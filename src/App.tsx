/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { QueueManager } from './components/QueueManager';
import { ThermalSimulator } from './components/ThermalSimulator';
import { PrinterSettings } from './components/PrinterSettings';
import { ApkBuilderModal } from './components/ApkBuilderModal';
import { NewJobModal } from './components/NewJobModal';
import { ShopAuthModal } from './components/ShopAuthModal';
import { ShopManagementModal } from './components/ShopManagementModal';
import { CustomerPortal } from './components/CustomerPortal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { Footer } from './components/Footer';
import { InAppUpdateBanner } from './components/InAppUpdateBanner';
import { FeedbackModal } from './components/FeedbackModal';
import { PrintJob, PrinterDevice, ShopAccount } from '../server';
import { 
  playPrinterSoundEffect, 
  triggerVibration, 
  requestScreenWakeLock, 
  PrintJobData, 
  buildEscPosBytes 
} from './utils/escpos';
import { AlertCircle, CheckCircle2, BellRing, Smartphone, ShieldCheck } from 'lucide-react';

export default function App() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [currentShop, setCurrentShop] = useState<ShopAccount | null>(null);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [shopModalMode, setShopModalMode] = useState<'register' | 'login'>('register');
  const [showShopPanelModal, setShowShopPanelModal] = useState<boolean>(false);
  const [shopPanelInitialTab, setShopPanelInitialTab] = useState<'detail' | 'password' | 'upi' | 'rates' | 'customer_qr' | 'printer_bt'>('detail');
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'agent' | 'customer'>('agent');
  const [customerShopId, setCustomerShopId] = useState<string>('current');
  const [activePrinterId, setActivePrinterId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'simulator' | 'printers' | 'new-job'>('queue');
  const [selectedPreviewJob, setSelectedPreviewJob] = useState<PrintJobData | null>(null);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('58mm');
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [showNewJobModal, setShowNewJobModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const wakeLockRef = useRef<{ release: () => void } | null>(null);
  const isExecutingRef = useRef<boolean>(false);

  // Check URL params for Customer Portal view mode (?shopId=...&view=customer)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shopIdParam = params.get('shopId');
      const viewParam = params.get('view');
      if (viewParam === 'customer' || shopIdParam) {
        setViewMode('customer');
        setCustomerShopId(shopIdParam || 'current');
      }
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Fetch current active shop
  const fetchCurrentShop = useCallback(async () => {
    try {
      const res = await fetch('/api/shops/current');
      const data = await res.json();
      if (data.success && data.shop) {
        setCurrentShop(data.shop);
      }
    } catch (err) {
      console.error('Failed to fetch current shop:', err);
    }
  }, []);

  // Fetch jobs from backend server
  const fetchJobs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/print-jobs');
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch printers from backend server
  const fetchPrinters = useCallback(async () => {
    try {
      const res = await fetch('/api/printers');
      const data = await res.json();
      if (data.success && Array.isArray(data.printers)) {
        setPrinters(data.printers);
        const def = data.printers.find((p: PrinterDevice) => p.isDefault);
        if (def) setActivePrinterId(def.id);
      }
    } catch (err) {
      console.error('Failed to fetch printers:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchJobs();
    fetchPrinters();
    fetchCurrentShop();
  }, [fetchJobs, fetchPrinters, fetchCurrentShop]);

  const handleOpenShopAuth = (mode: 'register' | 'login') => {
    setShopModalMode(mode);
    setShowShopModal(true);
  };

  const handleLogoutShop = async () => {
    try {
      await fetch('/api/shops/logout', { method: 'POST' });
      setCurrentShop(null);
      showToast('Shop logged out successfully', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleOpenShopPanelTab = (tab: 'detail' | 'password' | 'upi' | 'rates' | 'customer_qr' | 'printer_bt') => {
    setShopPanelInitialTab(tab);
    setShowShopPanelModal(true);
  };

  const handleOpenCustomerPortal = (shopId: string) => {
    setCustomerShopId(shopId);
    setViewMode('customer');
  };

  // Execute a specific print job
  const handleExecuteJob = useCallback(async (job: PrintJob) => {
    try {
      // 1. Physical audio & vibration feedback
      if (soundEnabled) {
        playPrinterSoundEffect();
      }
      triggerVibration([100, 50, 100]);

      // 2. Build ESC/POS command packet
      const rawBytes = buildEscPosBytes({
        ...job,
        paperWidth: job.paperWidth || paperWidth,
      });

      console.log(`[Shashi Print Agent] Dispatched ${rawBytes.byteLength} ESC/POS bytes to printer ${activePrinterId} for order ${job.orderNumber}`);

      // 3. Mark executed on backend server
      const res = await fetch(`/api/print-jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'printed',
          executedAt: new Date().toISOString(),
        }),
      });

      const updatedData = await res.json();
      if (updatedData.success) {
        setJobs(prev => prev.map(j => (j.id === job.id ? updatedData.job : j)));
        setSelectedPreviewJob(job);
        showToast(`Printed ${job.orderNumber} successfully!`, 'success');
      }
    } catch (err) {
      console.error('Execution error:', err);
      showToast(`Error executing ${job.orderNumber}`, 'error');
    }
  }, [activePrinterId, paperWidth, soundEnabled]);

  // Real-time polling & Auto-execution loop
  useEffect(() => {
    const interval = setInterval(async () => {
      // Fetch latest jobs
      try {
        const res = await fetch('/api/print-jobs');
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);

          // If auto-print is active and not currently busy executing
          if (autoPrint && !isExecutingRef.current) {
            const pendingJobs = data.jobs.filter((j: PrintJob) => j.status === 'pending');
            if (pendingJobs.length > 0) {
              const nextJob = pendingJobs[0];
              isExecutingRef.current = true;
              await handleExecuteJob(nextJob);
              setTimeout(() => {
                isExecutingRef.current = false;
              }, 1200);
            }
          }
        }
      } catch {
        // silent background poll error
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [autoPrint, handleExecuteJob]);

  // Screen Wake Lock toggle (keeps screen awake for counter cashier/kitchen use)
  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      setWakeLockActive(false);
      showToast('Screen Wake Lock Disabled', 'info');
    } else {
      const lock = await requestScreenWakeLock();
      if (lock.active) {
        wakeLockRef.current = lock;
        setWakeLockActive(true);
        showToast('Screen will stay awake (Continuous Kiosk Mode)', 'success');
      } else {
        showToast('Wake Lock not supported on this browser', 'info');
      }
    }
  };

  // Simulate incoming live order from backend
  const handleSimulateIncoming = async () => {
    try {
      const res = await fetch('/api/print-jobs/simulate-incoming', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`New Order Received: ${data.job.orderNumber}`, 'info');
        triggerVibration([60]);
        fetchJobs(true);
      }
    } catch (err) {
      console.error('Simulate order error:', err);
    }
  };

  // Delete a job
  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/print-jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== id));
        showToast('Job removed', 'info');
      }
    } catch (err) {
      console.error('Delete job error:', err);
    }
  };

  // Clear completed jobs
  const handleClearCompleted = async () => {
    try {
      const res = await fetch('/api/print-jobs/clear-completed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setJobs(prev => prev.filter(j => j.status === 'pending'));
        showToast('Cleared completed jobs', 'info');
      }
    } catch (err) {
      console.error('Clear completed error:', err);
    }
  };

  // Add new printer
  const handleAddPrinter = async (newP: Partial<PrinterDevice>) => {
    try {
      const res = await fetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newP),
      });
      const data = await res.json();
      if (data.success) {
        setPrinters(prev => [...prev, data.printer]);
        if (data.printer.isDefault || printers.length === 0) {
          setActivePrinterId(data.printer.id);
        }
        showToast(`Printer "${data.printer.name}" added successfully!`, 'success');
      }
    } catch (err) {
      console.error('Add printer error:', err);
    }
  };

  // Delete printer
  const handleDeletePrinter = async (id: string) => {
    try {
      const res = await fetch(`/api/printers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPrinters(prev => prev.filter(p => p.id !== id));
        if (activePrinterId === id) {
          const remaining = printers.filter(p => p.id !== id);
          if (remaining.length > 0) setActivePrinterId(remaining[0].id);
          else setActivePrinterId('');
        }
        showToast('Printer removed', 'info');
      }
    } catch (err) {
      console.error('Delete printer error:', err);
    }
  };

  // Set default printer
  const handleSetDefaultPrinter = async (id: string) => {
    try {
      const res = await fetch(`/api/printers/${id}/default`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setPrinters(prev => prev.map(p => ({ ...p, isDefault: p.id === id })));
        setActivePrinterId(id);
        showToast('Default printer set', 'success');
      }
    } catch (err) {
      console.error('Set default printer error:', err);
    }
  };

  // Clear all printers
  const handleClearAllPrinters = async () => {
    try {
      const res = await fetch('/api/printers', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPrinters([]);
        setActivePrinterId('');
        showToast('All printers deleted', 'info');
      }
    } catch (err) {
      console.error('Clear all printers error:', err);
    }
  };

  // Create custom new job
  const handleCreateJob = async (jobData: Partial<PrintJob>) => {
    try {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Job ${data.job.orderNumber} added to queue!`, 'success');
        fetchJobs(true);
        setActiveTab('queue');
      }
    } catch (err) {
      console.error('Create job error:', err);
    }
  };

  // System Spooler print trigger (window.print())
  const handlePrintWithSystem = () => {
    if (soundEnabled) playPrinterSoundEffect();
    window.print();
  };

  const activePrinter = printers.find(p => p.id === activePrinterId);
  const activePrinterName = activePrinter ? activePrinter.name : 'No Printer Connected (Add USB/WiFi)';
  const pendingCount = jobs.filter(j => j.status === 'pending').length;

  // If in Customer Scan Mode, render the dedicated Customer Portal
  if (viewMode === 'customer') {
    return (
      <CustomerPortal
        shopId={customerShopId}
        onBackToAgent={() => setViewMode('agent')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* App Header */}
      <Header
        autoPrint={autoPrint}
        onToggleAutoPrint={() => setAutoPrint(!autoPrint)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        wakeLockActive={wakeLockActive}
        onToggleWakeLock={handleToggleWakeLock}
        pendingCount={pendingCount}
        activePrinterName={activePrinterName}
        onOpenApkModal={() => setShowApkModal(true)}
        activeTab={activeTab}
        onChangeTab={tab => {
          if (tab === 'new-job') {
            setShowNewJobModal(true);
          } else if (tab === 'printers') {
            handleOpenShopPanelTab('printer_bt');
          } else {
            setActiveTab(tab);
          }
        }}
        currentShop={currentShop}
        onOpenShopAuth={handleOpenShopAuth}
        onLogoutShop={handleLogoutShop}
        onOpenShopPanel={() => handleOpenShopPanelTab('detail')}
        onOpenCustomerPortal={() => handleOpenCustomerPortal(currentShop?.id || 'current')}
        onOpenAdminPanel={() => setShowAdminModal(true)}
        onOpenFeedback={() => setShowFeedbackModal(true)}
      />

      {/* In-App Live Version & Auto-Update Banner */}
      <InAppUpdateBanner />

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900/95 border border-slate-700 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <BellRing className="w-4 h-4 text-sky-400 animate-bounce" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'queue' && (
          <QueueManager
            jobs={jobs}
            loading={loading}
            onRefresh={() => fetchJobs()}
            onExecuteJob={handleExecuteJob}
            onSelectJobForPreview={job => {
              setSelectedPreviewJob(job);
              setActiveTab('simulator');
            }}
            onDeleteJob={handleDeleteJob}
            onClearCompleted={handleClearCompleted}
            onSimulateIncoming={handleSimulateIncoming}
            onOpenNewJobModal={() => setShowNewJobModal(true)}
            soundEnabled={soundEnabled}
            currentShop={currentShop}
            onOpenShopAuth={handleOpenShopAuth}
            onOpenShopPanelTab={handleOpenShopPanelTab}
            onOpenPrintersTab={() => handleOpenShopPanelTab('printer_bt')}
          />
        )}

        {activeTab === 'simulator' && (
          <ThermalSimulator
            currentJob={selectedPreviewJob}
            paperWidth={paperWidth}
            onTogglePaperWidth={setPaperWidth}
            onPrintWithSystem={handlePrintWithSystem}
            soundEnabled={soundEnabled}
            currentShop={currentShop}
          />
        )}

        {activeTab === 'printers' && (
          <PrinterSettings
            printers={printers}
            activePrinterId={activePrinterId}
            onSelectActivePrinter={id => {
              setActivePrinterId(id);
              showToast('Active printer updated', 'success');
            }}
            onAddPrinter={handleAddPrinter}
            onDeletePrinter={handleDeletePrinter}
            onSetDefaultPrinter={handleSetDefaultPrinter}
            onClearAllPrinters={handleClearAllPrinters}
            soundEnabled={soundEnabled}
          />
        )}
      </main>

      {/* Feature-Rich Home Page Footer (Quick link, Contact us, About, Powered by Shashi ranjan 70% opacity) */}
      <Footer
        currentShop={currentShop}
        onOpenShopAuth={handleOpenShopAuth}
        onOpenShopPanel={() => {
          setShopPanelInitialTab('detail');
          setShowShopPanelModal(true);
        }}
        onOpenAdminPanel={() => setShowAdminModal(true)}
        onOpenApkModal={() => setShowApkModal(true)}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        onChangeTab={setActiveTab}
      />

      {/* Persistent Mobile Bottom Status Footer */}
      <footer className="fixed bottom-0 inset-x-0 bg-slate-900/95 border-t border-slate-800 text-xs px-4 py-2 flex items-center justify-between z-30 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Agent: <strong>Shashi Print Agent v2.4</strong></span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">Target: {activePrinterName}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowApkModal(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
            <span>Install APK on Phone</span>
          </button>
        </div>
      </footer>

      {/* APK & Mobile Installation Modal */}
      <ApkBuilderModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
      />

      {/* New Test Job Modal */}
      <NewJobModal
        isOpen={showNewJobModal}
        onClose={() => setShowNewJobModal(false)}
        onCreateJob={handleCreateJob}
        currentShop={currentShop}
      />

      {/* Shop Registration & Login Modal */}
      <ShopAuthModal
        isOpen={showShopModal}
        initialMode={shopModalMode}
        onClose={() => setShowShopModal(false)}
        onSuccess={(shop, authMode) => {
          setCurrentShop(shop);
          showToast(
            authMode === 'register'
              ? `🏪 Shop "${shop.shopName}" registered successfully! Login ID: ${shop.loginId}`
              : `🏪 Welcome back to "${shop.shopName}"!`,
            'success'
          );
        }}
      />

      {/* Shop Management Panel (Shop Detail, Change Password, UPI ID & QR, Customer Rates, QR FOR CUSTOMER, Printer & Bluetooth) */}
      {currentShop && (
        <ShopManagementModal
          isOpen={showShopPanelModal}
          initialTab={shopPanelInitialTab}
          onClose={() => setShowShopPanelModal(false)}
          shop={currentShop}
          onShopUpdated={updatedShop => {
            setCurrentShop(updatedShop);
            showToast('Shop details updated!', 'success');
          }}
          onOpenCustomerPortal={id => handleOpenCustomerPortal(id)}
          printers={printers}
          activePrinterId={activePrinterId}
          onSelectActivePrinter={id => {
            setActivePrinterId(id);
            showToast('Active printer updated', 'success');
          }}
          onAddPrinter={handleAddPrinter}
          onDeletePrinter={handleDeletePrinter}
          onSetDefaultPrinter={handleSetDefaultPrinter}
          onClearAllPrinters={handleClearAllPrinters}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Super Admin Control Panel (All Shops, Add/Remove Shop, Change Admin Password) */}
      <AdminPanelModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onShopDeletedOrAdded={() => {
          fetchJobs();
          fetchCurrentShop();
        }}
      />

      {/* Real User Feedback Submission Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        shopName={currentShop?.shopName}
        onFeedbackSubmitted={() => {
          showToast('Feedback successfully submitted to Super Admin!', 'success');
        }}
      />
    </div>
  );
}
