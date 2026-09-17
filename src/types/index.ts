export type UserRole = 'Employee' | 'Driver' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
}

export interface Trip {
  id: string;
  name: string; // e.g. "Hyper Bus", "Juhayna Bus"
  time: string; // e.g. "08:00 AM"
  rawTime?: string;
  totalSeats: number; // 7 for Suzuki, 13 for HC High Ace
  seatsLeft: number;
  bookedSeatsCount: number;
  bookedSeatsArray: number[];
  driverName: string;
  driverPhone: string;
  replacementName?: string;
  replacementPhone?: string;
  mainPickPoint: string;
  busModel: string; // "Suzuki" | "HC High Ace"
  busColor: string;
  busPlate: string;
  hasReplacement?: boolean;
}

export type BookingStatus =
  | 'Confirmed'
  | 'Waiting List'
  | 'Passenger on board'
  | 'Completed'
  | 'Canceled by Employee'
  | 'Canceled by System';

export interface Booking {
  bookingId: string;
  userId: string;
  userName?: string;
  tripId: string;
  tripName: string;
  tripTime: string;
  date: string;
  status: BookingStatus;
  seatNumber: number | string;
  pickupPoint: string;
  createdAt?: string;
  driverName?: string;
  driverPhone?: string;
  replacementName?: string;
  replacementPhone?: string;
  hasSub?: boolean;
  busPlate?: string;
  busModel?: string;
  busColor?: string;
  totalSeats?: number;
  hasComplaint?: boolean;
  ratingData?: SavedRating;
}

export interface SavedRating {
  rating: number;
  complaints: string[];
  customFeedback?: string;
  submittedAt?: string;
  bookingId?: string;
  userId?: string;
  tripName?: string;
  driverName?: string;
  date?: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}
