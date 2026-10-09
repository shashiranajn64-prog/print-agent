import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  X, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AppVersionInfo {
  latestVersion: string;
  releaseDate: string;
  changelog: string[];
  mandatoryUpdate: boolean;
  apkDownloadUrl: string;
  webUrl: string;
}

export const InAppUpdateBanner: React.FC = () => {
  const currentAppVersion = '1.0.1';
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    apiFetch('/api/app-version')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppVersionInfo) => {
        if (data) {
          setVersionInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed || !versionInfo) return null;

  const hasNewerVersion = versionInfo.latestVersion !== currentAppVersion;

  const handleInstantUpdate = () => {
    setIsUpdating(true);
    // 1. Unregister old service workers and clear cache to force freshest bundle
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }

    setTimeout(() => {
      setUpdateSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }, 1200);
  };

  return (
    <aside aria-label="Version Updates" className="bg-gradient-to-r from-sky-950/90 via-indigo-950/90 to-purple-950/90 border-b border-sky-800/60 px-4 py-2 text-xs text-slate-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                Shashi Print Agent v{currentAppVersion}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Auto-Update Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Future updates server par push hote hi shopkeepers ke phone me bina kisi reinstall ke live update ho jate hain!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasNewerVersion ? (
            <button
              onClick={handleInstantUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-[11px] shadow transition active:scale-95"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Updating App...' : `Update to v${versionInfo.latestVersion}`}</span>
            </button>
          ) : (
            <button
              onClick={handleInstantUpdate}
              disabled={isUpdating}
              title="Force check latest version and reload"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition active:scale-95"
            >
              <RotateCw className={`w-3 h-3 ${isUpdating ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isUpdating ? 'Syncing...' : 'Sync Latest Version'}</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
