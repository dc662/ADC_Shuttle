import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { Booking } from '../types';

interface CancelConfirmationModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void;
}

export const CancelConfirmationModal: React.FC<CancelConfirmationModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !booking) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        id="cancel-confirmation-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 relative overflow-hidden"
        >
          {/* Top Red Header Icon */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">إلغاء حجز الرحلة</h3>
                <p className="text-[11px] text-slate-500">Confirm Trip Cancellation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Trip Summary Details */}
          <div className="my-4 bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">الخط / الرحلة:</span>
              <span className="font-bold text-slate-800">{booking.tripName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الموعد:</span>
              <span className="font-bold text-blue-600 font-mono">{booking.tripTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">رقم المقعد:</span>
              <span className="font-bold text-slate-800">
                {booking.seatNumber === 'Waitlist' ? 'قائمة الانتظار' : `Seat #${booking.seatNumber}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">نقطة الركوب:</span>
              <span className="font-semibold text-slate-700 truncate max-w-[160px]">
                {booking.pickupPoint}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 text-center leading-relaxed mb-4">
            هل أنت متأكد من رغبتك في إلغاء هذا الحجز؟ سيتم تحرير المقعد لزملائك فوراً.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-98"
            >
              تراجع (Keep Booking)
            </button>
            <button
              type="button"
              id="btn-confirm-cancel-booking"
              onClick={() => {
                onConfirm(booking.bookingId);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد الإلغاء</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
