import React, { useState } from 'react';
import { 
  Printer, 
  RotateCw, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  ArrowDown, 
  Scissors,
  Layers,
  Sparkles
} from 'lucide-react';
import { PrintJobData, formatReceiptText, buildEscPosBytes, playPrinterSoundEffect, triggerVibration } from '../utils/escpos';

import { ShopAccount } from '../../server';

interface ThermalSimulatorProps {
  currentJob: PrintJobData | null;
  paperWidth: '58mm' | '80mm';
  onTogglePaperWidth: (w: '58mm' | '80mm') => void;
  onPrintWithSystem: () => void;
  soundEnabled: boolean;
  currentShop?: ShopAccount | null;
}

export const ThermalSimulator: React.FC<ThermalSimulatorProps> = ({
  currentJob,
  paperWidth,
  onTogglePaperWidth,
  onPrintWithSystem,
  soundEnabled,
  currentShop,
}) => {
  const [extraFeeds, setExtraFeeds] = useState(0);
  const [copiedHex, setCopiedHex] = useState(false);
  const [isFeedAnimating, setIsFeedAnimating] = useState(false);

  // Default demo receipt if no job is actively loaded
  const sampleJob: PrintJobData = currentJob || {
    id: 'demo-01',
    orderNumber: 'INV-2026-904',
    title: 'Self-Test & Welcome Receipt',
    type: 'tax_invoice',
    paperWidth: paperWidth,
    customerName: 'Shashi Kumar',
    customerPhone: '+91 99887 76655',
    amount: 850.00,
    source: currentShop ? currentShop.shopName : 'Mobile Android APK',
    shopName: currentShop?.shopName,
    shopAddress: currentShop?.address,
    shopPhone: currentShop?.mobileNumber,
    shopOwner: currentShop?.ownerName,
    items: [
      { name: 'Thermal Paper Roll 58mm', qty: 2, price: 120.00 },
      { name: 'Wireless Barcode Scanner', qty: 1, price: 490.00 },
      { name: 'OTG Type-C Adapter', qty: 1, price: 120.00 }
    ],
    taxDetails: {
      gstRate: 5,
      cgst: 20.24,
      sgst: 20.24,
      totalTax: 40.48
    },
    notes: 'Real-time print command executed successfully!'
  };

  const receiptContent = formatReceiptText({
    ...sampleJob,
    paperWidth: paperWidth,
  });

  const handleFeedPaper = () => {
    setIsFeedAnimating(true);
    setExtraFeeds(prev => prev + 2);
    if (soundEnabled) playPrinterSoundEffect();
    triggerVibration([50]);
    setTimeout(() => setIsFeedAnimating(false), 300);
  };

  const handleCopyHex = () => {
    const bytes = buildEscPosBytes({
      ...sampleJob,
      paperWidth: paperWidth,
    });
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

    navigator.clipboard.writeText(hex);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  const handleSelfTest = () => {
    setIsFeedAnimating(true);
    if (soundEnabled) playPrinterSoundEffect();
    triggerVibration([80, 40, 80]);
    setTimeout(() => setIsFeedAnimating(false), 500);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Virtual Thermal Printer Simulator
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                ESC/POS Emulation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live hardware preview for 58mm & 80mm mobile Bluetooth/USB thermal printers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Paper Width switch */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => onTogglePaperWidth('58mm')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                paperWidth === '58mm'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              58mm (Mobile POS)
            </button>
            <button
              onClick={() => onTogglePaperWidth('80mm')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                paperWidth === '80mm'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80mm (Desktop POS)
            </button>
          </div>

          {/* Android Print Spooler */}
          <button
            onClick={onPrintWithSystem}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition border border-slate-600"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Android Spooler / PDF</span>
          </button>

          {/* Copy ESC/POS Hex */}
          <button
            onClick={handleCopyHex}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition border border-slate-600"
          >
            {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHex ? 'Hex Copied!' : 'Copy Hex'}</span>
          </button>
        </div>
      </div>

      {/* Main Simulator Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Physical Printer Machine Frame */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 rounded-3xl p-5 shadow-2xl relative">
            {/* Printer Top Header with Brand Badge */}
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
                <span className="text-xs font-bold tracking-widest text-slate-200 uppercase">
                  SHASHI THERMAL AGENT {paperWidth}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">MODEL: SHP-BT58</div>
            </div>

            {/* LED Status Indicators */}
            <div className="flex items-center justify-between bg-slate-950/80 rounded-xl px-4 py-2 mb-4 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#22c55e]"></span>
                <span className="text-slate-300">POWER</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isFeedAnimating ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-sky-700'}`}></span>
                <span className="text-slate-300">DATA / BT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300">PAPER OK</span>
              </div>
            </div>

            {/* Receipt Output Slot with Jagged Tear Blade */}
            <div className="relative mb-2">
              <div className="h-6 bg-slate-950 rounded-t-lg border-x-2 border-t-2 border-slate-700 flex items-center justify-center relative overflow-hidden">
                {/* Jagged metal cutter edge teeth */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-b from-slate-600 to-slate-800 flex justify-between px-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-slate-400 rotate-45 transform -translate-y-0.5"></div>
                  ))}
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                  ▼ PAPER FEED SLOT ▼
                </span>
              </div>
            </div>

            {/* Emerging Paper Roll Effect */}
            <div className="relative flex justify-center overflow-hidden pb-4">
              <div
                className={`transition-all duration-300 ${
                  paperWidth === '58mm' ? 'w-[280px] sm:w-[310px]' : 'w-full max-w-[390px]'
                }`}
              >
                {/* Jagged top tear */}
                <div className="w-full h-3 bg-amber-50 [clip-path:polygon(0%_100%,3%_0%,6%_100%,9%_0%,12%_100%,15%_0%,18%_100%,21%_0%,24%_100%,27%_0%,30%_100%,33%_0%,36%_100%,39%_0%,42%_100%,45%_0%,48%_100%,51%_0%,54%_100%,57%_0%,60%_100%,63%_0%,66%_100%,69%_0%,72%_100%,75%_0%,78%_100%,81%_0%,84%_100%,87%_0%,90%_100%,93%_0%,96%_100%,100%_0%,100%_100%)] shadow-md"></div>

                {/* Thermal Paper Surface */}
                <div 
                  id="thermal-printable-receipt"
                  className="bg-amber-50 text-slate-950 p-4 font-mono text-[12px] leading-tight shadow-2xl rounded-b select-text border border-amber-200/50"
                  style={{
                    fontFamily: '"Courier New", Courier, monospace',
                  }}
                >
                  <pre className="whitespace-pre-wrap font-mono text-slate-900 font-medium">
                    {receiptContent}
                    {'\n'.repeat(extraFeeds)}
                  </pre>

                  {/* Simulated 1D Barcode Graphic */}
                  <div className="pt-2 flex flex-col items-center">
                    <div className="h-9 w-4/5 flex items-stretch justify-center gap-[2px] bg-white p-1 rounded border border-slate-300">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <div
                          key={i}
                          className={`bg-black h-full ${
                            (i * 7) % 3 === 0 ? 'w-1.5' : (i * 3) % 2 === 0 ? 'w-0.5' : 'w-1'
                          } ${(i % 5 === 0) ? 'opacity-0' : 'opacity-100'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] tracking-widest text-slate-600 mt-1">
                      *{sampleJob.orderNumber}*
                    </span>
                  </div>

                  {/* UPI QR Code representation if payment receipt */}
                  {sampleJob.type === 'upi_receipt' && (
                    <div className="mt-3 pt-2 border-t border-dashed border-slate-400 text-center">
                      <div className="text-[10px] font-bold text-slate-800 mb-1">SCAN & PAY VIA ANY UPI APP</div>
                      <div className="inline-block p-1.5 bg-white border border-slate-400 rounded">
                        <div className="w-24 h-24 bg-slate-900 flex items-center justify-center text-white text-[9px] font-sans p-1 text-center">
                          BHARAT QR / PHONEPE / GPAY
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Hardware Controls (FEED, POWER, TEST) */}
            <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between gap-3">
              <button
                onClick={handleFeedPaper}
                disabled={isFeedAnimating}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl transition border border-slate-600 shadow-md"
              >
                <ArrowDown className={`w-3.5 h-3.5 ${isFeedAnimating ? 'animate-bounce' : ''}`} />
                <span>FEED (+2 Lines)</span>
              </button>

              <button
                onClick={handleSelfTest}
                className="flex-1 flex items-center justify-center gap-1.5 bg-sky-700 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition border border-sky-500 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>SELF TEST</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Details Panel: Technical Job Specs & ESC/POS Command Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-lg space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Current Print Job Specifications</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ORDER ID</span>
                <span className="font-mono font-bold text-sky-400">{sampleJob.orderNumber}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">PAPER FORMAT</span>
                <span className="font-bold text-slate-200">{paperWidth} ({paperWidth === '58mm' ? '384 dots' : '576 dots'})</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TOTAL AMOUNT</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {sampleJob.amount ? `Rs. ${sampleJob.amount.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">CHARS PER LINE</span>
                <span className="font-bold text-slate-200 font-mono">{paperWidth === '58mm' ? '32 Chars' : '48 Chars'}</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
              <span className="text-slate-400 block font-medium">ESC/POS Command Sequence Generated:</span>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-sky-400">ESC @</span>
                  <span className="text-slate-400">Initialize Printer Head</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">ESC a 1</span>
                  <span className="text-slate-400">Center Align Header</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">ESC E 1 / GS ! 17</span>
                  <span className="text-slate-400">Bold & 2x Height Title</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">ESC a 0</span>
                  <span className="text-slate-400">Left Align Invoice Items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">GS V 66 0</span>
                  <span className="text-slate-400">Partial Paper Cut</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">ESC p 0 25 250</span>
                  <span className="text-slate-400">Kick Cash Drawer Solenoid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions for real physical phone connection */}
          <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-4 text-xs space-y-2">
            <h4 className="font-semibold text-sky-300 flex items-center gap-1.5">
              <span>Android Mobile Hardware Compatibility:</span>
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Connect this agent to physical 58mm or 80mm Bluetooth printers (e.g. POS-5802, PT-210, MPT-II, TVS, Epson, Munbyn) or WiFi/LAN printers. Use the <strong>Printers & Bluetooth</strong> tab to scan Bluetooth devices or send jobs directly via Android Print Spooler.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
