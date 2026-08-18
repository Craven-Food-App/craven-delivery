# Craven Hub Desktop

Native Windows and macOS desktop shell for the internal Craven Hub. The renderer bundles
the shared React portal route tree from `src/routes/InternalHubRoutes.tsx`;
portal screens do not load from the public website.

The application still requires an internet connection for Supabase, email,
payments, maps, and other network services.

## Development

From the repository root:

```powershell
cd apps/desktop/hub
npm install
npm run build
npm run dist:win
```

For day-to-day development:

```powershell
cd apps/desktop/hub
npm install
npm run dev
```

Or from the repository root:

```powershell
npm run desktop:hub:dev
```

Electron packaging dependencies live in `apps/desktop/hub/node_modules`. The renderer reuses the root app's React source via the `@` alias.

## Build renderer

```powershell
npm run desktop:hub:build
```

Output: `apps/desktop/hub/dist`

## Build Windows EXEs

```powershell
npm run desktop:hub:dist:win
```

Output: `apps/desktop/hub/release`

The command produces:

- NSIS installer (`Craven Hub-Setup-1.0.0.exe`)
- Portable executable (`Craven Hub-Portable-1.0.0.exe`)
- Unpacked app (`release/win-unpacked/Craven Hub.exe`)

Windows packaging sets `CSC_IDENTITY_AUTO_DISCOVERY=false` because these are
unsigned internal builds.

## App icon

Both platforms use `build/icon.png` (1024x1024 Craven "C" mark, generated from
`public/craven-c-new.png`). electron-builder derives the Windows `.ico` and the
macOS `.icns` from it, and `electron/main.cjs` uses the same file for the
window icon.

The Windows NSIS installer sidebar uses `build/installerSidebar.bmp` (and the
same art for uninstall), which is a 164x314 crop of
`build/installer-sidebar-source.png`.

Stamping the icon onto `Craven Hub.exe` requires electron-builder's
`winCodeSign` toolchain, which contains macOS symlinks that Windows refuses to
extract without Developer Mode or an elevated shell. If a build fails with
`Cannot create symbolic link ... libcrypto.dylib`, extract the toolchain once
without the unusable folder:

```powershell
$cache = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$7za = "node_modules\electron-builder\node_modules\builder-util\node_modules\7zip-bin\win\x64\7za.exe"
& $7za x -y "-o$cache\winCodeSign-2.6.0" "$cache\<downloaded>.7z" "-x!darwin"
```

Do not work around it by setting `signAndEditExecutable: false`; that skips the
icon and version metadata, which is why earlier builds shipped the stock
Electron icon.

## Build macOS DMGs

macOS packages must be built on macOS. On a Mac:

```bash
cd apps/desktop/hub
npm install --ignore-scripts=false
npm run dist:mac:unsigned
```

Or run the **Build Craven Hub for macOS** workflow from the GitHub Actions
page. Its `craven-hub-macos` artifact contains:

- Apple Silicon installer (`Craven Hub-1.0.0-arm64.dmg`)
- Intel installer (`Craven Hub-1.0.0-x64.dmg`)
- Apple Silicon and Intel ZIP distributions

The automated workflow creates unsigned internal-test builds. For public
distribution without Gatekeeper warnings, configure an Apple Developer ID
Application certificate and Apple notarization credentials in CI.

## Routing

- Web HQ uses `BrowserRouter`.
- Desktop uses `HashRouter`, which is safe for packaged local assets.
- Both consume `InternalHubRoutes`.
- `craven-hub://...` deep links are forwarded to the renderer.

`src/App.tsx` claims `/`, `/auth`, and `/business-auth` for the desktop sign-in
screen and falls through to `InternalHubRoutes` for everything else.

When adding a portal reachable from `MainHub`, add its route to
`src/routes/InternalHubRoutes.tsx`. This keeps web HQ and desktop behavior in
sync.

## Sign-in screen and window chrome

`src/auth/DesktopAuth.tsx` is a desktop-only two-pane sign-in (brand panel plus
a fixed-width form column). It shares all behavior with the web login through
`src/hooks/useBusinessAuth.ts`, so sign-in, password reset, and the forced
temporary-password change stay identical across web HQ and desktop; only the
layout differs.

"Keep me signed in" is stored locally and enforced in `src/main.tsx`, which
clears a persisted session at startup when the box was unchecked.

The window is frameless (`titleBarStyle: 'hidden'`, `hiddenInset` on macOS) and
`src/shell/DesktopTitleBar.tsx` draws the title bar, back/forward/home
navigation, and — on Windows and Linux — the minimize, maximize, and close
buttons through the `hub:window-*` IPC handlers. The Windows title bar overlay
is deliberately not used because it does not paint reliably. macOS keeps its
native traffic lights, so no caption buttons are drawn there.

`--craven-titlebar-height` in `src/desktop.css` must match `TITLE_BAR_HEIGHT`
expectations in the renderer: the value pads `body` and shrinks the `h-screen`
and `min-h-screen` utilities so portals do not scroll by the title bar height.

## Desktop notifications

Craven Hub shows branded notification panels — not the OS Action Center toast —
while the app is open or minimized. Each panel is a frameless always-on-top
window with the C mark, title, body, Open, and Dismiss. Up to three panels
stack in the bottom-right corner of the current display.

The renderer listens to authenticated Supabase Realtime inserts and asks the
main process to open a panel.

Sources:

- `internal_messages` for recipients listed in `recipient_ids`
- `internal_announcements` for company announcements
- `internal_tasks` for tasks assigned to the signed-in user
- `order_support_messages` for Support Operations users (`is_craven_support`)

Click routes are allowlisted in `electron/main.cjs` and only open Hub paths:

- `/hub/internal-comms?tab=messages&message=<id>`
- `/hub/internal-comms?tab=announcements&announcement=<id>`
- `/hub/internal-comms?tab=tasks&task=<id>`
- `/support-operations?tab=conversations&thread=<id>`

Notification preferences live in localStorage and are controlled from the bell
menu in the title bar. Message body previews can be disabled there.

Limitations:

- Alerts do not fire when the app is fully quit. Closed-app delivery needs a
  later tray keep-alive or OS push channel.
- Announcements and tasks also require the Realtime publication migration
  `supabase/migrations/20260817051500_enable_internal_comms_desktop_realtime.sql`.

Smoke-test a notification panel without waiting for a live message:

```powershell
npx electron . --notification-smoke-test
```

## Troubleshooting

The app writes startup problems (failed loads, renderer errors) to:

```text
# Windows
%APPDATA%\@craven\desktop-hub\startup.log

# macOS
~/Library/Application Support/@craven/desktop-hub/startup.log
```

A blank window almost always means the renderer failed to load its bundle.
Check that log first.

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- Electron sandbox enabled
- External links open in the system browser
- A narrow preload bridge exposes only version, external-link, and navigation
  operations
