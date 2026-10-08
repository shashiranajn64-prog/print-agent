import React from 'react';
import { 
  Printer, 
  Store, 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  Mail, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  CreditCard, 
  Wifi, 
  Bluetooth, 
  ExternalLink,
  ChevronRight,
  Sliders,
  Receipt,
  MessageSquarePlus
} from 'lucide-react';
import { ShopAccount } from '../../server';

interface FooterProps {
  currentShop: ShopAccount | null;
  onOpenShopAuth: (mode: 'login' | 'register') => void;
  onOpenShopPanel: () => void;
  onOpenAdminPanel: () => void;
  onOpenApkModal: () => void;
  onOpenFeedback?: () => void;
  onChangeTab?: (tab: 'queue' | 'printers' | 'simulator') => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentShop,
  onOpenShopAuth,
  onOpenShopPanel,
  onOpenAdminPanel,
  onOpenApkModal,
  onOpenFeedback,
  onChangeTab
}) => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/90 text-slate-300 mt-12 pb-16">
      {/* Top Footer Banner: Info Highlights */}
      <div className="border-b border-slate-800/70 bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 py-6 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">100% Real Print Queue</h4>
              <p className="text-[11px] text-slate-400">Zero fake print jobs, live counter verified</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Razorpay Auto-Verify</h4>
              <p className="text-[11px] text-slate-400">No UTR number needed, automated backend</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">All Printers Supported</h4>
              <p className="text-[11px] text-slate-400">Thermal 58/80mm + HP/Epson/Canon A4</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Bluetooth & USB Setup</h4>
              <p className="text-[11px] text-slate-400">Secure configuration after shop login</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Multi-Column Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
        {/* Column 1: About */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Shashi Print Agent</h3>
              <span className="text-[10px] font-bold text-sky-400">POS & Cyber Cafe Platform</span>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed text-[11px]">
            Smart cloud and thermal print automation platform designed for Cyber Cafes, Photocopy Centers, Retail Counter POS, and Customer Self-Service Kiosks.
          </p>

          <p className="text-slate-400 leading-relaxed text-[11px]">
            Seamlessly connects 58mm/80mm Thermal Receipt Printers via Bluetooth, USB OTG, WiFi and Desktop Bara Printers (HP, Epson, Canon, Brother) for A4 document printing.
          </p>

          <div className="pt-1 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Agent v2.4.0 Engine Active</span>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ChevronRight className="w-4 h-4 text-sky-400" />
            <span>Quick Links</span>
          </h3>

          <ul className="space-y-2 text-slate-300">
            <li>
              <button
                onClick={() => onChangeTab && onChangeTab('queue')}
                className="hover:text-sky-400 transition flex items-center gap-2 text-left"
              >
                <span className="text-slate-500">•</span>
                <span>Home / Live Print Queue</span>
              </button>
            </li>

            {currentShop ? (
              <>
                <li>
                  <button
                    onClick={onOpenShopPanel}
                    className="hover:text-sky-400 transition flex items-center gap-2 text-left font-semibold text-amber-300"
                  >
                    <span className="text-amber-500">•</span>
                    <span>Shop Management & Rates (Active: {currentShop.shopName})</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenShopPanel}
                    className="hover:text-sky-400 transition flex items-center gap-2 text-left"
                  >
                    <span className="text-slate-500">•</span>
                    <span>Printer & Bluetooth Settings (Tab 6)</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button
                    onClick={() => onOpenShopAuth('login')}
                    className="hover:text-sky-400 transition flex items-center gap-2 text-left"
                  >
                    <span className="text-slate-500">•</span>
                    <span>Shop Login (Dukan Login)</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onOpenShopAuth('register')}
                    className="hover:text-sky-400 transition flex items-center gap-2 text-left"
                  >
                    <span className="text-slate-500">•</span>
                    <span>Shop Registration (Nayi Shop)</span>
                  </button>
                </li>
              </>
            )}

            <li>
              <button
                onClick={() => {
                  if (currentShop) {
                    onOpenShopPanel();
                  } else {
                    onOpenShopAuth('login');
                  }
                }}
                className="hover:text-sky-400 transition flex items-center gap-2 text-left"
              >
                <span className="text-slate-500">•</span>
                <span>Customer Scan & Print QR Portal</span>
              </button>
            </li>

            <li>
              <button
                onClick={onOpenApkModal}
                className="hover:text-sky-400 transition flex items-center gap-2 text-left"
              >
                <span className="text-slate-500">•</span>
                <span>Android Mobile APK Download</span>
              </button>
            </li>

            <li>
              <button
                onClick={onOpenAdminPanel}
                className="hover:text-rose-400 transition flex items-center gap-2 text-left text-slate-400"
              >
                <span className="text-slate-500">•</span>
                <span>Super Admin Control Login</span>
              </button>
            </li>

            {onOpenFeedback && (
              <li>
                <button
                  onClick={onOpenFeedback}
                  className="hover:text-amber-400 transition flex items-center gap-2 text-left text-amber-300/90 font-medium"
                >
                  <span className="text-amber-500">★</span>
                  <span>Give Feedback / Suggestion</span>
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* Column 3: Email Support & Feedback */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <Mail className="w-4 h-4 text-sky-400" />
            <span>Support & Feedback</span>
          </h3>

          <div className="space-y-2.5 text-slate-300">
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Official Email Assistance</span>
                <a href="mailto:helpshashiprintagent@gmail.com" className="font-semibold text-white hover:text-sky-400 transition break-all">
                  helpshashiprintagent@gmail.com
                </a>
              </div>
            </div>

            {onOpenFeedback && (
              <div className="pt-1">
                <button
                  onClick={onOpenFeedback}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
                >
                  <MessageSquarePlus className="w-4 h-4 text-slate-950" />
                  <span>Send Feedback to Admin</span>
                </button>
                <span className="text-[10px] text-slate-400 block text-center mt-1">
                  Direct message reaches Super Admin
                </span>
              </div>
            )}

            <div className="flex items-start gap-2.5 pt-1">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Working Hours</span>
                <span className="text-white">7:00 AM – 10:00 PM (All 7 Days)</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Service Coverage</span>
                <span className="text-slate-300">Pan-India Cyber Cafes & Printing Centers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 4: Some Information & System Capabilities */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Some Information</span>
          </h3>

          <div className="space-y-2 text-[11px] text-slate-300">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-sky-400" />
                <span>Daily Collection Tracking</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Real-time tracking of today&apos;s cash, UPI, and online revenue with page counts.
              </p>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Razorpay Automated Gateway</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Automated payment verification on backend. Customers do not need to enter any 12-digit UTR number.
              </p>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Bluetooth className="w-3.5 h-3.5 text-indigo-400" />
                <span>Printer Setup in Shop Login</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Printer & Bluetooth configuration safely placed inside the shopkeeper login for full security.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= LAST FOOTER (POWERED BY SHASHI RANJAN 70% OPACITY) ================= */}
      <div className="border-t border-slate-800/80 bg-slate-950 px-4 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} Shashi Print Agent Platform. All rights reserved.
          </div>

          {/* CRITICAL REQUIREMENT: Powered by Shashi ranjan with 70% opacity */}
          <div 
            style={{ opacity: 0.70 }} 
            className="text-xs sm:text-sm font-semibold tracking-wide text-slate-300 flex items-center gap-1.5"
          >
            <span>Powered by</span>
            <span className="font-bold text-white">Shashi ranjan</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>Secure SSL</span>
            <span>•</span>
            <span>Razorpay Verified</span>
            <span>•</span>
            <span>ESC/POS Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
