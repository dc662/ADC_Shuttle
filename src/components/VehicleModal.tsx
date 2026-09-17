import React from 'react';
import { Booking, Trip } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, User as UserIcon, Shield, CheckCircle, Car } from 'lucide-react';
import { IMG_SUZUKI, IMG_HC } from '../services/storageService';

interface VehicleModalProps {
  booking: Booking | null;
  trip?: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  booking,
  trip,
  isOpen,
  onClose,
}) => {
  if (!isOpen || (!booking && !trip)) return null;

  const item = booking || trip;
  if (!item) return null;

  const tripName = booking?.tripName || trip?.name || 'Bus Shuttle';
  const tripTime = booking?.tripTime || trip?.time || '--:--';
  const seatNumber = booking?.seatNumber ?? 'N/A';
  const pickupPoint = booking?.pickupPoint || trip?.mainPickPoint || 'Main Point';

  const hasReplacement = Boolean(booking?.hasSub || trip?.hasReplacement || booking?.replacementName || trip?.replacementName);
  const primaryDriver = trip?.driverName || booking?.driverName || 'Captain';
  const subName = booking?.replacementName || trip?.replacementName || '';
  const activeDriverName = hasReplacement && subName ? subName : primaryDriver;

  let driverPhone = booking?.driverPhone || trip?.driverPhone || '';
  if (hasReplacement && (booking?.replacementPhone || trip?.replacementPhone)) {
    driverPhone = booking?.replacementPhone || trip?.replacementPhone || driverPhone;
  }

  const busPlate = booking?.busPlate || trip?.busPlate || 'أ ب ج 1234';
  const totalSeats = booking?.totalSeats || trip?.totalSeats || 7;
  const isSuzuki = totalSeats <= 7;
  const vehicleImg = isSuzuki ? IMG_SUZUKI : IMG_HC;
  const vehicleName = isSuzuki ? 'Suzuki (7 Seats)' : 'HC High Ace (13 Seats)';
  const initialLetter = activeDriverName.trim().charAt(0).toUpperCase() || 'C';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 relative text-slate-800"
          id="modal-vehicle-details"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Vehicle & Driver Info
            </h3>
            <button
              onClick={onClose}
              id="btn-close-vehicle-modal"
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
            {/* Trip summary badge box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Route: {tripName}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">{tripTime}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Pickup: <strong className="text-slate-700">{pickupPoint}</strong></span>
                {seatNumber !== 'N/A' && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    Seat #{seatNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Vehicle Model & Image Banner */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-3">
              <div className="w-20 h-14 bg-white/80 rounded-xl border border-blue-200 flex items-center justify-center p-1 shrink-0 shadow-xs">
                <img
                  src={vehicleImg}
                  alt={vehicleName}
                  className="max-h-11 max-w-[70px] object-contain drop-shadow-sm"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Shuttle Vehicle</div>
                <div className="font-bold text-sm text-slate-800 truncate">{vehicleName}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Air Conditioned &bull; Live Tracked</div>
              </div>
            </div>

            {/* Driver Profile Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center border-2 border-blue-200 shadow-sm shrink-0">
                  {initialLetter}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 truncate">{activeDriverName}</span>
                    {hasReplacement ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                        🔄 Substitute
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                        ⭐ Primary
                      </span>
                    )}
                  </div>

                  {hasReplacement && primaryDriver && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Assigned Driver: <strong>{primaryDriver}</strong>
                    </div>
                  )}

                  {/* Phone Call Link */}
                  {driverPhone ? (
                    <a
                      href={`tel:${driverPhone}`}
                      id="btn-call-driver"
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 active:scale-95 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>{driverPhone}</span>
                    </a>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">Phone not available</div>
                  )}
                </div>
              </div>
            </div>

            {/* Egyptian License Plate Visual Container */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Vehicle License Plate</div>
              <div className="inline-block border-[2.5px] border-black rounded-lg overflow-hidden bg-white shadow-md w-44">
                <div className="bg-blue-600 text-white text-[10px] font-black py-0.5 tracking-wider">
                  EGYPT &bull; مـصـر
                </div>
                <div className="py-1.5 px-2 text-base font-black text-black tracking-[0.2em] font-mono">
                  {busPlate}
                </div>
              </div>
            </div>

            {/* Close action button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-98 transition shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
