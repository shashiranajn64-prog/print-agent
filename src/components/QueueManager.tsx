import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Play, 
  Eye, 
  Plus, 
  Sparkles, 
  RotateCw, 
  Layers, 
  Check, 
  Receipt, 
  UtensilsCrossed, 
  Ticket, 
  QrCode,
  FileText,
  Store,
  UserPlus,
  LogIn,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Sliders,
  Bluetooth,
  Lock,
  TrendingUp,
  IndianRupee
} from 'lucide-react';
import { PrintJob, ShopAccount } from '../../server';
import { triggerVibration, playPrinterSoundEffect } from '../utils/escpos';

interface QueueManagerProps {
  jobs: PrintJob[];
  loading: boolean;
  onRefresh: () => void;
  onExecuteJob: (job: PrintJob) => void;
  onSelectJobForPreview: (job: PrintJob) => void;
  onDeleteJob: (id: string) => void;
  onClearCompleted: () => void;
  onSimulateIncoming: () => void;
  onOpenNewJobModal: () => void;
  soundEnabled: boolean;
  currentShop: ShopAccount | null;
  onOpenShopAuth: (mode: 'register' | 'login') => void;
  onOpenShopPanelTab: (tab: 'detail' | 'password' | 'upi' | 'rates' | 'customer_qr' | 'printer_bt') => void;
  onOpenPrintersTab: () => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  jobs,
  loading,
  onRefresh,
  onExecuteJob,
  onSelectJobForPreview,
  onDeleteJob,
  onClearCompleted,
  onSimulateIncoming,
  onOpenNewJobModal,
  soundEnabled,
  currentShop,
  onOpenShopAuth,
  onOpenShopPanelTab,
  onOpenPrintersTab,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'printed'>('all');
  const [dailyStats, setDailyStats] = useState<{
    todayDate: string;
    totalCollection: number;
    totalJobs: number;
    bwPages: number;
    colourPages: number;
    razorpayOnline: number;
  } | null>(null);

