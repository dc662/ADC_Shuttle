import { User, Trip, Booking, SavedRating } from '../types';

export const GOOGLE_SPREADSHEET_ID = '19WenkjF30MAS7b6DYHyJSurF3iqetIPWHbri2QqxpMY';

// Real Seed Data directly extracted from the live spreadsheet
export const REAL_SEED_USERS: User[] = [
  { id: 'E-88315', name: 'Mina Tharwat', password: 'password123', email: 'minatharwatwadie@gmail.com', role: 'Employee', phone: '01044789992' },
  { id: 'E-55335', name: 'Radwa Khaled', password: 'password123', email: 'radwakhaled@adc-arch.com', role: 'Employee', phone: '01146196957' },
  { id: 'E-31408', name: 'Abdelraman Mahmoud', password: 'password123', email: 'abdo21mahmoud@gmail.com', role: 'Employee', phone: '01153040102' },
  { id: 'E-36377', name: 'AbdelRahman Hassan elkhashab', password: 'password123', email: 'abdoelkashab2002@gmail.com', role: 'Employee', phone: '01207095694' },
  { id: 'E-42604', name: 'Tukka Musaad', password: '123', email: 'tukkamussad@gmail.com', role: 'Employee', phone: '01271621591' },
  { id: 'E-97783', name: 'Sameh Zidan', password: 'password123', email: 'sameh.zidan@adc-arch.com', role: 'Employee', phone: '01065622778' },
  { id: 'E-77811', name: 'Marwa Mohamed', password: 'password123', email: 'marwa.m.hasanein@gmail.com', role: 'Employee', phone: '01115939722' },
  { id: 'E-47807', name: 'Rana Salah', password: 'password123', email: 'rana.salah.7901@gmail.com', role: 'Employee', phone: '01091549704' },
  { id: 'E-23846', name: 'Hossam Saeed', password: 'password123', email: 'hossamsaeed115@gmail.com', role: 'Employee', phone: '01002032874' },
  { id: 'E-62328', name: 'Mohamed sobhy', password: 'password123', email: '1998moh.sob@gmail.com', role: 'Employee', phone: '01011730882' },
  { id: 'E-51882', name: 'Abdelmaged Elbehiry', password: 'password123', email: 'abdelmaged.elbehiry22@gmail.com', role: 'Employee', phone: '01014157910' },
  { id: 'E-74622', name: 'Hussein maher', password: 'password123', email: 'hussein.maher.qady@gmail.com', role: 'Employee', phone: '01149104670' },
  { id: 'E-43941', name: 'Ahmed attef', password: 'password123', email: 'attefahmed2001@gmail.com', role: 'Employee', phone: '01159785535' },
  { id: 'E-34550', name: 'Hadeer Salah', password: 'password123', email: 'hadeeeersalah@gmail.com', role: 'Employee', phone: '01148442808' },
  { id: 'E-28662', name: 'Aya Abdelmoneim', password: 'password123', email: 'aya.abdelmoneim@adc-arch.com', role: 'Employee', phone: '01070066925' },
  { id: 'E-22248', name: 'Ahmed Haddad', password: '123', email: 'ah4521704@gmail.com', role: 'Employee', phone: '01091618358' },
  { id: 'E-16280', name: 'Islam karam', password: 'password123', email: 'islam.karam.ibrahim.41@gmail.com', role: 'Employee', phone: '01092041792' },
  { id: 'E-16882', name: 'Ahmed Sorour', password: 'password123', email: 'info@adc-arch.com', role: 'Employee', phone: '01094214046' },
  { id: 'E-19349', name: 'Mayar Alaa Eldeen Mostafa', password: 'password123', email: 'mayaralaa32@gmail.com', role: 'Employee', phone: '01110558034' },
  { id: 'E-34562', name: 'Maram', password: 'password123', email: 'maramwalaaomar@gmail.com', role: 'Employee', phone: '01061565095' },
  { id: 'E-79669', name: 'Mohamed fathy nazer', password: 'password123', email: 'hapepa902@gmail.com', role: 'Employee', phone: '01227260664' },
  { id: 'E-64254', name: 'Aya Mohamed', password: 'password123', email: '41.aya.mohamed@gmail.com', role: 'Employee', phone: '01064977829' },
  { id: 'E-20181', name: 'Amr Fathy', password: '123', email: 'amrmofathy079@gmail.com', role: 'Employee', phone: '01000751606' },
  { id: 'E-76234', name: 'Mohamed Abdo', password: 'password123', email: 'mohamedabdo01149260420@gmail.com', role: 'Employee', phone: '01095715920' },
  { id: 'E-12996', name: 'Mohamed Khaled', password: 'password123', email: 'mohamedkhaledkhodairy90@gmail.com', role: 'Employee', phone: '01141921520' },
  { id: 'E-18983', name: 'Mariem basem', password: 'password123', email: 'mariambasem0@gmail.com', role: 'Employee', phone: '01281525254' },
  { id: 'E-43332', name: 'Hanaa adel', password: 'password123', email: 'hanaaadel117@gmail.com', role: 'Employee', phone: '01128844964' },
  { id: 'E-42858', name: 'Naira Mahmoud Mahmoud', password: 'password123', email: 'nairamahmoud2212@gmail.com', role: 'Employee', phone: '01117830196' },
  { id: 'E-71012', name: 'Sama ashraf', password: 'password123', email: 'samaashraf103@gmail.com', role: 'Employee', phone: '01092295854' },
  { id: 'E-53558', name: 'Amany Samir', password: 'password123', email: 'amany.samir806@gmail.com', role: 'Employee', phone: '01012570694' },
  { id: 'E-10071', name: 'Esraa Saeed', password: '123', email: 'esraa761saeed@gmail.com', role: 'Employee', phone: '01112952550' },
  { id: 'E-36231', name: 'Ayman', password: 'password123', email: 'aymannasser156@gmail.com', role: 'Employee', phone: '01024636152' },
  { id: 'E-89751', name: 'Samir Samy', password: 'password123', email: 'samir.samy2016@gmail.com', role: 'Employee', phone: '01114612196' },
  { id: 'E-99564', name: 'Nihal Ibraheem', password: 'password123', email: 'nihalibraheem16@gmail.com', role: 'Employee', phone: '01101641479' },
  { id: 'E-82798', name: 'AMR HATEM', password: 'password123', email: 'amr.anan@adc-arch.com', role: 'Employee', phone: '01124073208' },
  { id: 'E-54683', name: 'Mahmoud', password: 'password123', email: 'badbooy4545789@gmail.com', role: 'Employee', phone: '01144007676' },
  { id: 'E-74433', name: 'Sohayla', password: 'password123', email: 'sohaylasalahdesigns@gmail.com', role: 'Employee', phone: '01208151291' },
  { id: 'E-40653', name: 'Nourhan adel', password: 'password123', email: 'nourhanadelabdelaziz@gmail.com', role: 'Employee', phone: '01000731846' },
  { id: 'E-76047', name: 'Nada foda', password: 'password123', email: 'nadfoda95@gmail.com', role: 'Employee', phone: '01091310223' },
  { id: 'E-27388', name: 'Toka hamdy', password: 'password123', email: 'toka.hamdy.abdelhalem.38@gmail.com', role: 'Employee', phone: '01126664812' },
  { id: 'E-36878', name: 'Sarah Ibrahim', password: 'password123', email: 'sarah.ibrahim.01.si@gmail.com', role: 'Employee', phone: '01020984298' },
  { id: 'E-78628', name: 'Esraa sabry', password: 'password123', email: 'esraasabri0@gmail.com', role: 'Employee', phone: '01024413608' },
  { id: 'E-18864', name: 'Aya Abd elmoneam', password: '123', email: 'ayaabdelmoneam12@gmail.com', role: 'Employee', phone: '01141523533' },
  { id: 'E-16532', name: 'yousef ashraf', password: 'password123', email: 'yousefashraf651@gmail.com', role: 'Employee', phone: '01003792311' },
  { id: 'E-51739', name: 'Mohamed Taha', password: 'password123', email: 'mohamedahmedtaha38@gmail.com', role: 'Employee', phone: '01150048712' },
  { id: 'E-24568', name: 'Mahmoud hashem', password: 'password123', email: 'mahmodhashem99@gmail.com', role: 'Employee', phone: '01027234988' },
  { id: 'E-00001', name: 'DC Admin', password: 'password123', email: 'dc@adc-arch.com', role: 'Employee', phone: '01000000000' }
];

