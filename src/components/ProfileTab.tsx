import React, { useState } from 'react';
import { User, Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Bell,
  BellRing,
  Smartphone,
  CheckCircle2,
  Calendar,
  LogOut,
  ChevronRight,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Car,
  Edit,
  Pencil,
  Copy,
  Check,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { googleSignIn, isGoogleAuthenticated, getAccessToken, googleSignOut } from '../services/googleAuthService';
import { writeUserUpdateToGoogleSheet } from '../services/googleSheetsWriteService';
import { GOOGLE_SPREADSHEET_ID } from '../services/googleSheetsService';

interface ProfileTabProps {
  currentUser: User;
  upcomingCount: number;
  historyCount: number;
  onLogout: () => void;
  onSendToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onChangePassword: (oldPass: string, newPass: string) => { success: boolean; message?: string };
  onUpdateProfile?: (name: string, phone?: string) => { success: boolean; user?: User; message?: string };
  onSendEmailOTP?: (newEmail: string) => { success: boolean; otp?: string; message?: string };
  onVerifyEmailOTP?: (otp: string) => { success: boolean; user?: User; message?: string };
  onRefreshData?: () => void;
}

type EditTabType = 'name' | 'email' | 'password';

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  upcomingCount,
  historyCount,
  onLogout,
  onSendToast,
  onChangePassword,
  onUpdateProfile,
  onSendEmailOTP,
  onVerifyEmailOTP,
  onRefreshData,
}) => {
  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [activeEditTab, setActiveEditTab] = useState<EditTabType>('name');

  // Name / Info State
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editPhone, setEditPhone] = useState<string>(currentUser.phone || '');
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Email with OTP State
  const [newEmail, setNewEmail] = useState<string>('');
  const [emailOtpSent, setEmailOtpSent] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>('');
  const [lastGeneratedOtp, setLastGeneratedOtp] = useState<string>('');
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpCopied, setOtpCopied] = useState<boolean>(false);

  // Password State
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState<boolean>(false);

  // Preference toggles
  const [notifyTripReminders, setNotifyTripReminders] = useState<boolean>(true);
  const [notifyBoardingStatus, setNotifyBoardingStatus] = useState<boolean>(true);
  const [notifyDriverArrival, setNotifyDriverArrival] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adc_notify_driver_arrival');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [inAppPushEnabled, setInAppPushEnabled] = useState<boolean>(() =>
    notificationService.isInAppPushEnabled()
  );
  const [permissionState, setPermissionState] = useState<NotificationPermission>(() =>
    notificationService.getPermission()
  );
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => isGoogleAuthenticated());
  const [isAuthorizingGoogle, setIsAuthorizingGoogle] = useState<boolean>(false);
  const [lastSheetWriteStatus, setLastSheetWriteStatus] = useState<string | null>(null);

  React.useEffect(() => {
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone || '');
  }, [currentUser.name, currentUser.phone]);

  const handleConnectGoogleSheets = async () => {
    setIsAuthorizingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setIsGoogleConnected(true);
        onSendToast('تم تسجيل الدخول وربط Google Sheets للكتابة والقراءة بنجاح! 📊', 'success');
      }
    } catch (err: any) {
      console.error('Failed to authorize Google Sheets:', err);
      onSendToast(err.message || 'فشل تسجيل الدخول لحساب Google', 'error');
    } finally {
      setIsAuthorizingGoogle(false);
    }
  };

  const handleDisconnectGoogleSheets = async () => {
    await googleSignOut();
    setIsGoogleConnected(false);
    onSendToast('تم تسجيل الخروج من Google Sheets', 'info');
  };

  const handleManualSheetSync = async () => {
    setIsSyncingSheet(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      onSendToast('تمت المزامنة بنجاح من Google Sheet!', 'success');
    } catch {
      onSendToast('فشل الاتصال بـ Google Sheet، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleOpenEditModal = (tab: EditTabType = 'name') => {
    setEditName(currentUser.name);
    setEditPhone(currentUser.phone || '');
    setActiveEditTab(tab);
    setNewEmail('');
    setEmailOtpSent(false);
    setEmailOtpCode('');
    setLastGeneratedOtp('');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setShowEditModal(true);
  };

  const handleRequestPushPermission = async () => {
    const res = await notificationService.requestPermission();
    setPermissionState(notificationService.getPermission());
    setInAppPushEnabled(true);

    if (res.granted) {
      onSendToast('تم تفعيل إشعارات الهاتف بنجاح 🔔', 'success');
    } else {
      onSendToast('تم تفعيل التنبيهات الفورية بنجاح 🔔', 'success');
    }

    notificationService.sendMobileNotification(
      'ADC Shuttle Notifications',
      'مرحباً! تم تفعيل إشعارات الهاتف لرحلات ومواعيد باصات الشركة بنجاح.',
      'system'
    );
  };

  // 1. Submit Name / Info Change
  const handleSaveNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || editName.trim().length < 2) {
      onSendToast('Please enter a valid full name (min 2 characters).', 'error');
      return;
    }

    setIsUpdatingName(true);
    let localSuccess = false;
    let localMsg = '';

    if (onUpdateProfile) {
      const res = onUpdateProfile(editName.trim(), editPhone.trim());
      localSuccess = res.success;
      localMsg = res.message || '';
    }

    // Direct write-to-sheet attempt
    const token = await getAccessToken();
    if (token) {
      try {
        const sheetWriteRes = await writeUserUpdateToGoogleSheet(
          { id: currentUser.id, email: currentUser.email },
          { name: editName.trim(), phone: editPhone.trim() }
        );
        if (sheetWriteRes.success) {
          setLastSheetWriteStatus(`تم الحفظ في شيت جوجل بنجاح (${new Date().toLocaleTimeString('ar-EG')})`);
          onSendToast(`تم حفظ التعديلات في شيت جوجل (Google Sheet) والتطبيق بنجاح! ✅`, 'success');
        } else {
          onSendToast(`تم الحفظ محلياً (${sheetWriteRes.message})`, 'info');
        }
      } catch (sheetErr: any) {
        console.warn('Direct sheet write error:', sheetErr);
      }
    } else {
      if (localSuccess) {
        onSendToast(localMsg || 'تم حفظ التعديلات محلياً. اضغط "ربط حساب Google" للمزامنة المباشرة مع الشيت!', 'info');
      }
    }

    setIsUpdatingName(false);
    setShowEditModal(false);
  };

  // 2. Submit Request for Email OTP
  const handleSendEmailOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      onSendToast('Please enter a valid email address.', 'error');
      return;
    }
    if (cleanEmail === currentUser.email.toLowerCase()) {
      onSendToast('This is already your current email address.', 'error');
      return;
    }

    setIsSendingOtp(true);
    if (onSendEmailOTP) {
      const res = onSendEmailOTP(cleanEmail);
      setIsSendingOtp(false);
      if (res.success) {
        setEmailOtpSent(true);
        if (res.otp) {
          setLastGeneratedOtp(res.otp);
        }
        onSendToast(res.message || `OTP verification code sent to ${cleanEmail}.`, 'success');
      } else {
        onSendToast(res.message || 'Failed to send OTP.', 'error');
      }
    } else {
      setIsSendingOtp(false);
      onSendToast('Email OTP handler unavailable.', 'error');
    }
  };

  // 2b. Submit Verify Email OTP
  const handleVerifyEmailOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtpCode.trim() || emailOtpCode.trim().length < 4) {
      onSendToast('Please enter the verification OTP code.', 'error');
      return;
    }

    setIsVerifyingOtp(true);
    if (onVerifyEmailOTP) {
      const res = onVerifyEmailOTP(emailOtpCode.trim());
      setIsVerifyingOtp(false);
      if (res.success) {
        onSendToast(res.message || 'Email successfully updated!', 'success');
        setShowEditModal(false);
        setEmailOtpSent(false);
        setEmailOtpCode('');
        setNewEmail('');
        setLastGeneratedOtp('');
      } else {
        onSendToast(res.message || 'Invalid or expired OTP code.', 'error');
      }
    } else {
      setIsVerifyingOtp(false);
      onSendToast('Email verification handler unavailable.', 'error');
    }
  };

  // 3. Submit Password Change (requires writing the old one right)
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPass.trim()) {
      onSendToast('Please write your current (old) password.', 'error');
      return;
    }
    if (!newPass.trim() || !confirmPass.trim()) {
      onSendToast('Please enter and confirm your new password.', 'error');
      return;
    }
    if (newPass.length < 6) {
      onSendToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPass !== confirmPass) {
      onSendToast('New passwords do not match.', 'error');
      return;
    }
    if (newPass.trim() === currentPass.trim()) {
      onSendToast('New password must be different from current password.', 'error');
      return;
    }

    setIsUpdatingPass(true);
    const res = onChangePassword(currentPass.trim(), newPass.trim());
    setIsUpdatingPass(false);

    if (res.success) {
      onSendToast(res.message || 'Password updated successfully!', 'success');
      setShowEditModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      onSendToast(res.message || 'Current password is incorrect.', 'error');
    }
  };

  const handleCopyOtp = () => {
    if (lastGeneratedOtp) {
      navigator.clipboard.writeText(lastGeneratedOtp);
      setEmailOtpCode(lastGeneratedOtp);
      setOtpCopied(true);
      onSendToast('OTP copied and pasted to input!', 'info');
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-12">
      {/* 1. Digital Employee Pass Card */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-5 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold backdrop-blur-md border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              Corporate Employee Pass
            </div>
            <button
              type="button"
              id="btn-edit-profile-pass"
              onClick={() => handleOpenEditModal('name')}
              className="w-8 h-8 rounded-full bg-blue-600/80 hover:bg-blue-600 text-white flex items-center justify-center transition active:scale-95 border border-white/20 shadow-xs"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg border-2 border-white/20 shrink-0">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold truncate text-white">{currentUser.name}</h2>
              </div>
              <p className="text-xs text-blue-200/90 flex items-center gap-1 font-mono">
                ID: <span className="text-white font-bold">{currentUser.id || 'E-10492'}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 font-bold uppercase tracking-wider">
                  Active Passenger
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-center">
            <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
              <span className="text-xl font-black text-white">{upcomingCount}</span>
              <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Upcoming Trips
              </span>
            </div>
            <div className="bg-white/5 rounded-2xl p-2.5 border border-white/5">
              <span className="text-xl font-black text-white">{historyCount}</span>
              <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Completed Rides
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Account Information with Direct Edit Actions */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Account Details
          </h3>
          <button
            type="button"
            id="btn-edit-account-all"
            onClick={() => handleOpenEditModal('name')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <Edit className="w-3 h-3" />
            <span>Modify Profile</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Passenger Name Row */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Passenger Name</span>
                <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.name}</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-edit-name"
              onClick={() => handleOpenEditModal('name')}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-100 hover:text-blue-600 transition shrink-0 ml-2"
            >
              Edit Name
            </button>
          </div>

          {/* Work Email Row */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Work Email</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-200">
                    OTP Verified
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-edit-email"
              onClick={() => handleOpenEditModal('email')}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-100 hover:text-blue-600 transition shrink-0 ml-2"
            >
              Change Email
            </button>
          </div>

          {/* Mobile Number Row */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Mobile Number</span>
                <p className="text-xs font-semibold text-slate-800 truncate">{currentUser.phone || 'Not set'}</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-edit-phone"
              onClick={() => handleOpenEditModal('name')}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-100 hover:text-blue-600 transition shrink-0 ml-2"
            >
              Update
            </button>
          </div>

          {/* Security Password Row */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Password</span>
                <p className="text-xs font-mono font-bold text-slate-700 tracking-wider">••••••••</p>
              </div>
            </div>
            <button
              type="button"
              id="btn-quick-edit-password"
              onClick={() => handleOpenEditModal('password')}
              className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-100 hover:text-blue-600 transition shrink-0 ml-2"
            >
              Change Password
            </button>
          </div>

          {/* Access Role */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Access Role</span>
              <p className="text-xs font-semibold text-slate-800">Verified Corporate Passenger</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2b. Live Google Sheet Two-Way Sync Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Google Sheets Two-Way Sync
              </h3>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            isGoogleConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            {isGoogleConnected ? '● Read & Write Active' : '● Read-Only (Public)'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">
                مزامنة ثنائية الاتجاه (Read & Write)
              </p>
              <a
                href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SPREADSHEET_ID}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-0.5"
              >
                <span>فتح الشيت</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              قراءة بيانات الموظفين (<span className="font-mono text-slate-700 font-bold">Users_DataBase</span>)، وحفظ تعديلات رقم الهاتف والاسم والحجوزات مباشرة داخل الشيت.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60">
              <span className="text-slate-400 font-mono text-[10px]">Registered Phone in App:</span>
              <span className="font-mono font-bold text-slate-800">{currentUser.phone || 'غير مسجل'}</span>
            </div>
            {lastSheetWriteStatus && (
              <div className="text-[10px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{lastSheetWriteStatus}</span>
              </div>
            )}
          </div>

          {/* Connect / Disconnect Google Auth for Direct Write Access */}
          {!isGoogleConnected ? (
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-blue-950">
                  تفعيل الكتابة المباشرة في Google Sheet
                </p>
                <span className="text-[9px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md">
                  Google Workspace
                </span>
              </div>
              <p className="text-[10px] text-blue-700 leading-snug">
                لتسجيل تعديل رقم هاتفك أو اسمك وحجوزاتك مباشرة داخل الشيت بضغطة زر:
              </p>
              <button
                type="button"
                id="btn-connect-google-sheets-oauth"
                onClick={handleConnectGoogleSheets}
                disabled={isAuthorizingGoogle}
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-2"
              >
                {isAuthorizingGoogle ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>{isAuthorizingGoogle ? 'جاري الاتصال بـ Google...' : 'ربط حساب Google للكتابة (Authorize Write)'}</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-emerald-900">
                  صلاحية الكتابة المباشرة في الشيت نشطة
                </span>
              </div>
              <button
                type="button"
                onClick={handleDisconnectGoogleSheets}
                className="text-[10px] text-slate-500 hover:text-red-600 font-semibold"
              >
                قطع الربط
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              id="btn-sync-google-sheet-now"
              onClick={handleManualSheetSync}
              disabled={isSyncingSheet}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheet ? 'جاري القراءة...' : 'قراءة من الشيت (Read)'}</span>
            </button>

            <button
              type="button"
              id="btn-open-edit-for-sheet-write"
              onClick={() => handleOpenEditModal('name')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>تعديل وحفظ في الشيت (Write)</span>
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight px-1">
          💡 عند تعديل هاتفك أو اسمك عبر زر "تعديل وحفظ"، يتم تحديث صفك في شيت جوجل (<span className="font-mono text-slate-600">Users_DataBase</span>) فوراً.
        </p>
      </div>

      {/* 3. Travel & Push Preferences */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Mobile Push & Notification Settings
          </h3>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
              permissionState === 'granted' || inAppPushEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {permissionState === 'granted' || inAppPushEnabled ? '🔔 Active' : '🔕 Inactive'}
          </span>
        </div>

        {/* Permission Banner */}
        {permissionState !== 'granted' && !inAppPushEnabled && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold">تفعيل إشعارات الهاتف المباشرة</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-snug">
              استلم إشعارات فورية على هاتفك عند تأكيد حجز المقعد، وعند اقتراب موعد تحرك الباص.
            </p>
            <button
              type="button"
              onClick={handleRequestPushPermission}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>السماح بإشعارات الهاتف (Enable Push)</span>
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Departure Reminders</span>
                <span className="text-[10px] text-slate-500">Alert 15 minutes prior to departure</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNotifyTripReminders(!notifyTripReminders);
                onSendToast(
                  !notifyTripReminders ? 'Trip reminders enabled' : 'Trip reminders muted',
                  'info'
                );
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                notifyTripReminders ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Boarding Status Alerts</span>
                <span className="text-[10px] text-slate-500">When bus reaches pickup point</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setNotifyBoardingStatus(!notifyBoardingStatus);
                onSendToast(
                  !notifyBoardingStatus ? 'Boarding alerts enabled' : 'Boarding alerts muted',
                  'info'
                );
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                notifyBoardingStatus ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <Car className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Driver Arrival Alerts</span>
                <span className="text-[10px] text-slate-500">تنبيه فوري فور وصول السائق لنقطة الركوب</span>
              </div>
            </div>
            <button
              type="button"
              id="btn-toggle-driver-arrival"
              onClick={() => {
                const next = !notifyDriverArrival;
                setNotifyDriverArrival(next);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('adc_notify_driver_arrival', String(next));
                }
                onSendToast(
                  next ? 'تم تفعيل تنبيه وصول السائق 🚖' : 'تم إيقاف تنبيه وصول السائق',
                  'info'
                );
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                notifyDriverArrival ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Cross-Platform App Environment Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-4 border border-blue-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-900">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold">Cross-Platform Mobile App</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            PWA Ready
          </span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Optimized for iOS (iPhone) and Android devices with safe-area insets, touch-native responsive layout, and instant offline-tolerant local state.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <span className="px-2 py-0.5 rounded-md bg-white text-blue-700 text-[10px] font-bold border border-blue-200">
            iOS 16+ Ready
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white text-emerald-700 text-[10px] font-bold border border-emerald-200">
            Android 11+ Ready
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white text-slate-700 text-[10px] font-bold border border-slate-200">
            v2.4.0
          </span>
        </div>
      </div>

      {/* 5. Security & Logout Action Buttons */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          id="btn-open-edit-profile-action"
          onClick={() => handleOpenEditModal('name')}
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-between shadow-sm transition active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <span>Edit Profile & Personal Details</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          id="btn-open-change-password-action"
          onClick={() => handleOpenEditModal('password')}
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-between shadow-sm transition active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
            <span>Change Account Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onLogout}
          id="btn-profile-logout"
          className="w-full py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of ADC Shuttle</span>
        </button>
      </div>

      {/* 6. Comprehensive Passenger Profile & Credentials Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    {activeEditTab === 'name' && <UserIcon className="w-4 h-4" />}
                    {activeEditTab === 'email' && <Mail className="w-4 h-4" />}
                    {activeEditTab === 'password' && <Lock className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Update Profile</h3>
                    <p className="text-[11px] text-slate-500">Passenger Account Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-close-edit-modal"
                  onClick={() => setShowEditModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Tabs for Profile Modifications */}
              <div className="flex rounded-2xl bg-slate-100 p-1 gap-1">
                <button
                  type="button"
                  id="tab-edit-name"
                  onClick={() => setActiveEditTab('name')}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    activeEditTab === 'name'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Name</span>
                </button>

                <button
                  type="button"
                  id="tab-edit-email"
                  onClick={() => setActiveEditTab('email')}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    activeEditTab === 'email'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email (OTP)</span>
                </button>

                <button
                  type="button"
                  id="tab-edit-password"
                  onClick={() => setActiveEditTab('password')}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    activeEditTab === 'password'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
              </div>

              {/* TAB 1: EDIT NAME & INFO */}
              {activeEditTab === 'name' && (
                <form onSubmit={handleSaveNameSubmit} className="space-y-3.5 pt-1">
                  <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs">
                    <p className="font-semibold">Update Passenger Display Name</p>
                    <p className="text-[11px] text-blue-700/80 mt-0.5">
                      Your name will appear on seat manifests and corporate ride bookings.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="input-edit-passenger-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. John Smith"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      id="input-edit-passenger-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +20 100 123 4567"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      id="btn-save-passenger-name"
                      disabled={isUpdatingName}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
                    >
                      {isUpdatingName ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Profile Changes...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
                      💡 Saves your name and phone number across the app. Changes made directly in your Google Sheet also sync seamlessly.
                    </p>
                  </div>
                </form>
              )}

              {/* TAB 2: CHANGE WORK EMAIL (WITH MANDATORY OTP) */}
              {activeEditTab === 'email' && (
                <div className="space-y-3.5 pt-1">
                  <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" />
                      <span>OTP Email Verification</span>
                    </div>
                    <p className="text-[11px] text-indigo-700/90 mt-0.5">
                      Changing your work email requires entering the 6-digit OTP sent to your new email.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Email</span>
                    <p className="text-xs font-semibold text-slate-700">{currentUser.email}</p>
                  </div>

                  {!emailOtpSent ? (
                    /* Step 1: Input new email and request OTP */
                    <form onSubmit={handleSendEmailOtpSubmit} className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          New Work Email Address
                        </label>
                        <input
                          type="email"
                          id="input-new-email-address"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="new.email@adc-arch.com"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        id="btn-send-email-otp"
                        disabled={isSendingOtp}
                        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        {isSendingOtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending OTP Code...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send Verification Code (OTP)</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Enter sent OTP code */
                    <form onSubmit={handleVerifyEmailOtpSubmit} className="space-y-3">
                      {/* Highlight banner with sent OTP for easy test verification */}
                      {lastGeneratedOtp && (
                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              OTP Code Sent!
                            </span>
                            <button
                              type="button"
                              id="btn-copy-otp-code"
                              onClick={handleCopyOtp}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold flex items-center gap-1 hover:bg-emerald-700 transition"
                            >
                              {otpCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{otpCopied ? 'Pasted!' : 'Auto-fill OTP'}</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-emerald-700">
                            Sent to: <span className="font-bold">{newEmail}</span>
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[10px] text-emerald-600 font-bold uppercase">Verification OTP:</span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-mono font-black text-sm tracking-widest text-emerald-800">
                              {lastGeneratedOtp}
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Enter 6-Digit OTP Code
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setEmailOtpSent(false);
                              setEmailOtpCode('');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            Change Target Email
                          </button>
                        </div>
                        <input
                          type="text"
                          id="input-verify-email-otp"
                          value={emailOtpCode}
                          onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 text-center font-mono font-bold tracking-widest text-base text-slate-900 focus:outline-hidden focus:border-indigo-600 bg-indigo-50/20"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        id="btn-confirm-email-otp"
                        disabled={isVerifyingOtp || emailOtpCode.length < 4}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Code...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify OTP & Update Email</span>
                          </>
                        )}
                      </button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          id="btn-resend-email-otp"
                          onClick={handleSendEmailOtpSubmit}
                          className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition"
                        >
                          Didn't receive code? Resend OTP
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: CHANGE PASSWORD (OLD PASSWORD REQUIRED RIGHT) */}
              {activeEditTab === 'password' && (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-1">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Old Password Verification</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      You must enter your correct current password to authorize a new password.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Current (Old) Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      id="input-current-old-password"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Write your old password"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      New Password (Min. 6 chars) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      id="input-new-password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Create a new password"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      id="input-confirm-new-password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repeat the new password"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      type="button"
                      id="btn-toggle-profile-passwords"
                      onClick={() => setShowPass(!showPass)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPass ? 'Hide passwords' : 'Show passwords'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-change-password"
                    disabled={isUpdatingPass}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingPass ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying & Updating...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
