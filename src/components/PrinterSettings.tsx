import React, { useState } from 'react';
import { 
  Printer, 
  Bluetooth, 
  Wifi, 
  Usb, 
  Plus, 
  Check, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Settings2,
  HardDrive
} from 'lucide-react';
import { PrinterDevice } from '../../server';
import { connectWebBluetoothPrinter, playPrinterSoundEffect, triggerVibration } from '../utils/escpos';

interface PrinterSettingsProps {
  printers: PrinterDevice[];
  activePrinterId: string;
  onSelectActivePrinter: (id: string) => void;
  onAddPrinter: (p: Partial<PrinterDevice>) => void;
  soundEnabled: boolean;
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  printers,
  activePrinterId,
  onSelectActivePrinter,
  onAddPrinter,
  soundEnabled,
}) => {
  const [scanningBluetooth, setScanningBluetooth] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrinterForm, setNewPrinterForm] = useState({
    name: 'Counter KOT Printer',
    type: 'network' as 'bluetooth' | 'usb' | 'network' | 'system_spooler',
    paperWidth: '80mm' as '58mm' | '80mm',
    address: '192.168.1.120:9100',
    model: 'EPSON TM-T88VI'
  });

  const handleScanBluetooth = async () => {
    setScanningBluetooth(true);
    setBluetoothError(null);
    const result = await connectWebBluetoothPrinter();
    setScanningBluetooth(false);

    if (result.success && result.deviceName) {
      if (soundEnabled) playPrinterSoundEffect();
      triggerVibration([100, 50, 100]);
      onAddPrinter({
        name: result.deviceName,
        type: 'bluetooth',
        paperWidth: '58mm',
        address: 'Web Bluetooth Paired',
        model: 'Bluetooth ESC/POS Thermal Printer',
        isDefault: true,
      });
    } else if (result.error) {
      setBluetoothError(result.error);
    }
  };

  const handleTestPrint = (printer: PrinterDevice) => {
    if (soundEnabled) playPrinterSoundEffect();
    triggerVibration([80]);
    alert(`[Shashi Print Agent] Test print command sent to ${printer.name} (${printer.paperWidth})`);
  };

  const handleCreatePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    onAddPrinter({
      ...newPrinterForm,
      isDefault: false,
    });
    setShowAddModal(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Bluetooth className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Printer Hardware & Bluetooth Management
            </h2>
            <p className="text-xs text-slate-400">
              Pair mobile Bluetooth thermal printers, USB OTG, or Network LAN/WiFi printers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pair Web Bluetooth */}
          <button
            onClick={handleScanBluetooth}
            disabled={scanningBluetooth}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white text-xs font-bold transition shadow-md"
          >
            <Bluetooth className={`w-3.5 h-3.5 ${scanningBluetooth ? 'animate-spin' : ''}`} />
            <span>{scanningBluetooth ? 'Scanning Devices...' : 'Scan Bluetooth Thermal Printer'}</span>
          </button>

          {/* Add custom network printer */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition border border-slate-600"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Network / USB</span>
          </button>
        </div>
      </div>

      {bluetoothError && (
        <div className="p-3 bg-amber-950/50 border border-amber-800/60 rounded-xl text-xs text-amber-200">
          <strong>Bluetooth Notice:</strong> {bluetoothError}
          <div className="mt-1 text-slate-300">
            Tip: In Android Chrome, make sure Bluetooth and Location are turned ON, or install this app as an APK for unrestricted hardware access.
          </div>
        </div>
      )}

      {/* Printers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {printers.map(printer => {
          const isActive = printer.id === activePrinterId;

          return (
            <div
              key={printer.id}
              className={`rounded-2xl border p-4 transition-all duration-200 shadow-lg ${
                isActive
                  ? 'bg-slate-800/95 border-sky-500 shadow-sky-500/10'
                  : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${
                    printer.type === 'bluetooth'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : printer.type === 'network'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {printer.type === 'bluetooth' && <Bluetooth className="w-5 h-5" />}
                    {printer.type === 'network' && <Wifi className="w-5 h-5" />}
                    {printer.type === 'usb' && <Usb className="w-5 h-5" />}
                    {printer.type === 'system_spooler' && <Printer className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{printer.name}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          Active Target
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 block">{printer.model}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 text-sky-400 border border-slate-700">
                  {printer.paperWidth}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">CONNECTION TYPE</span>
                  <span className="capitalize font-medium text-slate-200">{printer.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">ADDRESS / PORT</span>
                  <span className="font-mono text-slate-300 truncate block">{printer.address || 'Local Device'}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleTestPrint(printer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send Test Print</span>
                </button>

                {!isActive ? (
                  <button
                    onClick={() => onSelectActivePrinter(printer.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Set As Active</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selected for Auto-Print</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Printer Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              <span>Add Custom Thermal Printer</span>
            </h3>

            <form onSubmit={handleCreatePrinter} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Printer Name</label>
                <input
                  type="text"
                  required
                  value={newPrinterForm.name}
                  onChange={e => setNewPrinterForm({ ...newPrinterForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Printer Type</label>
                <select
                  value={newPrinterForm.type}
                  onChange={e => setNewPrinterForm({ ...newPrinterForm, type: e.target.value as 'bluetooth' | 'usb' | 'network' | 'system_spooler' })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="network">Network WiFi / LAN (Port 9100 RAW)</option>
                  <option value="bluetooth">Bluetooth (Classic / BLE)</option>
                  <option value="usb">USB OTG Cable</option>
                  <option value="system_spooler">Android System Spooler</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Paper Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPrinterForm({ ...newPrinterForm, paperWidth: '58mm' })}
                    className={`py-2 rounded-xl font-bold border transition ${
                      newPrinterForm.paperWidth === '58mm'
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    58mm (2 Inch Roll)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrinterForm({ ...newPrinterForm, paperWidth: '80mm' })}
                    className={`py-2 rounded-xl font-bold border transition ${
                      newPrinterForm.paperWidth === '80mm'
                        ? 'bg-sky-600 text-white border-sky-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    80mm (3 Inch Roll)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Network Address or Port / ID</label>
                <input
                  type="text"
                  value={newPrinterForm.address}
                  onChange={e => setNewPrinterForm({ ...newPrinterForm, address: e.target.value })}
                  placeholder="e.g. 192.168.1.100:9100 or Bluetooth MAC"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Model Description</label>
                <input
                  type="text"
                  value={newPrinterForm.model}
                  onChange={e => setNewPrinterForm({ ...newPrinterForm, model: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition shadow-md"
                >
                  Save Printer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
