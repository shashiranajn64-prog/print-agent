import React, { useState } from 'react';
import { 
  MessageSquarePlus, 
  X, 
  Send, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Mail, 
  Store,
  Sparkles,
  HelpCircle,
  ThumbsUp,
  Bug
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  onFeedbackSubmitted?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  shopName: defaultShopName,
  onFeedbackSubmitted
}) => {
  const [senderName, setSenderName] = useState('');
  const [senderContact, setSenderContact] = useState('');
  const [shopName, setShopName] = useState(defaultShopName || '');
  const [category, setCategory] = useState<'General Feedback' | 'Suggestion' | 'Issue / Bug' | 'Printing Help' | 'Appreciation'>('General Feedback');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Kripya apna message ya feedback likhein.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim() || 'Anonymous User',
          senderContact: senderContact.trim() || undefined,
          shopName: shopName.trim() || undefined,
          category,
          rating,
          message: message.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        if (onFeedbackSubmitted) onFeedbackSubmitted();
      } else {
        setError(data.message || 'Feedback send nahi ho paya. Dobara koshish karein.');
      }
    } catch {
      setError('Server connection error. Kripya thodi der baad koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/60 via-slate-900 to-sky-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/25">
              <MessageSquarePlus className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Send Real Feedback</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Direct to Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aapka message seedhe Super Admin ke panel me dikhega
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 text-xs text-slate-300">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Feedback Successfully Sent!</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Aapka message Super Admin ke Control Panel me real-time receive ho gaya hai. Hum aapke feedback ki kadar karte hain!
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-400">
                Official Support Email: <span className="text-sky-400 font-mono font-medium">helpshashiprintagent@gmail.com</span>
              </div>

              <button
                onClick={handleResetAndClose}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-bold transition shadow-md"
              >
                Done / Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Rating Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  App Experience Rating:
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-2xl border border-slate-800 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition active:scale-95"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-700 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-amber-400 text-xs">
                    {rating === 5 ? '⭐⭐⭐⭐⭐ Best' : `${rating} / 5 Stars`}
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">
                  Category:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'General Feedback', label: 'Feedback', icon: ThumbsUp },
                    { id: 'Suggestion', label: 'Suggestion', icon: Sparkles },
                    { id: 'Issue / Bug', label: 'Problem / Bug', icon: Bug },
                    { id: 'Printing Help', label: 'Printer Help', icon: HelpCircle },
                    { id: 'Appreciation', label: 'Appreciation', icon: Star }
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold transition ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Aapka Naam:
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Naam dalein..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Mobile ya Email (Reply ke liye):
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={senderContact}
                      onChange={(e) => setSenderContact(e.target.value)}
                      placeholder="Mobile number ya email..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Name */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Shop Name (Agar Shopkeeper hain):
                </label>
                <div className="relative">
                  <Store className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Shashi Print Center / Cyber Cafe..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Aapka Message / Feedback / Samasya <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Kripya batayein aapko kaisa laga ya kya naya feature chahiye, ya koi samasya aayi..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold transition shadow-md shadow-amber-500/25 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Sending to Admin...' : 'Send Real Feedback to Admin'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Official Support: <span className="text-slate-400">helpshashiprintagent@gmail.com</span>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
