import React from 'react';
import { 
  Printer, 
  Smartphone, 
  Wifi, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Sun, 
  Download,
  Flame,
  Radio,
  Store,
  LogIn,
  UserPlus,
  LogOut,
  MapPin,
  User,
  Phone,
  QrCode
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ShopAccount } from '../../server';

interface HeaderProps {
  autoPrint: boolean;
  onToggleAutoPrint: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  wakeLockActive: boolean;
  onToggleWakeLock: () => void;
  pendingCount: number;
  activePrinterName: string;
  onOpenApkModal: () => void;
  activeTab: 'queue' | 'simulator' | 'printers' | 'new-job';
  onChangeTab: (tab: 'queue' | 'simulator' | 'printers' | 'new-job') => void;
  currentShop: ShopAccount | null;
  onOpenShopAuth: (mode: 'register' | 'login') => void;
  onLogoutShop: () => void;
  onOpenShopPanel: () => void;
  onOpenCustomerPortal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  autoPrint,
  onToggleAutoPrint,
  soundEnabled,
  onToggleSound,
  wakeLockActive,
  onToggleWakeLock,
  pendingCount,
  activePrinterName,
  onOpenApkModal,
  activeTab,
  onChangeTab,
  currentShop,
  onOpenShopAuth,
  onLogoutShop,
  onOpenShopPanel,
  onOpenCustomerPortal,
}) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner / Ticker */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 px-4 py-1.5 text-xs text-slate-300 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-emerald-400">Agent Active</span>
          <span className="text-slate-500">|</span>
          
          {/* Shop Tag in Ticker */}
          {currentShop ? (
            <div className="flex items-center gap-1.5 text-sky-300">
              <Store className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-white truncate max-w-[150px] sm:max-w-none">{currentShop.shopName}</span>
              <span className="text-slate-500">({currentShop.ownerName})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-300/90">
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span>Shop: Not Registered / Login</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="truncate max-w-[140px] text-slate-300">{activePrinterName}</span>
          </div>
          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition bg-sky-950/70 border border-sky-800/60 rounded px-2 py-0.5 hover:bg-sky-900/80"
          >
            <Smartphone className="w-3 h-3 text-sky-400" />
            <span>Mobile APK Hub</span>
          </button>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white border border-sky-400/30">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Shashi Print Agent
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Android & Web
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">Real-Time ESC/POS Mobile Print Engine</p>
          </div>
        </div>

        {/* Shop Registration & Login Buttons / Current Shop Display */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentShop ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenShopPanel}
                title="Open Shop Management & Customer QR"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-sky-500/50 hover:border-sky-400 rounded-xl px-3 py-1.5 shadow-sm text-left transition active:scale-98"
              >
                <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                    <span>{currentShop.shopName}</span>
                    <span className="text-[10px] text-amber-400 font-mono">⚙️ Panel</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {currentShop.mobileNumber}</div>
                </div>
              </button>

              <button
                onClick={onOpenShopPanel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20 active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-950" />
                <span>Customer QR</span>
              </button>

              <button
                onClick={onLogoutShop}
                title="Shop Logout"
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Shop Registration Button */}
              <button
                onClick={() => onOpenShopAuth('register')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-md shadow-sky-500/25 active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Shop Registration</span>
              </button>

              {/* Shop Login Button */}
              <button
                onClick={() => onOpenShopAuth('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-400" />
                <span>Shop Login</span>
              </button>
            </div>
          )}

          {/* Auto Print Toggle */}
          <button
            onClick={onToggleAutoPrint}
            title={autoPrint ? 'Auto-execution active: Pending jobs print automatically' : 'Auto-execution paused'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              autoPrint
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {autoPrint ? <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
            <span>Auto-Print: {autoPrint ? 'ON' : 'OFF'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mechanical printer sound feedback enabled' : 'Muted'}
            className={`p-2 rounded-lg text-xs font-medium transition border ${
              soundEnabled
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Screen Wake Lock Toggle */}
          <button
            onClick={onToggleWakeLock}
            title={wakeLockActive ? 'Screen will stay on (Kiosk mode)' : 'Standard screen timeout'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
              wakeLockActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sun className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-amber-400 fill-amber-400' : ''}`} />
            <span className="hidden sm:inline">Awake</span>
          </button>

          {/* In-App PWA / APK Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-md shadow-sky-500/25 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {isInstalled && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              APK Running
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex gap-2 border-t border-slate-800/60 overflow-x-auto scrollbar-none py-1.5">
        <button
          onClick={() => onChangeTab('queue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>Real-Time Queue</span>
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'queue' ? 'bg-white text-sky-700' : 'bg-amber-500 text-slate-950'
            }`}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onChangeTab('simulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Thermal Printer Simulator</span>
        </button>

        <button
          onClick={() => onChangeTab('printers')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'printers'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Printers & Bluetooth</span>
        </button>

        <button
          onClick={() => onChangeTab('new-job')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'new-job'
              ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>+ Create Test Bill</span>
        </button>
      </div>
    </header>
  );
};
