const { app, BrowserWindow, Menu, ipcMain, protocol, screen, session, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_SCHEME = 'craven-hub';
const isDevelopment = process.argv.includes('--dev');
let mainWindow = null;
const activeNotificationPanels = new Map();
const recentlyShownNotifications = new Map();

const NOTIFICATION_ROUTE_PREFIXES = ['/hub/internal-comms', '/support-operations'];
const NOTIFICATION_DEDUPE_MS = 5 * 60 * 1000;
const NOTIFICATION_PANEL_WIDTH = 380;
const NOTIFICATION_PANEL_HEIGHT = 188;
const NOTIFICATION_PANEL_GAP = 12;
const NOTIFICATION_PANEL_MARGIN = 18;
const NOTIFICATION_PANEL_DURATION_MS = 9000;
const NOTIFICATION_PANEL_MAX = 3;

function diagnosticLogFile() {
  try {
    const directory = app.getPath('userData');
    fs.mkdirSync(directory, { recursive: true });
    return path.join(directory, 'startup.log');
  } catch {
    return path.join(os.tmpdir(), 'craven-hub-startup.log');
  }
}

function logDiagnostic(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  process.stdout.write(`${line}\n`);
  try {
    fs.appendFileSync(diagnosticLogFile(), `${line}\n`, 'utf8');
  } catch {
    // Logging must never break startup.
  }
}

function attachDiagnostics(webContents) {
  webContents.on('console-message', (...args) => {
    // Electron 36+ passes a details object; older versions pass positional arguments.
    const details = typeof args[0] === 'object' && args[0] && 'message' in args[0] ? args[0] : null;
    const level = details ? details.level : args[1];
    const message = details ? details.message : args[2];
    const isProblem = level === 'error' || level === 'warning' || level >= 2;
    if (isProblem) logDiagnostic(`renderer console [${level}]: ${message}`);
  });
  webContents.on('did-fail-load', (_event, code, description, url) => {
    logDiagnostic(`did-fail-load ${code} ${description} url=${url}`);
  });
  webContents.on('preload-error', (_event, preloadPath, error) => {
    logDiagnostic(`preload-error ${preloadPath} ${error?.message}`);
  });
  webContents.on('render-process-gone', (_event, details) => {
    logDiagnostic(`render-process-gone ${JSON.stringify(details)}`);
  });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: false,
    },
  },
]);

const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function readWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return { width: 1440, height: 920 };
  }
}

/**
 * Saved bounds can outlive the display setup that produced them, so they are
 * clamped to the work area. Without this the window can restore taller than the
 * usable desktop and hide its own bottom edge behind the taskbar.
 */
function fitStateToWorkArea(state) {
  const display =
    state.x != null && state.y != null
      ? screen.getDisplayMatching({
          x: state.x,
          y: state.y,
          width: state.width || 1440,
          height: state.height || 920,
        })
      : screen.getPrimaryDisplay();
  const area = display.workArea;

  const width = Math.min(state.width || 1440, area.width);
  const height = Math.min(state.height || 920, area.height);
  const fitted = { width, height, maximized: state.maximized };

  if (state.x != null && state.y != null) {
    fitted.x = Math.min(Math.max(state.x, area.x), area.x + area.width - width);
    fitted.y = Math.min(Math.max(state.y, area.y), area.y + area.height - height);
  }

  return fitted;
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const maximized = mainWindow.isMaximized();
  const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds();
  fs.writeFileSync(stateFile(), JSON.stringify({ ...bounds, maximized }), 'utf8');
}

function normalizeRoute(input) {
  if (!input) return '/hub';
  try {
    if (input.startsWith(`${APP_SCHEME}://`)) {
      const url = new URL(input);
      const hostRoute = url.hostname && url.hostname !== 'app' ? `/${url.hostname}` : '';
      const route = hostRoute || (url.pathname === '/' ? '/hub' : url.pathname);
      return `${route}${url.search}`;
    }
  } catch {
    return '/hub';
  }
  return input.startsWith('/') ? input : `/${input}`;
}

