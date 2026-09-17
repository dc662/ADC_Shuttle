import React, { useState } from 'react';
import { Booking } from '../types';
import { IMG_SUZUKI, IMG_HC } from '../services/storageService';
import { CancelConfirmationModal } from './CancelConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Calendar, Car, XCircle, Star, MessageSquare, AlertCircle, Bell } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface MyTripsTabProps {
  upcomingBookings: Booking[];
  historyBookings: Booking[];
  onOpenVehicleModal: (booking: Booking) => void;
  onOpenComplaintModal: (booking: Booking) => void;
  onCancelBooking: (bookingId: string) => void;
  onSendToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const MyTripsTab: React.FC<MyTripsTabProps> = ({
  upcomingBookings,
  historyBookings,
  onOpenVehicleModal,
  onOpenComplaintModal,
  onCancelBooking,
  onSendToast,
}) => {
  const [subTab, setSubTab] = useState<'upcoming' | 'history'>('upcoming');
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  const handleCancelClick = (b: Booking) => {
    setBookingToCancel(b);
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-6" id="my-trips-container">
      {/* Subtab Switcher */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl">
        <button
          type="button"
          id="btn-subtab-upcoming"
          onClick={() => setSubTab('upcoming')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            subTab === 'upcoming'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Upcoming Rides</span>
          {upcomingBookings.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {upcomingBookings.length}
            </span>
          )}
        </button>

        <button
          type="button"
          id="btn-subtab-history"
          onClick={() => setSubTab('history')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            subTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Trip History</span>
          {historyBookings.length > 0 && (
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {historyBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {subTab === 'upcoming' ? (
          <motion.div
            key="upcoming-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {upcomingBookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Active Reservations</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  You haven't reserved a seat for today yet. Head over to the Reserve tab to book your shuttle ride.
                </p>
              </div>
            ) : (
              upcomingBookings.map((b) => {
                const totalSeats = b.totalSeats || (b.tripName.toLowerCase().includes('hyper') ? 13 : 7);
                const isSuzuki = totalSeats <= 7;
                const vehicleImg = isSuzuki ? IMG_SUZUKI : IMG_HC;
                const vehicleBadge = isSuzuki ? 'Suzuki (7 Seats)' : 'HC (13 Seats)';
                const isWaitlist = b.status === 'Waiting List';

                return (
                  <div
                    key={b.bookingId}
                    id={`booking-card-${b.bookingId}`}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col gap-3 group hover:border-blue-300 transition"
                  >
                    {/* Blue Accent border strip */}
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />

                    <div className="flex items-start gap-3 pl-1.5">
                      {/* Vehicle Thumbnail */}
                      <div className="w-20 h-16 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0">
                        <img
                          src={vehicleImg}
                          alt={vehicleBadge}
                          className="max-h-12 max-w-[70px] object-contain drop-shadow-xs group-hover:scale-105 transition"
                        />
                      </div>

                      {/* Info details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isSuzuki ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {vehicleBadge}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isWaitlist
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div className="font-bold text-sm text-slate-900 mt-1 truncate">
                          {b.tripName}{' '}
                          <span className="text-xs font-normal text-slate-500">({b.tripId})</span>
                        </div>

                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{b.pickupPoint}</span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                          <span>
                            Date: <strong>{b.date}</strong>
                          </span>
                          <span>
                            Time: <strong>{b.tripTime}</strong>
                          </span>
                          {b.seatNumber && b.seatNumber !== 'Waitlist' && (
                            <span className="text-blue-600 font-bold">Seat #{b.seatNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Driver Arrival Alert Bar */}
                    <div className="mx-1 bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-amber-900 block leading-tight">
                            إشعار وصول السائق (Driver Arrival)
                          </span>
                          <span className="text-[10px] text-amber-700 block truncate">
                            {b.driverName || 'احمد جوده'} • {b.pickupPoint}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`btn-notify-arrival-${b.bookingId}`}
                        onClick={() => {
                          notificationService.sendDriverArrivalNotification(
                            b.driverName || 'احمد جوده',
                            b.pickupPoint,
                            b.busModel || 'الباص',
                            b.busPlate,
                            b.driverPhone
                          );
                          if (onSendToast) {
                            onSendToast('تم إرسال إشعار وصول السائق لهاتفك 🚖', 'success');
                          }
                        }}
                        className="py-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 shadow-xs transition active:scale-95 flex items-center gap-1"
                      >
                        <Bell className="w-3 h-3" />
                        <span>وصل السائق</span>
                      </button>
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 pl-1.5">
                      <button
                        type="button"
                        id={`btn-details-${b.bookingId}`}
                        onClick={() => onOpenVehicleModal(b)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        Vehicle Details
                      </button>

                      <button
                        type="button"
                        id={`btn-cancel-${b.bookingId}`}
                        onClick={() => handleCancelClick(b)}
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {historyBookings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Past History</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Past completed trips will appear here with options to rate your experience and submit route feedback.
                </p>
              </div>
            ) : (
              historyBookings.map((item) => {
                const totalSeats = item.totalSeats || 7;
                const isSuzuki = totalSeats <= 7;
                const vehicleImg = isSuzuki ? IMG_SUZUKI : IMG_HC;
                const isCanceled = item.status.includes('Canceled');
                const isOnBoard = item.status === 'Passenger on board' || item.status.toLowerCase().includes('board');

                return (
                  <div
                    key={item.bookingId}
                    id={`history-card-${item.bookingId}`}
                    onClick={() => onOpenComplaintModal(item)}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden flex items-center gap-3.5 cursor-pointer hover:border-blue-300 hover:shadow-md transition active:scale-99"
                  >
                    {/* Status side bar */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        isCanceled ? 'bg-red-500' : isOnBoard ? 'bg-indigo-500' : 'bg-emerald-500'
                      }`}
                    />

                    {/* Vehicle icon */}
                    <div className="w-16 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center p-1 shrink-0">
                      <img
                        src={vehicleImg}
                        alt="Vehicle"
                        className="max-h-10 max-w-[55px] object-contain drop-shadow-xs"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {item.tripName}{' '}
                          <span className="text-[11px] font-semibold text-blue-600">[{item.tripId}]</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCanceled
                              ? 'bg-red-100 text-red-800'
                              : isOnBoard
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{item.pickupPoint}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.date} ({item.tripTime}) &bull; Seat: #{item.seatNumber || 'N/A'}
                      </div>
                    </div>

                    {/* Star / Feedback indicator */}
                    <div className="shrink-0 text-right">
                      {item.hasComplaint || item.ratingData ? (
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-bold bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{item.ratingData?.rating || 5}★</span>
                        </div>
                      ) : !isCanceled ? (
                        <button
                          type="button"
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Rate
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-App Confirmation Modal for Canceling Trips */}
      <CancelConfirmationModal
        booking={bookingToCancel}
        isOpen={Boolean(bookingToCancel)}
        onClose={() => setBookingToCancel(null)}
        onConfirm={(bookingId) => {
          onCancelBooking(bookingId);
        }}
      />
    </div>
  );
};
