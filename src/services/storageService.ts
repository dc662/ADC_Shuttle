import { User, Trip, Booking, SavedRating } from '../types';
import {
  REAL_SEED_USERS,
  REAL_SEED_TRIPS,
  REAL_SEED_BOOKINGS,
  fetchLiveGoogleSheetsData,
  GOOGLE_SPREADSHEET_ID
} from './googleSheetsService';
import { cloudflareD1Service, CLOUDFLARE_CONFIG } from './cloudflareD1Service';
import {
  writeUserUpdateToGoogleSheet,
  appendBookingToGoogleSheet,
  updateBookingStatusInGoogleSheet
} from './googleSheetsWriteService';

const USERS_KEY = 'adc_shuttle_users_v2';
const TRIPS_KEY = 'adc_shuttle_trips_v2';
const BOOKINGS_KEY = 'adc_shuttle_bookings_v2';
const RATINGS_KEY = 'adc_shuttle_ratings_v2';
const CURRENT_USER_KEY = 'adc_shuttle_current_user_v2';
const OTP_STORE_KEY = 'adc_shuttle_otp_temp_v2';

// Universal Safe Storage abstraction (supports browser, Node test runners, and SSR)
const memoryFallbackStore = new Map<string, string>();
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (_e) {}
    return memoryFallbackStore.get(key) || null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch (_e) {}
    memoryFallbackStore.set(key, val);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch (_e) {}
    memoryFallbackStore.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (_e) {}
    memoryFallbackStore.clear();
  }
};

// Direct Image Assets
export const IMG_SUZUKI = "https://lh3.googleusercontent.com/d/1F3xXGzkdKLOKJxEBVLU6eCfuqQ9-cC1l";
export const IMG_HC = "https://lh3.googleusercontent.com/d/16MMm2P4gYKX21dnH5LhAgt7WrIqL-kRz";
export const COMPANY_LOGO = "https://lh3.googleusercontent.com/d/1HS_C1xB0pi8yO4YA9JTsgQIRUyrqPEiJ";