export const REAL_SEED_TRIPS: Trip[] = [
  {
    id: 'TH1',
    name: 'Hyper Bus',
    time: '08:15 AM',
    rawTime: '8:15:00 AM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'احمد جوده',
    driverPhone: '01062800114',
    mainPickPoint: 'موقف أو ملف هايبر',
    busModel: 'Suzuki',
    busColor: 'White',
    busPlate: 'أ ب ج 1042',
    hasReplacement: false
  },
  {
    id: 'TH2',
    name: 'Hyper Bus',
    time: '08:45 AM',
    rawTime: '8:45:00 AM',
    totalSeats: 13,
    seatsLeft: 13,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'احمد اسلام',
    driverPhone: '01112904964',
    mainPickPoint: 'مدخل 2  الشيخ زايد ',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    busPlate: 'س ص ع 5678',
    hasReplacement: false
  },
  {
    id: 'TH3',
    name: 'Hyper Bus',
    time: '05:30 PM',
    rawTime: '5:30:00 PM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'احمد جوده',
    driverPhone: '01062800114',
    mainPickPoint: 'امام الشركه',
    busModel: 'Suzuki',
    busColor: 'White',
    busPlate: 'أ ب ج 1042',
    hasReplacement: false
  },
  {
    id: 'TH4',
    name: 'Hyper Bus',
    time: '06:00 PM',
    rawTime: '6:00:00 PM',
    totalSeats: 13,
    seatsLeft: 13,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'حسين',
    driverPhone: '01111550109',
    mainPickPoint: 'امام الشركه',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    busPlate: 'س ص ع 5678',
    hasReplacement: false
  },
  {
    id: 'TJ1',
    name: 'Juhayna Bus',
    time: '08:15 AM',
    rawTime: '8:15:00 AM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'محمد فتحى',
    driverPhone: '01005578093',
    mainPickPoint: 'ميدان جهينه',
    busModel: 'Suzuki',
    busColor: 'Blue',
    busPlate: 'د هـ و 9012',
    hasReplacement: false
  },
  {
    id: 'TJ2',
    name: 'Juhayna Bus',
    time: '08:45 AM',
    rawTime: '8:45:00 AM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'احمد جوده',
    driverPhone: '01062800114',
    mainPickPoint: 'ميدان جهينه',
    busModel: 'Suzuki',
    busColor: 'White',
    busPlate: 'أ ب ج 1042',
    hasReplacement: false
  },
  {
    id: 'TJ3',
    name: 'Juhayna Bus',
    time: '05:30 PM',
    rawTime: '5:30:00 PM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'محمد فتحى',
    driverPhone: '01005578093',
    mainPickPoint: 'امام الشركه',
    busModel: 'Suzuki',
    busColor: 'Blue',
    busPlate: 'د هـ و 9012',
    hasReplacement: false
  },
  {
    id: 'TJ4',
    name: 'Juhayna Bus',
    time: '06:00 PM',
    rawTime: '6:00:00 PM',
    totalSeats: 7,
    seatsLeft: 7,
    bookedSeatsCount: 0,
    bookedSeatsArray: [],
    driverName: 'احمد جوده',
    driverPhone: '01062800114',
    mainPickPoint: 'امام الشركه',
    busModel: 'Suzuki',
    busColor: 'White',
    busPlate: 'أ ب ج 1042',
    hasReplacement: false
  }
];

