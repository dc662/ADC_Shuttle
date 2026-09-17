import { getAccessToken } from './googleAuthService';
import { GOOGLE_SPREADSHEET_ID } from './googleSheetsService';
import { Booking } from '../types';

export interface SheetUserRow {
  rowIndex: number;
  userId: string;
  userName: string;
  password?: string;
  email: string;
  role: string;
  phone: string;
  rememberMe?: string;
}

/**
 * Directly writes an updated phone number (and/or name) for a user to the live Google Sheet
 * in the 'Users_DataBase' tab.
 */
export async function writeUserUpdateToGoogleSheet(
  userIdentifier: { id?: string; email?: string },
  updates: { name?: string; phone?: string; password?: string }
): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      message: 'Google authorization required. Please connect with Google first.'
    };
  }

  try {
    // 1. Fetch current rows in Users_DataBase to locate the user's exact row number
    const range = encodeURIComponent('Users_DataBase!A1:G1000');
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${range}`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!readRes.ok) {
      const err = await readRes.json().catch(() => ({}));
      return {
        success: false,
        message: err.error?.message || `Failed to read Users_DataBase: ${readRes.statusText}`
      };
    }

    const readData = await readRes.json();
    const rows: string[][] = readData.values || [];
    if (rows.length === 0) {
      return { success: false, message: 'Spreadsheet has no rows.' };
    }

    const header = rows[0].map(h => String(h || '').trim());
    const idColIdx = header.findIndex(h => h.toLowerCase().includes('user_id') || h.toLowerCase() === 'id');
    const nameColIdx = header.findIndex(h => h.toLowerCase().includes('user_name') || h.toLowerCase().includes('name'));
    const passColIdx = header.findIndex(h => h.toLowerCase().includes('password') || h.toLowerCase().includes('pass'));
    const emailColIdx = header.findIndex(h => h.toLowerCase().includes('email'));
    const phoneColIdx = header.findIndex(h => h.toLowerCase().includes('ph') || h.toLowerCase().includes('phone'));
    const roleColIdx = header.findIndex(h => h.toLowerCase().includes('role'));

    const searchId = userIdentifier.id?.trim().toLowerCase();
    const searchEmail = userIdentifier.email?.trim().toLowerCase();

    let targetRowIndex = -1; // 1-based index in Google Sheets
    let existingRow: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowId = idColIdx >= 0 ? String(row[idColIdx] || '').trim().toLowerCase() : '';
      const rowEmail = emailColIdx >= 0 ? String(row[emailColIdx] || '').trim().toLowerCase() : '';

      if ((searchEmail && rowEmail === searchEmail) || (searchId && rowId === searchId)) {
        targetRowIndex = i + 1; // Sheets is 1-indexed
        existingRow = row;
        break;
      }
    }

    if (targetRowIndex > 0) {
      // User found! Update the specific row
      const updatedRow = [...existingRow];
      // Pad out array if necessary
      while (updatedRow.length < 7) updatedRow.push('');

      if (updates.name !== undefined && nameColIdx >= 0) {
        updatedRow[nameColIdx] = updates.name.trim();
      }
      if (updates.phone !== undefined && phoneColIdx >= 0) {
        // Ensure Egyptian phone numbers maintain leading 0 by prepending quote or text
        let cleanPhone = updates.phone.trim();
        if (/^\d{10}$/.test(cleanPhone) && !cleanPhone.startsWith('0')) {
          cleanPhone = '0' + cleanPhone;
        }
        updatedRow[phoneColIdx] = cleanPhone;
      }
      if (updates.password !== undefined && passColIdx >= 0) {
        updatedRow[passColIdx] = updates.password.trim();
      }

      const updateRange = encodeURIComponent(`Users_DataBase!A${targetRowIndex}:G${targetRowIndex}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`;

      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `Users_DataBase!A${targetRowIndex}:G${targetRowIndex}`,
          majorDimension: 'ROWS',
          values: [updatedRow]
        })
      });

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        return {
          success: false,
          message: err.error?.message || `Failed to update sheet row: ${updateRes.statusText}`
        };
      }

      return {
        success: true,
        message: `Google Sheet updated successfully in row #${targetRowIndex}!`
      };
    } else {
      // User not yet in the sheet (e.g. dc@adc-arch.com). Append a new row to Users_DataBase!
      const newRow = [
        userIdentifier.id || `E-${Math.floor(10000 + Math.random() * 90000)}`,
        updates.name || 'ADC Employee',
        updates.password || '123456',
        userIdentifier.email || '',
        'Employee',
        updates.phone || '',
        ''
      ];

      const appendRange = encodeURIComponent('Users_DataBase!A:G');
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

      const appendRes = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Users_DataBase!A:G',
          majorDimension: 'ROWS',
          values: [newRow]
        })
      });

      if (!appendRes.ok) {
        const err = await appendRes.json().catch(() => ({}));
        return {
          success: false,
          message: err.error?.message || `Failed to append new user row: ${appendRes.statusText}`
        };
      }

      return {
        success: true,
        message: 'Your profile has been appended as a new row in Users_DataBase on Google Sheets!'
      };
    }
  } catch (error: any) {
    console.error('writeUserUpdateToGoogleSheet failed:', error);
    return { success: false, message: error.message || 'An error occurred while writing to Google Sheet.' };
  }
}

