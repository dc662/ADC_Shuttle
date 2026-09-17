import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Bus, CheckCircle2, Clock, Car, MapPin } from 'lucide-react';
import { notificationService, PushNotificationPayload } from '../services/notificationService';
import { COMPANY_LOGO } from '../services/storageService';

export const PushNotificationBanner: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<PushNotificationPayload | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notif) => {
      setCurrentNotification(notif);
      const timer = setTimeout(() => {
        setCurrentNotification((prev) => (prev?.id === notif.id ? null : prev));
      }, 5500);
      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-2 inset-x-0 z-50 flex justify-center px-3 pointer-events-none">
      <AnimatePresence>
        {currentNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            className="pointer-events-auto w-full max-w-md bg-slate-900/95 text-white rounded-3xl p-3.5 shadow-2xl border border-slate-700/60 backdrop-blur-xl flex items-start gap-3"
            id="mobile-push-notification-banner"
          >
            {/* App Icon / Bus Icon */}
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md ${
                currentNotification.type === 'driver_arrived'
                  ? 'bg-gradient-to-tr from-amber-500 to-emerald-500 ring-2 ring-emerald-400/40'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600'
              }`}
            >
              {currentNotification.type === 'driver_arrived' ? (
                <Car className="w-5 h-5 animate-pulse" />
              ) : (
                <Bus className="w-5 h-5" />
              )}
            </div>

            {/* Notification Text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase ${
                      currentNotification.type === 'driver_arrived'
                        ? 'text-amber-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {currentNotification.type === 'driver_arrived'
                      ? 'DRIVER ARRIVED • وصول السائق'
                      : 'ADC Shuttle • Now'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">
                  {currentNotification.timestamp}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate">
                {currentNotification.title}
              </h4>
              <p className="text-[11px] text-slate-300 leading-snug mt-0.5 break-words line-clamp-2">
                {currentNotification.body}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCurrentNotification(null)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
