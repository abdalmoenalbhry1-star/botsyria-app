import { TelegramUser } from '../types';

// Declare Telegram WebApp types on window
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: string;
          hash?: string;
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        isVersionAtLeast?: (version: string) => boolean;
        expand: () => void;
        close: () => void;
        ready: () => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        CloudStorage?: {
          setItem: (key: string, value: string, callback?: (error: Error | null, result?: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value?: string) => void) => void;
          getItems: (keys: string[], callback: (error: Error | null, values?: Record<string, string>) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, result?: boolean) => void) => void;
          removeItems: (keys: string[], callback?: (error: Error | null, result?: boolean) => void) => void;
          getKeys: (callback: (error: Error | null, keys?: string[]) => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

/**
 * Initializes the Telegram Mini App environment.
 * Expands to full screen, signals readiness, sets dark background.
 */
export function initTelegramWebApp(): void {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      if (typeof tg.ready === 'function') {
        tg.ready();
      }
      if (typeof tg.expand === 'function') {
        tg.expand();
      }
      
      // Set Telegram chrome styling if supported (requires version >= 6.1)
      const canSetColor = typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast('6.1') : true;
      if (canSetColor) {
        if (typeof tg.setBackgroundColor === 'function') {
          tg.setBackgroundColor('#0f172a');
        }
        if (typeof tg.setHeaderColor === 'function') {
          tg.setHeaderColor('#0f172a');
        }
      }
    }
  } catch {
    // Ignore initialization errors in non-Telegram or older environments
  }
}

/**
 * Retrieves the current Telegram user from initDataUnsafe.
 * Falls back to a mock user when previewed in standard browser.
 */
export function getTelegramUser(): TelegramUser {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user;
    }
  } catch {
    // fallback
  }

  // Fallback user for web testing / preview
  return {
    id: 85934120,
    first_name: 'محمد',
    last_name: 'أحمد',
    username: 'mohammed_tele',
    language_code: 'ar',
    is_premium: true,
  };
}

/**
 * Checks if running inside an actual Telegram client
 */
export function isRunningInTelegram(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
}

/**
 * Triggers Telegram native haptic feedback
 */
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    // HapticFeedback requires Telegram WebApp version >= 6.1
    if (typeof tg.isVersionAtLeast === 'function' && !tg.isVersionAtLeast('6.1')) {
      return;
    }

    const haptic = tg.HapticFeedback;
    if (!haptic) return;

    if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {
    // Ignore haptic errors in non-supported environments
  }
}

/**
 * Opens links safely using Telegram WebApp methods when available
 */
export function openExternalLink(url: string) {
  try {
    if (window.Telegram?.WebApp) {
      // Exclude sharing links from openTelegramLink because Telegram's native openTelegramLink
      // fails or hangs on non-invitation/non-chat paths like https://t.me/share/url
      if ((url.startsWith('https://t.me/') && !url.includes('/share/')) || url.startsWith('tg://')) {
        window.Telegram.WebApp.openTelegramLink(url);
        return;
      }
      window.Telegram.WebApp.openLink(url);
      return;
    }
  } catch {
    // fallback
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Checks if Telegram CloudStorage is natively supported in this runtime.
 * Telegram CloudStorage was officially introduced in Mini Apps version 6.9.
 * If accessed on version < 6.9 (e.g. 6.0 in browser previews or older clients),
 * Telegram's SDK will throw: "[Telegram.WebApp] CloudStorage is not supported in version 6.0"
 */
export function isCloudStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.CloudStorage) return false;

    // Check version through Telegram WebApp API
    if (typeof tg.isVersionAtLeast === 'function') {
      return tg.isVersionAtLeast('6.9');
    }

    // Fallback manual version parsing
    if (tg.version) {
      const parts = tg.version.split('.').map((p) => parseInt(p, 10));
      const major = parts[0] || 0;
      const minor = parts[1] || 0;
      if (major < 6 || (major === 6 && minor < 9)) {
        return false;
      }
    }

    return typeof tg.CloudStorage.getItem === 'function';
  } catch {
    return false;
  }
}

/**
 * Telegram Official CloudStorage: Get item by key
 * Preserved permanently across devices and bot uninstalls in Telegram cloud!
 */
export function tgCloudStorageGet(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (!isCloudStorageAvailable()) {
        resolve(null);
        return;
      }
      const storage = window.Telegram?.WebApp?.CloudStorage;
      if (!storage || typeof storage.getItem !== 'function') {
        resolve(null);
        return;
      }
      storage.getItem(key, (error, value) => {
        if (error) {
          resolve(null);
        } else {
          resolve(value || null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Telegram Official CloudStorage: Set item by key
 * Saves permanently to the user's Telegram Cloud account
 */
export function tgCloudStorageSet(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!isCloudStorageAvailable()) {
        resolve(false);
        return;
      }
      const storage = window.Telegram?.WebApp?.CloudStorage;
      if (!storage || typeof storage.setItem !== 'function') {
        resolve(false);
        return;
      }
      storage.setItem(key, value, (error, result) => {
        if (error) {
          resolve(false);
        } else {
          resolve(result !== false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Telegram Official CloudStorage: Get multiple items at once
 */
export function tgCloudStorageGetItems(keys: string[]): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    try {
      if (!isCloudStorageAvailable()) {
        resolve({});
        return;
      }
      const storage = window.Telegram?.WebApp?.CloudStorage;
      if (!storage || typeof storage.getItems !== 'function') {
        resolve({});
        return;
      }
      storage.getItems(keys, (error, values) => {
        if (error) {
          resolve({});
        } else {
          resolve(values || {});
        }
      });
    } catch {
      resolve({});
    }
  });
}
