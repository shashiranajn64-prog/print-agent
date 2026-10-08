import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  Layers, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  Cpu
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkBuilderModal: React.FC<ApkBuilderModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'capacitor' | 'cloud'>('pwa');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shashi-print-agent.app';

  const capacitorCommands = `# 1. Install Capacitor Android packages
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize native project
npx cap init "Shashi Print Agent" com.shashiprint.agent --web-dir=dist

# 3. Build web assets
npm run build

# 4. Add Android platform & generate APK
npx cap add android
npx cap open android

# Inside Android Studio: Click Build -> Build Bundle(s) / APK(s) -> Build APK(s)
# Your ShashiPrintAgent.apk is ready in android/app/build/outputs/apk/debug/app-debug.apk`;

  const handleCopyCapacitor = () => {
    navigator.clipboard.writeText(capacitorCommands);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Shashi Print Agent - APK & Mobile Setup
              </h2>
              <p className="text-xs text-slate-300">
                Install as standalone Android APK with persistent background printing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 ${
              activeTab === 'pwa'
                ? 'text-sky-400 border-sky-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            1. Direct Phone Install (WebAPK)
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 ${
              activeTab === 'cloud'
                ? 'text-sky-400 border-sky-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            2. 1-Click APK Generator (PWABuilder)
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 ${
              activeTab === 'capacitor'
                ? 'text-sky-400 border-sky-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            3. Native Capacitor Android Build
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-800/50 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400" />
                    Instant Android WebAPK (Recommended)
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    No Android Studio Needed
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Android Chrome generates a real native `.apk` in the background (Google WebAPK). It installs on your phone home screen, runs full screen without any browser bar, and has direct access to Bluetooth thermal printers, vibration, and audio!
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  {!isInstalled && isInstallable ? (
                    <button
                      onClick={install}
                      className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-sky-500/25 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Shashi Print Agent on This Phone</span>
                    </button>
                  ) : isInstalled ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-950/80 px-4 py-2 rounded-xl border border-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Already Installed as Native App on this Device!</span>
                    </div>
                  ) : (
                    <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-slate-300 space-y-1">
                      <p className="font-semibold text-white">To install on an Android Phone:</p>
                      <p>1. Open this link in Google Chrome on your phone: <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">{currentUrl}</code></p>
                      <p>2. Tap Chrome Menu (3 dots) &rarr; tap <strong>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</p>
                      <p>3. Android will automatically install &ldquo;Shashi Print Agent&rdquo; as a native app with app icon!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Download TWA Manifest */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-xs">Download Android TWA Manifest</h4>
                  <p className="text-[11px] text-slate-400">Pre-configured package <code>com.shashiprint.agent</code> for Bubblewrap & Google Play</p>
                </div>
                <a
                  href="/api/apk/twa-manifest.json"
                  download="twa-manifest.json"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition border border-slate-600"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download JSON</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  Generate Downloadable .APK file using PWABuilder (Free)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Microsoft PWABuilder takes this URL and packages it into an official signed Android APK file that you can directly download and install on any phone or distribute to cashiers:
                </p>

                <ol className="list-decimal list-inside space-y-2 text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <li>
                    Copy your App URL:{' '}
                    <span className="font-mono text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded">{currentUrl}</span>
                  </li>
                  <li>
                    Open{' '}
                    <a
                      href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline font-semibold"
                    >
                      PWABuilder.com <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>Click &ldquo;Package for Stores&rdquo; &rarr; Choose <strong>Android</strong>.</li>
                  <li>
                    Set Package ID to: <code className="text-amber-300 font-mono">com.shashiprint.agent</code>
                  </li>
                  <li>Click &ldquo;Download APK&rdquo; and install the APK on any Android phone!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-sky-400" />
                    Native Android Studio Project (Capacitor)
                  </h3>
                  <button
                    onClick={handleCopyCapacitor}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Commands Copied!' : 'Copy Commands'}</span>
                  </button>
                </div>

                <p className="text-slate-300">
                  Run these commands in your project terminal to generate full native Android Studio `.apk` files with native Bluetooth plugins:
                </p>

                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {capacitorCommands}
                </pre>
              </div>
            </div>
          )}

          {/* Android Best Practices Checklist for Continuous Counter/Kitchen Printing */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Guidelines for Continuous 24/7 Printing on Android Phones:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-0.5">1. Keep-Awake / Kiosk Mode</span>
                Keep the &ldquo;Awake&rdquo; toggle in the top header ON so the phone display does not sleep during billing hours.
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-0.5">2. Battery Optimization Off</span>
                In Android Settings &rarr; Apps &rarr; Shashi Print Agent &rarr; Battery &rarr; Select <strong>&ldquo;Unrestricted&rdquo;</strong>.
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-0.5">3. Auto-Print Active</span>
                Leave Auto-Print ON. Any orders pushed to <code className="text-amber-300">/api/print-jobs</code> will print immediately without manual clicking.
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-0.5">4. Auto Reconnect</span>
                Pair your Bluetooth printer once; the agent remembers and reconnects automatically.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
