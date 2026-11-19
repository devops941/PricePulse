import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { IconEye, IconEyeOff, IconLock, IconMail, IconAlertTriangle } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Flipped state for first-login password change (§10.6)
  const [isFlipped, setIsFlipped] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.must_change_password) {
        setTempToken(res.access_token);
        setIsFlipped(true);
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
        body: JSON.stringify({ email, password: newPassword }),
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
    try {
      const res = await apiFetch<any>('/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.dev_reset_token) {
        setDevResetToken(res.dev_reset_token);
        toast.success('Password reset token generated (see demo box below)');
      } else {
        toast.info('If the account exists, instructions have been sent.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error requesting reset');
    }
  };

  const quickFill = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-shelf flex flex-col items-center justify-start pt-6 sm:pt-12 px-4 relative overflow-hidden select-none">
      
      {/* Session Expired Banner (§10.6) */}
      {sessionExpired && (
        <div className="mb-4 max-w-md w-full bg-[#FEF7EC] border border-[#F8DCB3] text-warn px-4 py-2.5 rounded-tile flex items-center gap-2.5 shadow-shelf animate-bounce">
          <IconAlertTriangle size={18} className="shrink-0" />
          <span className="text-xs font-sans font-medium">
            Your session has expired. Please sign in again to resume.
          </span>
        </div>
      )}

      {/* Top thin string rail representing supermarket shelf line */}
      <div className="w-full max-w-md flex flex-col items-center">
        {/* String from top edge */}
        <div className="w-[1.5px] h-8 sm:h-12 bg-cocoa" />

        {/* Hanging Price-Tag Card Container with 3D Flip (§10.6) */}
        <div className={cn("w-full max-w-md perspective-1000", sessionExpired && "animate-pulse")}>
          <div
            className={cn(
              "relative transition-transform duration-500 transform-style-3d",
              isFlipped && "rotate-y-180"
            )}
          >
            {/* FRONT FACE: SIGN-IN TAG */}
            <div className="price-tag-shape bg-tile border border-hairline shadow-2xl p-6 sm:p-8 rounded-sm relative backface-hidden">
              {/* Punched hole at top-left angled notch */}
              <div className="price-tag-hole absolute top-2 left-2" />

              {/* Tag Header */}
              <div className="text-center mb-6 pt-2">
                <span className="font-serif text-3xl text-cocoa block font-normal tracking-tight">
                  PricePulse
                </span>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-muted font-sans mt-1 block">
                  Retail Inflation Intelligence Desk
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
                    Email Address
                  </label>
                  <div className="relative">
                    <IconMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@pricepulse.local"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf/40 focus:bg-tile text-ink placeholder:text-muted/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase text-muted font-sans">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-[11px] text-cocoa hover:text-cocoa-deep font-sans underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <IconLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf/40 focus:bg-tile text-ink placeholder:text-muted/60 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep transition-colors shadow-shelf disabled:opacity-50 mt-2"
                >
                  {loading ? 'Authenticating...' : 'Sign In to PricePulse'}
                </button>
              </form>

              {/* Quick Demo Credentials helper */}
              <div className="mt-6 pt-4 border-t border-hairline/60">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted block mb-2 font-sans">
                  Quick Demo Role Autofill:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => quickFill('admin@pricepulse.local', 'AdminPass@123')}
                    className="p-1.5 rounded border border-hairline bg-shelf hover:bg-cocoa-wash/50 text-left truncate text-cocoa"
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('analyst@pricepulse.local', 'TempPassword@123')}
                    className="p-1.5 rounded border border-hairline bg-shelf hover:bg-cocoa-wash/50 text-left truncate text-cocoa"
                  >
                    Analyst
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('collector@pricepulse.local', 'CollectorPass@123')}
                    className="p-1.5 rounded border border-hairline bg-shelf hover:bg-cocoa-wash/50 text-left truncate text-cocoa"
                  >
                    Collector
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFill('viewer@pricepulse.local', 'PricePulse@Demo2026!')}
                    className="p-1.5 rounded border border-hairline bg-shelf hover:bg-cocoa-wash/50 text-left truncate text-cocoa"
                  >
                    Viewer
                  </button>
                </div>
              </div>

              {/* Decorative Barcode Strip at bottom (§10.6) */}
              <div className="mt-6 pt-3 border-t border-hairline flex flex-col items-center">
                <div className="h-6 w-full flex items-center justify-between px-2 bg-shelf/60 py-1">
                  {/* Decorative barcode vertical bars */}
                  {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
                    <div
                      key={i}
                      className="bg-ink h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[9px] text-muted tracking-widest mt-1">
                  PP-SEC-8901245-IN
                </span>
              </div>
            </div>

            {/* BACK FACE: FIRST-LOGIN PASSWORD CHANGE FLIPPED TAG (§10.6) */}
            <div className="price-tag-shape bg-tile border border-hairline shadow-2xl p-6 sm:p-8 rounded-sm absolute inset-0 backface-hidden rotate-y-180">
              <div className="price-tag-hole absolute top-2 left-2" />
              
              <div className="text-center mb-6 pt-2">
                <span className="font-serif text-2xl text-cocoa block font-normal tracking-tight">
                  Update Password
                </span>
                <span className="text-[11px] font-sans text-muted block mt-1">
                  First-time access requires personal password setup.
                </span>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf/40 focus:bg-tile text-ink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-muted mb-1 font-sans">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf/40 focus:bg-tile text-ink"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-md bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep transition-colors shadow-shelf disabled:opacity-50 mt-2"
                >
                  {loading ? 'Updating...' : 'Set Password & Enter'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="w-full text-center text-xs text-muted hover:text-ink font-sans underline"
                >
                  Back to Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-tile rounded-tile border border-hairline p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-serif text-xl text-ink mb-1">Reset Password</h3>
            <p className="text-xs text-muted mb-4 font-sans leading-relaxed">
              Enter your email to receive a password reset token. In dev mode, tokens are logged directly.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="analyst@pricepulse.local"
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-hairline bg-shelf text-ink"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(false);
                    setDevResetToken(null);
                  }}
                  className="px-3 py-1.5 rounded border border-hairline text-xs font-sans text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-cocoa text-white text-xs font-sans font-medium hover:bg-cocoa-deep"
                >
                  Request Reset
                </button>
              </div>
            </form>

            {devResetToken && (
              <div className="mt-4 p-3 bg-shelf rounded border border-hairline">
                <span className="text-[10px] uppercase font-mono text-muted block mb-1">
                  Dev Generated Reset Token:
                </span>
                <span className="text-xs font-mono text-cocoa break-all block">
                  {devResetToken}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
