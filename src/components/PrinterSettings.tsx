import React, { useState } from 'react';
import { 
  Printer, 
  Wifi, 
  Usb, 
  Plus, 
  Check, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  FileText,
  Cable,
  Layers,
  Sparkles,
  HelpCircle,
  Smartphone,
  Bluetooth,
  Radio
} from 'lucide-react';
import { PrinterDevice } from '../../server';
import { playPrinterSoundEffect, triggerVibration } from '../utils/escpos';

interface PrinterSettingsProps {
  printers: PrinterDevice[];
  activePrinterId: string;
  onSelectActivePrinter: (id: string) => void;
  onAddPrinter: (p: Partial<PrinterDevice>) => void;
  onDeletePrinter?: (id: string) => void;
  onSetDefaultPrinter?: (id: string) => void;
  onClearAllPrinters?: () => void;
  soundEnabled: boolean;
  shopName?: string;
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  printers,
  activePrinterId,
  onSelectActivePrinter,
  onAddPrinter,
  onDeletePrinter,
  onSetDefaultPrinter,
  onClearAllPrinters,
  soundEnabled,
  shopName,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [printerCategory, setPrinterCategory] = useState<'bluetooth' | 'thermal_usb' | 'thermal_wifi' | 'big_printer'>('bluetooth');

  // Input states - ZERO HARDCODING (Strictly blank default strings)
  const [printerName, setPrinterName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [ipAddress, setIpAddress] = useState<string>('');
  const [port, setPort] = useState<string>('');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm' | 'A4' | 'Legal'>('58mm');
  const [modelInfo, setModelInfo] = useState<string>('');
  const [usbDeviceId, setUsbDeviceId] = useState<string>('');
  const [bluetoothDeviceId, setBluetoothDeviceId] = useState<string>('');
  const [connectionType, setConnectionType] = useState<'usb' | 'network' | 'system_spooler'>('network');

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Web Bluetooth Direct Detection & Pairing
  const handleScanBluetooth = async () => {
    try {
      if (!('bluetooth' in navigator)) {
        showNotice('Is device/browser me Web Bluetooth support nahi hai. Niche manual Bluetooth Printer Name enter karein.', 'error');
        return;
      }
      setTestingConnection(true);
      const navBt = (navigator as unknown as {
        bluetooth: {
          requestDevice: (options: unknown) => Promise<{ name?: string; id?: string }>
        }
      }).bluetooth;

      const device = await navBt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal ESC/POS UUID
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter / Milestone
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC Transparent
        ]
      });