export const REAL_SEED_BOOKINGS: Booking[] = [
  {
    bookingId: 'BOK-37807',
    userId: 'E-88315',
    userName: 'Mina Tharwat Wadie',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Canceled by Employee',
    seatNumber: 1,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T14:51:34Z'
  },
  {
    bookingId: 'BOK-23764',
    userId: 'E-53341',
    userName: 'Mina Tawfiq',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Confirmed',
    seatNumber: 2,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T14:54:13Z'
  },
  {
    bookingId: 'BOK-78877',
    userId: 'E-77811',
    userName: 'Marwa Mohamed',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Canceled by System',
    seatNumber: 4,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T15:22:43Z'
  },
  {
    bookingId: 'BOK-81686',
    userId: 'E-47807',
    userName: 'Rana Salah',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Canceled by System',
    seatNumber: 5,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T15:25:16Z'
  },
  {
    bookingId: 'BOK-25737',
    userId: 'E-23846',
    userName: 'Hossam Saeed',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Canceled by Employee',
    seatNumber: 7,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T15:27:01Z'
  },
  {
    bookingId: 'BOK-38000',
    userId: 'E-34550',
    userName: 'Hadeer Salsh',
    tripId: 'TH4',
    tripName: 'Hyper Bus',
    tripTime: '06:00 PM',
    date: '2026-08-26',
    status: 'Confirmed',
    seatNumber: 3,
    pickupPoint: 'امام الشركه',
    driverName: 'حسين',
    driverPhone: '01111550109',
    busPlate: 'س ص ع 5678',
    busModel: 'HC High Ace',
    busColor: 'Silver',
    totalSeats: 13,
    hasSub: false,
    createdAt: '2026-08-26T16:13:38Z'
  }
];

