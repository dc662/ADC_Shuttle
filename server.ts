import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Cloudflare D1 Database Configuration
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'e751dfa4e122383d061223cfe068cdb1';
const CF_DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || '32fb3a8c-abd2-4c8f-a65c-84425b098c0a';

function getEffectiveToken(req: Request): string {
  const headerToken = req.headers['x-d1-token'] as string;
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }
  return process.env.CLOUDFLARE_D1_API_TOKEN?.trim() || '';
}

async function queryD1(sql: string, params: any[] = [], token: string) {
  if (!token) {
    return {
      success: false,
      error: "No Cloudflare API Token provided. Please provide a token in the Settings or set CLOUDFLARE_D1_API_TOKEN.",
      needToken: true
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("D1 API Request Error:", err);
    return {
      success: false,
      error: err.message || "Failed to communicate with Cloudflare API"
    };
  }
}

// -------------------------------------------------------------
// Google Sheets Integration & Live Proxy with In-Memory Caching
// -------------------------------------------------------------
const GOOGLE_SPREADSHEET_ID = '19WenkjF30MAS7b6DYHyJSurF3iqetIPWHbri2QqxpMY';

interface SheetCache {
  data: any;
  timestamp: number;
}
const sheetCache = new Map<string, SheetCache>();
const CACHE_TTL_MS = 5000; // 5 seconds cache to balance real-time freshness and API rate limits

async function fetchGoogleSheetTabData(sheetName: string, force = false): Promise<any[]> {
  const cacheKey = `tab_${sheetName}`;
  const cached = sheetCache.get(cacheKey);
  if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet ${sheetName}: ${response.statusText}`);
  }
  const text = await response.text();
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Invalid gviz response from sheet ${sheetName}`);
  }
  const json = JSON.parse(text.substring(startIdx, endIdx + 1));
  const cols = (json.table?.cols || []).map((c: any) => c?.label || c?.id || '');
  const rows = json.table?.rows || [];

  const parsedRows = rows.map((r: any) => {
    const rowObj: Record<string, any> = {};
    const cells = r.c || [];
    cols.forEach((colName: string, idx: number) => {
      const cell = cells[idx];
      let val = cell?.f ?? cell?.v ?? null;
      // Handle numeric Egyptian phone numbers where Google Sheets strips the leading zero
      if (typeof val === 'number' && (colName.toLowerCase().includes('ph') || idx === 5)) {
        val = '0' + String(val);
      }
      rowObj[colName] = val;
      rowObj[`_col_${idx}`] = val;
    });
    return rowObj;
  });

  sheetCache.set(cacheKey, { data: parsedRows, timestamp: Date.now() });
  return parsedRows;
}

// -------------------------------------------------------------
// Concurrent Atomic Mutex to Guarantee Zero Double Bookings
// Even when multiple orders hit the server at the exact same millisecond
// -------------------------------------------------------------
class AsyncLock {
  private queues = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.queues.has(key)) {
      await this.queues.get(key);
    }
    let release: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.queues.set(key, promise);
    try {
      return await fn();
    } finally {
      this.queues.delete(key);
      release!();
    }
  }
}
const bookingLock = new AsyncLock();

interface ServerBooking {
  bookingId: string;
  userId: string;
  userName: string;
  tripId: string;
  tripName: string;
  tripTime: string;
  date: string;
  seatNumber: number;
  pickupPoint: string;
  status: string;
  driverName?: string;
  driverPhone?: string;
  busPlate?: string;
  busModel?: string;
  busColor?: string;
  totalSeats?: number;
  hasSub?: boolean;
  createdAt: string;
}

const serverBookings: ServerBooking[] = [];