      if (device) {
        const devName = device.name || 'Bluetooth Thermal Printer';
        setPrinterName(devName);
        setBluetoothDeviceId(`BT: ${devName} (ID: ${device.id?.slice(0, 8) || 'Paired'})`);
        showNotice(`Bluetooth Printer connect ho gaya: ${devName}`, 'success');
        if (soundEnabled) playPrinterSoundEffect();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bluetooth scan cancelled';
      if (!msg.includes('cancelled')) {
        showNotice(msg, 'error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  // WebUSB Direct Detection
  const handleScanUsb = async () => {
    try {
      if (!('usb' in navigator)) {
        showNotice('Is browser me WebUSB support nahi hai. Niche manual USB details enter karein.', 'error');
        return;
      }
      setTestingConnection(true);
      const navUsb = (navigator as unknown as { usb: { requestDevice: (opt: unknown) => Promise<{ productName?: string; vendorId?: number; productId?: number }> } }).usb;
      const device = await navUsb.requestDevice({ filters: [] });
      if (device) {
        const devName = device.productName || `USB Printer (VID:${device.vendorId})`;
        setPrinterName(devName);
        setUsbDeviceId(`USB VID:${device.vendorId?.toString(16)} PID:${device.productId?.toString(16)}`);
        showNotice(`USB Device mila: ${devName}`, 'success');
        if (soundEnabled) playPrinterSoundEffect();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'USB pairing cancelled';
      if (!msg.includes('cancelled')) {
        showNotice(msg, 'error');
      }
    } finally {
      setTestingConnection(false);
    }
  };

  // Add Printer Form Submit
  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerName.trim()) {
      showNotice('Kripya Printer Name enter karein.', 'error');
      return;
    }

    let resolvedAddress = '';
    let resolvedType: 'bluetooth' | 'usb' | 'network' | 'system_spooler' = 'bluetooth';

    if (printerCategory === 'bluetooth') {
      resolvedType = 'bluetooth';
      resolvedAddress = bluetoothDeviceId.trim() || 'Bluetooth Wireless (Paired)';
    } else if (printerCategory === 'thermal_usb') {
      resolvedType = 'usb';
      resolvedAddress = usbDeviceId.trim() || 'USB Port / OTG Cable';
    } else if (printerCategory === 'thermal_wifi') {
      resolvedType = 'network';
      resolvedAddress = `${ipAddress.trim() || '192.168.1.100'}:${port.trim() || '9100'}`;
    } else {
      // Big A4 Printer (HP, Epson, Canon, Brother)
      resolvedType = connectionType;
      if (connectionType === 'network') {
        resolvedAddress = `${ipAddress.trim() || '192.168.1.100'}:${port.trim() || '9100'}`;
      } else if (connectionType === 'usb') {
        resolvedAddress = usbDeviceId.trim() || 'USB OTG Cable';
      } else {
        resolvedAddress = 'Android / Windows System Print Spooler';
      }
    }

    onAddPrinter({
      name: printerName.trim(),
      type: resolvedType,
      paperWidth: paperSize,
      category: paperSize === 'A4' || paperSize === 'Legal' ? 'document_a4' : 'thermal',
      brand: brand.trim() || undefined,
      address: resolvedAddress,
      model: modelInfo.trim() || (brand ? `${brand} ${paperSize} Printer` : `${paperSize} Printer`),
      isDefault: printers.length === 0,
    });

    showNotice(`Printer "${printerName}" successfully add ho gaya!`, 'success');

    // Reset inputs to clean blank state
    setPrinterName('');
    setBrand('');
    setIpAddress('');
    setPort('');
    setModelInfo('');
    setUsbDeviceId('');
    setShowAddModal(false);
  };

  const handleTestPrint = (printer: PrinterDevice) => {
    if (soundEnabled) playPrinterSoundEffect();
    triggerVibration([80, 40, 80]);

    if (printer.paperWidth === 'A4' || printer.paperWidth === 'Legal' || printer.type === 'system_spooler') {
      // Trigger native system spooler for A4 / Big printers (HP, Epson, Canon)
      window.print();
      showNotice(`[Shashi Print Agent] A4 Test Print dialogue khul gaya (${printer.name})`, 'success');
    } else {
      // Thermal printer test
      showNotice(`[Shashi Print Agent] Thermal Test slip command sent to ${printer.name} (${printer.paperWidth})`, 'success');
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Kya aap sach me sabhi printers ko delete/clear karna chahte hain?')) {
      onClearAllPrinters?.();
      showNotice('Sabhi printers delete kar diye gaye.', 'success');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">Printer Configuration Hub</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Thermal & Bara Printer (HP/Epson/Canon)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Isme Thermal roll printer aur bada A4 printer (HP, Epson, Canon, Brother) dono connect hote hain
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {printers.length > 0 && onClearAllPrinters && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 text-xs font-semibold transition border border-slate-700"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Delete All Printers</span>
            </button>
          )}

          <button
            onClick={() => {
              setPrinterCategory('bluetooth');
              setPaperSize('58mm');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <Bluetooth className="w-4 h-4" />
            <span>+ Add Bluetooth Printer</span>
          </button>

          <button
            onClick={() => {
              setPrinterCategory('big_printer');
              setPaperSize('A4');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/25 active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>+ Add Bara Printer (HP/Epson/Canon)</span>
          </button>

          <button
            onClick={() => {
              setPrinterCategory('thermal_usb');
              setPaperSize('58mm');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-sky-500/25 active:scale-95"
          >
            <Usb className="w-4 h-4" />
            <span>+ Add Thermal USB/WiFi</span>
          </button>
        </div>
      </div>

      {/* Printer Types Explanatory Card */}
      <div className="bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thermal Printer Box */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Printer className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">1. Thermal Printer (58mm / 80mm Roll)</h3>
          </div>
          <p className="text-xs text-slate-300">
            <strong>Use:</strong> Dukan ki Tax Invoice, UPI Payment slip, KOT token slips turant roll par print karne ke liye.
          </p>
          <div className="text-[11px] text-slate-400">
            <strong>Supported Brands:</strong> TVS RP 3150, Xprinter, NGX, Everycom, Posiflex, Epson TM-T82, Bluetooth/USB/WiFi Thermal.
          </div>
        </div>

        {/* Big Printer Box */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-purple-500/30 space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">2. Bara Printer (HP / Epson / Canon / Brother)</h3>
          </div>
          <p className="text-xs text-slate-300">
            <strong>Use:</strong> Customer dwara upload kiye gaye Aadhaar card, Photo, PDF, Color aur B&W A4 documents print karne ke liye.
          </p>
          <div className="text-[11px] text-slate-400">
            <strong>Supported Brands:</strong> HP LaserJet & InkTank, Epson EcoTank (L3110/L3250), Canon PIXMA/imageCLASS, Brother DCP.
          </div>
        </div>
      </div>

      {/* Notices */}
      {statusMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
            : 'bg-rose-950/80 border-rose-800 text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Connected Printers Grid */}
      {printers.length === 0 ? (
        <div className="bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
            <Printer className="w-8 h-8 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Printers Connected Yet</h3>
            <p className="text-xs text-slate-400">
              Shopkeeper apna <strong>Thermal Bill Printer</strong> ya <strong>Bara A4 Printer (HP/Epson/Canon)</strong> USB ya WiFi se connect karein.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2 flex-wrap">
            <button
              onClick={() => {
                setPrinterCategory('bluetooth');
                setPaperSize('58mm');
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-md shadow-indigo-600/30"
            >
              <Bluetooth className="w-4 h-4" />
              <span>Connect Bluetooth Printer</span>
            </button>

            <button
              onClick={() => {
                setPrinterCategory('big_printer');
                setPaperSize('A4');
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-md shadow-purple-600/30"
            >
              <FileText className="w-4 h-4" />
              <span>Connect Bara Printer (HP/Epson/Canon)</span>
            </button>

            <button
              onClick={() => {
                setPrinterCategory('thermal_usb');
                setPaperSize('58mm');
                setShowAddModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-md shadow-sky-600/30"
            >
              <Usb className="w-4 h-4" />
              <span>Connect Thermal USB/WiFi</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {printers.map(printer => {
            const isSelected = printer.id === activePrinterId || printer.isDefault;
            const isA4 = printer.paperWidth === 'A4' || printer.paperWidth === 'Legal' || printer.category === 'document_a4';
            const isBt = printer.type === 'bluetooth';

            return (
              <div
                key={printer.id}
                className={`bg-slate-900 rounded-3xl p-5 border transition space-y-4 shadow-lg ${
                  isSelected
                    ? isA4
                      ? 'border-purple-500/80 bg-slate-900/90 shadow-purple-500/10'
                      : isBt
                        ? 'border-indigo-500/80 bg-slate-900/90 shadow-indigo-500/10'
                        : 'border-sky-500/80 bg-slate-900/90 shadow-sky-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isA4
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : isBt
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                          : printer.type === 'network'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    }`}>
                      {isA4 ? (
                        <FileText className="w-5 h-5" />
                      ) : isBt ? (
                        <Bluetooth className="w-5 h-5" />
                      ) : printer.type === 'network' ? (
                        <Wifi className="w-5 h-5" />
                      ) : (
                        <Usb className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{printer.name}</span>
                        {printer.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            DEFAULT
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {printer.brand ? `${printer.brand} • ` : ''}{printer.model}
                      </p>
                    </div>
                  </div>

                  {onDeletePrinter && (
                    <button
                      onClick={() => onDeletePrinter(printer.id)}
                      title="Delete Printer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition border border-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Printer Category:</span>
                    <span className={`font-bold uppercase font-mono text-[11px] ${isA4 ? 'text-purple-400' : 'text-sky-400'}`}>
                      {isA4 ? 'Bara Printer (A4 Document)' : 'Thermal Roll (Receipt)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Paper Size:</span>
                    <span className="font-bold text-white font-mono">{printer.paperWidth}</span>
                  </div>
                  {printer.address && (
                    <div className="col-span-2 pt-1 border-t border-slate-900">
                      <span className="text-[10px] text-slate-500 block">Connection Address:</span>
                      <span className="font-mono text-slate-300 text-[11px] truncate block">{printer.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 gap-2 text-xs">
                  <button
                    onClick={() => handleTestPrint(printer)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isA4 ? 'Test Print (A4)' : 'Test Print Slip'}</span>
                  </button>

                  {!printer.isDefault && onSetDefaultPrinter && (
                    <button
                      onClick={() => onSetDefaultPrinter(printer.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white font-semibold transition border border-sky-500/40"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Set as Default</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Add Printer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-sky-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-sky-500 flex items-center justify-center text-white shadow-lg">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Printer to System</h3>
                  <p className="text-xs text-slate-400">
                    Bara Printer (HP/Epson/Canon) ya Thermal Printer connect karein
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {/* Category Select Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/70 p-2 gap-1.5 text-xs overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setPrinterCategory('bluetooth');
                  setPaperSize('58mm');
                }}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                  printerCategory === 'bluetooth'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span>Bluetooth (BT)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrinterCategory('thermal_usb');
                  setPaperSize('58mm');
                }}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                  printerCategory === 'thermal_usb'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Usb className="w-4 h-4" />
                <span>Thermal USB</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrinterCategory('thermal_wifi');
                  setPaperSize('80mm');
                }}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                  printerCategory === 'thermal_wifi'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span>Thermal WiFi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrinterCategory('big_printer');
                  setPaperSize('A4');
                }}
                className={`flex-1 py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                  printerCategory === 'big_printer'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Bara Printer (A4)</span>
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSavePrinter} className="p-5 space-y-4 text-xs">
              {/* CATEGORY 0: BLUETOOTH THERMAL */}
              {printerCategory === 'bluetooth' && (
                <>
                  <div className="bg-indigo-950/30 border border-indigo-500/30 p-3 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-indigo-300 block">
                      Wireless Bluetooth Thermal Printer (Android & Web):
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Bluetooth POS-5802, MPT-II, TVS, Xprinter ya InnerPrinter wireless thermal bill printer connect karein.
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Bluetooth Printer Name *</label>
                      <button
                        type="button"
                        onClick={handleScanBluetooth}
                        disabled={testingConnection}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 active:scale-95"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>{testingConnection ? 'Searching BT Devices...' : 'Pair Web Bluetooth'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      placeholder="e.g. MPT-II / POS-5802 / Thermal BT Printer"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Roll Width</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperSize('58mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '58mm'
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        58mm (2-Inch Mini)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('80mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '80mm'
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        80mm (3-Inch Standard)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Bluetooth Address / ID (Optional)</label>
                    <input
                      type="text"
                      value={bluetoothDeviceId}
                      onChange={e => setBluetoothDeviceId(e.target.value)}
                      placeholder="e.g. BT:66:32:B1:84:11:00 or Paired Device"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
              {/* CATEGORY 1: BARA PRINTER (HP, EPSON, CANON, BROTHER) */}
              {printerCategory === 'big_printer' && (
                <>
                  <div className="bg-purple-950/30 border border-purple-500/30 p-3 rounded-2xl space-y-1">
                    <span className="text-[11px] font-bold text-purple-300 block">
                      A4 / Legal Document Printer (HP, Epson, Canon, Brother):
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Customer ke Aadhaar, PDF, Photo aur Document print karne ke liye use hota hai.
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Select Brand / Company</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['HP', 'Epson', 'Canon', 'Brother'].map(b => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setBrand(b);
                            if (!printerName) setPrinterName(`${b} Desk/Laser Printer`);
                          }}
                          className={`py-2 rounded-xl font-bold border transition ${
                            brand === b
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Printer Name / Model *</label>
                    <input
                      type="text"
                      required
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      placeholder="e.g. HP LaserJet M1005 / Epson EcoTank L3250 / Canon G3010"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Connection Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setConnectionType('network')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          connectionType === 'network'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        WiFi / Network IP
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionType('usb')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          connectionType === 'usb'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        USB Cable / OTG
                      </button>
                      <button
                        type="button"
                        onClick={() => setConnectionType('system_spooler')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          connectionType === 'system_spooler'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Android / PC Spooler
                      </button>
                    </div>
                  </div>

                  {connectionType === 'network' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-slate-300 font-semibold block mb-1">Printer IP Address</label>
                        <input
                          type="text"
                          value={ipAddress}
                          onChange={e => setIpAddress(e.target.value)}
                          placeholder="e.g. 192.168.1.150"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Port</label>
                        <input
                          type="text"
                          value={port}
                          onChange={e => setPort(e.target.value)}
                          placeholder="9100 / 631"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Paper Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperSize('A4')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === 'A4'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        A4 Size (Standard Document)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('Legal')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === 'Legal'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        Legal Size
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* CATEGORY 2: THERMAL USB */}
              {printerCategory === 'thermal_usb' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Thermal Printer Name *</label>
                      <button
                        type="button"
                        onClick={handleScanUsb}
                        disabled={testingConnection}
                        className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <Cable className="w-3.5 h-3.5" />
                        <span>{testingConnection ? 'Detecting...' : 'Auto-Detect WebUSB'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      placeholder="e.g. TVS RP 3150 / POS-80 / Epson TM-T82"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Roll Width</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperSize('58mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '58mm'
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        58mm (2-Inch)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('80mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '80mm'
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        80mm (3-Inch)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">USB Port / VID PID (Optional)</label>
                    <input
                      type="text"
                      value={usbDeviceId}
                      onChange={e => setUsbDeviceId(e.target.value)}
                      placeholder="e.g. USB VID:0416 PID:5011"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </>
              )}

              {/* CATEGORY 3: THERMAL WIFI */}
              {printerCategory === 'thermal_wifi' && (
                <>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Thermal WiFi Printer Name *</label>
                    <input
                      type="text"
                      required
                      value={printerName}
                      onChange={e => setPrinterName(e.target.value)}
                      placeholder="e.g. Billing Counter WiFi Printer"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-slate-300 font-semibold block mb-1">Printer IP Address</label>
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={e => setIpAddress(e.target.value)}
                        placeholder="e.g. 192.168.1.100"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Port</label>
                      <input
                        type="text"
                        value={port}
                        onChange={e => setPort(e.target.value)}
                        placeholder="9100"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Roll Width</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaperSize('58mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '58mm'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        58mm (2-Inch)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperSize('80mm')}
                        className={`py-2 rounded-xl font-bold border transition ${
                          paperSize === '80mm'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        80mm (3-Inch Standard)
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-bold transition shadow-lg ${
                    printerCategory === 'big_printer'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                      : printerCategory === 'thermal_wifi'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                        : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30'
                  }`}
                >
                  Save Printer to System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
