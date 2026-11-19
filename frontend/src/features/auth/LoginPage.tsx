import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconArrowLeft,
  IconCheck,
  IconSparkles,
  IconShield,
  IconKey,
  IconAlertCircle,
} from '@tabler/icons-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'forgot' | 'change_password'>('login');
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // First-login password change state
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.must_change_password) {
        setTempToken(res.access_token);
        setActiveTab('change_password');
        toast.info('First login detected: Please set your new password.');
      } else {
        login(res.access_token, res.refresh_token, res.user);
        toast.success(`Welcome back, ${res.user.name}`);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiFetch<any>('/auth/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tempToken}` },
        body: JSON.stringify({
          current_password: password,
          new_password: newPassword,
        }),
      });
      toast.success('Password updated successfully! Logging you in...');
      // Re-login with new password
      const reLoginRes = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: newPassword }),
      });
      login(reLoginRes.access_token, reLoginRes.refresh_token, reLoginRes.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<any>('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (res.dev_reset_token) {
        setDevResetToken(res.dev_reset_token);
        toast.success('Reset token generated! You can use it below.');
      } else {
        toast.info('If the account exists, instructions have been logged.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const fillRole = (roleEmail: string, rolePass: string = 'Admin@123') => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="flex min-h-screen flex-col bg-shelf text-ink font-sans selection:bg-cocoa-wash">
      {/* Top Standalone Bar */}
      <header className="flex h-16 w-full items-center justify-between border-b border-hairline/80 bg-shelf-paper px-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-cocoa">
              PricePulse
            </span>
            <span className="hidden font-sans text-xs text-shelf-muted sm:inline">
              Retail Inflation Tracker
            </span>
          </Link>
          <span className="rounded-full border border-hairline bg-shelf-base px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-shelf-muted font-semibold">
            Illustrative sample data
          </span>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-shelf-base px-3 py-1.5 font-serif text-xs font-bold text-cocoa hover:bg-hairline/50 transition shadow-xs"
        >
          <IconArrowLeft size={15} />
          <span>Back to Dashboard</span>
        </Link>
      </header>

      {/* Main Centered Content */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Card Container in Shelf Tag Aesthetic */}
          <div className="overflow-hidden rounded-2xl border-2 border-hairline bg-shelf-paper shadow-md">
            {/* Hanging String Ribbon Visual */}
            <div className="flex justify-center pt-2">
              <div className="h-3 w-[1.5px] bg-cocoa" />
            </div>

            {/* Card Header */}
            <div className="px-6 pt-3 pb-4 text-center border-b border-hairline/70">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cocoa/10 text-cocoa mb-2">
                {activeTab === 'change_password' ? <IconKey size={22} /> : <IconShield size={22} />}
              </div>
              <h1 className="font-serif text-xl font-bold text-cocoa">
                {activeTab === 'change_password'
                  ? 'Set New Password'
                  : activeTab === 'forgot'
                  ? 'Reset Your Password'
                  : 'Sign in to PricePulse'}
              </h1>
              <p className="mt-0.5 text-xs text-shelf-muted">
                {activeTab === 'change_password'
                  ? 'First-time login requires setting a secure password'
                  : activeTab === 'forgot'
                  ? 'Enter your registered email to receive a recovery token'
                  : 'Access authorized inflation datasets, grid entry, and analytics'}
              </p>

              {sessionExpired && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-price-rise/30 bg-price-rise/10 p-2 text-left font-mono text-xs text-price-rise">
                  <IconAlertCircle size={16} className="shrink-0" />
                  <span>Your session has expired. Please log in again.</span>
                </div>
              )}
            </div>

            {/* Mode 1: Sign In */}
            {activeTab === 'login' && (
              <div className="p-6 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block font-serif text-xs font-bold text-cocoa mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-shelf-muted">
                        <IconMail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@gmail.com"
                        className="w-full rounded-lg border border-hairline bg-shelf-base py-2 pl-9 pr-3 font-mono text-xs text-cocoa placeholder:text-shelf-muted/60 focus:border-cocoa focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-serif text-xs font-bold text-cocoa">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('forgot')}
                        className="text-[11px] text-cocoa hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-shelf-muted">
                        <IconLock size={16} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-hairline bg-shelf-base py-2 pl-9 pr-10 font-mono text-xs text-cocoa placeholder:text-shelf-muted/60 focus:border-cocoa focus:bg-white focus:outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-shelf-muted hover:text-cocoa"
                      >
                        {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-cocoa py-2.5 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-sm"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In as Super Admin'}</span>
                  </button>
                </form>

                {/* One-Click Super Admin Autofill */}
                <div className="border-t border-hairline/80 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-serif text-[11px] font-bold uppercase tracking-wider text-shelf-muted">
                      Configured Account
                    </span>
                    <span className="font-mono text-[10px] text-shelf-muted font-bold">Pass: Admin@123</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fillRole('admin@gmail.com', 'Admin@123')}
                    className="flex w-full items-center justify-between rounded-lg border-2 border-cocoa/20 bg-shelf-base p-2.5 text-left transition hover:border-cocoa hover:bg-white shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cocoa font-mono text-xs font-bold text-white shadow-xs">
                        SA
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-xs font-bold text-cocoa">Super Admin</span>
                          <span className="rounded bg-cocoa/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-cocoa">
                            Full Control
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-shelf-muted">admin@gmail.com</div>
                      </div>
                    </div>
                    <span className="rounded-md border border-hairline bg-shelf px-2 py-1 font-serif text-[10px] font-bold text-cocoa">
                      Auto-fill
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Forgot Password */}
            {activeTab === 'forgot' && (
              <div className="p-6 space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block font-serif text-xs font-bold text-cocoa mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-shelf-muted">
                        <IconMail size={16} />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="admin@gmail.com"
                        className="w-full rounded-lg border border-hairline bg-shelf-base py-2 pl-9 pr-3 font-mono text-xs text-cocoa placeholder:text-shelf-muted/60 focus:border-cocoa focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-cocoa py-2.5 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-sm"
                  >
                    <span>{loading ? 'Processing...' : 'Generate Recovery Token'}</span>
                  </button>

                  {devResetToken && (
                    <div className="rounded-lg border border-hairline bg-shelf-base p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-price-fall">
                        <IconCheck size={16} />
                        <span>Development Reset Token</span>
                      </div>
                      <pre className="overflow-x-auto rounded bg-shelf-paper p-2 font-mono text-[10px] text-cocoa border border-hairline">
                        {devResetToken}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          setTempToken(devResetToken);
                          setActiveTab('change_password');
                        }}
                        className="w-full rounded bg-cocoa py-1 font-serif text-xs font-bold text-white hover:bg-cocoa/90"
                      >
                        Set New Password with Token
                      </button>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-xs text-shelf-muted hover:text-cocoa font-medium"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mode 3: Set New Password / First Login */}
            {activeTab === 'change_password' && (
              <div className="p-6 space-y-4">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block font-serif text-xs font-bold text-cocoa mb-1">
                      New Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-shelf-muted">
                        <IconLock size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-hairline bg-shelf-base py-2 pl-9 pr-3 font-mono text-xs text-cocoa focus:border-cocoa focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-serif text-xs font-bold text-cocoa mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-shelf-muted">
                        <IconLock size={16} />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-hairline bg-shelf-base py-2 pl-9 pr-3 font-mono text-xs text-cocoa focus:border-cocoa focus:bg-white focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-cocoa py-2.5 font-serif text-xs font-bold text-white transition hover:bg-cocoa/90 disabled:opacity-50 shadow-sm"
                  >
                    <span>{loading ? 'Updating Password...' : 'Save Password & Enter'}</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-xs text-shelf-muted hover:text-cocoa font-medium"
                    >
                      Cancel & Return to Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bottom Shelf Tag Barcode Motif */}
            <div className="border-t border-hairline bg-shelf-base/60 px-6 py-3 text-center">
              <div className="font-mono text-xs text-shelf-muted/50 tracking-[0.25em] select-none">
                || | |||| | ||| |||| | || | ||| || ||
              </div>
              <span className="font-mono text-[9px] text-shelf-muted">
                PP-SEC-AUTH-2024
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
