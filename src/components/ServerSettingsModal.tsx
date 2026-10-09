import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  X, 
  Smartphone, 
  Globe, 
  Zap, 
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { 
  getApiBaseUrl, 
  setApiBaseUrl, 
  DEFAULT_CLOUD_API_URL, 
  testServerConnectivity, 
  isOfflineModeActive, 
  setOfflineModeActive,
  isNativeApp 
} from '../utils/api';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged
}) => {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(getApiBaseUrl());
      setOfflineMode(isOfflineModeActive());
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testServerConnectivity(serverUrl);
      setTestResult({
        ok: res.ok,
        message: res.statusText
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Connection error'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(serverUrl);
    setOfflineModeActive(offlineMode);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onSettingsChanged?.();
      onClose();
    }, 800);
  };

  const handleResetDefault = () => {
    setServerUrl(DEFAULT_CLOUD_API_URL);
    setOfflineMode(false);
  };

  const handleEnableOffline = () => {
    setOfflineMode(true);
    setOfflineModeActive(true);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onSettingsChanged?.();
      onClose();
    }, 800);
  };

  const isNative = isNativeApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Server & Network Settings
                {isNative && (
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Android APK
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Manage backend cloud connection & offline mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Active Mode Notice */}
          <div className={`p-4 rounded-2xl border ${
            offlineMode 
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' 
              : 'bg-sky-950/30 border-sky-500/30 text-sky-200'
          }`}>
            <div className="flex items-start gap-3">
              {offlineMode ? (
                <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Globe className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-semibold text-sm">
                  {offlineMode ? '📱 Phone Standalone / Offline Mode Active' : '🌐 Cloud Server Mode Active'}
                </p>
                <p className="text-slate-300">
                  {offlineMode
                    ? 'App aapke mobile phone me bina kisi internet server ke direct chalega. Bluetooth printer, billing aur print queue local phone memory me safely work karega.'
                    : 'App cloud server se connected hai. Online customer QR code aur remote print sync enabled hai.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Offline Button */}
          {!offlineMode && (
            <div className="bg-slate-800/60 border border-slate-700/70 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Bina Server Ke Chalana Hai?</h4>
                <p className="text-xs text-slate-400 mt-0.5">Agar server connect nahi ho raha to Phone Offline Mode chalu karein.</p>
              </div>
              <button
                type="button"
                onClick={handleEnableOffline}
                className="px-3.5 py-2 text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-xl transition-colors shrink-0"
              >
                Use Offline Mode
              </button>
            </div>
          )}

          {/* Server URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Backend Server URL</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[11px] text-sky-400 hover:underline"
              >
                Reset to Default
              </button>
            </label>
            <div className="relative">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-domain.com ya https://...run.app"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Default Cloud Server ya apna deployed URL / local IP (jaise <code className="text-sky-300">http://192.168.1.5:3000</code>) yahan enter karein.
            </p>
          </div>

          {/* Test Connection Button & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing connection...' : 'Test Server Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                testResult.ok 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <div>
                  <span className="font-semibold">{testResult.ok ? 'Connection Successful!' : 'Connection Failed:'}</span>{' '}
                  {testResult.message}
                </div>
              </div>
            )}
          </div>

          {/* Offline Mode Toggle Checkbox */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Force Phone Offline Mode</p>
              <p className="text-xs text-slate-400">Server errors ko bypass karke direct phone me chalayein</p>
            </div>
            <input
              type="checkbox"
              checked={offlineMode}
              onChange={(e) => setOfflineMode(e.target.checked)}
              className="w-5 h-5 accent-sky-500 rounded cursor-pointer"
            />
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Settings successfully save ho gayi hain!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
