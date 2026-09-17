import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip, Booking, ToastMessage, SavedRating } from './types';
import { storageService } from './services/storageService';
import { notificationService } from './services/notificationService';
import { MobileFrame } from './components/MobileFrame';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { ToastContainer } from './components/Toast';
import { PushNotificationBanner } from './components/PushNotificationBanner';
import { AuthScreen } from './components/AuthScreen';
import { ReserveSeatTab } from './components/ReserveSeatTab';
import { MyTripsTab } from './components/MyTripsTab';
import { SupportWidget } from './components/SupportWidget';
import { ProfileTab } from './components/ProfileTab';
import { VehicleModal } from './components/VehicleModal';
import { ComplaintModal } from './components/ComplaintModal';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('booking');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Core Data
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);

  // Modals state
  const [vehicleModalBooking, setVehicleModalBooking] = useState<Booking | null>(null);
  const [complaintModalBooking, setComplaintModalBooking] = useState<Booking | null>(null);

  // Toast Helper
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Reload data from storage and sync live Google Sheets
  const reloadData = useCallback(
    async (showToastFeedback = false) => {
      if (!currentUser) return;
      setIsRefreshing(true);

      try {
        await storageService.syncLiveGoogleSheetsData(showToastFeedback);
        const freshUser = storageService.getCurrentUser();
        if (freshUser) {
          setCurrentUser((prev) => {
            if (!prev) return freshUser;
            if (
              prev.phone !== freshUser.phone ||
              prev.name !== freshUser.name ||
              prev.email !== freshUser.email ||
              prev.role !== freshUser.role
            ) {
              return { ...prev, ...freshUser };
            }
            return prev;
          });
        }
      } catch (e) {
        // ignore network hiccups
      }

      const activeUser = storageService.getCurrentUser() || currentUser;
      const empData = storageService.getEmployeeData(activeUser.id);
      setTrips(empData.trips);
      setActiveBookings(empData.activeBookings);
      setBookingHistory(empData.bookingHistory);

      setIsRefreshing(false);
      if (showToastFeedback) {
        showToast('Google Sheet live data synced!', 'success');
      }
    },
    [currentUser, showToast]
  );

  // Initial load on user change
  useEffect(() => {
    if (currentUser) {
      reloadData();
      setActiveTab('booking');
    }
  }, [currentUser, reloadData]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(() => {
      reloadData(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [currentUser, reloadData]);

  // Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    storageService.setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    storageService.setCurrentUser(null);
    showToast('Signed out of ADC Shuttle', 'info');
  };

  const handleBookTrip = async (tripId: string, seatNumber: number, pickupPoint: string) => {
    if (!currentUser) return { success: false, message: 'Please sign in first' };
    const res = await storageService.bookTrip(currentUser.id, tripId, seatNumber, pickupPoint);
    if (res.success) {
      reloadData();
      // Send Device & In-App Mobile Push Notification
      const trip = trips.find((t) => t.id === tripId);
      const tripTime = trip?.time || '';
      const lineName = trip?.line || 'ADC Shuttle';
      notificationService.sendMobileNotification(
        'تم تأكيد حجز المقعد بنجاح 🎫',
        `تم تأكيد حجز مقعدك رقم #${seatNumber} في ${lineName} (موعد: ${tripTime}) من محطة: ${pickupPoint}.`,
        'booking'
      );
    }
    return res;
  };

  const handleCancelBooking = (bookingId: string) => {
    const res = storageService.cancelBooking(bookingId);
    if (res.success) {
      showToast(res.message || 'Booking canceled successfully', 'success');
      reloadData();
      // Send cancellation push notification
      notificationService.sendMobileNotification(
        'تم إلغاء حجز الرحلة ⚠️',
        'تم إلغاء حجز مقعدك في الرحلة بنجاح بناءً على طلبك.',
        'status'
      );
    } else {
      showToast(res.message || 'Failed to cancel booking', 'error');
    }
  };

  const handleSubmitRating = (ratingData: SavedRating & { bookingId: string }) => {
    if (!currentUser) return;
    const res = storageService.submitTripRating(currentUser.id, ratingData);
    if (res.success) {
      showToast(res.message || 'Feedback recorded successfully', 'success');
      reloadData();
    } else {
      showToast(res.message || 'Error submitting feedback', 'error');
    }
  };

  const handleChangePassword = (oldPass: string, newPass: string) => {
    if (!currentUser) return { success: false, message: 'User not signed in' };
    const res = storageService.changeUserPassword(currentUser.id, oldPass, newPass);
    if (res.success) {
      setCurrentUser((prev) => (prev ? { ...prev, password: newPass.trim() } : null));
      notificationService.sendMobileNotification(
        'تحديث كلمة المرور 🔒',
        'تم تحديث كلمة مرور حسابك بنجاح.',
        'system'
      );
    }
    return res;
  };

  const handleUpdateProfile = (name: string, phone?: string) => {
    if (!currentUser) return { success: false, message: 'User not signed in' };
    const res = storageService.updateUserProfile(currentUser.id, name, phone);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      notificationService.sendMobileNotification(
        'تحديث الملف الشخصي 👤',
        `تم تحديث بيانات ملفك الشخصي (${res.user.name}) بنجاح.`,
        'system'
      );
    }
    return res;
  };

  const handleSendEmailOTP = (newEmail: string) => {
    if (!currentUser) return { success: false, message: 'User not signed in' };
    const res = storageService.sendEmailChangeOTP(currentUser.id, newEmail);
    if (res.success && res.otp) {
      notificationService.sendMobileNotification(
        'رمز التحقق للبريد ✉️',
        `كود التحقق لتغيير بريدك الإلكتروني هو: ${res.otp}`,
        'system'
      );
    }
    return res;
  };

  const handleVerifyEmailOTP = (otp: string) => {
    if (!currentUser) return { success: false, message: 'User not signed in' };
    const res = storageService.verifyAndChangeEmail(currentUser.id, otp);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      notificationService.sendMobileNotification(
        'تم تغيير البريد الإلكتروني بنجاح ✉️',
        `تم اعتماد بريدك الإلكتروني الجديد: ${res.user.email}`,
        'system'
      );
    }
    return res;
  };

  return (
    <MobileFrame>
      <PushNotificationBanner />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {!currentUser ? (
        <AuthScreen
          onLoginSuccess={handleLoginSuccess}
          onSendToast={showToast}
          onLogin={(ident, pass) => storageService.login(ident, pass)}
          onRegister={(name, pass, email, phone, role) =>
            storageService.sendRegistrationOTP(name, pass, email, phone, role)
          }
          onVerifyRegOTP={(email, otp) => storageService.verifyRegistration(email, otp)}
          onSendForgotOTP={(email) => storageService.sendForgotOTP(email)}
          onResetPassword={(email, otp, newPass) =>
            storageService.verifyResetPassword(email, otp, newPass)
          }
        />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
          {/* Mobile Top Header */}
          <Header
            user={currentUser}
            isRefreshing={isRefreshing}
            onRefresh={() => reloadData(true)}
            onLogout={handleLogout}
          />

          {/* Active Tab Screen Content */}
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar bg-slate-100/70">
            <AnimatePresence mode="wait">
              {activeTab === 'booking' && (
                <motion.div
                  key="tab-booking"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  <ReserveSeatTab
                    trips={trips}
                    currentUser={currentUser}
                    onBookTrip={handleBookTrip}
                    onBookSuccess={() => setActiveTab('trips')}
                    onSendToast={showToast}
                  />
                </motion.div>
              )}

              {activeTab === 'trips' && (
                <motion.div
                  key="tab-trips"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <MyTripsTab
                    upcomingBookings={activeBookings}
                    historyBookings={bookingHistory}
                    onOpenVehicleModal={(b) => setVehicleModalBooking(b)}
                    onOpenComplaintModal={(b) => setComplaintModalBooking(b)}
                    onCancelBooking={handleCancelBooking}
                    onSendToast={showToast}
                  />
                </motion.div>
              )}

              {activeTab === 'support' && (
                <motion.div
                  key="tab-support"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <SupportWidget currentUser={currentUser} onSendToast={showToast} />
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <motion.div
                  key="tab-profile"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                >
                  <ProfileTab
                    currentUser={currentUser}
                    upcomingCount={activeBookings.length}
                    historyCount={bookingHistory.length}
                    onLogout={handleLogout}
                    onSendToast={showToast}
                    onChangePassword={handleChangePassword}
                    onUpdateProfile={handleUpdateProfile}
                    onSendEmailOTP={handleSendEmailOTP}
                    onVerifyEmailOTP={handleVerifyEmailOTP}
                    onRefreshData={() => reloadData(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          {/* Bottom Navigation */}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            upcomingCount={activeBookings.length}
          />

          {/* Vehicle Details Modal */}
          <VehicleModal
            booking={vehicleModalBooking}
            isOpen={Boolean(vehicleModalBooking)}
            onClose={() => setVehicleModalBooking(null)}
          />

          {/* Rating & Complaint Modal */}
          <ComplaintModal
            booking={complaintModalBooking}
            isOpen={Boolean(complaintModalBooking)}
            onClose={() => setComplaintModalBooking(null)}
            onSubmitRating={handleSubmitRating}
          />
        </div>
      )}
    </MobileFrame>
  );
}