// Endpoint: Fetch single Google Sheet tab
app.get("/api/sheets/tab", async (req: Request, res: Response) => {
  const sheet = req.query.sheet as string;
  if (!sheet) {
    return res.status(400).json({ success: false, error: "Missing sheet query parameter" });
  }
  try {
    const rows = await fetchGoogleSheetTabData(sheet);
    res.json({ success: true, sheet, count: rows.length, rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to format raw time
function formatServerTime(rawVal: any): string {
  if (!rawVal) return '08:00 AM';
  const str = String(rawVal).trim();
  if (str.includes('Date(')) {
    const match = str.match(/Date\(\d+,\d+,\d+,(\d+),(\d+)/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 === 0 ? 12 : h % 12;
      return `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    }
  }
  if (str.includes(':')) {
    const parts = str.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1].substring(0, 2);
    let period = 'AM';
    if (str.toUpperCase().includes('PM') || h >= 12) {
      period = 'PM';
    }
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, '0')}:${m} ${period}`;
  }
  return str;
}

// Endpoint: Read all live Google Sheets data (Users, Trips, Bookings, Driver Leaves)
app.get("/api/sheets/data", async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true' || req.query.refresh === '1';
    const [rawUsers, rawTrips, rawBookings, rawLeaves] = await Promise.all([
      fetchGoogleSheetTabData('Users_DataBase', force).catch(() => []),
      fetchGoogleSheetTabData('Trips_DataBase', force).catch(() => []),
      fetchGoogleSheetTabData('Bookings', force).catch(() => []),
      fetchGoogleSheetTabData('Driver_Leaves', force).catch(() => [])
    ]);

    // Parse Users
    const users = (rawUsers || []).map((row: any) => {
      const id = row.User_ID || row._col_0;
      const name = row.User_Name || row._col_1;
      const password = row.Password || row._col_2 || '123456';
      const email = row.Email || row._col_3;
      const role = row.Role || row._col_4 || 'Employee';
      let phone = row.Emp_Ph_N || row._col_5 || '';
      phone = String(phone || '').trim();
      if (phone && /^\d{10}$/.test(phone) && !phone.startsWith('0')) {
        phone = '0' + phone;
      }

      return {
        id: String(id || '').trim(),
        name: String(name || '').trim(),
        password: String(password || '').trim(),
        email: String(email || '').trim().toLowerCase(),
        role: String(role || 'Employee').trim(),
        phone
      };
    }).filter((u: any) => u.name && (u.email || u.id));

    // Parse Trips
    const trips = (rawTrips || []).map((row: any) => {
      const id = row.Trip_ID || row._col_0;
      const name = row.Trip_Name || row._col_1 || 'Hyper Bus';
      const rawTime = row.Time || row._col_2 || '08:00 AM';
      const totalSeats = Number(row.Totla_Seats || row.Total_Seats || row._col_3 || 7);
      const driverName = row.Drvier || row.Driver || row._col_4 || 'سائق ADC';
      const driverPhone = row.Driver_Phone || row._col_5 || '01044789992';
      const mainPickPoint = row.Main_PickPoint || row._col_6 || 'Main Point';
      const formattedTime = formatServerTime(rawTime);
      const isHiAce = totalSeats > 7;

      return {
        id: String(id || '').trim(),
        name: String(name || '').trim(),
        time: formattedTime,
        rawTime: String(rawTime || formattedTime),
        totalSeats,
        seatsLeft: totalSeats,
        bookedSeatsCount: 0,
        bookedSeatsArray: [] as number[],
        driverName: String(driverName || '').trim(),
        driverPhone: String(driverPhone || '').trim(),
        mainPickPoint: String(mainPickPoint || '').trim(),
        busModel: isHiAce ? 'High Ace' : 'Suzuki',
        busColor: 'White',
        busPlate: 'أ ب ج 1042',
        hasReplacement: false
      };
    }).filter((t: any) => t.id);

    // Parse Bookings
    const sheetBookings = (rawBookings || []).map((row: any) => {
      const bookingId = row.Booking_ID || row._col_0;
      const userId = row.User_ID || row._col_1;
      const userName = row.User_Name || row._col_2;
      const tripId = row.Trip_ID || row._col_3;
      const tripName = row.Trip_Name || row._col_4;
      const tripTime = row.Time || row._col_5;
      const date = row.Date || row._col_6;
      const seatNumber = Number(row.Seat_Number || row._col_7 || 1);
      const pickupPoint = row.Pick_Up_Point || row._col_8 || 'Main Point';
      const status = row.Status || row._col_9 || 'Confirmed';
      return {
        bookingId: String(bookingId || '').trim(),
        userId: String(userId || '').trim(),
        userName: String(userName || '').trim(),
        tripId: String(tripId || '').trim(),
        tripName: String(tripName || '').trim(),
        tripTime: String(tripTime || '').trim(),
        date: String(date || '').trim(),
        seatNumber,
        pickupPoint: String(pickupPoint || '').trim(),
        status: String(status || 'Confirmed').trim()
      };
    }).filter((b: any) => b.bookingId || (b.userId && b.tripId));

    res.json({
      success: true,
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      users,
      trips,
      bookings: sheetBookings,
      driverLeaves: rawLeaves || [],
      lastSyncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Strict Atomic Reservation with Concurrency Protection
app.post("/api/bookings/reserve", async (req: Request, res: Response) => {
  const {
    userId,
    userName,
    tripId,
    tripName,
    tripTime,
    date,
    seatNumber,
    pickupPoint,
    driverName,
    driverPhone,
    busPlate,
    busModel,
    busColor,
    totalSeats,
    hasSub
  } = req.body;

  if (!userId || !tripId || !date || seatNumber === undefined) {
    return res.status(400).json({ success: false, message: "Missing required booking details." });
  }

  const parsedSeat = Number(seatNumber);
  // Atomic Lock key keyed specifically to (tripId + date + seatNumber)
  const lockKey = `${tripId}:${date}:${parsedSeat}`;

  return await bookingLock.acquire(lockKey, async () => {
    // 1. Check in Cloudflare D1 if connected
    const token = getEffectiveToken(req);
    if (token) {
      try {
        const d1Check = await queryD1(
          "SELECT booking_id FROM bookings WHERE trip_id = ? AND date = ? AND CAST(seat_number AS INTEGER) = ? AND status NOT LIKE '%Cancel%' LIMIT 1",
          [tripId, date, parsedSeat],
          token
        );
        if (d1Check.success && d1Check.result?.[0]?.results?.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'SEAT_ALREADY_TAKEN',
            message: `Seat #${parsedSeat} has already been reserved for this trip today by another passenger. Please choose another seat.`
          });
        }
      } catch (_err) {
        // Fall through to memory check
      }
    }

    // 2. Check in memory active bookings
    const existingTaken = serverBookings.find(b => 
      b.tripId === tripId && 
      b.date === date && 
      Number(b.seatNumber) === parsedSeat && 
      !b.status.toLowerCase().includes('cancel')
    );

    if (existingTaken) {
      return res.status(409).json({
        success: false,
        code: 'SEAT_ALREADY_TAKEN',
        message: `Seat #${parsedSeat} has already been reserved for this trip today by another passenger. Please choose another seat.`
      });
    }

    // 3. Prevent the same user from booking the exact same trip twice today
    const userAlreadyBooked = serverBookings.find(b =>
      b.userId.toLowerCase() === userId.toLowerCase() &&
      b.date === date &&
      b.tripId === tripId &&
      !b.status.toLowerCase().includes('cancel')
    );
    if (userAlreadyBooked) {
      return res.status(400).json({
        success: false,
        code: 'USER_ALREADY_BOOKED',
        message: 'You have already booked this exact trip today!'
      });
    }

    // 4. Create confirmed booking record
    const bookingId = 'BOK-' + Math.floor(10000 + Math.random() * 90000);
    const newBooking: ServerBooking = {
      bookingId,
      userId,
      userName: userName || 'Passenger',
      tripId,
      tripName: tripName || 'ADC Shuttle',
      tripTime: tripTime || '',
      date,
      seatNumber: parsedSeat,
      pickupPoint: pickupPoint || 'Main Point',
      status: 'Confirmed',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      busPlate: busPlate || '',
      busModel: busModel || 'Suzuki',
      busColor: busColor || 'White',
      totalSeats: totalSeats || 7,
      hasSub: Boolean(hasSub),
      createdAt: new Date().toISOString()
    };

    serverBookings.unshift(newBooking);

    // 5. Persist to Cloudflare D1 if configured
    if (token) {
      const insertSql = `
        INSERT INTO bookings (
          booking_id, user_id, user_name, trip_id, trip_name, trip_time, 
          date, seat_number, pickup_point, status, driver_name, driver_phone, 
          bus_plate, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        newBooking.bookingId, newBooking.userId, newBooking.userName,
        newBooking.tripId, newBooking.tripName, newBooking.tripTime,
        newBooking.date, String(newBooking.seatNumber), newBooking.pickupPoint,
        newBooking.status, newBooking.driverName, newBooking.driverPhone,
        newBooking.busPlate, newBooking.createdAt
      ];
      queryD1(insertSql, params, token).catch(err => console.warn("D1 async save:", err));
      queryD1("UPDATE trips SET available_seats = MAX(0, available_seats - 1) WHERE id = ?", [tripId], token).catch(() => {});
    }

    return res.json({
      success: true,
      booking: newBooking,
      message: `Seat #${parsedSeat} reserved successfully!`
    });
  });
});

// Endpoint: Cancel booking on server
app.post("/api/bookings/cancel", async (req: Request, res: Response) => {
  const { bookingId, tripId } = req.body;
  if (!bookingId) {
    return res.status(400).json({ success: false, message: "bookingId is required" });
  }

  const booking = serverBookings.find(b => b.bookingId === bookingId);
  if (booking) {
    booking.status = 'Canceled by Employee';
  }

  const token = getEffectiveToken(req);
  if (token) {
    queryD1("UPDATE bookings SET status = 'Canceled by Employee' WHERE booking_id = ?", [bookingId], token).catch(() => {});
    if (tripId) {
      queryD1("UPDATE trips SET available_seats = MIN(total_seats, available_seats + 1) WHERE id = ?", [tripId], token).catch(() => {});
    }
  }

  res.json({ success: true, message: "Booking canceled successfully" });
});

// Endpoint: Get all active server bookings
app.get("/api/bookings/active", (req: Request, res: Response) => {
  res.json({
    success: true,
    bookings: serverBookings.filter(b => !b.status.toLowerCase().includes('cancel'))
  });
});

// -------------------------------------------------------------
// 1. D1 Status & Diagnostics Endpoint
// -------------------------------------------------------------
app.get("/api/d1/status", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const hasToken = Boolean(token);

  if (!hasToken) {
    return res.json({
      connected: false,
      hasToken: false,
      accountId: CF_ACCOUNT_ID,
      databaseId: CF_DATABASE_ID,
      message: "No Cloudflare API Token configured yet."
    });
  }

  const pingResult = await queryD1("SELECT 1 as ping", [], token);
  const isConnected = Boolean(pingResult?.success);

  res.json({
    connected: isConnected,
    hasToken: true,
    accountId: CF_ACCOUNT_ID,
    databaseId: CF_DATABASE_ID,
    pingResult,
    message: isConnected ? "Successfully connected to Cloudflare D1" : (pingResult?.errors?.[0]?.message || pingResult?.error || "Connection failed")
  });
});

// -------------------------------------------------------------
// 2. Initialize Database Schema & Tables
// -------------------------------------------------------------
app.post("/api/d1/init", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  if (!token) {
    return res.status(400).json({ success: false, error: "API token required", needToken: true });
  }

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      department TEXT DEFAULT 'General',
      pickup_point TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'Employee',
      password TEXT DEFAULT '123456',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      time TEXT NOT NULL,
      pickup_points TEXT NOT NULL,
      total_seats INTEGER NOT NULL DEFAULT 7,
      available_seats INTEGER NOT NULL DEFAULT 7,
      bus_type TEXT NOT NULL DEFAULT 'Suzuki Alto / Carry',
      bus_plate TEXT NOT NULL,
      bus_model TEXT DEFAULT '',
      bus_color TEXT DEFAULT 'White',
      driver_name TEXT NOT NULL,
      driver_phone TEXT NOT NULL,
      has_replacement INTEGER NOT NULL DEFAULT 0,
      replacement_name TEXT DEFAULT '',
      replacement_phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Active'
    );`,
    `CREATE TABLE IF NOT EXISTS bookings (
      booking_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      trip_name TEXT NOT NULL,
      trip_time TEXT NOT NULL,
      date TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      pickup_point TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Confirmed',
      driver_name TEXT,
      driver_phone TEXT,
      bus_plate TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      complaints TEXT,
      custom_feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `INSERT OR IGNORE INTO trips (id, name, time, pickup_points, total_seats, available_seats, bus_type, bus_plate, driver_name, driver_phone, status)
     VALUES 
     ('trip-01', 'Morning Line 1 - Maadi to Headquarters', '07:30 AM', '["Maadi Grand Mall", "Degla Square", "Autostrad Bridge", "HQ Gate 1"]', 7, 7, 'Suzuki 7-Seater', 'أ ب ج 1234', 'Captain Mahmoud Hassan', '01012345678', 'Active'),
     ('trip-02', 'Morning Line 2 - Nasr City & Heliopolis', '07:45 AM', '["Abbassiya", "Ramses", "Roxy Square", "HQ Gate 1"]', 14, 14, 'High-Class Bus 14-Seater', 'س ص ع 5678', 'Captain Ibrahim Ali', '01198765432', 'Active'),
     ('trip-03', 'Evening Line 1 - Headquarters to Maadi', '05:15 PM', '["HQ Main Exit", "Autostrad", "Degla", "Maadi Metro"]', 7, 7, 'Suzuki 7-Seater', 'أ ب ج 1234', 'Captain Mahmoud Hassan', '01012345678', 'Active'),
     ('trip-04', 'Evening Line 2 - Headquarters to Nasr City', '05:30 PM', '["HQ Main Exit", "Ring Road", "Nasr Road", "Abbassiya"]', 14, 14, 'High-Class Bus 14-Seater', 'س ص ع 5678', 'Captain Ibrahim Ali', '01198765432', 'Active');`
  ];

  const results = [];
  for (const q of queries) {
    const r = await queryD1(q, [], token);
    results.push(r);
  }

  res.json({ success: true, message: "Database schema initialized successfully", results });
});

// -------------------------------------------------------------
// 3. Generic SQL Query Proxy
// -------------------------------------------------------------
app.post("/api/d1/query", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const { sql, params = [] } = req.body;

  if (!sql) {
    return res.status(400).json({ success: false, error: "SQL statement is required" });
  }

  const result = await queryD1(sql, params, token);
  res.json(result);
});

// -------------------------------------------------------------
// 4. Read Trips from Cloudflare D1
// -------------------------------------------------------------
app.get("/api/d1/trips", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const result = await queryD1("SELECT * FROM trips WHERE status = 'Active' ORDER BY time ASC", [], token);

  if (result.success && result.result?.[0]?.results) {
    return res.json({ success: true, trips: result.result[0].results });
  }

  res.json({ success: false, trips: [], error: result.errors || result.error });
});

// -------------------------------------------------------------
// 5. Read Bookings from Cloudflare D1
// -------------------------------------------------------------
app.get("/api/d1/bookings", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const userId = req.query.userId as string | undefined;

  let sql = "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100";
  let params: any[] = [];

  if (userId) {
    sql = "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 100";
    params = [userId];
  }

  const result = await queryD1(sql, params, token);
  if (result.success && result.result?.[0]?.results) {
    return res.json({ success: true, bookings: result.result[0].results });
  }

  res.json({ success: false, bookings: [], error: result.errors || result.error });
});

// -------------------------------------------------------------
// 6. Write / Insert Booking into Cloudflare D1
// -------------------------------------------------------------
app.post("/api/d1/bookings", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const booking = req.body;

  if (!booking.bookingId || !booking.userId || !booking.tripId) {
    return res.status(400).json({ success: false, error: "Missing required booking details" });
  }

  const parsedSeat = Number(booking.seatNumber || 1);
  const lockKey = `${booking.tripId}:${booking.date}:${parsedSeat}`;

  return await bookingLock.acquire(lockKey, async () => {
    // Check if seat is already booked in D1
    if (token) {
      try {
        const checkSql = "SELECT booking_id FROM bookings WHERE trip_id = ? AND date = ? AND CAST(seat_number AS INTEGER) = ? AND status NOT LIKE '%Cancel%' LIMIT 1";
        const checkRes = await queryD1(checkSql, [booking.tripId, booking.date, parsedSeat], token);
        if (checkRes.success && checkRes.result?.[0]?.results?.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'SEAT_ALREADY_TAKEN',
            message: `Seat #${parsedSeat} has already been reserved for this trip today by another passenger.`
          });
        }
      } catch (_e) {}
    }

    // Check memory bookings
    const memTaken = serverBookings.some(b =>
      b.tripId === booking.tripId &&
      b.date === booking.date &&
      Number(b.seatNumber) === parsedSeat &&
      !b.status.toLowerCase().includes('cancel')
    );
    if (memTaken) {
      return res.status(409).json({
        success: false,
        code: 'SEAT_ALREADY_TAKEN',
        message: `Seat #${parsedSeat} has already been reserved for this trip today by another passenger.`
      });
    }

    const insertSql = `
      INSERT INTO bookings (
        booking_id, user_id, user_name, trip_id, trip_name, trip_time, 
        date, seat_number, pickup_point, status, driver_name, driver_phone, 
        bus_plate, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      booking.bookingId,
      booking.userId,
      booking.userName || 'Passenger',
      booking.tripId,
      booking.tripName || 'ADC Shuttle',
      booking.tripTime || '',
      booking.date,
      String(parsedSeat),
      booking.pickupPoint,
      booking.status || 'Confirmed',
      booking.driverName || '',
      booking.driverPhone || '',
      booking.busPlate || '',
      booking.createdAt || new Date().toISOString()
    ];

    const insertResult = await queryD1(insertSql, params, token);

    // Also decrement available seats in trips table if possible
    await queryD1(
      "UPDATE trips SET available_seats = MAX(0, available_seats - 1) WHERE id = ?",
      [booking.tripId],
      token
    );

    // Sync to memoryBookings
    serverBookings.unshift({
      bookingId: booking.bookingId,
      userId: booking.userId,
      userName: booking.userName || 'Passenger',
      tripId: booking.tripId,
      tripName: booking.tripName || 'ADC Shuttle',
      tripTime: booking.tripTime || '',
      date: booking.date,
      seatNumber: parsedSeat,
      pickupPoint: booking.pickupPoint || 'Main Point',
      status: booking.status || 'Confirmed',
      driverName: booking.driverName || '',
      driverPhone: booking.driverPhone || '',
      busPlate: booking.busPlate || '',
      busModel: booking.busModel || 'Suzuki',
      busColor: booking.busColor || 'White',
      totalSeats: booking.totalSeats || 7,
      hasSub: Boolean(booking.hasSub),
      createdAt: booking.createdAt || new Date().toISOString()
    });

    res.json({
      success: Boolean(insertResult.success),
      result: insertResult,
      message: insertResult.success ? "Booking successfully recorded in Cloudflare D1" : "Failed to record in D1"
    });
  });
});

// -------------------------------------------------------------
// 7. Cancel Booking in Cloudflare D1
// -------------------------------------------------------------
app.post("/api/d1/cancel-booking", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const { bookingId, tripId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, error: "bookingId is required" });
  }

  const cancelSql = "UPDATE bookings SET status = 'Cancelled' WHERE booking_id = ?";
  const result = await queryD1(cancelSql, [bookingId], token);

  if (tripId) {
    await queryD1(
      "UPDATE trips SET available_seats = MIN(total_seats, available_seats + 1) WHERE id = ?",
      [tripId],
      token
    );
  }

  res.json({
    success: Boolean(result.success),
    message: result.success ? "Booking canceled in Cloudflare D1" : "Failed to cancel in D1"
  });
});

// -------------------------------------------------------------
// 8. Write Rating / Feedback into Cloudflare D1
// -------------------------------------------------------------
app.post("/api/d1/ratings", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const { id, bookingId, userId, rating, complaints, customFeedback } = req.body;

  const sql = `
    INSERT INTO ratings (id, booking_id, user_id, rating, complaints, custom_feedback, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id || `rating-${Date.now()}`,
    bookingId,
    userId,
    rating,
    Array.isArray(complaints) ? complaints.join(', ') : (complaints || ''),
    customFeedback || '',
    new Date().toISOString()
  ];

  const result = await queryD1(sql, params, token);
  res.json({
    success: Boolean(result.success),
    message: result.success ? "Feedback saved to Cloudflare D1" : "Failed to save feedback"
  });
});

