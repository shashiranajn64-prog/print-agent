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
  Cpu,
  QrCode,
  Share2,
  Send,
  RotateCw,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { apiFetch } from '../utils/api';

interface ApkBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkBuilderModal: React.FC<ApkBuilderModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'capacitor' | 'cloud' | 'github' | 'updates'>('pwa');
  const [copiedGithubYml, setCopiedGithubYml] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://shashi-print-agent.app';

  const githubWorkflowYml = `name: Build Shashi Print Agent APK

on:
  push:
    branches: [ main, master ]
    tags:
      - 'v*'
  pull_request:
    branches: [ main, master ]
  workflow_dispatch: # Allows 1-click manual trigger from GitHub Actions tab

jobs:
  build-apk:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: 1. Checkout Repository
        uses: actions/checkout@v4

      - name: 2. Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: 3. Install NPM Dependencies
        run: |
          npm install

      - name: 4. Build Web Application (Vite)
        run: |
          npm run build

      - name: 5. Setup Java JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 6. Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: 7. Configure Capacitor Android & Inject Permissions
        run: |
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android

          # Inject Bluetooth & USB thermal printer permissions into AndroidManifest.xml
          node -e '
          const fs = require("fs");
          const file = "android/app/src/main/AndroidManifest.xml";
          if (fs.existsSync(file)) {
            let content = fs.readFileSync(file, "utf8");
            const permissions = \`
    <!-- Permissions for ESC/POS Thermal Printers, Bluetooth & Network -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-feature android:name="android.hardware.bluetooth" android:required="false" />
    <uses-feature android:name="android.hardware.usb.host" android:required="false" />
\`;
            if (!content.includes("android.permission.BLUETOOTH_CONNECT")) {
              content = content.replace(/<application/i, permissions + "\\n    <application");
              fs.writeFileSync(file, content, "utf8");
              console.log("Permissions successfully injected into AndroidManifest.xml");
            }
          }
          '

      - name: 8. Grant Execute Permission for Gradle
        run: |
          chmod +x android/gradlew

      - name: 9. Build Debug APK with Gradle
        working-directory: android
        run: |
          ./gradlew assembleDebug --stacktrace

      - name: 10. Prepare Output APK
        run: |
          mkdir -p release-apk
          cp android/app/build/outputs/apk/debug/app-debug.apk release-apk/ShashiPrintAgent-debug.apk

      - name: 11. Upload APK Artifact (Download from GitHub Summary)
        uses: actions/upload-artifact@v4
        with:
          name: ShashiPrintAgent-Android-APK
          path: release-apk/ShashiPrintAgent-debug.apk
          retention-days: 30

      - name: 12. Create GitHub Release (Optional on Git Tags)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: release-apk/ShashiPrintAgent-debug.apk
          name: Release \${{ github.ref_name }}
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

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
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'text-amber-400 border-amber-400 font-bold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>4. GitHub Actions (Auto APK)</span>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`pb-2.5 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'updates'
                ? 'text-emerald-400 border-emerald-400 font-bold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. Future Updates (नया वर्जन कैसे मिलेगा)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 text-xs text-slate-300">
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sky-950/60 to-slate-900 border border-sky-800/50 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400" />
                    Instant Android WebAPK (100% Working on Mobile)
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    No Android Studio Needed
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Google Chrome Android me real native APK generate karta hai. Ye seedha phone home screen par install ho jata hai, bina browser bar ke full-screen chalta hai, aur isme Bluetooth thermal printer, vibration aur background printing ka direct access milta hai!
                </p>

                {/* Direct Action Buttons on Mobile */}
                <div className="flex flex-wrap items-center gap-3">
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
                    <button
                      onClick={async () => {
                        const worked = await install();
                        if (!worked) {
                          alert('Apne phone ke Chrome menu (3 dots) par tap karein aur "Install app" ya "Add to Home screen" par click karein!');
                        }
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install App Now (Chrome One-Tap)</span>
                    </button>
                  )}

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Install Shashi Print Agent on Android phone: ' + currentUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-semibold transition active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Phone on WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentUrl);
                      alert('App Link Copied! Mobile Chrome me paste karke open karein.');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </button>
                </div>

                {/* QR Code Scan to open on mobile phone directly */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(currentUrl)}`}
                      alt="Scan to Install APK on Phone"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <h4 className="font-bold text-white text-xs flex items-center justify-center sm:justify-start gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Scan from Phone Camera to Open & Install</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Apne Android phone ke camera ya Google Lens se is QR code ko scan karein. Phone me website khulegi, fir neeche <strong>&ldquo;Install App&rdquo;</strong> dabate hi app phone me install ho jayegi!
                    </p>
                    <div className="font-mono text-[10px] text-sky-400 truncate max-w-xs">
                      {currentUrl}
                    </div>
                  </div>
                </div>

                {/* Manual 3-dot instructions */}
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1 text-[11px]">
                  <p className="font-semibold text-white">Agar Install prompt automatically na aaye:</p>
                  <p>1. Android phone me Google Chrome kholein aur link open karein.</p>
                  <p>2. Chrome ke top-right <strong>3 dots (⋮)</strong> par click karein.</p>
                  <p>3. <strong>&ldquo;Install app&rdquo;</strong> ya <strong>&ldquo;Add to Home Screen&rdquo;</strong> par tap karein. Ye bina kisi coding ke seedha phone me app icon ke sath install ho jata hai!</p>
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

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>GitHub Actions Automated APK Builder (.github/workflows/build-apk.yml)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Code push karte hi GitHub free me cloud par Android APK build kar deta hai!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(githubWorkflowYml);
                      setCopiedGithubYml(true);
                      setTimeout(() => setCopiedGithubYml(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition"
                  >
                    {copiedGithubYml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGithubYml ? 'YAML Copied!' : 'Copy Workflow YAML'}</span>
                  </button>
                </div>

                {/* Step-by-step instructions */}
                <ol className="list-decimal list-inside space-y-2 text-slate-300 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-[11px]">
                  <li>
                    <strong>File already created:</strong> Repository me <code className="text-amber-300">.github/workflows/build-apk.yml</code> file ban chuki hai.
                  </li>
                  <li>
                    <strong>Push to GitHub:</strong> Apna code GitHub repo me push karein (<code className="text-sky-300">git push origin main</code>).
                  </li>
                  <li>
                    <strong>Actions Tab:</strong> GitHub repository page par jayein aur upar <strong>&ldquo;Actions&rdquo;</strong> tab par click karein.
                  </li>
                  <li>
                    <strong>Run Workflow:</strong> Left side me <strong>&ldquo;Build Shashi Print Agent APK&rdquo;</strong> select karein &rarr; right side me <strong>&ldquo;Run workflow&rdquo;</strong> button dabayein.
                  </li>
                  <li>
                    <strong>Download APK:</strong> Build complete hone par (lagbhag 2-3 minute), workflow run par click karein &rarr; neeche <strong>Artifacts</strong> section me se <code className="text-emerald-400 font-bold">ShashiPrintAgent-Android-APK</code> download kar lein!
                  </li>
                </ol>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Workflow Code (.github/workflows/build-apk.yml):</span>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[10px] text-amber-300 overflow-x-auto max-h-56 scrollbar-thin">
                    {githubWorkflowYml}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-sky-950/60 border border-emerald-800/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    How Future Updates Reach Shopkeepers (App Update Guide)
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Auto-Sync v1.0.1
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Agar aap aaj APK release kar dete hain aur baad me koi bhi naya feature, design ya bug-fix add karte hain, to shopkeeper ko naya version kaise milega? Yahan 4 best mechanisms setup hain:
                </p>

                {/* 4 Methods */}
                <div className="space-y-3">
                  {/* Method 1: PWA / WebAPK Instant OTA */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        1. WebAPK / Phone Install (100% Automatic Over-The-Air)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded">
                        No Reinstall Needed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Jab shopkeeper ne Chrome se &ldquo;Install on Phone&rdquo; kiya hai: Aap jab bhi server/cloud par naya code push karenge, phone me app open hote hi background service worker <strong>automatically naya version fetch kar lega</strong>. Shopkeeper ko dobara APK download karne ki bilkul zaroorat nahi padti!
                    </p>
                  </div>

                  {/* Method 2: In-App Version Checker */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                        2. In-App Auto-Update Banner &amp; API
                      </span>
                      <span className="text-[10px] text-sky-400 font-semibold bg-sky-950/80 px-2 py-0.5 rounded">
                        API: /api/app-version
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      App open hote hi server se latest version compare karti hai. Naya update aate hi shopkeeper ke screen par <strong>&ldquo;Update to v1.0.2&rdquo;</strong> ka 1-click button dikhai deta hai. Bas ek tap me naya code sync ho jata hai.
                    </p>
                  </div>

                  {/* Method 3: Standalone APK Direct Upgrade */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        3. Native Standalone APK Update (Zero Data Loss)
                      </span>
                      <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/80 px-2 py-0.5 rounded">
                        Android Upgrade
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Agar shopkeeper ne direct <code>.apk</code> file se install kiya hai:
                      Aap GitHub Actions se naya APK generate karke shopkeeper ko bhejenge. Shopkeeper naya APK open karke <strong>&ldquo;Update&rdquo;</strong> tap karega.
                      <strong>Important:</strong> Purani app uninstall nahi karni padti! Shopkeeper ka mobile number, login, settings aur paired Bluetooth printer <strong>100% save</strong> rahenge.
                    </p>
                  </div>

                  {/* Method 4: Capacitor Live Server URL */}
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                        4. Capacitor Live URL Mode (Instant Live OTA)
                      </span>
                      <span className="text-[10px] text-purple-300 font-semibold bg-purple-950/80 px-2 py-0.5 rounded">
                        Live Cloud Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <code>capacitor.config.json</code> me live server URL set karne se APK hamesha cloud se latest web bundle load karti hai. Iska matlab aap cloud par code push karenge aur APK me turant live change dikhega!
                    </p>
                  </div>
                </div>

                {/* Live Check Button */}
                <div className="pt-2 flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="font-bold text-white text-xs block">Current Version: v1.0.1</span>
                    <span className="text-[10px] text-slate-400">Status: Latest stable build running</span>
                  </div>
                  <button
                    onClick={() => {
                      apiFetch('/api/app-version')
                        .then(r => r.json())
                        .then(d => {
                          alert(`App Version: v${d.latestVersion}\nRelease Date: ${d.releaseDate}\nFeatures: ${d.changelog.join(', ')}`);
                        })
                        .catch(() => {
                          alert('App Version: v1.0.1 (Offline Local Build)');
                        });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Test Version API Check</span>
                  </button>
                </div>
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
