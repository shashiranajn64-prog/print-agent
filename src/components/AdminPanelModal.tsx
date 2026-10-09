import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Store, 
  Trash2, 
  Plus, 
  KeyRound, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Lock, 
  User, 
  Phone, 
  MapPin, 
  IndianRupee, 
  LogOut, 
  Eye, 
  EyeOff,
  RefreshCw,
  QrCode,
  MessageSquare,
  Star,
  Mail,
  Check,
  Sparkles
} from 'lucide-react';
import { ShopAccount, UserFeedback } from '../../server';
import { apiFetch, localDb } from '../utils/api';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopDeletedOrAdded?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onShopDeletedOrAdded,
}) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminIdInput, setAdminIdInput] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showAdminPass, setShowAdminPass] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'shops' | 'add_shop' | 'feedbacks' | 'change_password'>('shops');
  const [shopsList, setShopsList] = useState<ShopAccount[]>([]);
  const [feedbacksList, setFeedbacksList] = useState<UserFeedback[]>([]);
  const [unreadFeedbacksCount, setUnreadFeedbacksCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Shop Form State
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBwRate, setNewBwRate] = useState<number>(3);
  const [newColourRate, setNewColourRate] = useState<number>(10);
  const [newPdfRate, setNewPdfRate] = useState<number>(5);
  const [newUpiId, setNewUpiId] = useState('');

  // Change Admin Password State
  const [oldAdminPass, setOldAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');

  // Check admin status on open
  useEffect(() => {
    if (isOpen) {
      checkAdminStatus();
    }
  }, [isOpen]);

  const showNotice = (text: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(text);
      setErrorMsg(null);
    } else {
      setErrorMsg(text);
      setSuccessMsg(null);
    }
    setTimeout(() => {
      setSuccessMsg(null);
      setErrorMsg(null);
    }, 4000);
  };

  const checkAdminStatus = async () => {
    try {
      const res = await apiFetch('/api/admin/status');
      const data = await res.json();
      if (data.success && data.isLoggedIn) {
        setIsAdminLoggedIn(true);
        fetchAllShops();
        fetchFeedbacks();
      } else {
        setIsAdminLoggedIn(false);
      }
    } catch {
      setIsAdminLoggedIn(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await apiFetch('/api/admin/feedbacks');
      const data = await res.json();
      if (data.success && Array.isArray(data.feedbacks)) {
        setFeedbacksList(data.feedbacks);
        setUnreadFeedbacksCount(data.unreadCount || 0);
        return;
      }
    } catch (err) {
      console.warn('Fetch admin feedbacks offline:', err);
    }
    const local = localDb.getFeedbacks();
    setFeedbacksList(local);
    setUnreadFeedbacksCount(local.filter(f => !f.isRead).length);
  };

  const handleMarkFeedbackRead = async (id: string) => {
    try {
      await apiFetch(`/api/admin/feedbacks/${id}/read`, { method: 'PATCH' });
    } catch (err) {
      console.warn('Mark read offline:', err);
    }
    setFeedbacksList(prev => prev.map(f => f.id === id ? { ...f, isRead: true } : f));
    setUnreadFeedbacksCount(prev => Math.max(0, prev - 1));
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await apiFetch(`/api/admin/feedbacks/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete feedback offline:', err);
    }
    setFeedbacksList(prev => prev.filter(f => f.id !== id));
    showNotice('Feedback message remove ho gaya', 'success');
  };

  const fetchAllShops = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/shops');
      const data = await res.json();
      if (data.success && Array.isArray(data.shops)) {
        setShopsList(data.shops);
        return;
      }
    } catch (err) {
      console.warn('Fetch admin shops offline:', err);
      const local = localDb.getShop();
      if (local) setShopsList([local]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: adminIdInput.trim(),
          password: adminPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        showNotice('Super Admin login successful!', 'success');
        fetchAllShops();
        fetchFeedbacks();
        return;
      } else {
        showNotice(data.message || 'Login failed', 'error');
        return;
      }
    } catch {
      // Offline fallback: verify Super Admin master credentials directly!
      if (adminIdInput.trim() === '7870089309' && adminPasswordInput.trim() === '211361') {
        setIsAdminLoggedIn(true);
        showNotice('Super Admin login successful (Phone Offline Mode)!', 'success');
        const local = localDb.getShop();
        if (local) setShopsList([local]);
        fetchFeedbacks();
        return;
      }
      showNotice('Server connection error. Phone mode me Master ID: 7870089309 / Pass: 211361 use karein.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout offline:', err);
    }
    setIsAdminLoggedIn(false);
    showNotice('Admin logged out successfully', 'success');
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!window.confirm(`Kya aap sach me dukan "${shopName}" ko delete/remove karna chahte hain?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch(`/api/admin/shops/${shopId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setShopsList(prev => prev.filter(s => s.id !== shopId));
        showNotice(`Shop "${shopName}" removed successfully`, 'success');
        onShopDeletedOrAdded?.();
      } else {
        showNotice(data.message || 'Failed to remove shop', 'error');
      }
    } catch {
      // Offline fallback
      setShopsList(prev => prev.filter(s => s.id !== shopId));
      showNotice(`Shop "${shopName}" removed locally`, 'success');
      onShopDeletedOrAdded?.();
    } finally {
      setLoading(false);
    }
  };

  const handleAddShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMob = newMobile.replace(/\D/g, '').slice(0, 10);
    if (cleanMob.length !== 10) {
      showNotice('Mobile number pura 10 digits ka hona chahiye', 'error');
      return;
    }

    const shopObj: ShopAccount = {
      id: cleanMob,
      shopName: newShopName.trim(),
      ownerName: newOwnerName.trim(),
      mobileNumber: cleanMob,
      loginId: cleanMob,
      address: newAddress.trim(),
      password: newPassword.trim(),
      registeredAt: new Date().toISOString(),
      isActive: true,
      totalPrinted: 0,
      upiId: newUpiId.trim() || `${cleanMob}@upi`,
      rates: {
        blackAndWhiteRate: newBwRate,
        colourRate: newColourRate,
        pdfPageRate: newPdfRate,
      }
    };

    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: newShopName.trim(),
          ownerName: newOwnerName.trim(),
          mobileNumber: cleanMob,
          address: newAddress.trim(),
          password: newPassword.trim(),
          blackAndWhiteRate: newBwRate,
          colourRate: newColourRate,
          pdfPageRate: newPdfRate,
          upiId: newUpiId.trim() || `${cleanMob}@upi`,
        }),
      });
      const data = await res.json();
      if (data.success && data.shop) {
        setShopsList(prev => [data.shop, ...prev]);
        localDb.saveShop(data.shop);
        showNotice(`Nayi Shop "${data.shop.shopName}" successfully add ho gayi!`, 'success');
        setActiveTab('shops');
        setNewShopName('');
        setNewOwnerName('');
        setNewMobile('');
        setNewAddress('');
        setNewUpiId('');
        onShopDeletedOrAdded?.();
        return;
      } else {
        showNotice(data.message || 'Add shop failed', 'error');
        return;
      }
    } catch {
      // Local fallback
      setShopsList(prev => [shopObj, ...prev]);
      localDb.saveShop(shopObj);
      showNotice(`Nayi Shop "${shopObj.shopName}" locally add ho gayi!`, 'success');
      setActiveTab('shops');
      setNewShopName('');
      setNewOwnerName('');
      setNewMobile('');
      setNewAddress('');
      setNewUpiId('');
      onShopDeletedOrAdded?.();
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPass !== confirmAdminPass) {
      showNotice('Naya password aur confirm password match nahi ho rahe hain', 'error');
      return;
    }
    if (newAdminPass.length < 4) {
      showNotice('Naya password kam se kam 4 characters ka hona chahiye', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: oldAdminPass.trim(),
          newPassword: newAdminPass.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Admin password successfully change ho gaya!', 'success');
        setOldAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
      } else {
        showNotice(data.message || 'Password change failed', 'error');
      }
    } catch {
      showNotice('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredShops = shopsList.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.shopName.toLowerCase().includes(q) ||
      s.ownerName.toLowerCase().includes(q) ||
      s.mobileNumber.includes(q) ||
      s.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Super Admin Control Panel</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  Root Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAdminLoggedIn ? 'Admin Logged In' : 'Enter Admin ID & Password to access system control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminLoggedIn && (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 text-xs font-semibold transition border border-slate-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-slate-300">
          {!isAdminLoggedIn ? (
            /* ================= ADMIN LOGIN SCREEN ================= */
            <div className="max-w-md mx-auto py-6 space-y-5">
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-xl">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white mt-3">Super Admin Login</h3>
                <p className="text-xs text-slate-400">
                  Enter your Admin Login ID and Password
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Admin ID</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={adminIdInput}
                      onChange={e => setAdminIdInput(e.target.value)}
                      placeholder="Enter Admin ID"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Admin Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type={showAdminPass ? 'text' : 'password'}
                      required
                      value={adminPasswordInput}
                      onChange={e => setAdminPasswordInput(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPass(!showAdminPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showAdminPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition active:scale-98 disabled:opacity-50"
                >
                  {loading ? 'Authenticating Admin...' : 'Login to Admin Panel'}
                </button>
              </form>
            </div>
          ) : (
            /* ================= LOGGED IN ADMIN DASHBOARD ================= */
            <div className="space-y-5">
              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/70 p-2 gap-2 rounded-2xl">
                <button
                  onClick={() => setActiveTab('shops')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
                    activeTab === 'shops'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>All Shops ({shopsList.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('add_shop')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
                    activeTab === 'add_shop'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Shop</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('feedbacks');
                    fetchFeedbacks();
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition relative ${
                    activeTab === 'feedbacks'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Real Feedbacks</span>
                  {feedbacksList.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                      {feedbacksList.length}
                    </span>
                  )}
                  {unreadFeedbacksCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('change_password')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition ${
                    activeTab === 'change_password'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Admin Password</span>
                </button>
              </div>

              {/* TAB 1: ALL SHOPS LIST */}
              {activeTab === 'shops' && (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search shop name, owner, mobile..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <button
                      onClick={fetchAllShops}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {filteredShops.length === 0 ? (
                    <div className="text-center py-12 bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
                      <Store className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-slate-400 font-semibold">Koi dukan nahi mili.</p>
                      <button
                        onClick={() => setActiveTab('add_shop')}
                        className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nayi Shop Add Karein</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredShops.map(shop => (
                        <div
                          key={shop.id}
                          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                <Store className="w-4 h-4 text-sky-400" />
                                <span>{shop.shopName}</span>
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Owner: <strong className="text-slate-200">{shop.ownerName}</strong>
                              </p>
                            </div>

                            <button
                              onClick={() => handleDeleteShop(shop.id, shop.shopName)}
                              title="Delete/Remove Shop"
                              className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 transition"
                            >
                              <Trash2 className="w-4 h-4 text-rose-400" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                            <div>
                              <span className="text-slate-500 block">Mobile / ID:</span>
                              <span className="font-mono text-sky-300 font-bold">{shop.mobileNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Password:</span>
                              <span className="font-mono text-amber-300 font-semibold">{shop.password}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Address:</span>
                              <span className="text-slate-300 truncate block">{shop.address}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">UPI ID:</span>
                              <span className="text-emerald-400 font-mono text-[10px] truncate block">{shop.upiId || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                            <span>
                              Rates: B&W ₹{shop.rates?.blackAndWhiteRate || 3} | Col ₹{shop.rates?.colourRate || 10} | PDF ₹{shop.rates?.pdfPageRate || 5}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Printed: {shop.totalPrinted || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ADMIN ADD SHOP */}
              {activeTab === 'add_shop' && (
                <form onSubmit={handleAddShopSubmit} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-rose-400" />
                    <span>Admin: Add New Shop (नई दुकान पंजीकृत करें)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Shop Name *</label>
                      <input
                        type="text"
                        required
                        value={newShopName}
                        onChange={e => setNewShopName(e.target.value)}
                        placeholder="e.g. ABC Cyber Cafe"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Owner Name *</label>
                      <input
                        type="text"
                        required
                        value={newOwnerName}
                        onChange={e => setNewOwnerName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Mobile Number (10 Digits) *</label>
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={newMobile}
                        onChange={e => setNewMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Password *</label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-slate-300 font-semibold block mb-1">Shop Address *</label>
                      <input
                        type="text"
                        required
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                        placeholder="Colony City"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Shop UPI ID</label>
                      <input
                        type="text"
                        value={newUpiId}
                        onChange={e => setNewUpiId(e.target.value)}
                        placeholder="mobile@upi (optional)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">B&W Rate</label>
                        <input
                          type="number"
                          value={newBwRate}
                          onChange={e => setNewBwRate(parseFloat(e.target.value) || 3)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Colour Rate</label>
                        <input
                          type="number"
                          value={newColourRate}
                          onChange={e => setNewColourRate(parseFloat(e.target.value) || 10)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">PDF Rate</label>
                        <input
                          type="number"
                          value={newPdfRate}
                          onChange={e => setNewPdfRate(parseFloat(e.target.value) || 5)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition"
                    >
                      {loading ? 'Adding Shop...' : 'Add Shop to System'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: REAL USER FEEDBACKS (STRICTLY REAL ONLY - NO FAKE / NO DEMO) */}
              {activeTab === 'feedbacks' && (
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white">Real User Feedbacks</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            100% Real • No Demo
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Total {feedbacksList.length} real message{feedbacksList.length !== 1 ? 's' : ''} received from users
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={fetchFeedbacks}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 text-xs transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Empty state: No fake messages */}
                  {feedbacksList.length === 0 ? (
                    <div className="text-center py-14 bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white">Abhi tak koi naya feedback nahi aaya hai</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          Yahan par koi fake ya sample message nahi dikhaya jaata. Jab koi shopkeeper ya customer app me <strong>&ldquo;Feedback&rdquo;</strong> button se message submit karega, to unke genuine real messages yahan turant dikhai denge.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {feedbacksList.map((fb) => (
                        <div
                          key={fb.id}
                          className={`p-4 rounded-2xl border transition ${
                            fb.isRead
                              ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                              : 'bg-slate-950 border-amber-500/40 shadow-md shadow-amber-500/5'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 font-bold shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">
                                    {fb.senderName || 'Anonymous User'}
                                  </span>
                                  {fb.shopName && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                      <Store className="w-3 h-3" />
                                      {fb.shopName}
                                    </span>
                                  )}
                                  {!fb.isRead && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                                      New
                                    </span>
                                  )}
                                </div>
                                {fb.senderContact && (
                                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span>Contact: {fb.senderContact}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Rating & Category */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-300">
                                {fb.category}
                              </span>
                              <div className="flex items-center text-amber-400 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                                {[...Array(fb.rating || 5)].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Message Body */}
                          <div className="py-3">
                            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                              {fb.message}
                            </p>
                          </div>

                          {/* Card Footer: Timestamp & Actions */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                            <span>
                              Received: {new Date(fb.createdAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>

                            <div className="flex items-center gap-2">
                              {!fb.isRead && (
                                <button
                                  onClick={() => handleMarkFeedbackRead(fb.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                                >
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Mark as Read</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteFeedback(fb.id)}
                                title="Delete this feedback"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ADMIN CHANGE PASSWORD */}
              {activeTab === 'change_password' && (
                <form onSubmit={handleChangeAdminPassword} className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4 max-w-md mx-auto">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-rose-400" />
                    <span>Change Admin Password</span>
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    Super Admin account ka login password update karein.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Purana Admin Password (Old Password)</label>
                      <input
                        type="password"
                        required
                        value={oldAdminPass}
                        onChange={e => setOldAdminPass(e.target.value)}
                        placeholder="Current Password (Default 211361)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Naya Admin Password (New Password)</label>
                      <input
                        type="password"
                        required
                        value={newAdminPass}
                        onChange={e => setNewAdminPass(e.target.value)}
                        placeholder="Enter New Admin Password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Confirm Naya Password</label>
                      <input
                        type="password"
                        required
                        value={confirmAdminPass}
                        onChange={e => setConfirmAdminPass(e.target.value)}
                        placeholder="Confirm New Admin Password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition"
                    >
                      {loading ? 'Updating Password...' : 'Update Admin Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
