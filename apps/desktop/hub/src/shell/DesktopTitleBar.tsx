import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, ChevronRight, Home, Minus, Square, Copy, X } from 'lucide-react';
import brandMark from '../assets/craven-c.png';
import {
  readDesktopNotificationPreferences,
  writeDesktopNotificationPreferences,
  type DesktopNotificationPreferences,
} from '../notifications/desktopNotificationPreferences';

const AUTH_ROUTES = new Set(['/', '/auth', '/business-auth']);

const navButtonClass =
  'craven-no-drag flex h-6 w-6 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white';

const captionButtonClass =
  'craven-no-drag flex h-9 w-11 items-center justify-center text-white/60 transition hover:bg-white/10 hover:text-white';

function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const controls = window.cravenDesktop?.window;

  useEffect(() => {
    if (!controls) return;
    void controls.isMaximized().then(setMaximized);
    return controls.onStateChange((state) => setMaximized(state.maximized));
  }, [controls]);

  if (!controls) return null;

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label="Minimize"
        className={captionButtonClass}
        onClick={() => void controls.minimize()}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        className={captionButtonClass}
        onClick={() => void controls.toggleMaximize().then(setMaximized)}
      >
        {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        aria-label="Close"
        className={`${captionButtonClass} hover:bg-[#c42b1c] hover:text-white`}
        onClick={() => void controls.close()}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function NotificationSettings() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<DesktopNotificationPreferences>(
    readDesktopNotificationPreferences,
  );

  const update = (patch: Partial<DesktopNotificationPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    writeDesktopNotificationPreferences(next);
  };

  return (
    <div className="craven-no-drag relative">
      <button
        type="button"
        className={captionButtonClass}
        aria-label="Notification settings"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {preferences.enabled && (
          <span className="absolute right-3 top-2 h-1.5 w-1.5 rounded-full bg-[#ff7a45]" />
        )}
      </button>

      {open && (
        <div className="absolute right-1 top-10 w-72 rounded-lg border border-white/10 bg-[#17171b] p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Desktop alerts</p>
              <p className="mt-0.5 text-[11px] leading-4 text-white/45">
                Branded panels appear while Craven Hub is open or minimized.
              </p>
            </div>
            <button
              type="button"
              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Close notification settings"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {[
            { key: 'enabled', label: 'Enable desktop alerts' },
            { key: 'internalComms', label: 'Internal messages and tasks' },
            { key: 'supportConversations', label: 'Support conversations' },
            { key: 'showPreviews', label: 'Show message previews' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between border-t border-white/[0.07] py-2.5 text-[12px] text-white/70"
            >
              <span>{label}</span>
              <input
                type="checkbox"
                checked={preferences[key as keyof DesktopNotificationPreferences]}
                disabled={key !== 'enabled' && !preferences.enabled}
                onChange={(event) =>
                  update({ [key]: event.target.checked } as Partial<DesktopNotificationPreferences>)
                }
                className="h-4 w-4 accent-[#ff7a45] disabled:opacity-35"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DesktopTitleBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMac = window.cravenDesktop?.platform === 'darwin';
  const onAuthScreen = AUTH_ROUTES.has(location.pathname);

  return (
    <header
      className="craven-titlebar flex items-center gap-2 border-b border-white/10 bg-[#0b0b0d] pl-3"
      style={isMac ? { paddingLeft: 82 } : undefined}
    >
      <img src={brandMark} alt="" className="h-4 w-4" />
      <span className="text-[12px] font-medium text-white/70">Craven Hub</span>

      {!onAuthScreen && (
        <div className="ml-3 flex items-center gap-1">
          <button
            type="button"
            className={navButtonClass}
            aria-label="Back"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={navButtonClass}
            aria-label="Forward"
            onClick={() => navigate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={navButtonClass}
            aria-label="Hub home"
            onClick={() => navigate('/hub')}
          >
            <Home className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center">
        {!onAuthScreen && <NotificationSettings />}
        {/* macOS draws its own traffic lights on the left. */}
        {!isMac && <WindowControls />}
      </div>
    </header>
  );
}
