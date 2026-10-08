import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Receipt, 
  UtensilsCrossed, 
  Ticket, 
  QrCode, 
  Check, 
  Sparkles,
  X
} from 'lucide-react';
import { PrintJob, ShopAccount } from '../../server';

interface NewJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: (jobData: Partial<PrintJob>) => void;
  currentShop?: ShopAccount | null;
}

export const NewJobModal: React.FC<NewJobModalProps> = ({ isOpen, onClose, onCreateJob, currentShop }) => {
  const [jobType, setJobType] = useState<'tax_invoice' | 'kot' | 'token_slip' | 'upi_receipt'>('tax_invoice');
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [title, setTitle] = useState(currentShop ? `${currentShop.shopName} Bill` : 'Retail Tax Invoice');
  const [customerName, setCustomerName] = useState('Shashi Kumar');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [source, setSource] = useState(currentShop ? currentShop.shopName : 'Cashier Terminal #1');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [notes, setNotes] = useState(currentShop ? `Thank you for visiting ${currentShop.shopName}!` : 'Thank you! Visit again.');
  const [items, setItems] = useState([
    { name: 'Amul Butter 500g', qty: 1, price: 285.00 },
    { name: 'Britannia Good Day 120g', qty: 2, price: 35.00 },
    { name: 'Cadbury Dairy Milk Silk', qty: 1, price: 180.00 },
  ]);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  const handleAddItem = () => {
    setItems([...items, { name: 'Item Name', qty: 1, price: 50.00 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: 'name' | 'qty' | 'price', value: unknown) => {
    const updated = [...items];
    if (field === 'name') updated[index].name = String(value);
    if (field === 'qty') updated[index].qty = Math.max(1, parseInt(String(value), 10) || 1);
    if (field === 'price') updated[index].price = Math.max(0, parseFloat(String(value)) || 0);
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateJob({
      title,
      type: jobType,
      paperWidth,
      priority,
      source,
      customerName,
      customerPhone,
      amount: totalAmount,
      items,
      notes,
      orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Test Print Job</h3>
              <p className="text-xs text-slate-400">Pushes a new print command to backend server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Job Type Selector */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">Select Document Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setJobType('tax_invoice');
                  setTitle('Supermarket Retail GST Bill');
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                  jobType === 'tax_invoice'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span className="font-semibold text-[11px]">GST Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJobType('kot');
                  setTitle('Kitchen Order Ticket (KOT)');
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                  jobType === 'kot'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span className="font-semibold text-[11px]">Kitchen KOT</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJobType('token_slip');
                  setTitle('Clinic / Counter Token');
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                  jobType === 'token_slip'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span className="font-semibold text-[11px]">Token Slip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setJobType('upi_receipt');
                  setTitle('UPI Payment Confirmation');
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                  jobType === 'upi_receipt'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="font-semibold text-[11px]">UPI Slip</span>
              </button>
            </div>
          </div>

          {/* Paper Size & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Paper Width</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperWidth('58mm')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    paperWidth === '58mm'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  58mm (2&quot;)
                </button>
                <button
                  type="button"
                  onClick={() => setPaperWidth('80mm')}
                  className={`py-2 rounded-xl font-bold border transition ${
                    paperWidth === '80mm'
                      ? 'bg-sky-600 text-white border-sky-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  80mm (3&quot;)
                </button>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as 'normal' | 'high' | 'urgent')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="urgent">Urgent (Flash execute)</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Customer / Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Customer / Guest</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Source / Counter</label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">Bill Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700">
                  <input
                    type="text"
                    value={it.name}
                    onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="Item name"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                  />
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={e => handleUpdateItem(idx, 'qty', e.target.value)}
                    placeholder="Qty"
                    className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs text-center"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={it.price}
                    onChange={e => handleUpdateItem(idx, 'price', e.target.value)}
                    placeholder="Rate"
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs text-right"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 font-bold">
              <span className="text-slate-400">Calculated Total:</span>
              <span className="text-emerald-400 text-sm font-mono">Rs. {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Receipt Notes / Footer Message</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold transition shadow-lg shadow-sky-500/25"
            >
              <Check className="w-4 h-4" />
              <span>Send to Print Queue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
