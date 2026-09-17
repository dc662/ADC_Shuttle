-- ============================================================================
-- Cloudflare D1 Database Schema for ADC Shuttle & Swvl Fixed-Route App
-- Database ID: 32fb3a8c-abd2-4c8f-a65c-84425b098c0a
-- Cloudflare Account ID: e751dfa4e122383d061223cfe068cdb1
-- Studio URL: https://dash.cloudflare.com/e751dfa4e122383d061223cfe068cdb1/workers/d1/databases/32fb3a8c-abd2-4c8f-a65c-84425b098c0a/studio
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    department TEXT DEFAULT 'General',
    pickup_point TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Employee' CHECK(role IN ('Employee', 'Admin', 'Driver')),
    password TEXT DEFAULT '123456',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Trips & Shuttle Buses Table
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    time TEXT NOT NULL,
    pickup_points TEXT NOT NULL,          -- JSON array or comma-separated
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
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (trip_id) REFERENCES trips(id)
);

-- 4. Fixed Routes (Swvl model extension)
CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    base_price REAL NOT NULL DEFAULT 0.0,
    distance_km REAL DEFAULT 0.0,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- 5. Route Stops
CREATE TABLE IF NOT EXISTS stops (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    stop_sequence INTEGER NOT NULL,
    latitude REAL NOT NULL DEFAULT 0.0,
    longitude REAL NOT NULL DEFAULT 0.0,
    offset_minutes INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
);

-- 6. Trip Feedback & Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    complaints TEXT,
    custom_feedback TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_trip ON bookings(trip_id, date);
CREATE INDEX IF NOT EXISTS idx_stops_route ON stops(route_id, stop_sequence);

-- Seed Real Initial Data for ADC Shuttle Trips
INSERT OR IGNORE INTO trips (id, name, time, pickup_points, total_seats, available_seats, bus_type, bus_plate, driver_name, driver_phone, status)
VALUES 
('trip-01', 'Morning Line 1 - Maadi to Headquarters', '07:30 AM', '["Maadi Grand Mall", "Degla Square", "Autostrad Bridge", "HQ Gate 1"]', 7, 7, 'Suzuki 7-Seater', 'أ ب ج 1234', 'Captain Mahmoud Hassan', '01012345678', 'Active'),
('trip-02', 'Morning Line 2 - Nasr City & Heliopolis', '07:45 AM', '["Abbassiya", "Ramses", "Roxy Square", "HQ Gate 1"]', 14, 14, 'High-Class Bus 14-Seater', 'س ص ع 5678', 'Captain Ibrahim Ali', '01198765432', 'Active'),
('trip-03', 'Evening Line 1 - Headquarters to Maadi', '05:15 PM', '["HQ Main Exit", "Autostrad", "Degla", "Maadi Metro"]', 7, 7, 'Suzuki 7-Seater', 'أ ب ج 1234', 'Captain Mahmoud Hassan', '01012345678', 'Active'),
('trip-04', 'Evening Line 2 - Headquarters to Nasr City', '05:30 PM', '["HQ Main Exit", "Ring Road", "Nasr Road", "Abbassiya"]', 14, 14, 'High-Class Bus 14-Seater', 'س ص ع 5678', 'Captain Ibrahim Ali', '01198765432', 'Active');