  // Fetch live daily collection stats from backend
  const fetchDailyStats = () => {
    fetch('/api/shops/daily-collection')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.dailyStats) {
          setDailyStats(data.dailyStats);
        }
      })
      .catch(err => console.error('Failed to load daily stats:', err));
  };

  useEffect(() => {
    fetchDailyStats();
  }, [currentShop, jobs.length]);

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const printedJobs = jobs.filter(j => j.status === 'printed');

  const filteredJobs = jobs.filter(job => {
    if (filter === 'pending') return job.status === 'pending';
    if (filter === 'printed') return job.status === 'printed';
    return true;
  });

  const getJobIcon = (type: string) => {
    switch (type) {
      case 'tax_invoice':
        return <Receipt className="w-4 h-4 text-sky-400" />;
      case 'kot':
        return <UtensilsCrossed className="w-4 h-4 text-amber-400" />;
      case 'token_slip':
        return <Ticket className="w-4 h-4 text-purple-400" />;
      case 'upi_receipt':
        return <QrCode className="w-4 h-4 text-emerald-400" />;
      default:
        return <Printer className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase animate-pulse">Urgent</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">High</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">Normal</span>;
    }
  };

  const handleExecuteAll = () => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    if (pendingJobs.length === 0) return;
    pendingJobs.forEach((job, index) => {
      setTimeout(() => {
        onExecuteJob(job);
      }, index * 800);
    });
  };

  const handleExecuteJobSafe = (job: PrintJob) => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    onExecuteJob(job);
  };

  const handleSimulateSafe = () => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    onSimulateIncoming();
  };

  const handleNewJobSafe = () => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    onOpenNewJobModal();
  };

  const handleDeleteJobSafe = (id: string) => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    onDeleteJob(id);
  };

  const handleClearCompletedSafe = () => {
    if (!currentShop) {
      onOpenShopAuth('login');
      return;
    }
    onClearCompleted();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Prominent Shop Registration & Login Banner on Home Page */}
      {currentShop ? (
        <>
        <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-500/40 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-md">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">{currentShop.shopName}</h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Active Registered Shop
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Owner: <strong>{currentShop.ownerName}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Login ID / Mobile: <strong className="font-mono text-sky-300">{currentShop.mobileNumber}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Address: <span>{currentShop.address}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenShopAuth('login')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700"
            >
              Switch Shop
            </button>
          </div>
        </div>

        {/* 5 Shopkeeper Action Buttons directly on Home Page */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 px-2">
            <Store className="w-4 h-4 text-sky-400" />
            <span>Shop Control Panel:</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onOpenShopPanelTab('detail')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 hover:border-sky-500"
            >
              <Store className="w-3.5 h-3.5 text-sky-400" />
              <span>1. Shop Detail</span>
            </button>

            <button
              onClick={() => onOpenShopPanelTab('password')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 hover:border-sky-500"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>2. Change Password</span>
            </button>

            <button
              onClick={() => onOpenShopPanelTab('upi')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 hover:border-emerald-500"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. UPI ID & QR</span>
            </button>

            <button
              onClick={() => onOpenShopPanelTab('rates')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 hover:border-sky-500"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>4. Customer Rates</span>
            </button>

            <button
              onClick={() => onOpenShopPanelTab('customer_qr')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/25 active:scale-95"
            >
              <QrCode className="w-4 h-4 text-slate-950" />
              <span>5. QR FOR CUSTOMER ★</span>
            </button>

            <button
              onClick={() => onOpenShopPanelTab('printer_bt')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 hover:text-white text-xs font-bold transition border border-indigo-500/50 hover:border-indigo-400 shadow-md active:scale-95"
            >
              <Bluetooth className="w-4 h-4 text-indigo-400" />
              <span>6. Printer & Bluetooth 🖨️</span>
            </button>
          </div>
        </div>

        {/* Daily Collection Dashboard on Active Shop Banner */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-sky-950/60 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">Today&apos;s Daily Collection (Aaj Ki Kamai)</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5">
                  {dailyStats?.todayDate || 'Today'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real Print Orders Only • Zero Fake Jobs • Razorpay Auto-Verified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="text-right sm:text-left bg-slate-950/80 px-3.5 py-2 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Collection</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                ₹{dailyStats?.totalCollection ? dailyStats.totalCollection.toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Real Jobs</span>
              <span className="text-base font-bold text-white font-mono">
                {dailyStats?.totalJobs ?? printedJobs.length}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Pages (B&W/Col)</span>
              <span className="text-base font-bold text-sky-400 font-mono">
                {dailyStats?.bwPages ?? 0} / {dailyStats?.colourPages ?? 0}
              </span>
            </div>

            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-right sm:text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Razorpay Online</span>
              <span className="text-base font-bold text-emerald-300 font-mono">
                ₹{dailyStats?.razorpayOnline ? dailyStats.razorpayOnline.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-2 border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Shop Registration & Shop Login
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Apni dukan register karein aur Mobile Number se auto-fill hone wale Login ID ke sath login karke real-time printing aur printer setup chalu karein!
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onOpenShopAuth('register')}
                className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-lg shadow-sky-500/30 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Shop Registration</span>
              </button>

              <button
                onClick={() => onOpenShopAuth('login')}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 hover:text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl border border-slate-700 shadow-md transition"
              >
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>Shop Login</span>
              </button>
            </div>
          </div>

          {/* Explicit View-Only Banner on Home Page */}
          <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-amber-300 flex items-center gap-2">
                  <span>Home Screen: Preview & View-Only Mode</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    👀 View-Only
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Home screen par sirf view hoga. Dukan login karne ke baad sabhi kaam (print execution, add printer with USB/WiFi/BT, create bills) unlock honge!
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenShopAuth('login')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login to Unlock</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats & Quick Actions Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Pending Queue</span>
            <span className="text-2xl font-black text-amber-400">{pendingJobs.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Executed Today</span>
            <span className="text-2xl font-black text-emerald-400">{printedJobs.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Total Jobs</span>
            <span className="text-2xl font-black text-sky-400">{jobs.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">Sync Status</span>
            <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live Backend
            </span>
          </div>
          <button
            onClick={onRefresh}
            title="Refresh jobs from backend server"
            className="w-10 h-10 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 transition"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Pending ({pendingJobs.length})
          </button>
          <button
            onClick={() => setFilter('printed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filter === 'printed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Printed ({printedJobs.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Customer Self-Service QR button */}
          <button
            onClick={() => onOpenShopPanelTab('customer_qr')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 transition"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Customer Print QR</span>
          </button>

          {/* Execute All Pending */}
          {pendingJobs.length > 0 && (
            <button
              onClick={handleExecuteAll}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
            >
              {currentShop ? <Play className="w-3.5 h-3.5 fill-white" /> : <Lock className="w-3.5 h-3.5 text-emerald-200" />}
              <span>Execute All ({pendingJobs.length})</span>
            </button>
          )}

          {/* Create custom real bill */}
          <button
            onClick={handleNewJobSafe}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
          >
            {currentShop ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-sky-200" />}
            <span>New Custom Job</span>
          </button>

          {/* Clear completed */}
          {printedJobs.length > 0 && (
            <button
              onClick={handleClearCompletedSafe}
              title="Clear completed print jobs from memory"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Printer className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No print jobs in queue</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Real-time queue is live. Customer orders scan & print hone par yahan turant aate hain. Fake print jobs disabled hain.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleNewJobSafe}
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Counter Job</span>
            </button>
            <button
              onClick={() => onOpenShopPanelTab('customer_qr')}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-amber-500/30 transition shadow-md active:scale-95"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Show Customer QR</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map(job => {
            const isPending = job.status === 'pending';

            return (
              <div
                key={job.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  isPending
                    ? 'bg-slate-800/90 border-amber-500/40 hover:border-amber-400/70 shadow-amber-500/5'
                    : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                }`}
              >
                {/* Job Card Header */}
                <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700">
                      {getJobIcon(job.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{job.orderNumber}</span>
                        {getPriorityBadge(job.priority)}
                      </div>
                      <span className="text-xs text-slate-400">{job.title}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        Pending Print
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Executed
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Card Details */}
                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">CUSTOMER / PARTY</span>
                      <span className="font-medium truncate block">{job.customerName || 'Walk-in Customer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">TOTAL VALUE</span>
                      <span className="font-bold font-mono text-emerald-400">
                        {job.amount ? `Rs. ${job.amount.toFixed(2)}` : 'Token / Free'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SOURCE / POS</span>
                      <span className="truncate block">{job.source}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">PAPER FORMAT</span>
                      <span className="font-mono text-sky-400">{job.paperWidth} Thermal</span>
                    </div>
                  </div>

                  {/* Items summary */}
                  {job.items && job.items.length > 0 && (
                    <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-slate-400 text-[10px] uppercase">
                        Items ({job.items.length}):
                      </div>
                      <div className="truncate">
                        {job.items.map(it => `${it.name} (x${it.qty})`).join(', ')}
                      </div>
                    </div>
                  )}

                  {job.notes && (
                    <div className="text-[11px] text-amber-300/90 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/40">
                      <strong>Note:</strong> {job.notes}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                    <span>Created: {new Date(job.createdAt).toLocaleTimeString()}</span>
                    {job.executedAt && (
                      <span className="text-emerald-400/90">
                        Printed: {new Date(job.executedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Card Action Buttons */}
                <div className="p-3 bg-slate-900/60 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectJobForPreview(job)}
                      title="Load and inspect in thermal paper simulator"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Simulate</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJobSafe(job.id)}
                      title="Delete job"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition border border-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleExecuteJobSafe(job)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 shadow-md ${
                      isPending
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {currentShop ? (
                      <Printer className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>
                      {!currentShop
                        ? 'Login to Print'
                        : isPending
                          ? 'Print Now (Execute)'
                          : 'Reprint'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
