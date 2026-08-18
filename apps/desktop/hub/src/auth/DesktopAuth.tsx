import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import brandMark from '../assets/craven-c.png';
import brandPanel from '../assets/desktop-auth-panel.png';
import { keepSignedIn, setKeepSignedIn } from './desktopSessionPreference';

const SUPPORT_MAILTO = 'mailto:help@cravenusa.com?subject=Craven%20Hub%20desktop%20sign-in';

const fieldClass =
  'w-full rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#ff7a45] focus:bg-white/[0.09] focus:ring-2 focus:ring-[#ff7a45]/30 disabled:opacity-60';

const labelClass = 'mb-1.5 block text-[13px] font-medium text-white/70';

const primaryButtonClass =
  'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#ff7a45] text-sm font-semibold text-white transition hover:bg-[#ff5a1f] focus:outline-none focus:ring-2 focus:ring-[#ff7a45]/50 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50';

const linkButtonClass =
  'text-[13px] font-medium text-white/55 transition hover:text-white focus:outline-none focus:text-white';

function BrandPanel({ version }: { version: string }) {
  return (
    <aside className="relative hidden w-[420px] shrink-0 overflow-hidden bg-[#0b0b0d] lg:block">
      <img src={brandPanel} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0d]/85 via-[#0b0b0d]/45 to-[#0b0b0d]/95" />
      {/* The artwork is brightest near the bottom, where the footer text sits. */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0b0b0d] to-transparent" />
      {/* Extra bottom padding keeps the footer clear of an overlapping taskbar. */}
      <div className="relative flex h-full flex-col justify-between px-9 pb-16 pt-9">
        <div className="flex items-center gap-3">
          <img src={brandMark} alt="Crave'n" className="h-9 w-9" />
          <div>
            <p className="text-[15px] font-semibold leading-tight text-white">Craven Hub</p>
            <p className="text-[12px] leading-tight text-white/50">Internal operations</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[22px] font-semibold leading-snug text-white">
            Every order, driver, and merchant in one place.
          </p>
          <p className="text-[13px] leading-relaxed text-white/55">
            Sign in with your Crave'n internal account to reach the executive, operations, and
            engineering portals.
          </p>
        </div>

        <p className="text-[12px] text-white/55">{version ? `Version ${version}` : ''}</p>
      </div>
    </aside>
  );
}