export async function fetchGoogleSheetTab(sheetName: string): Promise<any[]> {
  // First attempt via Express server backend proxy if available
  try {
    const proxyUrl = `/api/sheets/tab?sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && Array.isArray(data.rows)) {
        return data.rows;
      }
    }
  } catch (_e) {
    // Ignore and fallback to direct Google Sheet gviz
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName
  )}&_t=${Date.now()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet ${sheetName}: ${response.statusText}`);
  }

  const text = await response.text();
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Invalid gviz response from sheet ${sheetName}`);
  }

  const jsonStr = text.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);

  const cols = (data.table?.cols || []).map((c: any) => c?.label || c?.id || '');
  const rows = data.table?.rows || [];

  return rows.map((r: any) => {
    const rowObj: Record<string, any> = {};
    const cells = r.c || [];
    cols.forEach((colName: string, idx: number) => {
      const cell = cells[idx];
      rowObj[colName] = cell?.f ?? cell?.v ?? null;
      rowObj[`_col_${idx}`] = cell?.f ?? cell?.v ?? null;
    });
    return rowObj;
  });
}

function formatTimeString(rawVal: any): string {
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

export async function fetchLiveGoogleSheetsData(force = false) {
  try {
    // 1. Fast path: check Express proxy endpoint if available
    try {
      const liveRes = await fetch(`/api/sheets/data?force=${force ? 'true' : 'false'}&_t=${Date.now()}`);
      if (liveRes.ok) {
        const liveJson = await liveRes.json();
        if (liveJson && liveJson.success && Array.isArray(liveJson.trips) && liveJson.trips.length > 0) {
          return {
            success: true,
            users: liveJson.users && liveJson.users.length > 0 ? liveJson.users : REAL_SEED_USERS,
            trips: liveJson.trips,
            bookings: liveJson.bookings && liveJson.bookings.length > 0 ? liveJson.bookings : REAL_SEED_BOOKINGS
          };
        }
      }
    } catch (_proxyErr) {
      // Fallback to direct client gviz query
    }

    const [rawUsers, rawTrips, rawBookings, rawLeaves] = await Promise.all([
      fetchGoogleSheetTab('Users_DataBase').catch(() => []),
      fetchGoogleSheetTab('Trips_DataBase').catch(() => []),
      fetchGoogleSheetTab('Bookings').catch(() => []),
      fetchGoogleSheetTab('Driver_Leaves').catch(() => [])
    ]);

    // Parse Users
    const users: User[] = [];
    if (rawUsers && rawUsers.length > 0) {
      for (const row of rawUsers) {
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

        if (name && (email || id)) {
          users.push({
            id: String(id).trim(),
            name: String(name).trim(),
            password: String(password).trim(),
            email: String(email).trim().toLowerCase(),
            phone,
            role: String(role).trim() as any
          });
        }
      }
    }

    // Parse Trips
    const trips: Trip[] = [];
    if (rawTrips && rawTrips.length > 0) {
      for (const row of rawTrips) {
        const id = row.Trip_ID || row._col_0;
        const name = row.Trip_Name || row._col_1 || 'Hyper Bus';
        const rawTime = row.Time || row._col_2 || '08:00 AM';
        const totalSeats = Number(row.Totla_Seats || row.Total_Seats || row._col_3 || 7);
        const driverName = row.Drvier || row.Driver || row._col_4 || 'سائق ADC';
        const driverPhone = row.Driver_Phone || row._col_5 || '01044789992';
        const mainPickPoint = row.Main_PickPoint || row._col_6 || 'Main Point';

        if (id) {
          const formattedTime = formatTimeString(rawTime);
          const isHiAce = totalSeats > 7;

          // Check replacement driver in leaves
          let replacementName: string | undefined;
          let replacementPhone: string | undefined;
          let hasReplacement = false;

          if (rawLeaves && rawLeaves.length > 0) {
            const leave = rawLeaves.find(
              (l: any) => (l.Trip_ID || l._col_0) === id
            );
            if (leave) {
              replacementName = leave.Replcament_Name || leave._col_5;
              replacementPhone = leave.Replcament_Number || leave._col_6;
              hasReplacement = Boolean(replacementName);
            }
          }

          trips.push({
            id: String(id).trim(),
            name: String(name).trim(),
            time: formattedTime,
            rawTime: String(rawTime),
            totalSeats,
            seatsLeft: totalSeats,
            bookedSeatsCount: 0,
            bookedSeatsArray: [],
            driverName: String(driverName).trim(),
            driverPhone: String(driverPhone).trim(),
            replacementName,
            replacementPhone,
            mainPickPoint: String(mainPickPoint).trim(),
            busModel: isHiAce ? 'HC High Ace' : 'Suzuki',
            busColor: isHiAce ? 'Silver' : (name.includes('Juhayna') ? 'Blue' : 'White'),
            busPlate: isHiAce ? 'س ص ع 5678' : 'أ ب ج 1042',
            hasReplacement
          });
        }
      }
    }

    // Parse Bookings
    const bookings: Booking[] = [];
    if (rawBookings && rawBookings.length > 0) {
      for (const row of rawBookings) {
        const bookingId = row.Booking_ID || row._col_0;
        const userId = row.User_ID || row._col_1;
        const tripId = row.Trip_ID || row._col_2;
        const tripDate = row.Trip_Date || row._col_3;
        const status = row.Status || row._col_4 || 'Confirmed';
        const createdAt = row.Created_At || row._col_5;
        const seatNumber = Number(row.Seats || row._col_6 || 1);
        const pickupPoint = row.Pickup_Point || row._col_7 || 'Main Point';

        if (bookingId && tripId) {
          const trip = trips.find((t) => t.id === tripId);
          const user = users.find((u) => u.id === userId);

          let normalizedStatus: Booking['status'] = 'Confirmed';
          const lowerStatus = String(status).toLowerCase();
          if (lowerStatus.includes('cancel')) {
            normalizedStatus = lowerStatus.includes('driver') ? 'Canceled by System' : 'Canceled by Employee';
          } else if (lowerStatus.includes('onboard') || lowerStatus.includes('board')) {
            normalizedStatus = 'Passenger on board';
          } else if (lowerStatus.includes('complete')) {
            normalizedStatus = 'Completed';
          } else if (lowerStatus.includes('wait')) {
            normalizedStatus = 'Waiting List';
          }

          bookings.push({
            bookingId: String(bookingId).trim(),
            userId: String(userId).trim(),
            userName: user ? user.name : 'Employee',
            tripId: String(tripId).trim(),
            tripName: trip ? trip.name : 'Hyper Bus',
            tripTime: trip ? trip.time : '06:00 PM',
            date: String(tripDate).trim(),
            status: normalizedStatus,
            seatNumber,
            pickupPoint: String(pickupPoint).trim(),
            driverName: trip ? trip.driverName : 'Driver',
            driverPhone: trip ? trip.driverPhone : '01000000000',
            replacementName: trip?.replacementName,
            replacementPhone: trip?.replacementPhone,
            busPlate: trip ? trip.busPlate : 'أ ب ج 1042',
            busModel: trip ? trip.busModel : 'Suzuki',
            busColor: trip ? trip.busColor : 'White',
            totalSeats: trip ? trip.totalSeats : 7,
            hasSub: trip?.hasReplacement || false,
            createdAt: String(createdAt || new Date().toISOString())
          });
        }
      }
    }

    return {
      success: true,
      users: users.length > 0 ? users : REAL_SEED_USERS,
      trips: trips.length > 0 ? trips : REAL_SEED_TRIPS,
      bookings: bookings.length > 0 ? bookings : REAL_SEED_BOOKINGS
    };
  } catch (error) {
    console.warn('Google Sheets live fetch fallback to local synced state:', error);
    return {
      success: false,
      users: REAL_SEED_USERS,
      trips: REAL_SEED_TRIPS,
      bookings: REAL_SEED_BOOKINGS
    };
  }
}
