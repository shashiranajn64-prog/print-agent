import React, { useState, useEffect } from 'react';
import { 
  Store, 
  User, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight,
  ShieldCheck,
  LogIn,
  UserPlus,
  Receipt,
  IndianRupee,
  TrendingUp,
  Printer,
  Smartphone,
  Server,
  Settings
} from 'lucide-react';
import { ShopAccount } from '../../server';
import { apiFetch, localDb, setOfflineModeActive, isOfflineModeActive, isNativeApp } from '../utils/api';
import { ServerSettingsModal } from './ServerSettingsModal';

interface ShopAuthModalProps {
  isOpen: boolean;
  initialMode?: 'register' | 'login';
  onClose: () => void;
  onSuccess: (shop: ShopAccount, mode: 'register' | 'login') => void;
}

export const ShopAuthModal: React.FC<ShopAuthModalProps> = ({
  isOpen,
  initialMode = 'register',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  
  // Registration Form State - strictly blank by default (No hardcoding)
  const [shopName, setShopName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State - strictly blank by default (No hardcoding)
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);

  // Live Daily Collection Stats for Shopkeeper
  const [dailyStats, setDailyStats] = useState<{
    todayDate: string;
    totalCollection: number;
    totalJobs: number;
    bwPages: number;
    colourPages: number;
    razorpayOnline: number;
  } | null>(null);

  // Synchronize initial mode when modal opens & fetch daily stats
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsConnectionError(false);

      // Fetch live daily collection stats
      apiFetch('/api/shops/daily-collection')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.dailyStats) {
            setDailyStats(data.dailyStats);
          }
        })
        .catch(err => {
          console.warn('Daily stats offline:', err);
        });
    }
  }, [isOpen, initialMode]);

  // Handle Mobile Number input in registration: sanitize to digits only and limit to max 10 digits
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    const sanitized = digitsOnly.slice(0, 10);
    setMobileNumber(sanitized);
    setErrorMessage(null);
    setIsConnectionError(false);
  };

  // Handle Login ID change: sanitize to 10 digits
  const handleLoginIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '').slice(0, 10);
    setLoginId(digitsOnly);
    setErrorMessage(null);
    setIsConnectionError(false);
  };

  const handleContinueLocalMode = () => {
    const existing = localDb.getShop();
    const effectiveMobile = (mobileNumber || loginId || existing?.mobileNumber || '9876543210').trim();
    const effectiveShopName = (shopName || existing?.shopName || 'Mera Print Counter').trim();
    const effectiveOwner = (ownerName || existing?.ownerName || 'Shopkeeper').trim();
    const effectiveAddress = (address || existing?.address || 'Counter 1').trim();
    
    const localShop: ShopAccount = existing ? {
      ...existing,
      shopName: effectiveShopName,
      ownerName: effectiveOwner,
      address: effectiveAddress,
      mobileNumber: effectiveMobile,
      loginId: effectiveMobile,
    } : {
      id: effectiveMobile,
      shopName: effectiveShopName,
      mobileNumber: effectiveMobile,
      ownerName: effectiveOwner,
      address: effectiveAddress,
      loginId: effectiveMobile,
      password: password || loginPassword || '1234',
      registeredAt: new Date().toISOString(),
      isActive: true,
      totalPrinted: 0,
      rates: {
        blackAndWhiteRate: 3,
        colourRate: 10,
        pdfPageRate: 5
      }
    };

    localDb.saveShop(localShop);
    setOfflineModeActive(true);
    setSuccessMessage('Phone Offline Mode active! Shop profile saved locally.');
    setTimeout(() => {
      onSuccess(localShop, mode);
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  // The Login ID auto-fills dynamically with the Mobile Number!
  const autoFilledLoginId = mobileNumber;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsConnectionError(false);

    // Strict Validations
    if (!shopName.trim()) {
      setErrorMessage('Kripya Shop name enter karein.');
      return;
    }

    if (mobileNumber.length !== 10) {
      setErrorMessage('Mobile number pura 10 digit ka hona chahiye.');
      return;
    }

    if (!ownerName.trim()) {
      setErrorMessage('Kripya Shop Owner name enter karein.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Kripya Shop address enter karein.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Password kam se kam 4 characters ka hona chahiye.');
      return;
    }

    if (isOfflineModeActive()) {
      handleContinueLocalMode();
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/shops/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          mobileNumber: mobileNumber.trim(),
          ownerName: ownerName.trim(),
          address: address.trim(),
          loginId: autoFilledLoginId,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Registration failed. Kripya punah prayas karein.');
        return;
      }

      localDb.saveShop(data.shop);
      setSuccessMessage('Shop successfully register ho gaya hai!');
      setTimeout(() => {
        onSuccess(data.shop, 'register');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Registration error:', err);
      setIsConnectionError(true);
      setErrorMessage('Server connection error. Niche diye gaye button se Phone Offline Mode me continue karein ya Server URL badlein.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsConnectionError(false);

    if (loginId.length !== 10) {
      setErrorMessage('Kripya 10-digit Login ID (Mobile number) enter karein.');
      return;
    }

    if (!loginPassword) {
      setErrorMessage('Kripya Password enter karein.');
      return;
    }

    if (isOfflineModeActive()) {
      handleContinueLocalMode();
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/shops/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Invalid Login ID ya Password.');
        return;
      }

      localDb.saveShop(data.shop);
      setSuccessMessage(`Welcome! ${data.shop.shopName} logged in.`);
      setTimeout(() => {
        onSuccess(data.shop, 'login');
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Login error:', err);
      setIsConnectionError(true);
      setErrorMessage('Server connection error. Niche diye gaye button se Phone Offline Mode me direct login karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {mode === 'register' ? 'Shop Registration' : 'Shop Login'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                  Shashi Agent
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'register'
                  ? 'Apni dukan register karein aur real-time print commands payein'
                  : 'Registered mobile number aur password se login karein'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switch Mode Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              mode === 'register'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Shop Registration</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
              mode === 'login'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Shop Login</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Offline Fallback Card if Connection Error happens */}
        {isConnectionError && (
          <div className="mx-4 sm:mx-6 mt-3 p-3.5 bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/50 rounded-2xl space-y-2.5 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Bina Server Ke Phone Me Chalana Chahte Hain?</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Agar cloud server connect nahi ho raha to aap bina kisi server ke apne phone me direct Bluetooth thermal printer se bills print kar sakte hain!
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleContinueLocalMode}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>📱 Phone Offline Mode Me Continue Karein</span>
              </button>
              <button
                type="button"
                onClick={() => setShowServerModal(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl border border-slate-600 transition flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>⚙️ Server Settings</span>
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= SHOP REGISTRATION FORM ================= */}
        {mode === 'register' ? (
          <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
            {/* 1. Shop Name */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Shop name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. ABC cyber cafe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* 2. Mobile number (max 10 digit) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Mobile number <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${
                  mobileNumber.length === 10 ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {mobileNumber.length}/10 digits
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center gap-1 text-slate-400 font-medium">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <span className="text-[11px] text-slate-400 font-mono">+91</span>
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-16 pr-3 py-2 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Maximum 10 digits allowed (ex-9876543210)</p>
            </div>

            {/* 3. Shop Owner name */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Shop Owner name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="e.g. Ramesh kumar"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* 4. Shop address */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Shop address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. colony city"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* 5. Shop login id = (Mobile number)(auto fill) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>Shop login id</span>
                  <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 rounded px-1.5 py-0.2">
                    Auto-fill with Mobile
                  </span>
                </label>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-sky-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  readOnly
                  value={autoFilledLoginId || ''}
                  placeholder="(Mobile number se automatically fill hoga)"
                  className="w-full bg-slate-900/90 border border-sky-500/40 rounded-xl pl-9 pr-3 py-2 text-sky-300 font-mono font-bold tracking-wider cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Aapka Mobile number hi aapka permanent Shop Login ID banega.
              </p>
            </div>

            {/* 6. Create Password */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Create Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="e.g. Ramesh123"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-sky-500/25 transition active:scale-98 disabled:opacity-50"
              >
                <span>{loading ? 'Registering Shop...' : 'Register Shop & Get Login ID'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-slate-400">Pehle se dukan registered hai? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-sky-400 hover:underline font-bold"
              >
                Shop Login karein
              </button>
            </div>
          </form>
        ) : (
          /* ================= SHOP LOGIN FORM ================= */
          <form onSubmit={handleLoginSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
            {/* Live Daily Collection Card on Shop Login Page */}
            {dailyStats && (
              <div className="bg-gradient-to-r from-emerald-950/70 via-slate-950 to-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Today&apos;s Daily Collection</span>
                        <span className="text-[10px] text-emerald-400 font-mono">({dailyStats.todayDate})</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">Real Counter Revenue & Print Jobs</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">Total Collection</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      ₹{dailyStats.totalCollection.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Total Jobs</span>
                    <span className="font-bold text-white font-mono">{dailyStats.totalJobs}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Pages (B&W/Col)</span>
                    <span className="font-bold text-sky-400 font-mono">{dailyStats.bwPages} / {dailyStats.colourPages}</span>
                  </div>
                  <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Razorpay Online</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{dailyStats.razorpayOnline.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Real Print Jobs Only (Zero Fake Jobs)</span>
                  </span>
                  <span className="text-slate-500">Live Server Sync</span>
                </div>
              </div>
            )}

            {/* Login ID (Mobile Number) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Shop Login ID (Mobile Number) <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${
                  loginId.length === 10 ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {loginId.length}/10 digits
                </span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={loginId}
                  onChange={handleLoginIdChange}
                  placeholder="Apna 10-digit mobile number dalein"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition tracking-wider"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Apna password dalein"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/25 transition active:scale-98 disabled:opacity-50"
              >
                <span>{loading ? 'Logging in...' : 'Shop Login Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-1">
              <span className="text-slate-400">Naye dukan dar hain? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className="text-sky-400 hover:underline font-bold"
              >
                Nayi Shop Register karein
              </button>
            </div>
          </form>
        )}

        {/* Bottom Server & Connection Quick Access */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOfflineModeActive() ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span>{isOfflineModeActive() ? '📱 Phone Standalone Mode' : '🌐 Cloud Server Mode'}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="text-sky-400 hover:text-sky-300 font-medium hover:underline flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Server / Network Settings</span>
          </button>
        </div>
      </div>

      <ServerSettingsModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
        onSettingsChanged={() => {
          setIsConnectionError(false);
          setErrorMessage(null);
        }}
      />
    </div>
  );
};