export default function DesktopAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailField = useRef<HTMLInputElement>(null);
  const [version, setVersion] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [stayedSignedIn, setStayedSignedIn] = useState(keepSignedIn);

  const auth = useBusinessAuth({
    search: location.search,
    navigation: {
      toRedirectTarget: (path) => {
        const target = path === '/business-auth' || path.startsWith('/auth') ? '/hub' : path;
        navigate(target, { replace: true });
      },
      toExecutiveProfile: () => navigate('/executive/profile?reset=true', { replace: true }),
    },
  });

  useEffect(() => {
    void window.cravenDesktop?.getVersion().then(setVersion);
  }, []);

  useEffect(() => {
    emailField.current?.focus();
  }, []);

  const openSupport = () => {
    void window.cravenDesktop?.openExternal(SUPPORT_MAILTO);
  };

  const toggleStaySignedIn = (value: boolean) => {
    setStayedSignedIn(value);
    setKeepSignedIn(value);
  };

  const trackCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="flex min-h-screen bg-[#101013]">
      <BrandPanel version={version} />

      <main className="flex flex-1 items-center justify-center px-10">
        {auth.isRedirecting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#ff7a45]" />
            <p className="text-[13px] text-white/50">Opening Craven Hub...</p>
          </div>
        ) : (
        <div className="w-[360px]">
          <img src={brandMark} alt="" className="mb-6 h-10 w-10 lg:hidden" />

          {auth.mode === 'updatePassword' ? (
            <h1 className="text-[22px] font-semibold text-white">Set a new password</h1>
          ) : auth.mode === 'reset' ? (
            <h1 className="text-[22px] font-semibold text-white">Reset your password</h1>
          ) : (
            <h1 className="text-[22px] font-semibold text-white">Sign in to Craven Hub</h1>
          )}

          <p className="mt-1.5 text-[13px] text-white/50">
            {auth.mode === 'updatePassword'
              ? 'Your account is using a temporary password.'
              : auth.mode === 'reset'
                ? "We'll email you a reset link that opens in your browser."
                : 'Use your Crave\'n internal account.'}
          </p>

          {auth.error && (
            <div
              role="alert"
              className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300"
            >
              {auth.error}
            </div>
          )}

          {auth.resetSent && (
            <div
              role="status"
              className="mt-5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300"
            >
              Reset email sent. Check your inbox, then follow the link in your browser.
            </div>
          )}

          {auth.mode === 'updatePassword' ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void auth.updatePassword();
              }}
            >
              <div>
                <label className={labelClass} htmlFor="desktop-new-password">
                  New password
                </label>
                <input
                  id="desktop-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={fieldClass}
                  value={auth.newPassword}
                  onChange={(event) => auth.setNewPassword(event.target.value)}
                  disabled={auth.isUpdatingPassword}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="desktop-confirm-password">
                  Confirm password
                </label>
                <input
                  id="desktop-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={fieldClass}
                  value={auth.confirmPassword}
                  onChange={(event) => auth.setConfirmPassword(event.target.value)}
                  disabled={auth.isUpdatingPassword}
                />
              </div>

              <button type="submit" className={primaryButtonClass} disabled={auth.isUpdatingPassword}>
                {auth.isUpdatingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                {auth.isUpdatingPassword ? 'Updating' : 'Update password'}
              </button>
            </form>
          ) : auth.mode === 'reset' ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void auth.sendResetEmail();
              }}
            >
              <div>
                <label className={labelClass} htmlFor="desktop-reset-email">
                  Work email
                </label>
                <input
                  id="desktop-reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  className={fieldClass}
                  value={auth.resetEmail}
                  onChange={(event) => auth.setResetEmail(event.target.value)}
                  disabled={auth.isResetting}
                />
              </div>

              <button type="submit" className={primaryButtonClass} disabled={auth.isResetting}>
                {auth.isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
                {auth.isResetting ? 'Sending' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={auth.cancelPasswordReset}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 text-sm font-medium text-white/70 transition hover:border-white/25 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            </form>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void auth.signIn();
              }}
            >
              <div>
                <label className={labelClass} htmlFor="desktop-email">
                  Work email
                </label>
                <input
                  id="desktop-email"
                  ref={emailField}
                  type="email"
                  autoComplete="email"
                  required
                  className={fieldClass}
                  value={auth.email}
                  onChange={(event) => auth.setEmail(event.target.value)}
                  disabled={auth.isSubmitting}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="desktop-password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="desktop-password"
                    type={revealPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`${fieldClass} pr-10`}
                    value={auth.password}
                    onChange={(event) => auth.setPassword(event.target.value)}
                    onKeyUp={trackCapsLock}
                    onKeyDown={trackCapsLock}
                    disabled={auth.isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealPassword((current) => !current)}
                    aria-label={revealPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 transition hover:text-white/80"
                  >
                    {revealPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {capsLockOn && (
                  <p className="mt-1.5 text-[12px] text-amber-300/90">Caps Lock is on.</p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/60">
                <input
                  type="checkbox"
                  checked={stayedSignedIn}
                  onChange={(event) => toggleStaySignedIn(event.target.checked)}
                  className="h-4 w-4 rounded border-white/25 bg-white/10 accent-[#ff7a45]"
                />
                Keep me signed in on this computer
              </label>

              <button type="submit" className={primaryButtonClass} disabled={auth.isSubmitting}>
                {auth.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {auth.isSubmitting ? 'Signing in' : 'Sign in'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={auth.startPasswordReset} className={linkButtonClass}>
                  Forgot password?
                </button>
                <button type="button" onClick={openSupport} className={linkButtonClass}>
                  Contact support
                </button>
              </div>
            </form>
          )}
        </div>
        )}
      </main>
    </div>
  );
}
