import React, { useState, useMemo, useEffect } from 'react';
import { Trip, User } from '../types';
import {
  getTodayFormatted,
  checkSystemAvailability,
  isTripUpcomingToday,
  getCurrentMinutesToday,
  formatMinutesUntilTrip,
  IMG_SUZUKI,
  IMG_HC
} from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, MapPin, Clock, Calendar, CheckCircle2, AlertCircle, Info, Sparkles, ChevronDown, ShieldAlert, Moon, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReserveSeatTabProps {
  trips: Trip[];
  currentUser: User | null;
  onBookSuccess: () => void;
  onSendToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBookTrip: (tripId: string, seatNumber: number, pickupPoint: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
}

export const ReserveSeatTab: React.FC<ReserveSeatTabProps> = ({
  trips,
  currentUser,
  onBookSuccess,
  onSendToast,
  onBookTrip,
}) => {
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => getCurrentMinutesToday());

  // Periodically refresh current time every 30 seconds to automatically hide trips as their time passes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMinutes(getCurrentMinutesToday());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayFormatted();
  const systemStatus = checkSystemAvailability();

  // Filter available departure times for selected line - ONLY upcoming trips in the next hours
  const availableTripsForLine = useMemo(() => {
    if (!selectedLine) return [];
    return trips.filter((t) => {
      if (t.name !== selectedLine) return false;
      return isTripUpcomingToday(t.time, currentTimeMinutes);
    });
  }, [trips, selectedLine, currentTimeMinutes]);

  // If currently selected trip just passed its departure time, clear the selection
  useEffect(() => {
    if (selectedTripId && !availableTripsForLine.some((t) => t.id === selectedTripId)) {
      setSelectedTripId('');
      setSelectedPickup('');
      setSelectedSeat(null);
    }
  }, [availableTripsForLine, selectedTripId]);

  // Selected trip object
  const currentTrip = useMemo(() => {
    return trips.find((t) => t.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  // Pickup point options strictly separated by Direction (Morning AM vs Evening PM)
  const pickupOptions = useMemo(() => {
    if (!currentTrip) return [];

    const isMorningTrip = currentTrip.time.toUpperCase().includes('AM');

    if (isMorningTrip) {
      // Morning trips (8:15 AM & 8:45 AM): Going TO the company
      // Pickup points are external meeting stations (Hyper, Juhayna, etc.) - NOT "امام الشركه"
      if (selectedLine === 'Hyper Bus') {
        if (currentTrip.id === 'TH1') {
          return ['موقف أو ملف هايبر', 'Cairo University Square', 'University St. Beginning'];
        } else if (currentTrip.id === 'TH2') {
          return ['مدخل 2  الشيخ زايد ', 'موقف أو ملف هايبر', 'Cairo University Square'];
        }
        return ['موقف أو ملف هايبر', 'مدخل 2  الشيخ زايد ', 'Cairo University Square', 'University St. Beginning'];
      } else if (selectedLine === 'Juhayna Bus') {
        return ['ميدان جهينه', '11th District', 'Main Point'];
      }
      return [currentTrip.mainPickPoint || 'نقطة التجمع'];
    } else {
      // Evening trips (5:30 PM & 6:00 PM): Leaving FROM the company
      // Boarding point is at the company ("امام الشركه")
      return ['امام الشركه (ADC HQ)'];
    }
  }, [selectedLine, currentTrip]);

  const handleLineChange = (line: string) => {
    if (!systemStatus.isOpen) {
      onSendToast(systemStatus.reason || 'Booking system is closed.', 'error');
      return;
    }
    setSelectedLine(line);
    setSelectedTripId('');
    setSelectedPickup('');
    setSelectedSeat(null);
  };

  const handleTripChange = (tripId: string) => {
    if (!systemStatus.isOpen) {
      onSendToast(systemStatus.reason || 'Booking system is closed.', 'error');
      return;
    }
    setSelectedTripId(tripId);
    setSelectedSeat(null);
    
    // Auto-select pickup if evening (only 1 option: امام الشركه)
    const trip = trips.find(t => t.id === tripId);
    if (trip && trip.time.toUpperCase().includes('PM')) {
      setSelectedPickup('امام الشركه (ADC HQ)');
    } else {
      setSelectedPickup('');
    }
  };

  const handleSeatClick = (seatNum: number, isBooked: boolean) => {
    if (!systemStatus.isOpen) {
      onSendToast(systemStatus.reason || 'Booking system is closed.', 'error');
      return;
    }
    if (isBooked) {
      onSendToast(`Seat #${seatNum} is already booked`, 'info');
      return;
    }
    setSelectedSeat(seatNum);
    onSendToast(`Selected Seat #${seatNum}`, 'info');
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemStatus.isOpen) {
      onSendToast(systemStatus.reason || 'Booking system is closed.', 'error');
      return;
    }

    if (!selectedLine || !selectedTripId || !selectedPickup) {
      onSendToast('Please select line, departure time, and pickup point!', 'error');
      return;
    }

    if (!selectedSeat && (!currentTrip || currentTrip.seatsLeft > 0)) {
      onSendToast('Please choose an available seat on the bus map!', 'error');
      return;
    }

    setIsSubmitting(true);
    const result = await onBookTrip(selectedTripId, selectedSeat || 1, selectedPickup);

    if (result.success) {
      // Trigger festive confetti
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore if not supported
      }

      onSendToast(result.message || 'Seat reserved successfully!', 'success');
      onBookSuccess();
    } else {
      onSendToast(result.message || 'Booking failed!', 'error');
    }
    setIsSubmitting(false);
  };

  // Seat matrix layouts matching exact original code
  const isSuzuki = currentTrip ? currentTrip.totalSeats <= 7 : true;
  const matrix7Seater = [
    [null, null, 1],
    [2, 3, 4],
    [5, 6, 7]
  ];
  const matrix13Seater = [
    [null, null, null, 1],
    [null, null, null, null],
    [2, 3, null, null],
    [4, 5, null, 6],
    [7, 8, null, 9],
    [10, 11, 12, 13]
  ];

  const activeMatrix = isSuzuki ? matrix7Seater : matrix13Seater;
  const bookedArray = currentTrip?.bookedSeatsArray || [];
  const vehicleImg = isSuzuki ? IMG_SUZUKI : IMG_HC;
  const vehicleLabel = isSuzuki ? 'Suzuki (7 Seats)' : 'HC High Ace (13 Seats)';

  const isFormComplete = Boolean(
    systemStatus.isOpen &&
    selectedLine &&
    selectedTripId &&
    selectedPickup &&
    (selectedSeat !== null || (currentTrip && currentTrip.seatsLeft <= 0))
  );

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-6" id="reserve-seat-container">
      {/* Top Welcome & Date pill */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Shuttle Reservation</div>
            <div className="text-[11px] text-slate-500">Corporate Mobility Service</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* Rules Notice Badge */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
        <div className="font-bold text-slate-700 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600" />
          <span>Booking Rules & Operational Schedule:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-slate-500 pr-1">
          <li>Daily booking hours: <strong>07:00 AM to 07:00 PM</strong>.</li>
          <li>Weekends: <strong>No shuttle service on Friday & Saturday</strong>.</li>
          <li>Maximum 2 bookings per day: <strong>1 Morning (AM) & 1 Evening (PM)</strong>.</li>
        </ul>
      </div>

      {/* System Closed Alert if Weekend or Outside Operating Hours */}
      {!systemStatus.isOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-xs">
              {systemStatus.isWeekend ? (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {systemStatus.isWeekend
                  ? 'Weekend Off (Friday & Saturday)'
                  : 'Booking System Currently Closed'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
              Live Schedule
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {systemStatus.reason}
          </p>

          {/* Instant Demo Test Mode Switcher */}
          <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-800">
              هل تريد تجربة واختبار الحجز الآن؟
            </span>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('adc_demo_force_open', 'true');
                window.location.reload();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition active:scale-95"
            >
              🔓 تشغيل وضع التجربة (Demo)
            </button>
          </div>
        </div>
      )}

      {/* If Demo Mode is currently active, show a dismiss banner */}
      {typeof window !== 'undefined' && localStorage.getItem('adc_demo_force_open') === 'true' && (
        <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between text-xs font-semibold">
          <span>⚡ وضع التجربة مفعل: يمكنك تجربة حجز المقاعد واختبار الإشعارات الآن.</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('adc_demo_force_open');
              window.location.reload();
            }}
            className="text-[11px] text-emerald-800 underline font-bold hover:text-emerald-950"
          >
            إيقاف وضع التجربة
          </button>
        </div>
      )}

      {/* Step 1: Select Line */}
      <div className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 ${!systemStatus.isOpen ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Select Route Line:
          </label>
          <span className="text-[10px] text-slate-500">
            اختر خط الرحلة
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {['Hyper Bus', 'Juhayna Bus'].map((line) => {
            const isSelected = selectedLine === line;
            const upcomingCount = trips.filter(
              (t) => t.name === line && isTripUpcomingToday(t.time, currentTimeMinutes)
            ).length;

            return (
              <button
                key={line}
                type="button"
                id={`btn-line-${line.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleLineChange(line)}
                className={`p-3 rounded-xl border text-left transition relative active:scale-95 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{line}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {line === 'Hyper Bus' ? 'Hyper One Route' : 'Juhayna Square Route'}
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      upcomingCount > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {upcomingCount > 0 ? `${upcomingCount} upcoming` : 'All departed'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Departure Time */}
      {selectedLine && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 ${!systemStatus.isOpen ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Departure Time:
            </label>
            <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Next Hours Only
            </span>
          </div>

          {availableTripsForLine.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                All Trips Have Departed Today
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                انتهت جميع رحلات {selectedLine} لهذا اليوم، حيث تم إخفاء المواعيد السابقة تلقائياً.
              </p>
              <div className="pt-1 text-[10px] font-semibold text-blue-700 bg-blue-50 py-1 px-2.5 rounded-lg inline-block border border-blue-100">
                تبدأ رحلات الغد في تمام الساعة 08:15 صباحاً
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableTripsForLine.map((t) => {
                const isSelected = selectedTripId === t.id;
                const isFull = t.seatsLeft <= 0;
                const countdown = formatMinutesUntilTrip(t.time, currentTimeMinutes);
                return (
                  <button
                    key={t.id}
                    type="button"
                    id={`btn-trip-time-${t.id}`}
                    onClick={() => handleTripChange(t.id)}
                    className={`p-3 rounded-xl border text-left transition active:scale-95 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {t.time}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>

                    {countdown && countdown !== 'Departed' && (
                      <div className="text-[10px] font-medium text-blue-600 mt-1">
                        Starts {countdown}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span>{t.busModel}</span>
                      <span className={`font-bold ${isFull ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {isFull ? 'Full (Waitlist)' : `${t.seatsLeft} seats left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Step 3: Boarding Point */}
      {selectedTripId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 ${!systemStatus.isOpen ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              3. {currentTrip?.time.toUpperCase().includes('AM') ? 'Boarding Point (الركوب للشركة):' : 'Departure Point (التحرك من الشركة):'}
            </label>
            <span className="text-[10px] font-semibold text-slate-400">
              {currentTrip?.time.toUpperCase().includes('AM') ? 'Morning Trip (ذهاب)' : 'Evening Trip (عودة)'}
            </span>
          </div>
          <div className="space-y-1.5">
            {pickupOptions.map((opt) => {
              const isSelected = selectedPickup === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  id={`btn-pickup-${opt.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setSelectedPickup(opt)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition active:scale-98 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{opt}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Interactive Bus Seat Map */}
      {selectedTripId && currentTrip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4 ${!systemStatus.isOpen ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {/* Front Vehicle Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-200">
            <div className="flex items-center gap-2.5">
              <img
                src={vehicleImg}
                alt={vehicleLabel}
                className="w-14 h-9 object-contain drop-shadow-xs"
              />
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                {vehicleLabel}
              </span>
            </div>
            <div className="text-[11px] font-black text-slate-400 tracking-widest uppercase">
              FRONT CABIN
            </div>
          </div>

          {/* Cabin Seat Grid Layout */}
          <div className="py-2">
            <div
              className={`grid gap-3 justify-center mx-auto ${
                isSuzuki ? 'grid-cols-3 max-w-[240px]' : 'grid-cols-4 max-w-[290px]'
              }`}
              id="seatsGridContainer"
            >
              {activeMatrix.map((row, rowIndex) =>
                row.map((item, colIndex) => {
                  if (item === null) {
                    return <div key={`empty-${rowIndex}-${colIndex}`} className="w-12 h-12" />;
                  }

                  const seatNum = item;
                  const isBooked = bookedArray.includes(seatNum);
                  const isSelected = selectedSeat === seatNum;

                  return (
                    <button
                      key={`seat-${seatNum}`}
                      type="button"
                      id={`btn-seat-${seatNum}`}
                      disabled={isBooked || !systemStatus.isOpen}
                      onClick={() => handleSeatClick(seatNum, isBooked)}
                      className={`relative w-12 h-13 flex items-center justify-center transition transform active:scale-95 group focus:outline-hidden ${
                        isBooked || !systemStatus.isOpen
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : isSelected
                          ? 'text-blue-600 scale-105 filter drop-shadow-md'
                          : 'text-emerald-500 hover:scale-105'
                      }`}
                    >
                      {/* Realistic Seat SVG */}
                      <svg className="w-full h-full" viewBox="0 0 100 110">
                        {/* Seat Back */}
                        <rect
                          x="15"
                          y="10"
                          width="70"
                          height="60"
                          rx="12"
                          fill={isBooked ? '#cbd5e1' : isSelected ? '#2563eb' : '#10b981'}
                        />
                        {/* Seat Cushion */}
                        <rect
                          x="10"
                          y="65"
                          width="80"
                          height="35"
                          rx="8"
                          fill={isBooked ? '#cbd5e1' : isSelected ? '#1d4ed8' : '#059669'}
                        />
                        {/* Armrests */}
                        <rect x="5" y="20" width="12" height="45" rx="6" fill="rgba(0,0,0,0.18)" />
                        <rect x="83" y="20" width="12" height="45" rx="6" fill="rgba(0,0,0,0.18)" />
                      </svg>

                      {/* Seat Number Tag */}
                      <span className="absolute top-[28%] text-xs font-black text-white pointer-events-none drop-shadow-xs">
                        {seatNum}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Seat Color Legend */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-blue-600" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-slate-300" />
              <span>Booked</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Submit Button & Clear Selection */}
      <div className="space-y-2">
        <button
          type="button"
          id="btn-confirm-reservation"
          disabled={!isFormComplete || isSubmitting || !systemStatus.isOpen}
          onClick={handleConfirmReservation}
          className={`w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition active:scale-98 shadow-md ${
            !systemStatus.isOpen
              ? 'bg-slate-400 opacity-60 cursor-not-allowed'
              : currentTrip && currentTrip.seatsLeft <= 0
              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
              : isFormComplete
              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25 pulse-glow'
              : 'bg-slate-300 opacity-60 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {!systemStatus.isOpen
            ? systemStatus.isWeekend ? 'No Service on Weekends' : 'Booking Closed (07:00 AM - 07:00 PM Only)'
            : currentTrip && currentTrip.seatsLeft <= 0
            ? 'Request Ride (Waiting List)'
            : selectedSeat
            ? `Confirm Seat #${selectedSeat} Reservation`
            : 'Confirm Reservation'}
        </button>

        {(selectedLine || selectedTripId || selectedSeat) && (
          <button
            type="button"
            id="btn-reset-reserve-selection"
            onClick={() => {
              setSelectedLine('');
              setSelectedTripId('');
              setSelectedPickup('');
              setSelectedSeat(null);
              onSendToast('تم إلغاء وتفريغ الاختيارات', 'info');
            }}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            إلغاء التحديد وإعادة الاختيار (Reset / Cancel Selection)
          </button>
        )}
      </div>
    </div>
  );
};
