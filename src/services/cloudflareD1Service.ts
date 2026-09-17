import { Trip, User, Booking, SavedRating } from '../types';

export const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: 'e751dfa4e122383d061223cfe068cdb1',
  DATABASE_ID: '32fb3a8c-abd2-4c8f-a65c-84425b098c0a',
  DATABASE_NAME: 'adc_shuttle_d1',
  STUDIO_URL: 'https://dash.cloudflare.com/e751dfa4e122383d061223cfe068cdb1/workers/d1/databases/32fb3a8c-abd2-4c8f-a65c-84425b098c0a/studio',
  API_BASE: 'https://api.cloudflare.com/client/v4/accounts/e751dfa4e122383d061223cfe068cdb1/d1/database/32fb3a8c-abd2-4c8f-a65c-84425b098c0a'
};

export interface D1QueryResult<T = any> {
  success: boolean;
  result?: Array<{
    results: T[];
    success: boolean;
    meta?: any;
  }>;
  errors?: any[];
  messages?: any[];
  error?: string;
  needToken?: boolean;
}

export interface D1StatusResponse {
  connected: boolean;
  hasToken: boolean;
  accountId: string;
  databaseId: string;
  message: string;
}

class CloudflareD1Service {
  private apiToken: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('adc_cloudflare_d1_token') || '';
      this.apiToken = storedToken;
    }
  }

  getApiToken(): string {
    return this.apiToken;
  }

  setApiToken(token: string) {
    this.apiToken = token.trim();
    if (typeof window !== 'undefined') {
      if (this.apiToken) {
        localStorage.setItem('adc_cloudflare_d1_token', this.apiToken);
      } else {
        localStorage.removeItem('adc_cloudflare_d1_token');
      }
    }
  }

  getStudioUrl(): string {
    return CLOUDFLARE_CONFIG.STUDIO_URL;
  }

  getDatabaseInfo() {
    return {
      accountId: CLOUDFLARE_CONFIG.ACCOUNT_ID,
      databaseId: CLOUDFLARE_CONFIG.DATABASE_ID,
      databaseName: CLOUDFLARE_CONFIG.DATABASE_NAME,
      studioUrl: CLOUDFLARE_CONFIG.STUDIO_URL,
      hasToken: Boolean(this.apiToken)
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiToken) {
      headers['x-d1-token'] = this.apiToken;
    }
    return headers;
  }

  /**
   * Check connection status to Cloudflare D1
   */
  async checkStatus(): Promise<D1StatusResponse> {
    try {
      const res = await fetch('/api/d1/status', {
        headers: this.getHeaders()
      });
      if (!res.ok) {
        return {
          connected: false,
          hasToken: Boolean(this.apiToken),
          accountId: CLOUDFLARE_CONFIG.ACCOUNT_ID,
          databaseId: CLOUDFLARE_CONFIG.DATABASE_ID,
          message: `Server returned HTTP ${res.status}`
        };
      }
      return await res.json();
    } catch (err: any) {
      return {
        connected: false,
        hasToken: Boolean(this.apiToken),
        accountId: CLOUDFLARE_CONFIG.ACCOUNT_ID,
        databaseId: CLOUDFLARE_CONFIG.DATABASE_ID,
        message: err.message || 'Cannot reach API backend'
      };
    }
  }

  /**
   * Initialize tables in Cloudflare D1
   */
  async initSchema(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/d1/init', {
        method: 'POST',
        headers: this.getHeaders()
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to initialize D1 schema' };
    }
  }

  /**
   * Execute SQL query via secure server proxy to Cloudflare D1
   */
  async executeQuery<T = any>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
    try {
      const response = await fetch('/api/d1/query', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ sql, params })
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          errors: [{ message: `HTTP ${response.status}: ${errText}` }]
        };
      }

      return await response.json();
    } catch (err: any) {
      console.warn('Cloudflare D1 Query error:', err);
      return {
        success: false,
        errors: [{ message: err.message || 'Network error executing D1 query' }]
      };
    }
  }

  private getApiUrl(endpoint: string): string {
    if (typeof window !== 'undefined' && window.location) {
      return endpoint;
    }
    return `http://127.0.0.1:3000${endpoint}`;
  }

  /**
   * Read Trips from Cloudflare D1
   */
  async fetchTrips(): Promise<Trip[] | null> {
    try {
      const res = await fetch(this.getApiUrl('/api/d1/trips'), {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.trips) && data.trips.length > 0) {
        return data.trips.map((row: any) => {
          let pickupPoints: string[] = [];
          try {
            pickupPoints = JSON.parse(row.pickup_points || '[]');
          } catch {
            pickupPoints = (row.pickup_points || '').split(',').map((s: string) => s.trim()).filter(Boolean);
          }

          const totalSeats = Number(row.total_seats) || 7;
          const availableSeats = Number(row.available_seats) || totalSeats;

          return {
            id: row.id,
            name: row.name,
            time: row.time,
            rawTime: row.time,
            totalSeats,
            seatsLeft: availableSeats,
            bookedSeatsCount: Math.max(0, totalSeats - availableSeats),
            bookedSeatsArray: [],
            mainPickPoint: pickupPoints[0] || 'Main Station',
            driverName: row.driver_name || 'Captain',
            driverPhone: row.driver_phone || '',
            replacementName: row.replacement_name || '',
            replacementPhone: row.replacement_phone || '',
            hasReplacement: Boolean(row.has_replacement),
            busModel: row.bus_model || row.bus_type || 'Suzuki',
            busColor: row.bus_color || 'White',
            busPlate: row.bus_plate || 'ADC-01'
          } as Trip;
        });
      }
      return null;
    } catch (err) {
      console.warn('Error fetching trips from D1:', err);
      return null;
    }
  }

  /**
   * Read Bookings from Cloudflare D1
   */
  async fetchBookings(userId?: string): Promise<Booking[] | null> {
    try {
      const url = userId ? this.getApiUrl(`/api/d1/bookings?userId=${encodeURIComponent(userId)}`) : this.getApiUrl('/api/d1/bookings');
      const res = await fetch(url, {
        headers: this.getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && Array.isArray(data.bookings)) {
        return data.bookings.map((row: any) => ({
          bookingId: row.booking_id,
          userId: row.user_id,
          userName: row.user_name,
          tripId: row.trip_id,
          tripName: row.trip_name,
          tripTime: row.trip_time,
          date: row.date,
          seatNumber: isNaN(Number(row.seat_number)) ? row.seat_number : Number(row.seat_number),
          pickupPoint: row.pickup_point,
          status: row.status,
          driverName: row.driver_name,
          driverPhone: row.driver_phone,
          busPlate: row.bus_plate,
          createdAt: row.created_at
        } as Booking));
      }
      return null;
    } catch (err) {
      console.warn('Error fetching bookings from D1:', err);
      return null;
    }
  }

  /**
   * Write / Insert Booking into Cloudflare D1
   */
  async insertBooking(booking: Booking): Promise<boolean> {
    try {
      const res = await fetch(this.getApiUrl('/api/d1/bookings'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(booking)
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.warn('Error writing booking to D1:', err);
      return false;
    }
  }

  /**
   * Cancel Booking in Cloudflare D1
   */
  async cancelBooking(bookingId: string, tripId?: string): Promise<boolean> {
    try {
      const res = await fetch(this.getApiUrl('/api/d1/cancel-booking'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ bookingId, tripId })
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.warn('Error cancelling booking in D1:', err);
      return false;
    }
  }

  /**
   * Write Feedback / Rating into Cloudflare D1
   */
  async submitRating(ratingData: SavedRating & { bookingId: string }): Promise<boolean> {
    try {
      const res = await fetch(this.getApiUrl('/api/d1/ratings'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          bookingId: ratingData.bookingId,
          userId: ratingData.userId,
          rating: ratingData.rating,
          complaints: ratingData.complaints,
          customFeedback: ratingData.customFeedback
        })
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.warn('Error writing rating to D1:', err);
      return false;
    }
  }

  /**
   * Write User into Cloudflare D1
   */
  async saveUser(user: User): Promise<boolean> {
    try {
      const res = await fetch(this.getApiUrl('/api/d1/users'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(user)
      });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.warn('Error saving user to D1:', err);
      return false;
    }
  }
}

export const cloudflareD1Service = new CloudflareD1Service();