/**
 * Appends a new reservation directly into the 'Bookings' tab of the Google Sheet.
 */
export async function appendBookingToGoogleSheet(booking: Booking): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      message: 'Google authorization required. Please connect with Google first.'
    };
  }

  try {
    // Columns: Booking_ID, User_ID, Trip_ID, Trip_Date, Status, Created_At, Seats, Pickup_Point
    const newBookingRow = [
      booking.bookingId,
      booking.userId,
      booking.tripId,
      booking.date,
      booking.status,
      booking.createdAt || new Date().toISOString(),
      String(booking.seatNumber),
      booking.pickupPoint
    ];

    const appendRange = encodeURIComponent('Bookings!A:H');
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: 'Bookings!A:H',
        majorDimension: 'ROWS',
        values: [newBookingRow]
      })
    });

    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      return {
        success: false,
        message: err.error?.message || `Failed to append booking to sheet: ${appendRes.statusText}`
      };
    }

    return {
      success: true,
      message: `Booking ${booking.bookingId} written to Google Sheet 'Bookings' tab successfully!`
    };
  } catch (error: any) {
    console.error('appendBookingToGoogleSheet failed:', error);
    return { success: false, message: error.message || 'Failed to write booking to Google Sheet.' };
  }
}

/**
 * Updates a booking status (e.g. 'Canceled by Employee') in the 'Bookings' tab of Google Sheets.
 */
export async function updateBookingStatusInGoogleSheet(
  bookingId: string,
  newStatus: string
): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return {
      success: false,
      message: 'Google authorization required.'
    };
  }

  try {
    const range = encodeURIComponent('Bookings!A1:H1000');
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${range}`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!readRes.ok) return { success: false, message: 'Failed to read Bookings tab' };

    const readData = await readRes.json();
    const rows: string[][] = readData.values || [];
    if (rows.length === 0) return { success: false, message: 'No bookings in sheet' };

    const header = rows[0].map(h => String(h || '').trim().toLowerCase());
    const bookingIdColIdx = header.findIndex(h => h.includes('booking_id') || h === 'id');
    const statusColIdx = header.findIndex(h => h.includes('status'));

    const searchId = bookingId.trim().toLowerCase();
    let targetRowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      const rowId = bookingIdColIdx >= 0 ? String(rows[i][bookingIdColIdx] || '').trim().toLowerCase() : '';
      if (rowId === searchId) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex > 0 && statusColIdx >= 0) {
      // Column letter calculation: 0 = A, 1 = B, 2 = C, 3 = D, 4 = E, etc.
      const colLetter = String.fromCharCode(65 + statusColIdx);
      const cellRange = encodeURIComponent(`Bookings!${colLetter}${targetRowIndex}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SPREADSHEET_ID}/values/${cellRange}?valueInputOption=USER_ENTERED`;

      const updateRes = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `Bookings!${colLetter}${targetRowIndex}`,
          majorDimension: 'ROWS',
          values: [[newStatus]]
        })
      });

      if (!updateRes.ok) {
        return { success: false, message: 'Failed to update booking status in Google Sheet' };
      }

      return { success: true, message: `Booking ${bookingId} status updated to '${newStatus}' in Google Sheet.` };
    }

    return { success: false, message: 'Booking ID not found in sheet to update.' };
  } catch (error: any) {
    console.error('updateBookingStatusInGoogleSheet failed:', error);
    return { success: false, message: error.message };
  }
}
