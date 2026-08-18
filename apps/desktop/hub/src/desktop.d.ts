export {};

declare global {
  interface Window {
    cravenDesktop?: {
      platform: string;
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      onNavigate: (listener: (route: string) => void) => () => void;
      notifications: {
        isSupported: () => Promise<boolean>;
        show: (payload: {
          id: string;
          title: string;
          body: string;
          route: string;
        }) => Promise<{ shown: boolean; reason?: string }>;
      };
      window: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onStateChange: (listener: (state: { maximized: boolean }) => void) => () => void;
      };
    };
  }
}