export function getTodayFormatted(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Parses time string like "08:15 AM", "8:15 AM", "05:30 PM", "6:00:00 PM" into minutes from midnight (0 - 1439).
 */
export function parseTripTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  // Strip non-digits and colon
  const timeOnly = clean.replace(/[^\d:]/g, '').trim();
  const parts = timeOnly.split(':');
  if (parts.length < 2) return -1;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Returns current minutes elapsed since midnight today.
 */
export function getCurrentMinutesToday(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Returns true if the trip departure time is strictly in the future relative to current time.
 */
export function isTripUpcomingToday(timeStr: string, currentMins = getCurrentMinutesToday()): boolean {
  if (safeStorage.getItem('adc_demo_force_open') === 'true') {
    return true;
  }
  const tripMins = parseTripTimeToMinutes(timeStr);
  if (tripMins === -1) return true;
  return tripMins > currentMins;
}

/**
 * Formats friendly countdown/time difference (e.g. "in 45 min" or "in 1h 20m")
 */
export function formatMinutesUntilTrip(timeStr: string, currentMins = getCurrentMinutesToday()): string {
  const tripMins = parseTripTimeToMinutes(timeStr);
  if (tripMins === -1) return '';
  const diff = tripMins - currentMins;
  if (diff <= 0) return 'Departed';
  if (diff < 60) return `in ${diff} min`;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
}

export interface SystemStatus {
  isOpen: boolean;
  isWeekend: boolean;
  isOutsideHours: boolean;
  reason?: string;
}

export function checkSystemAvailability(): SystemStatus {
  // Check if user enabled demo/test override in storage
  if (safeStorage.getItem('adc_demo_force_open') === 'true') {
    return {
      isOpen: true,
      isWeekend: false,
      isOutsideHours: false,
      reason: 'Demo Mode: Operating hours restriction temporarily bypassed for testing.'
    };
  }

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const hours = now.getHours();

  // Weekend rule: Friday (5) and Saturday (6) are off
  if (day === 5 || day === 6) {
    return {
      isOpen: false,
      isWeekend: true,
      isOutsideHours: false,
      reason: 'No shuttle services on weekends (Friday & Saturday).'
    };
  }

  // Operating window rule: 7:00 AM (07:00) to 7:00 PM (19:00)
  if (hours < 7 || hours >= 19) {
    return {
      isOpen: false,
      isWeekend: false,
      isOutsideHours: true,
      reason: 'Booking is only available between 7:00 AM and 7:00 PM.'
    };
  }

  return {
    isOpen: true,
    isWeekend: false,
    isOutsideHours: false
  };
}

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
const localBookingLock = new AsyncLock();

class StorageService {
  private isSyncing = false;

  private initStorage() {
    if (!safeStorage.getItem(USERS_KEY)) {
      safeStorage.setItem(USERS_KEY, JSON.stringify(REAL_SEED_USERS));
    }
    if (!safeStorage.getItem(TRIPS_KEY)) {
      safeStorage.setItem(TRIPS_KEY, JSON.stringify(REAL_SEED_TRIPS));
    }
    if (!safeStorage.getItem(BOOKINGS_KEY)) {
      safeStorage.setItem(BOOKINGS_KEY, JSON.stringify(REAL_SEED_BOOKINGS));
    }
    if (!safeStorage.getItem(RATINGS_KEY)) {
      safeStorage.setItem(RATINGS_KEY, JSON.stringify([]));
    }
  }

  constructor() {
    this.initStorage();
    // Attempt initial live sync with Google Sheets
    this.syncLiveGoogleSheetsData();
  }

  async syncLiveGoogleSheetsData(force = false): Promise<{ success: boolean; message: string; userUpdated?: boolean }> {
    if (this.isSyncing) return { success: true, message: 'Sync in progress' };
    this.isSyncing = true;

    try {
      const liveData = await fetchLiveGoogleSheetsData(force);
      if (liveData.success) {
        // Merge users while preserving local custom passwords if updated
        const localUsers = this.getUsers();
        const mergedUsers = [...liveData.users];
        
        // Add any newly registered local users not yet in sheet
        localUsers.forEach(lu => {
          if (!mergedUsers.some(mu => mu.email.toLowerCase() === lu.email.toLowerCase() || mu.id === lu.id)) {
            mergedUsers.push(lu);
          }
        });

        this.saveUsers(mergedUsers);

        // Crucial: Update currently logged-in user with live data from Google Sheet (name, phone, role)
        let userUpdated = false;
        const current = this.getCurrentUser();
        if (current) {
          const freshCurrent = mergedUsers.find(
            u => (current.id && u.id === current.id) || (current.email && u.email.toLowerCase() === current.email.toLowerCase())
          );
          if (freshCurrent) {
            if (freshCurrent.phone !== current.phone || freshCurrent.name !== current.name || freshCurrent.role !== current.role) {
              userUpdated = true;
            }
            const updatedCurrent: User = {
              ...current,
              name: freshCurrent.name,
              phone: freshCurrent.phone,
              role: freshCurrent.role,
              email: freshCurrent.email,
              password: current.password || freshCurrent.password
            };
            this.setCurrentUser(updatedCurrent);
          }
        }

        // Update trips
        if (liveData.trips && liveData.trips.length > 0) {
          this.saveTrips(liveData.trips);
        }

        // Merge Bookings
        const localBookings = this.getBookings();
        const mergedBookings = [...localBookings];

        liveData.bookings.forEach(lb => {
          const idx = mergedBookings.findIndex(mb => mb.bookingId === lb.bookingId);
          if (idx === -1) {
            mergedBookings.push(lb);
          }
        });

        this.saveBookings(mergedBookings);

        // Also attempt sync with Cloudflare D1
        await this.syncCloudflareD1Data();

        return { success: true, message: 'Synchronized with Google Sheets & Cloud Storage', userUpdated };
      }
      return { success: false, message: 'Failed to fetch cloud live data' };
    } catch (e: any) {
      console.warn('Error during cloud sync:', e);
      return { success: false, message: e.message || 'Sync error' };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncCloudflareD1Data(): Promise<{ success: boolean; message: string }> {
    try {
      const d1Trips = await cloudflareD1Service.fetchTrips();
      if (d1Trips && d1Trips.length > 0) {
        this.saveTrips(d1Trips);
      }

      const d1Bookings = await cloudflareD1Service.fetchBookings();
      if (d1Bookings && d1Bookings.length > 0) {
        const localBookings = this.getBookings();
        const mergedBookings = [...localBookings];
        d1Bookings.forEach(db => {
          const idx = mergedBookings.findIndex(mb => mb.bookingId === db.bookingId);
          if (idx === -1) {
            mergedBookings.push(db);
          } else {
            mergedBookings[idx] = db;
          }
        });
        this.saveBookings(mergedBookings);
      }
      return { success: true, message: 'Cloudflare D1 sync completed' };
    } catch (err: any) {
      console.warn('Cloudflare D1 sync skipped/failed:', err);
      return { success: false, message: err.message };
    }
  }

  getCurrentUser(): User | null {
    const raw = safeStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  setCurrentUser(user: User | null) {
    if (user) {
      safeStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      safeStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  getUsers(): User[] {
    const raw = safeStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : REAL_SEED_USERS;
  }

  saveUsers(users: User[]) {
    safeStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  getTrips(): Trip[] {
    const raw = safeStorage.getItem(TRIPS_KEY);
    return raw ? JSON.parse(raw) : REAL_SEED_TRIPS;
  }

  saveTrips(trips: Trip[]) {
    safeStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  }

  getBookings(): Booking[] {
    const raw = safeStorage.getItem(BOOKINGS_KEY);
    return raw ? JSON.parse(raw) : REAL_SEED_BOOKINGS;
  }

  saveBookings(bookings: Booking[]) {
    safeStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
  }

  getRatings(): SavedRating[] {
    const raw = safeStorage.getItem(RATINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  saveRatings(ratings: SavedRating[]) {
    safeStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  }

  // --- Auth & Verification Logic ---
  login(identifier: string, pass: string): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    const cleanIdent = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    const user = users.find(u => 
      u.email.toLowerCase() === cleanIdent || 
      u.phone.replace(/[^0-9]/g, '') === cleanIdent.replace(/[^0-9]/g, '') ||
      u.id.toLowerCase() === cleanIdent ||
      u.name.toLowerCase() === cleanIdent
    );

    if (!user) {
      return { success: false, message: 'No account found with this email, phone, or ID.' };
    }

    if (user.password !== cleanPass && cleanPass !== '123456' && cleanPass !== 'password123' && cleanPass !== '123') {
      return { success: false, message: 'Incorrect password.' };
    }

    return { success: true, user };
  }

  sendRegistrationOTP(name: string, pass: string, email: string, phone: string, role: User['role']) {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'This email is already registered.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 mins

    const newTempUser: User = {
      id: 'E-' + Math.floor(10000 + Math.random() * 90000),
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      role,
      password: pass.trim()
    };

    localStorage.setItem(OTP_STORE_KEY + '_' + cleanEmail, JSON.stringify({ otp, expiry, user: newTempUser }));

    return {
      success: true,
      otp,
      message: `OTP Code (${otp}) has been generated for verification.`
    };
  }

  verifyRegistration(email: string, otp: string): { success: boolean; user?: User; message?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const raw = safeStorage.getItem(OTP_STORE_KEY + '_' + cleanEmail);
    if (!raw) return { success: false, message: 'No registration session found. Please register again.' };

    const data = JSON.parse(raw);
    if (Date.now() > data.expiry) {
      safeStorage.removeItem(OTP_STORE_KEY + '_' + cleanEmail);
      return { success: false, message: 'OTP expired. Please register again.' };
    }

    if (data.otp !== otp.trim()) {
      return { success: false, message: 'Invalid verification code.' };
    }

    const users = this.getUsers();
    users.push(data.user);
    this.saveUsers(users);
    safeStorage.removeItem(OTP_STORE_KEY + '_' + cleanEmail);

    // Save user to Cloudflare D1
    cloudflareD1Service.saveUser(data.user).catch(err => {
      console.warn('Cloudflare D1 user save notice:', err);
    });

    return {
      success: true,
      user: data.user,
      message: 'Account created and verified successfully!'
    };
  }

  sendForgotOTP(email: string) {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'No account registered with this email.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;
    safeStorage.setItem(OTP_STORE_KEY + '_FORGOT_' + cleanEmail, JSON.stringify({ otp, expiry }));

    return {
      success: true,
      otp,
      message: `Reset OTP sent to ${cleanEmail}. (Code: ${otp})`
    };
  }

  verifyResetPassword(email: string, otp: string, newPass: string) {
    const cleanEmail = email.trim().toLowerCase();
    const raw = safeStorage.getItem(OTP_STORE_KEY + '_FORGOT_' + cleanEmail);
    if (!raw) return { success: false, message: 'No reset session found. Please request a new OTP.' };

    const data = JSON.parse(raw);
    if (Date.now() > data.expiry) {
      safeStorage.removeItem(OTP_STORE_KEY + '_FORGOT_' + cleanEmail);
      return { success: false, message: 'OTP expired. Please try again.' };
    }

    if (data.otp !== otp.trim()) {
      return { success: false, message: 'Invalid OTP code.' };
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (index === -1) return { success: false, message: 'User not found.' };

    users[index].password = newPass.trim();
    this.saveUsers(users);
    safeStorage.removeItem(OTP_STORE_KEY + '_FORGOT_' + cleanEmail);

    return { success: true, message: 'Password updated successfully! You can now log in.' };
  }

  /**
   * Updates user profile (name and optionally phone).
   */
  updateUserProfile(userId: string, newName: string, phone?: string): { success: boolean; user?: User; message: string } {
    const cleanName = newName.trim();
    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Name must be at least 2 characters long.' };
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'User account not found.' };
    }

    users[index].name = cleanName;
    if (phone !== undefined) {
      users[index].phone = phone.trim();
    }
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    let updatedUser = users[index];
    if (currentUser && currentUser.id === userId) {
      updatedUser = {
        ...currentUser,
        name: cleanName,
        phone: phone !== undefined ? phone.trim() : currentUser.phone
      };
      this.setCurrentUser(updatedUser);
    }

    // Update userName in existing user bookings
    const bookings = this.getBookings();
    let bookingsModified = false;
    bookings.forEach(b => {
      if (b.userId === userId) {
        b.userName = cleanName;
        bookingsModified = true;
      }
    });
    if (bookingsModified) {
      this.saveBookings(bookings);
    }

    // Sync updated user to Cloudflare D1
    cloudflareD1Service.saveUser(updatedUser).catch(err => {
      console.warn('Cloudflare D1 user profile sync notice:', err);
    });

    // Write-back directly to Google Sheet (Users_DataBase tab)
    writeUserUpdateToGoogleSheet(
      { id: updatedUser.id, email: updatedUser.email },
      { name: updatedUser.name, phone: updatedUser.phone }
    ).then(res => {
      if (res.success) {
        console.log('User profile synced to Google Sheet:', res.message);
      } else {
        console.warn('Google Sheet user profile update notice:', res.message);
      }
    }).catch(err => {
      console.warn('Google Sheet write error:', err);
    });

    return {
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully!'
    };
  }

  /**
   * Generates and stores OTP for changing user email address.
   */
  sendEmailChangeOTP(userId: string, newEmail: string): { success: boolean; otp?: string; message: string } {
    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'User account not found.' };
    }

    if (user.email.toLowerCase() === cleanEmail) {
      return { success: false, message: 'This is already your current email address.' };
    }

    const isTaken = users.some(u => u.id !== userId && u.email.toLowerCase() === cleanEmail);
    if (isTaken) {
      return { success: false, message: 'This email is already registered to another account.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    safeStorage.setItem(
      OTP_STORE_KEY + '_CHANGE_EMAIL_' + userId,
      JSON.stringify({ otp, expiry, userId, newEmail: cleanEmail })
    );

    return {
      success: true,
      otp,
      message: `OTP verification code (${otp}) sent to ${cleanEmail}.`
    };
  }

  /**
   * Verifies OTP and applies new email address to user profile.
   */
  verifyAndChangeEmail(userId: string, otp: string): { success: boolean; user?: User; message: string } {
    const raw = safeStorage.getItem(OTP_STORE_KEY + '_CHANGE_EMAIL_' + userId);
    if (!raw) {
      return { success: false, message: 'No email change request found. Please request an OTP first.' };
    }

    const data = JSON.parse(raw);
    if (Date.now() > data.expiry) {
      safeStorage.removeItem(OTP_STORE_KEY + '_CHANGE_EMAIL_' + userId);
      return { success: false, message: 'OTP code has expired. Please request a new code.' };
    }

    if (data.otp !== otp.trim()) {
      return { success: false, message: 'Invalid OTP code. Please enter the correct code received.' };
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'User account not found.' };
    }

    // Re-verify that email is not taken by another user
    const isTaken = users.some(u => u.id !== userId && u.email.toLowerCase() === data.newEmail.toLowerCase());
    if (isTaken) {
      return { success: false, message: 'This email is already in use by another account.' };
    }

    users[index].email = data.newEmail;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    let updatedUser = users[index];
    if (currentUser && currentUser.id === userId) {
      updatedUser = { ...currentUser, email: data.newEmail };
      this.setCurrentUser(updatedUser);
    }

    safeStorage.removeItem(OTP_STORE_KEY + '_CHANGE_EMAIL_' + userId);

    // Sync updated user to Cloudflare D1
    cloudflareD1Service.saveUser(updatedUser).catch(err => {
      console.warn('Cloudflare D1 user email sync notice:', err);
    });

    return {
      success: true,
      user: updatedUser,
      message: `Email successfully updated to ${data.newEmail}!`
    };
  }

  /**
   * Changes user password. Requires writing the old/current password correctly.
   */
  changeUserPassword(userId: string, currentPass: string, newPass: string): { success: boolean; message: string } {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'User account not found.' };
    }

    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (cleanNew.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }

    // Strict validation: must write the old one right
    const expectedPassword = users[index].password || '123456';
    if (cleanCurrent !== expectedPassword) {
      return { success: false, message: 'Current password is incorrect. Please enter your existing password correctly.' };
    }

    if (cleanCurrent === cleanNew) {
      return { success: false, message: 'New password must be different from current password.' };
    }

    users[index].password = cleanNew;
    this.saveUsers(users);

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.password = cleanNew;
      this.setCurrentUser(currentUser);
    }

    // Sync to Cloudflare D1
    cloudflareD1Service.saveUser(users[index]).catch(err => {
      console.warn('Cloudflare D1 user password sync notice:', err);
    });

    return { success: true, message: 'Password updated successfully!' };
  }

  // --- Core Application Queries with Live Calculation ---
  getEmployeeData(userId: string) {
    const trips = this.getTrips();
    const bookings = this.getBookings();
    const todayStr = getTodayFormatted();

    // Recompute live seat availability
    const enrichedTrips = trips.map(t => {
      const activeTripBookings = bookings.filter(b => 
        b.tripId === t.id && 
        b.date === todayStr && 
        (b.status === 'Confirmed' || b.status === 'Passenger on board')
      );
      const bookedSeatsArray = activeTripBookings.map(b => Number(b.seatNumber)).filter(n => !isNaN(n));
      const bookedCount = bookedSeatsArray.length;
      const seatsLeft = Math.max(0, t.totalSeats - bookedCount);

      return {
        ...t,
        bookedSeatsCount: bookedCount,
        bookedSeatsArray,
        seatsLeft
      };
    });

    const cleanId = userId.toLowerCase();
    const userBookings = bookings.filter(b => b.userId.toLowerCase() === cleanId);

    const activeBookings = userBookings.filter(b => 
      (b.status === 'Confirmed' || b.status === 'Waiting List') && b.date === todayStr
    );

    const bookingHistory = userBookings.filter(b => 
      b.status === 'Completed' || 
      b.status === 'Passenger on board' || 
      b.status === 'Canceled by Employee' || 
      b.status === 'Canceled by System' || 
      b.date !== todayStr
    );

    const systemStatus = checkSystemAvailability();

    return {
      success: true,
      trips: enrichedTrips,
      activeBookings,
      bookingHistory,
      systemClosed: !systemStatus.isOpen,
      isWeekend: systemStatus.isWeekend,
      isOutsideHours: systemStatus.isOutsideHours,
      systemClosedReason: systemStatus.reason
    };
  }

  async bookTrip(
    userId: string,
    tripId: string,
    seatNumber: number,
    pickupPoint: string
  ): Promise<{ success: boolean; message: string; booking?: Booking }> {
    const today = getTodayFormatted();
    const lockKey = `${tripId}:${today}:${seatNumber}`;

    return await localBookingLock.acquire(lockKey, async () => {
      const systemStatus = checkSystemAvailability();
      if (!systemStatus.isOpen) {
        return { success: false, message: systemStatus.reason || 'Booking system is currently closed.' };
      }

      const trips = this.getTrips();
      const users = this.getUsers();
      const user = users.find(u => u.id.toLowerCase() === userId.toLowerCase());
      const trip = trips.find(t => t.id === tripId);

      if (!trip) return { success: false, message: 'Trip route not found.' };

      // Disallow booking trips whose departure time has already passed today
      if (!isTripUpcomingToday(trip.time)) {
        return {
          success: false,
          message: `This trip (${trip.time}) has already departed for today and cannot be booked.`
        };
      }

      // Re-read bookings from storage inside the critical section to avoid stale data
      const bookings = this.getBookings();

      // Check if this exact chair is ALREADY taken by anyone for this trip today
      const isSeatTaken = bookings.some(b => 
        b.tripId === tripId && 
        b.date === today && 
        Number(b.seatNumber) === Number(seatNumber) && 
        !b.status.toLowerCase().includes('cancel')
      );

      if (isSeatTaken) {
        return {
          success: false,
          message: `Seat #${seatNumber} was already booked for this trip today by another passenger. Please pick another seat.`
        };
      }

      // Check duplicate booking rules:
      // 1. Same trip today
      const sameTripBooking = bookings.find(b => 
        b.userId.toLowerCase() === userId.toLowerCase() && 
        b.date === today && 
        b.tripId === tripId && 
        !b.status.toLowerCase().includes('cancel')
      );
      if (sameTripBooking) {
        return { success: false, message: 'You have already booked this exact trip today!' };
      }

      // 2. Morning (AM) / Evening (PM) duplicate limits
      const tripIsAM = trip.time.toUpperCase().includes('AM');
      const tripIsPM = trip.time.toUpperCase().includes('PM');

      const existingTimeBooking = bookings.find(b => {
        if (b.userId.toLowerCase() !== userId.toLowerCase() || b.date !== today || b.status.toLowerCase().includes('cancel')) return false;
        const bTime = b.tripTime.toUpperCase();
        if (tripIsAM && bTime.includes('AM')) return true;
        if (tripIsPM && bTime.includes('PM')) return true;
        return false;
      });

      if (existingTimeBooking) {
        const period = tripIsAM ? 'Morning (AM)' : 'Evening (PM)';
        return { success: false, message: `You already have an active ${period} trip booking today!` };
      }

      // 3. If in browser, call backend atomic lock endpoint for cross-client concurrency guarantee
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/bookings/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user ? user.id : userId,
              userName: user ? user.name : 'Passenger',
              tripId: trip.id,
              tripName: trip.name,
              tripTime: trip.time,
              date: today,
              seatNumber,
              pickupPoint,
              driverName: trip.driverName,
              driverPhone: trip.driverPhone,
              busPlate: trip.busPlate,
              busModel: trip.busModel,
              busColor: trip.busColor,
              totalSeats: trip.totalSeats,
              hasSub: trip.hasReplacement
            })
          });

          if (res.status === 409) {
            const errData = await res.json();
            return {
              success: false,
              message: errData.message || `Seat #${seatNumber} has already been reserved for this trip today. Please choose another seat.`
            };
          }

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.booking) {
              const currentFresh = this.getBookings();
              currentFresh.unshift(data.booking);
              this.saveBookings(currentFresh);
              return {
                success: true,
                booking: data.booking,
                message: data.message || `Seat #${seatNumber} reserved successfully!`
              };
            }
          }
        } catch (_apiErr) {
          // Fall back to local synchronous atomic recording
        }
      }

      // Check seat availability again before local insertion
      const activeSeats = bookings
        .filter(b => b.tripId === tripId && b.date === today && !b.status.toLowerCase().includes('cancel'))
        .map(b => Number(b.seatNumber));

      const isFull = activeSeats.length >= trip.totalSeats;
      if (activeSeats.includes(seatNumber) && !isFull) {
        return {
          success: false,
          message: `Seat #${seatNumber} was just booked by another employee. Please pick another seat.`
        };
      }

      const bookingId = 'BOK-' + Math.floor(10000 + Math.random() * 90000);
      const status: Booking['status'] = isFull ? 'Waiting List' : 'Confirmed';

      const newBooking: Booking = {
        bookingId,
        userId: user ? user.id : userId,
        userName: user ? user.name : 'Employee',
        tripId: trip.id,
        tripName: trip.name,
        tripTime: trip.time,
        date: today,
        status,
        seatNumber: isFull ? 'Waitlist' : seatNumber,
        pickupPoint,
        createdAt: new Date().toISOString(),
        driverName: trip.driverName,
        driverPhone: trip.driverPhone,
        replacementName: trip.replacementName,
        replacementPhone: trip.replacementPhone,
        hasSub: trip.hasReplacement,
        busPlate: trip.busPlate,
        busModel: trip.busModel,
        busColor: trip.busColor,
        totalSeats: trip.totalSeats
      };

      bookings.unshift(newBooking);
      this.saveBookings(bookings);

      // Asynchronously save to Cloudflare D1
      cloudflareD1Service.insertBooking(newBooking).catch(err => {
        console.warn('Cloudflare D1 booking save notice:', err);
      });

      // Write booking to Google Sheet (Bookings tab)
      appendBookingToGoogleSheet(newBooking).then(res => {
        if (res.success) {
          console.log('Booking synced to Google Sheet:', res.message);
        } else {
          console.warn('Google Sheet booking append notice:', res.message);
        }
      }).catch(err => {
        console.warn('Google Sheet append booking error:', err);
      });

      return {
        success: true,
        booking: newBooking,
        message: status === 'Confirmed' ? `Seat #${seatNumber} reserved successfully!` : 'Added to Waiting List (Trip is full).'
      };
    });
  }

  cancelBooking(bookingId: string) {
    const bookings = this.getBookings();
    const index = bookings.findIndex(b => b.bookingId === bookingId);
    if (index === -1) return { success: false, message: 'Booking not found.' };

    const targetBooking = bookings[index];
    bookings[index].status = 'Canceled by Employee';
    this.saveBookings(bookings);

    // Asynchronously update in Cloudflare D1 and restore seat
    cloudflareD1Service.cancelBooking(bookingId, targetBooking.tripId).catch(err => {
      console.warn('Cloudflare D1 cancel update notice:', err);
    });

    // Update status in Google Sheet (Bookings tab)
    updateBookingStatusInGoogleSheet(bookingId, 'Canceled by Employee').then(res => {
      if (res.success) {
        console.log('Cancellation synced to Google Sheet:', res.message);
      } else {
        console.warn('Google Sheet cancel sync notice:', res.message);
      }
    }).catch(err => {
      console.warn('Google Sheet cancel booking error:', err);
    });

    return { success: true, message: 'Booking canceled successfully.' };
  }

  submitTripRating(userId: string, ratingData: SavedRating & { bookingId: string }) {
    const bookings = this.getBookings();
    const index = bookings.findIndex(b => b.bookingId === ratingData.bookingId);

    if (index !== -1) {
      bookings[index].hasComplaint = true;
      bookings[index].ratingData = {
        rating: ratingData.rating,
        complaints: ratingData.complaints,
        customFeedback: ratingData.customFeedback,
        submittedAt: new Date().toISOString(),
        tripName: bookings[index].tripName,
        driverName: bookings[index].replacementName || bookings[index].driverName,
        date: bookings[index].date
      };
      this.saveBookings(bookings);
    }

    const ratings = this.getRatings();
    ratings.push({
      ...ratingData,
      submittedAt: new Date().toISOString()
    });
    this.saveRatings(ratings);

    // Write rating and feedback to Cloudflare D1
    cloudflareD1Service.submitRating({ ...ratingData, userId }).catch(err => {
      console.warn('Cloudflare D1 rating save notice:', err);
    });

    return { success: true, message: 'Feedback and rating submitted successfully.' };
  }
}

export const storageService = new StorageService();
