import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { COMPANY_LOGO } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Phone, Shield, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  onSendToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onLogin: (ident: string, pass: string) => { success: boolean; message?: string; user?: User };
  onRegister: (name: string, pass: string, email: string, phone: string, role: string) => { success: boolean; message?: string; otp?: string };
  onVerifyRegOTP: (email: string, otp: string) => { success: boolean; message?: string };
  onSendForgotOTP: (email: string) => { success: boolean; message?: string; otp?: string };
  onResetPassword: (email: string, otp: string, newPass: string) => { success: boolean; message?: string };
}

type AuthView = 'login' | 'register' | 'verifyReg' | 'forgot' | 'resetPass';

const REMEMBER_ME_KEY = 'adc_remember_me';
const REMEMBERED_IDENTIFIER_KEY = 'adc_remembered_identifier';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onSendToast,
  onLogin,
  onRegister,
  onVerifyRegOTP,
  onSendForgotOTP,
  onResetPassword,
}) => {
  const [view, setView] = useState<AuthView>('login');

  // Login form
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [loginIdentifier, setLoginIdentifier] = useState<string>(() => {
    return localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';
  });
  const [loginPass, setLoginPass] = useState<string>('');
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);

  // Register form
  const [regName, setRegName] = useState<string>('');
  const [regUser, setRegUser] = useState<string>('');
  const [regDomain, setRegDomain] = useState<string>('@adc-arch.com');
  const [regPrefix, setRegPrefix] = useState<string>('010');
  const [regPhoneBody, setRegPhoneBody] = useState<string>('');
  const [regPass, setRegPass] = useState<string>('');
  const [showRegPass, setShowRegPass] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [regOtp, setRegOtp] = useState<string>('');

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [showNewPass, setShowNewPass] = useState<boolean>(false);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPass.trim()) {
      onSendToast('Please enter both identifier and password.', 'error');
      return;
    }

    const res = onLogin(loginIdentifier, loginPass);
    if (res.success && res.user) {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, loginIdentifier.trim());
      } else {
        localStorage.setItem(REMEMBER_ME_KEY, 'false');
        localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      }
      onSendToast(`Welcome back, ${res.user.name}!`, 'success');
      onLoginSuccess(res.user);
    } else {
      onSendToast(res.message || 'Login failed. Please check credentials.', 'error');
    }
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = regName.trim();
    if (!cleanName || !regUser.trim() || !regPhoneBody.trim() || !regPass.trim()) {
      onSendToast('Please fill out all registration fields.', 'error');
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(cleanName)) {
      onSendToast('Full Name must be in English characters only.', 'error');
      return;
    }

    const fullEmail = (regUser.trim() + regDomain).toLowerCase();
    const fullPhone = regPrefix + regPhoneBody.trim();

    const res = onRegister(cleanName, regPass, fullEmail, fullPhone, 'Employee');
    if (res.success) {
      setPendingEmail(fullEmail);
      if (res.otp) setRegOtp(res.otp); // Pre-fill or demo prompt
      onSendToast(res.message || 'Verification code sent to your email.', 'success');
      setView('verifyReg');
    } else {
      onSendToast(res.message || 'Registration failed.', 'error');
    }
  };

  // Handle Verify Registration OTP
  const handleVerifyRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOtp.trim()) {
      onSendToast('Please enter the 6-digit verification code.', 'error');
      return;
    }

    const res = onVerifyRegOTP(pendingEmail, regOtp);
    if (res.success) {
      onSendToast(res.message || 'Account verified! You can now sign in.', 'success');
      setLoginIdentifier(pendingEmail);
      setLoginPass(regPass);
      setView('login');
    } else {
      onSendToast(res.message || 'Invalid verification code.', 'error');
    }
  };

  // Handle Send Forgot OTP
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      onSendToast('Please enter your corporate email address.', 'error');
      return;
    }

    const res = onSendForgotOTP(forgotEmail);
    if (res.success) {
      if (res.otp) setForgotOtp(res.otp);
      onSendToast(res.message || 'Reset code sent to email.', 'success');
      setView('resetPass');
    } else {
      onSendToast(res.message || 'Email not found.', 'error');
    }
  };

  // Handle Reset Password Submit
  const handleResetPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !newPass.trim()) {
      onSendToast('Please enter OTP and your new password.', 'error');
      return;
    }

    const res = onResetPassword(forgotEmail, forgotOtp, newPass);
    if (res.success) {
      onSendToast(res.message || 'Password reset successfully.', 'success');
      setLoginIdentifier(forgotEmail);
      setLoginPass(newPass);
      setView('login');
    } else {
      onSendToast(res.message || 'Failed to update password.', 'error');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-full flex flex-col justify-center py-6" id="auth-container">
      {/* Top Brand Logo */}
      <div className="text-center mb-6">
        <img
          src={COMPANY_LOGO}
          alt="ADC Architecture & Design Consultants"
          className="max-h-12 max-w-[210px] mx-auto object-contain mb-2"
        />
        <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
          Corporate Shuttle & Mobility Portal
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* 1. LOGIN VIEW */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="text-center pb-1">
                <h2 className="text-xl font-bold text-slate-900">Sign In</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your corporate credentials</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Corporate Email / Phone / ID:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="loginIdentifier"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="minatharwatwadie@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden transition"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      id="loginPass"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden transition"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label
                    htmlFor="rememberMe"
                    className="flex items-center gap-2 cursor-pointer select-none group"
                  >
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setRememberMe(val);
                        localStorage.setItem(REMEMBER_ME_KEY, String(val));
                        if (!val) {
                          localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
                        }
                      }}
                      className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginIdentifier);
                      setView('forgot');
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  id="btn-login-submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/25 active:scale-98 transition"
                >
                  Login to Shuttle
                </button>

                <button
                  type="button"
                  id="btn-goto-register"
                  onClick={() => setView('register')}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Create New Account
                </button>
              </form>
            </motion.div>
          )}

          {/* 2. REGISTER VIEW */}
          {view === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-bold text-slate-900">New Account</h2>
                <div className="w-6" />
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                {/* Full English Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Full Name (English Only):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="regName"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                      placeholder="e.g. Mina Tharwat"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Email User + Domain */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Email Address:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      id="regContactUser"
                      value={regUser}
                      onChange={(e) => setRegUser(e.target.value)}
                      placeholder="username"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                    />
                    <select
                      id="regContactDomain"
                      value={regDomain}
                      onChange={(e) => setRegDomain(e.target.value)}
                      className="w-36 px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      <option value="@adc-arch.com">@adc-arch.com</option>
                      <option value="@gmail.com">@gmail.com</option>
                      <option value="@yahoo.com">@yahoo.com</option>
                      <option value="@outlook.com">@outlook.com</option>
                    </select>
                  </div>
                </div>

                {/* Egyptian Phone Prefix + Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Mobile Number:
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      id="regPhonePrefix"
                      value={regPrefix}
                      onChange={(e) => setRegPrefix(e.target.value)}
                      className="w-20 px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                    >
                      <option value="010">010</option>
                      <option value="011">011</option>
                      <option value="012">012</option>
                      <option value="015">015</option>
                    </select>
                    <input
                      type="text"
                      id="regPhoneBody"
                      maxLength={8}
                      value={regPhoneBody}
                      onChange={(e) => setRegPhoneBody(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="8-digit number"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPass ? 'text' : 'password'}
                      id="regPass"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="Choose strong password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowRegPass(!showRegPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                    >
                      {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-register-submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-600/25 active:scale-98 transition"
                >
                  Send Verification OTP
                </button>
              </form>
            </motion.div>
          )}

          {/* 3. VERIFY REGISTRATION OTP VIEW */}
          {view === 'verifyReg' && (
            <motion.div
              key="verifyReg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Verify Email</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter the 6-digit code sent to <strong className="text-slate-700">{pendingEmail}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyRegSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  id="regOtpCode"
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="6-digit OTP"
                  className="w-full text-center text-xl font-bold tracking-[0.4em] py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                />

                <button
                  type="submit"
                  id="btn-verify-reg-submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition"
                >
                  Verify & Activate Account
                </button>

                <button
                  type="button"
                  onClick={() => setView('register')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Registration
                </button>
              </form>
            </motion.div>
          )}

          {/* 4. FORGOT PASSWORD VIEW */}
          {view === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your registered email to receive a reset OTP code.
                </p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  id="forgotEmail"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                />

                <button
                  type="submit"
                  id="btn-send-forgot-otp"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition"
                >
                  Send OTP Code
                </button>

                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Login
                </button>
              </form>
            </motion.div>
          )}

          {/* 5. RESET PASSWORD VIEW */}
          {view === 'resetPass' && (
            <motion.div
              key="resetPass"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Update Password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter OTP and set your new password for {forgotEmail}
                </p>
              </div>

              <form onSubmit={handleResetPassSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    6-Digit OTP:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    id="otpCode"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full text-center text-lg font-bold tracking-widest py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      id="newPass"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="New password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-update-password-submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition"
                >
                  Update Password & Sign In
                </button>

                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
                >
                  &larr; Back
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