// -------------------------------------------------------------
// 9. Write / Register User into Cloudflare D1
// -------------------------------------------------------------
app.post("/api/d1/users", async (req: Request, res: Response) => {
  const token = getEffectiveToken(req);
  const user = req.body;

  if (!user.id || !user.email) {
    return res.status(400).json({ success: false, error: "User ID and email are required" });
  }

  const sql = `
    INSERT OR REPLACE INTO users (id, name, email, phone, role, password, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    user.id,
    user.name,
    user.email,
    user.phone || '',
    user.role || 'Employee',
    user.password || '123456',
    new Date().toISOString()
  ];

  const result = await queryD1(sql, params, token);
  res.json({
    success: Boolean(result.success),
    message: result.success ? "User registered in Cloudflare D1" : "Failed to save user"
  });
});

// -------------------------------------------------------------
// 6. Web Push Notification Service (For closed app & background delivery)
// -------------------------------------------------------------
// Initialize or load VAPID Keys for native OS background notifications
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (!vapidPublicKey || !vapidPrivateKey) {
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
  } catch (err) {
    console.warn("VAPID generation warning:", err);
  }
}

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:minatharwatwadie@gmail.com",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (e) {
    console.warn("Error setting VAPID details:", e);
  }
}

// In-memory registry of device subscriptions
const pushSubscriptionsMap = new Map<string, any>();

// Return public key for client pushManager subscription
app.get("/api/push/vapid-key", (req: Request, res: Response) => {
  res.json({
    publicKey: vapidPublicKey,
    supported: Boolean(vapidPublicKey)
  });
});

// Save client subscription
app.post("/api/push/subscribe", (req: Request, res: Response) => {
  try {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "Missing valid push subscription" });
    }
    const key = userId || subscription.endpoint;
    pushSubscriptionsMap.set(key, subscription);
    console.log(`[Push] Device registered. Total subscribers: ${pushSubscriptionsMap.size}`);
    res.json({ success: true, subscribersCount: pushSubscriptionsMap.size });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch push notification to all devices (wakes up closed phones & browsers)
app.post("/api/push/send", async (req: Request, res: Response) => {
  const { title, body, icon, url, type, data } = req.body;
  const payload = JSON.stringify({
    title: title || "ADC Shuttle",
    body: body || "تنبيه جديد من باص الشركة",
    icon: icon || "https://lh3.googleusercontent.com/d/1HS_C1xB0pi8yO4YA9JTsgQIRUyrqPEiJ",
    badge: "https://lh3.googleusercontent.com/d/1HS_C1xB0pi8yO4YA9JTsgQIRUyrqPEiJ",
    url: url || "/",
    type: type || "status",
    data: data || {},
    timestamp: Date.now()
  });

  let sent = 0;
  let failed = 0;

  for (const [key, sub] of pushSubscriptionsMap.entries()) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err: any) {
      failed++;
      // Clean up dead/expired endpoints (status 404 or 410 Gone)
      if (err.statusCode === 404 || err.statusCode === 410) {
        pushSubscriptionsMap.delete(key);
      }
    }
  }

  res.json({
    success: true,
    sent,
    failed,
    subscribersCount: pushSubscriptionsMap.size
  });
});

// -------------------------------------------------------------
// Public Static Assets & Vite Middleware / Static Fallback
// -------------------------------------------------------------
app.use(express.static(path.join(process.cwd(), 'public')));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ADC Shuttle Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
