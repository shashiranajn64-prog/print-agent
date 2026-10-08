import React, { useState, useEffect } from 'react';
import { 
  Store, 
  KeyRound, 
  QrCode, 
  Sliders, 
  Scan, 
  X, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Printer, 
  ExternalLink, 
  Copy, 
  User, 
  MapPin, 
  Phone, 
  IndianRupee,
  Sparkles,
  Download,
  Bluetooth
} from 'lucide-react';
import { ShopAccount, PrinterDevice } from '../../server';
import { PrinterSettings } from './PrinterSettings';

interface ShopManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopAccount;
  onShopUpdated: (updatedShop: ShopAccount) => void;
  onOpenCustomerPortal: (shopId: string) => void;
  initialTab?: 'detail' | 'password' | 'upi' | 'rates' | 'customer_qr' | 'printer_bt';
  printers: PrinterDevice[];
  activePrinterId: string;
  onSelectActivePrinter: (id: string) => void;
  onAddPrinter: (p: Partial<PrinterDevice>) => void;
  onDeletePrinter?: (id: string) => void;
  onSetDefaultPrinter?: (id: string) => void;
  onClearAllPrinters?: () => void;
  soundEnabled: boolean;
}

export const ShopManagementModal: React.FC<ShopManagementModalProps> = ({
  isOpen,
  onClose,
  shop,
  onShopUpdated,
  onOpenCustomerPortal,
  initialTab = 'detail',
  printers,
  activePrinterId,
  onSelectActivePrinter,
  onAddPrinter,
  onDeletePrinter,
  onSetDefaultPrinter,
  onClearAllPrinters,
  soundEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'password' | 'upi' | 'rates' | 'customer_qr' | 'printer_bt'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 1. Shop Detail State
  const [shopName, setShopName] = useState(shop.shopName);
  const [ownerName, setOwnerName] = useState(shop.ownerName);
  const [mobileNumber, setMobileNumber] = useState(shop.mobileNumber);
  const [address, setAddress] = useState(shop.address);

  // 2. Change Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. UPI ID & QR State
  const [upiId, setUpiId] = useState(shop.upiId || `${shop.mobileNumber}@upi`);
  const [upiQrCustomUrl, setUpiQrCustomUrl] = useState(shop.upiQrCustomUrl || '');

  // 4. Customer Panel Rates State
  const [bwRate, setBwRate] = useState<number>(shop.rates?.blackAndWhiteRate ?? 3);
  const [colourRate, setColourRate] = useState<number>(shop.rates?.colourRate ?? 10);
  const [pdfRate, setPdfRate] = useState<number>(shop.rates?.pdfPageRate ?? 5);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const customerPortalUrl = `${originUrl}/?shopId=${shop.id}&view=customer`;

  // Quick message display helper
  const notify = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // 1. Save Shop Detail
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !address.trim()) {
      notify('Sabhi fields zaroori hain.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/shops/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          address: address.trim(),
          mobileNumber: mobileNumber.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.shop) {
        onShopUpdated(data.shop);
        notify('Shop details successfully update ho gayi hain!', 'success');
      } else {
        notify(data.message || 'Update failed', 'error');
      }
    } catch {
      notify('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify('Naya password aur confirm password match nahi kar rahe hain.', 'error');
      return;
    }
    if (newPassword.length < 4) {
      notify('Password kam se kam 4 characters ka hona chahiye.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/shops/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        notify('Password successfully badal gaya hai!', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        notify(data.message || 'Password change failed', 'error');
      }
    } catch {
      notify('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Save UPI & QR
  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/shops/upi', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiId: upiId.trim(),
          upiQrCustomUrl: upiQrCustomUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.shop) {
        onShopUpdated(data.shop);
        notify('UPI ID aur QR update ho gaya hai!', 'success');
      } else {
        notify(data.message || 'Update failed', 'error');
      }
    } catch {
      notify('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. Save Customer Print Rates
  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch('/api/shops/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blackAndWhiteRate: bwRate,
          colourRate: colourRate,
          pdfPageRate: pdfRate,
        }),
      });
      const data = await res.json();
      if (data.success && data.rates) {
        onShopUpdated({ ...shop, rates: data.rates });
        notify('Customer printing rates update ho gaye hain!', 'success');
      } else {
        notify(data.message || 'Rates update failed', 'error');
      }
    } catch {
      notify('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCustomerLink = () => {
    navigator.clipboard.writeText(customerPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Generate SVG QR Code representation for Customer Portal URL
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(customerPortalUrl)}`;
  const upiQrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(shop.shopName)}&cu=INR`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Shop Panel: {shop.shopName}</span>
              </h2>
              <p className="text-xs text-slate-300">
                Owner: {shop.ownerName} | Mobile / ID: <span className="font-mono text-sky-400">{shop.mobileNumber}</span>
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

        {/* 5 Required Action Buttons in Shop Interface */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 p-2 gap-1.5 overflow-x-auto scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'detail'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>1. Shop Detail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'password'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>2. Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'upi'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>3. UPI ID & QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'rates'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>4. Customer Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customer_qr')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'customer_qr'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>5. QR FOR CUSTOMER ★</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('printer_bt')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              activeTab === 'printer_bt'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            <Bluetooth className="w-4 h-4 text-indigo-400" />
            <span>6. Printer & Bluetooth</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}>
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 text-xs text-slate-300">
          {/* ================= 1. SHOP DETAIL ================= */}
          {activeTab === 'detail' && (
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-sky-400" />
                  <span>Update Shop Details (Dukan ki Jankari Badle)</span>
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Yahan shopkeeper apni dukan ka naam, malik ka naam, address aur mobile number update kar sakta hai.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Shop Name</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={e => setShopName(e.target.value)}
                        placeholder="Shop Name"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Shop Owner Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        placeholder="Owner Name"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Mobile Number (Login ID)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileNumber}
                        onChange={e => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Shop Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Colony City"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Shop Details'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= 2. CHANGE PASSWORD ================= */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-sky-400" />
                  <span>Change Password (Password Badle)</span>
                </h3>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Purana Password (Old Password)</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Enter Old Password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Naya Password (New Password)</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter New Password (min 4 characters)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Naya Password Dobara Dalein (Confirm New Password)</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= 3. UPI ID AND QR ================= */}
          {activeTab === 'upi' && (
            <form onSubmit={handleSaveUpi} className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Shopkeeper UPI ID & QR Code Settings</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Direct Payment to Your Account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Shopkeeper UPI ID (GPay / PhonePe / Paytm / BHIM)
                      </label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        placeholder="e.g. 9876543210@paytm ya shopname@upi"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Costumer isi UPI ID par payment karega jab wo QR scan karke print karega.
                      </p>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Optional: Custom Scanner QR Image Link
                      </label>
                      <input
                        type="url"
                        value={upiQrCustomUrl}
                        onChange={e => setUpiQrCustomUrl(e.target.value)}
                        placeholder="https://... image URL (optional)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-[11px] font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Live UPI QR Preview */}
                  <div className="flex flex-col items-center bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[11px] font-bold text-slate-300 mb-2">Live Shop UPI QR Code</span>
                    <div className="p-2 bg-white rounded-xl shadow-lg inline-block">
                      <img
                        src={upiQrSvgUrl}
                        alt="Shop UPI QR"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 mt-2 font-bold">{upiId}</span>
                    <span className="text-[9px] text-slate-400">Scan to pay directly into your shop account</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save UPI & QR'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= 4. CUSTOMER PANEL RATES ================= */}
          {activeTab === 'rates' && (
            <form onSubmit={handleSaveRates} className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <span>Customer Panel Rate Configuration (Print Rate Fix Karein)</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Live Rates for Customers
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Shopkeeper yahan apna rate fix kar sakta hai. Jab costumer QR scan karke file upload karega, to isi rate ke hisab se total payment calculate hoga:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* Black & White Rate */}
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Black & White Print</span>
                      <span className="text-xs text-slate-500">Per Page</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        required
                        value={bwRate}
                        onChange={e => setBwRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Standard monochrome print rate</p>
                  </div>

                  {/* Colour Rate */}
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>Colour Print</span>
                      <span className="text-xs text-slate-500">Per Page</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-amber-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        required
                        value={colourRate}
                        onChange={e => setColourRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Full colour graphics/photo print rate</p>
                  </div>

                  {/* PDF Rate */}
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span>One Page PDF Print</span>
                      <span className="text-xs text-slate-500">Per Page</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-purple-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        required
                        value={pdfRate}
                        onChange={e => setPdfRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-base font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Multi-page / single PDF document rate</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save Customer Rates'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= 5. QR FOR CUSTOMER (VERY IMPORTANT) ================= */}
          {activeTab === 'customer_qr' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                      <Scan className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white uppercase tracking-wide">
                        ★ DEDICATED QR CODE FOR YOUR SHOP CUSTOMERS ★
                      </h3>
                      <p className="text-[11px] text-amber-200/90">
                        Har shopkeeper ke liye unique QR code jo counter par lagaya ja sakta hai
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Customer Portal Ready
                  </span>
                </div>

                {/* Printable Counter Standee Preview */}
                <div className="bg-white text-slate-950 rounded-2xl p-5 shadow-2xl max-w-sm mx-auto text-center border-4 border-amber-500/30">
                  <div className="text-[10px] font-bold tracking-widest text-sky-700 uppercase">
                    SCAN TO PRINT & PAY AT COUNTER
                  </div>
                  <h4 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
                    {shop.shopName}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {shop.address} | Mo: {shop.mobileNumber}
                  </p>

                  <div className="my-3 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl inline-block">
                    <img
                      src={qrSvgUrl}
                      alt="Customer Print QR"
                      className="w-48 h-48 object-contain mx-auto"
                    />
                  </div>

                  <div className="text-[11px] font-bold text-slate-800 bg-amber-100 py-1.5 px-3 rounded-lg inline-block mb-2">
                    B&W: ₹{shop.rates?.blackAndWhiteRate || 3}/p • Colour: ₹{shop.rates?.colourRate || 10}/p • PDF: ₹{shop.rates?.pdfPageRate || 5}/p
                  </div>

                  <div className="text-[10px] text-slate-500 leading-tight">
                    1. Mobile Camera / Scanner se QR Scan karein.<br />
                    2. Gallery ya Camera se file upload & crop karein.<br />
                    3. UPI payment karein aur printout counter se lein!
                  </div>
                </div>

                {/* Direct Link & Actions */}
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Direct Customer Portal Link:</span>
                    <button
                      onClick={handleCopyCustomerLink}
                      className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-sky-300 truncate select-all">
                    {customerPortalUrl}
                  </div>

                  <div className="pt-2 flex flex-wrap gap-2.5 justify-center">
                    {/* Launch Customer Portal in App to Test */}
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCustomerPortal(shop.id);
                      }}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-950" />
                      <span>Open Customer Portal View (Test Now)</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition"
                    >
                      <Printer className="w-4 h-4 text-sky-400" />
                      <span>Print Counter QR Standee</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 6. PRINTER & BLUETOOTH ================= */}
          {activeTab === 'printer_bt' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-sky-950/60 border border-indigo-500/30 rounded-2xl p-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Bluetooth className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Shop Printer & Bluetooth Management</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Shop Logged In
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Apni dukan ke liye Bluetooth roll printer, USB thermal, WiFi network printer ya Bara A4 printer (HP/Epson/Canon) add karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Render PrinterSettings inside Shop Login Modal */}
              <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-2 sm:p-4">
                <PrinterSettings
                  printers={printers}
                  activePrinterId={activePrinterId}
                  onSelectActivePrinter={onSelectActivePrinter}
                  onAddPrinter={onAddPrinter}
                  onDeletePrinter={onDeletePrinter}
                  onSetDefaultPrinter={onSetDefaultPrinter}
                  onClearAllPrinters={onClearAllPrinters}
                  soundEnabled={soundEnabled}
                  shopName={shop.shopName}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
