/**
 * API utility for Shashi Print Agent
 * Handles hybrid connectivity:
 * 1. Web browser: uses relative paths (/api/...)
 * 2. Mobile Android APK (Capacitor): routes to configured Cloud Server URL or user-defined host
 * 3. Offline / Standalone mode: seamlessly falls back to localStorage so the app always works on mobile
 */

import { ShopAccount, PrinterDevice, PrintJob, UserFeedback } from '../../server';

export const DEFAULT_CLOUD_API_URL = 'https://ais-pre-ahpif75nvakpcce7ybedge-718433802346.asia-southeast1.run.app';

// Local storage keys
const KEY_CUSTOM_API_URL = 'shashi_custom_api_url';
const KEY_OFFLINE_MODE = 'shashi_offline_mode_active';
const KEY_LOCAL_SHOP = 'shashi_local_shop_account';
const KEY_LOCAL_PRINTERS = 'shashi_local_printers';
const KEY_LOCAL_JOBS = 'shashi_local_print_jobs';
const KEY_LOCAL_FEEDBACKS = 'shashi_local_feedbacks';

/**
 * Detect if running as native mobile app (Capacitor) or in a packaged Android webview
 */
export const isNativeApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isCap = Boolean((window as any).Capacitor?.isNativePlatform?.());
  const isLocalOrigin = 
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  return isCap || isLocalOrigin;
};

/**
 * Get configured or detected API Base URL
 */
export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const custom = localStorage.getItem(KEY_CUSTOM_API_URL);
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  // In native Android APK without custom URL, default to cloud URL
  if (isNativeApp()) {
    return DEFAULT_CLOUD_API_URL;
  }

  // In web browser, use relative URL (same origin)
  return '';
};

/**
 * Set custom server URL
 */
export const setApiBaseUrl = (url: string) => {
  if (url && url.trim()) {
    localStorage.setItem(KEY_CUSTOM_API_URL, url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(KEY_CUSTOM_API_URL);
  }
};

/**
 * Check if user explicitly enabled offline/standalone phone mode
 */
export const isOfflineModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEY_OFFLINE_MODE) === 'true';
};

export const setOfflineModeActive = (active: boolean) => {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(KEY_OFFLINE_MODE, 'true');
  } else {
    localStorage.removeItem(KEY_OFFLINE_MODE);
  }
};

/**
 * Build full URL for an API endpoint
 */
export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
};

/**
 * Public Web URL for customer QR code scanning
 */
export const getPublicWebUrl = (): string => {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_API_URL;
  const custom = localStorage.getItem(KEY_CUSTOM_API_URL);
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  if (isNativeApp()) {
    return DEFAULT_CLOUD_API_URL;
  }
  return window.location.origin;
};

/**
 * Test connectivity to a server URL
 */
export const testServerConnectivity = async (testUrl?: string): Promise<{ ok: boolean; statusText: string; latencyMs?: number }> => {
  const targetBase = testUrl !== undefined ? testUrl.trim().replace(/\/+$/, '') : getApiBaseUrl();
  const checkEndpoint = targetBase ? `${targetBase}/api/agent-status` : '/api/agent-status';
  const start = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(checkEndpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { ok: true, statusText: `Connected (${latencyMs}ms)`, latencyMs };
    }
    return { ok: false, statusText: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { ok: false, statusText: 'Connection timed out (4s)' };
    }
    return { ok: false, statusText: err.message || 'Network error / Server unreachable' };
  }
};

/**
 * Unified fetch wrapper that prepends the proper base URL
 */
export const apiFetch = async (endpoint: string, init?: RequestInit): Promise<Response> => {
  const url = apiUrl(endpoint);
  return fetch(url, init);
};

// ==========================================
// Local Storage Offline Fallback Controllers
// ==========================================

export const localDb = {
  getShop: (): ShopAccount | null => {
    try {
      const data = localStorage.getItem(KEY_LOCAL_SHOP);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  saveShop: (shop: ShopAccount | null) => {
    try {
      if (shop) {
        localStorage.setItem(KEY_LOCAL_SHOP, JSON.stringify(shop));
      } else {
        localStorage.removeItem(KEY_LOCAL_SHOP);
      }
    } catch (e) {
      console.error('Failed to save local shop', e);
    }
  },
  getPrinters: (): PrinterDevice[] => {
    try {
      const data = localStorage.getItem(KEY_LOCAL_PRINTERS);
      if (data) return JSON.parse(data);
    } catch {}
    // Default thermal printer devices
    return [
      {
        id: 'local_bt_thermal_58',
        name: 'Bluetooth Thermal 58mm',
        type: 'bluetooth',
        paperWidth: '58mm',
        category: 'thermal',
        status: 'idle',
        isDefault: true,
        model: 'POS-58 Bluetooth Mini'
      },
      {
        id: 'local_usb_thermal_80',
        name: 'USB Thermal 80mm',
        type: 'usb',
        paperWidth: '80mm',
        category: 'thermal',
        status: 'idle',
        isDefault: false,
        model: 'RP-80 Thermal Receipt'
      }
    ];
  },
  savePrinters: (printers: PrinterDevice[]) => {
    try {
      localStorage.setItem(KEY_LOCAL_PRINTERS, JSON.stringify(printers));
    } catch (e) {
      console.error('Failed to save local printers', e);
    }
  },
  getJobs: (): PrintJob[] => {
    try {
      const data = localStorage.getItem(KEY_LOCAL_JOBS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  saveJobs: (jobs: PrintJob[]) => {
    try {
      localStorage.setItem(KEY_LOCAL_JOBS, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed to save local jobs', e);
    }
  },
  addJob: (job: PrintJob) => {
    const list = localDb.getJobs();
    list.unshift(job);
    localDb.saveJobs(list);
  },
  updateJobStatus: (id: string, status: 'pending' | 'processing' | 'printed' | 'failed') => {
    const list = localDb.getJobs();
    const target = list.find(j => j.id === id);
    if (target) {
      target.status = status;
      if (status === 'printed') target.executedAt = new Date().toISOString();
      localDb.saveJobs(list);
    }
  },
  deleteJob: (id: string) => {
    const list = localDb.getJobs().filter(j => j.id !== id);
    localDb.saveJobs(list);
  },
  clearCompletedJobs: () => {
    const list = localDb.getJobs().filter(j => j.status !== 'printed');
    localDb.saveJobs(list);
  },
  getFeedbacks: (): UserFeedback[] => {
    try {
      const data = localStorage.getItem(KEY_LOCAL_FEEDBACKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  addFeedback: (fb: UserFeedback) => {
    const list = localDb.getFeedbacks();
    list.unshift(fb);
    try {
      localStorage.setItem(KEY_LOCAL_FEEDBACKS, JSON.stringify(list));
    } catch {}
  }
};