function normalizeNotificationRoute(input) {
  if (typeof input !== 'string' || input.length > 512 || !input.startsWith('/')) return null;
  try {
    const parsed = new URL(input, 'https://craven-hub.local');
    if (parsed.origin !== 'https://craven-hub.local') return null;
    const allowed = NOTIFICATION_ROUTE_PREFIXES.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${parsed.pathname}${parsed.search}` : null;
  } catch {
    return null;
  }
}

function cleanNotificationText(input, maxLength) {
  if (typeof input !== 'string') return '';
  return input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function pruneNotificationDedupe(now = Date.now()) {
  for (const [id, shownAt] of recentlyShownNotifications) {
    if (now - shownAt > NOTIFICATION_DEDUPE_MS) recentlyShownNotifications.delete(id);
  }
}

function notificationKindFromRoute(route) {
  if (route.startsWith('/support-operations')) return 'Support';
  if (route.includes('tab=announcements')) return 'Announcement';
  if (route.includes('tab=tasks')) return 'Task';
  if (route.includes('tab=messages')) return 'Message';
  return 'Craven Hub';
}

function displayForNotificationPanel() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return screen.getDisplayMatching(mainWindow.getBounds());
  }
  return screen.getPrimaryDisplay();
}

function layoutNotificationPanels() {
  const { workArea } = displayForNotificationPanel();
  const entries = [...activeNotificationPanels.values()];
  entries.forEach((panel, index) => {
    if (!panel || panel.isDestroyed()) return;
    const x = Math.round(workArea.x + workArea.width - NOTIFICATION_PANEL_WIDTH - NOTIFICATION_PANEL_MARGIN);
    const y = Math.round(
      workArea.y +
        workArea.height -
        NOTIFICATION_PANEL_MARGIN -
        (index + 1) * NOTIFICATION_PANEL_HEIGHT -
        index * NOTIFICATION_PANEL_GAP,
    );
    panel.setPosition(x, Math.max(workArea.y + NOTIFICATION_PANEL_MARGIN, y), false);
  });
}

function closeNotificationPanel(id) {
  const panel = activeNotificationPanels.get(id);
  if (!panel) return;
  activeNotificationPanels.delete(id);
  if (!panel.isDestroyed()) panel.close();
  layoutNotificationPanels();
}

function showDesktopNotification(sender, rawPayload) {
  if (!mainWindow || mainWindow.isDestroyed() || sender !== mainWindow.webContents) {
    return { shown: false, reason: 'unauthorized' };
  }

  const id = cleanNotificationText(rawPayload?.id, 128);
  const title = cleanNotificationText(rawPayload?.title, 80);
  const body = cleanNotificationText(rawPayload?.body, 240);
  const route = normalizeNotificationRoute(rawPayload?.route);
  if (!id || !title || !body || !route) return { shown: false, reason: 'invalid-payload' };

  const now = Date.now();
  pruneNotificationDedupe(now);
  if (recentlyShownNotifications.has(id)) return { shown: false, reason: 'duplicate' };
  recentlyShownNotifications.set(id, now);

  try {
    // Drop the oldest panel when the stack is full so new alerts stay visible.
    while (activeNotificationPanels.size >= NOTIFICATION_PANEL_MAX) {
      const oldestId = activeNotificationPanels.keys().next().value;
      closeNotificationPanel(oldestId);
    }

    const iconPath = path.resolve(__dirname, '..', 'build', 'icon.png');
    const panel = new BrowserWindow({
      width: NOTIFICATION_PANEL_WIDTH,
      height: NOTIFICATION_PANEL_HEIGHT,
      show: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      focusable: true,
      transparent: true,
      hasShadow: false,
      backgroundColor: '#00000000',
      title: 'Craven Hub Notification',
      webPreferences: {
        preload: path.join(__dirname, 'notification-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    activeNotificationPanels.set(id, panel);
    panel.setAlwaysOnTop(true, 'pop-up-menu');
    layoutNotificationPanels();

    panel.once('ready-to-show', () => {
      if (!panel.isDestroyed()) panel.showInactive();
    });
    panel.on('closed', () => {
      if (activeNotificationPanels.get(id) === panel) {
        activeNotificationPanels.delete(id);
        layoutNotificationPanels();
      }
    });

    void panel.loadFile(path.join(__dirname, 'notification-panel.html'), {
      query: {
        id,
        title,
        body,
        route,
        kind: notificationKindFromRoute(route),
        durationMs: String(NOTIFICATION_PANEL_DURATION_MS),
        icon: pathToFileURL(iconPath).href,
      },
    });

    return { shown: true };
  } catch (error) {
    recentlyShownNotifications.delete(id);
    logDiagnostic(`notification panel failed id=${id} ${error?.message}`);
    return { shown: false, reason: 'show-failed' };
  }
}

function navigate(route) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const target = normalizeRoute(route);
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('hub:navigate', target);
    });
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow.webContents.send('hub:navigate', target);
  mainWindow.show();
  mainWindow.focus();
}

function openExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) return Promise.resolve();
    return shell.openExternal(url.toString());
  } catch {
    return Promise.resolve();
  }
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

const SESSION_PARTITION = 'persist:craven-hub';

function installApplicationProtocol() {
  const handler = async (request) => {
    const requestUrl = new URL(request.url);
    const rendererRoot = path.resolve(__dirname, '..', 'dist');
    let relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    if (!relativePath) relativePath = 'index.html';

    let target = path.resolve(rendererRoot, relativePath);
    const relativeToRoot = path.relative(rendererRoot, target);
    const escapedRendererRoot = relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);
    if (escapedRendererRoot || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      target = path.join(rendererRoot, 'index.html');
    }

    try {
      const body = await fs.promises.readFile(target);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': CONTENT_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
          // Vite emits crossorigin script/style tags, so served assets need CORS headers.
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (error) {
      logDiagnostic(`asset read failed target=${target} ${error?.message}`);
      return new Response('Not found', { status: 404 });
    }
  };

  // The window renders in a persisted partition, which has its own protocol
  // registry, so the handler must be installed there as well as on the default.
  protocol.handle(APP_SCHEME, handler);
  session.fromPartition(SESSION_PARTITION).protocol.handle(APP_SCHEME, handler);
}

function buildMenu() {
  const template = [
    {
      label: 'Craven Hub',
      submenu: [
        { label: 'Hub Home', accelerator: 'CmdOrCtrl+H', click: () => navigate('/hub') },
        { label: 'Back', accelerator: 'Alt+Left', click: () => mainWindow?.webContents.navigationHistory.goBack() },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow?.webContents.navigationHistory.goForward() },
        { type: 'separator' },
        { role: 'reload' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDevelopment ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Craven HQ Website',
          click: () => openExternalUrl('https://hq.cravenusa.com/hub'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function createWindow() {
  const state = fitStateToWorkArea(readWindowState());
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#101013',
    title: 'Craven Hub',
    icon: path.resolve(__dirname, '..', 'build', 'icon.png'),
    // The renderer draws the title bar. macOS keeps its native traffic lights;
    // Windows and Linux get renderer-drawn controls wired to the IPC handlers
    // below, because the Windows overlay does not paint reliably here.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 16, y: 11 } } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: SESSION_PARTITION,
    },
  });

  if (state.maximized) mainWindow.maximize();

  attachDiagnostics(mainWindow.webContents);

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const sendMaximizedState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('hub:window-state', { maximized: mainWindow.isMaximized() });
  };
  mainWindow.on('maximize', sendMaximizedState);
  mainWindow.on('unmaximize', sendMaximizedState);

  mainWindow.webContents.on('did-finish-load', async () => {
    const probeMount = async (label) => {
      try {
        const mountedNodes = await mainWindow?.webContents.executeJavaScript(
          'document.getElementById("root")?.childElementCount ?? -1',
        );
        logDiagnostic(`renderer ${label} child nodes=${mountedNodes}`);
      } catch (error) {
        logDiagnostic(`mount probe failed ${label} ${error?.message}`);
      }
    };
    await probeMount('mounted');
    // The renderer may still be awaiting the session preference check before
    // createRoot runs, so re-check after React has had time to mount.
    setTimeout(() => {
      void probeMount('settled');
    }, 3000);
  });
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`${APP_SCHEME}://`)) {
      navigate(url);
    } else {
      void openExternalUrl(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocal = isDevelopment
      ? url.startsWith('http://127.0.0.1:8095')
      : url.startsWith(`${APP_SCHEME}://`);
    if (isLocal) {
      const target = new URL(url);
      const isRendererEntry = isDevelopment
        ? target.pathname === '/' || target.pathname === '/index.html'
        : target.hostname === 'app' && target.pathname === '/index.html';
      if (!isRendererEntry && !target.hash) {
        event.preventDefault();
        navigate(`${target.pathname}${target.search}`);
      }
      return;
    }

    event.preventDefault();
    void openExternalUrl(url);
  });

  const entryUrl = isDevelopment
    ? 'http://127.0.0.1:8095/#/hub'
    : `${APP_SCHEME}://app/index.html#/hub`;

  try {
    await mainWindow.loadURL(entryUrl);
  } catch (error) {
    logDiagnostic(`load failed url=${entryUrl} ${error?.message}`);
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${APP_SCHEME}://`));
    navigate(deepLink || '/hub');
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('com.craven.hub.desktop');
    if (process.defaultApp && process.argv[1]) {
      app.setAsDefaultProtocolClient(APP_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(APP_SCHEME);
    }

    logDiagnostic(`app ready dev=${isDevelopment} userData=${app.getPath('userData')}`);
    if (!isDevelopment) installApplicationProtocol();
    buildMenu();
    await createWindow();
    logDiagnostic('window created');
    if (process.argv.includes('--notification-smoke-test')) {
      const result = showDesktopNotification(mainWindow?.webContents, {
        id: `smoke-${Date.now()}`,
        title: 'Craven Hub notification test',
        body: 'Open brings you into Internal Comms. Dismiss closes this panel.',
        route: '/hub/internal-comms?tab=messages',
      });
      logDiagnostic(`notification smoke ${JSON.stringify(result)}`);
    }
    const initialDeepLink = process.argv.find((arg) => arg.startsWith(`${APP_SCHEME}://`));
    if (initialDeepLink) navigate(initialDeepLink);

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  });
}

ipcMain.handle('hub:get-version', () => app.getVersion());
ipcMain.handle('hub:open-external', (_event, url) => openExternalUrl(url));
ipcMain.handle('hub:notification-supported', () => true);
ipcMain.handle('hub:notification-show', (event, payload) => showDesktopNotification(event.sender, payload));
ipcMain.on('hub:notification-panel-action', (event, payload) => {
  const id = cleanNotificationText(payload?.id, 128);
  const action = payload?.action;
  const route = normalizeNotificationRoute(payload?.route);
  const panel = activeNotificationPanels.get(id);
  if (!panel || panel.isDestroyed() || event.sender !== panel.webContents) return;

  closeNotificationPanel(id);
  if (action === 'open' && route) navigate(route);
});

ipcMain.handle('hub:window-minimize', () => mainWindow?.minimize());
ipcMain.handle('hub:window-toggle-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
  return mainWindow.isMaximized();
});
ipcMain.handle('hub:window-close', () => mainWindow?.close());
ipcMain.handle('hub:window-is-maximized', () => Boolean(mainWindow?.isMaximized()));

app.on('open-url', (event, url) => {
  event.preventDefault();
  navigate(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
