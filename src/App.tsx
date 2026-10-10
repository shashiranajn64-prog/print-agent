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
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { PrintJob, PrinterDevice, ShopAccount } from '../server';
import { 
  playPrinterSoundEffect, 
  triggerVibration, 
  requestScreenWakeLock, 
  PrintJobData, 
  buildEscPosBytes 
} from './utils/escpos';
import { 
  apiFetch, 
  localDb, 
  isOfflineModeActive, 
  setOfflineModeActive, 
  isNativeApp 
} from './utils/api';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AlertCircle, CheckCircle2, BellRing, Smartphone, ShieldCheck, Server } from 'lucide-react';

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
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [serverOnline, setServerOnline] = useState<boolean>(true);
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
      const res = await apiFetch('/api/shops/current');
      const data = await res.json();
      if (data.success && data.shop) {
        setCurrentShop(data.shop);
        localDb.saveShop(data.shop);
        setServerOnline(true);
        return;
      }
    } catch (err) {
      console.warn('Backend shop fetch offline, using localDb:', err);
      setServerOnline(false);
      const local = localDb.getShop();
      if (local) {
        setCurrentShop(local);
      }
    }
  }, []);

  // Fetch jobs from backend server or local storage
  const fetchJobs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await apiFetch('/api/print-jobs');
      const data = await res.json();
      if (data.success && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        localDb.saveJobs(data.jobs);
        setServerOnline(true);
        return;
      }
    } catch (err) {
      setServerOnline(false);
      const local = localDb.getJobs();
      setJobs(local);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch printers from backend server or local storage
  const fetchPrinters = useCallback(async () => {
    try {
      const res = await apiFetch('/api/printers');
      const data = await res.json();
      if (data.success && Array.isArray(data.printers)) {
        setPrinters(data.printers);
        localDb.savePrinters(data.printers);
        const def = data.printers.find((p: PrinterDevice) => p.isDefault);
        if (def) setActivePrinterId(def.id);
        return;
      }
    } catch (err) {
      const local = localDb.getPrinters();
      setPrinters(local);
      const def = local.find(p => p.isDefault);
      if (def) setActivePrinterId(def.id);
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
      await apiFetch('/api/shops/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout offline:', err);
    }
    localDb.saveShop(null);
    setCurrentShop(null);
    showToast('Shop logged out successfully', 'info');
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

      // 2. Build ESC/POS command packet (for thermal/bluetooth)
      const rawBytes = buildEscPosBytes({
        ...job,
        paperWidth: job.paperWidth || paperWidth,
      });

      console.log(`[Shashi Print Agent] Dispatched ${rawBytes.byteLength} ESC/POS bytes to printer ${activePrinterId} for order ${job.orderNumber}`);

      // 3. A4 Paper Local Auto-Print trigger (Direct system/local printer window)
      try {
        const printFrame = document.getElementById('a4-print-iframe') as HTMLIFrameElement;
        if (printFrame && printFrame.contentWindow) {
          const pDoc = printFrame.contentWindow.document;
          pDoc.open();
          pDoc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>A4 Print - ${job.orderNumber}</title>
                <style>
                  @page { size: A4 portrait; margin: 10mm; }
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #111; }
                  .header { border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
                  .shop { font-size: 20px; font-weight: bold; }
                  .info { font-size: 12px; color: #555; }
                  .token { font-size: 15px; font-weight: 900; background: #e0f2fe; padding: 4px 10px; border-radius: 6px; }
                  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
                  .doc-box { text-align: center; margin: 20px 0; }
                  .doc-box img { max-width: 100%; max-height: 850px; object-fit: contain; }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <div class="shop">${currentShop?.shopName || 'Shashi Print Center'}</div>
                    <div class="info">${currentShop?.address || 'Counter 1'} • Mo: ${currentShop?.mobileNumber || ''}</div>
                  </div>
                  <div style="text-align: right;">
                    <div class="token">A4 PRINT #${job.orderNumber}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 4px;">Time: ${new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
                <div class="meta">
                  <div><strong>Customer:</strong> ${job.customerName || 'Walk-in'}</div>
                  <div><strong>Total Amount:</strong> ₹${job.amount || 0}</div>
                  <div><strong>Format:</strong> A4 Standard Document</div>
                  <div><strong>Source:</strong> ${job.source}</div>
                </div>
                ${job.notes ? `<div style="font-size: 12px; color: #555; margin-bottom: 12px;"><strong>Details:</strong> ${job.notes}</div>` : ''}
                <script>
                  window.onload = function() {
                    window.print();
                  };
                </script>
              </body>
            </html>
          `);
          pDoc.close();
        }
      } catch (pErr) {
        console.warn('Local A4 printer iframe notice:', pErr);
      }

      // 4. Update status in Firebase Firestore
      try {
        await updateDoc(doc(db, 'print_jobs', job.id), {
          status: 'printed',
          executedAt: new Date().toISOString()
        });
      } catch (fireErr) {
        console.warn('Firestore updateDoc notice:', fireErr);
      }

      // 5. Mark executed on backend server or local storage
      try {
        const res = await apiFetch(`/api/print-jobs/${job.id}`, {
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
          localDb.updateJobStatus(job.id, 'printed');
          setSelectedPreviewJob(job);
          showToast(`Printed ${job.orderNumber} successfully!`, 'success');
          return;
        }
      } catch {
        // Fallback to local execution
        localDb.updateJobStatus(job.id, 'printed');
        setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: 'printed', executedAt: new Date().toISOString() } : j)));
        setSelectedPreviewJob(job);
        showToast(`Printed ${job.orderNumber} successfully!`, 'success');
      }
    } catch (err) {
      console.error('Execution error:', err);
      showToast(`Error executing ${job.orderNumber}`, 'error');
    }
  }, [activePrinterId, paperWidth, soundEnabled, currentShop]);

  // Real-time Firebase Firestore Subscription for print jobs (Instant Auto-Print)
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'print_jobs'), (snapshot) => {
        const fireJobs: PrintJob[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          fireJobs.push({
            id: d.id || docSnap.id,
            orderNumber: d.orderNumber || 'ORD-000',
            title: d.title || 'Customer Print Job',
            type: 'tax_invoice',
            paperWidth: (d.paperWidth as '58mm' | '80mm') || '80mm',
            status: d.status || 'pending',
            priority: 'urgent',
            createdAt: d.createdAt || new Date().toISOString(),
            executedAt: d.executedAt,
            source: d.source || 'Customer Online Kiosk',
            customerName: d.customerName,
            customerPhone: d.customerPhone,
            amount: d.amount,
            notes: d.notes,
            printerId: d.printerId
          });
        });

        if (fireJobs.length > 0) {
          fireJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setJobs(fireJobs);
          localDb.saveJobs(fireJobs);

          // Auto-execute pending jobs in real time if autoPrint is on
          if (autoPrint && !isExecutingRef.current) {
            const pendingJobs = fireJobs.filter(j => j.status === 'pending');
            if (pendingJobs.length > 0) {
              const nextJob = pendingJobs[0];
              isExecutingRef.current = true;
              handleExecuteJob(nextJob).finally(() => {
                setTimeout(() => {
                  isExecutingRef.current = false;
                }, 1200);
              });
            }
          }
        }
      }, (err) => {
        console.warn('[Firebase] Firestore onSnapshot warning:', err);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('[Firebase] Snapshot error, falling back to polling:', err);
    }
  }, [autoPrint, handleExecuteJob]);

  // Real-time polling fallback loop
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/print-jobs');
        const data = await res.json();
        if (data.success && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          localDb.saveJobs(data.jobs);

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
    }, 4500);

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
      const res = await apiFetch('/api/print-jobs/simulate-incoming', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`New Order Received: ${data.job.orderNumber}`, 'info');
        triggerVibration([60]);
        fetchJobs(true);
        return;
      }
    } catch {
      // Local simulated job
      const simulatedJob: PrintJob = {
        id: `sim_${Date.now()}`,
        orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        title: 'Customer Print Order',
        type: 'tax_invoice',
        paperWidth: '58mm',
        status: 'pending',
        priority: 'urgent',
        createdAt: new Date().toISOString(),
        source: 'QR Customer Portal',
        customerName: 'Rahul Verma',
        amount: 25,
        items: [
          { name: 'A4 Document (B&W)', qty: 5, price: 3 },
          { name: 'Colour Print Slip', qty: 1, price: 10 }
        ]
      };
      localDb.addJob(simulatedJob);
      setJobs(prev => [simulatedJob, ...prev]);
      showToast(`New Order Received: ${simulatedJob.orderNumber}`, 'info');
      triggerVibration([60]);
    }
  };

  // Delete a job
  const handleDeleteJob = async (id: string) => {
    try {
      await apiFetch(`/api/print-jobs/${id}`, { method: 'DELETE' });
    } catch {}
    localDb.deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
    showToast('Job removed', 'info');
  };

  // Clear completed jobs
  const handleClearCompleted = async () => {
    try {
      await apiFetch('/api/print-jobs/clear-completed', { method: 'POST' });
    } catch {}
    localDb.clearCompletedJobs();
    setJobs(prev => prev.filter(j => j.status === 'pending'));
    showToast('Cleared completed jobs', 'info');
  };

  // Add new printer
  const handleAddPrinter = async (newP: Partial<PrinterDevice>) => {
    const fullPrinter: PrinterDevice = {
      id: newP.id || `printer_${Date.now()}`,
      name: newP.name || 'Thermal Printer',
      type: newP.type || 'bluetooth',
      paperWidth: newP.paperWidth || '58mm',
      category: newP.category || 'thermal',
      status: 'idle',
      isDefault: newP.isDefault || printers.length === 0,
      model: newP.model || 'Standard Thermal',
      address: newP.address,
      brand: newP.brand,
    };

    try {
      const res = await apiFetch('/api/printers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newP),
      });
      const data = await res.json();
      if (data.success) {
        setPrinters(prev => [...prev, data.printer]);
        localDb.savePrinters([...printers, data.printer]);
        if (data.printer.isDefault || printers.length === 0) {
          setActivePrinterId(data.printer.id);
        }
        showToast(`Printer "${data.printer.name}" added successfully!`, 'success');
        return;
      }
    } catch {}

    // Local fallback
    const updated = [...printers, fullPrinter];
    setPrinters(updated);
    localDb.savePrinters(updated);
    if (fullPrinter.isDefault || printers.length === 0) {
      setActivePrinterId(fullPrinter.id);
    }
    showToast(`Printer "${fullPrinter.name}" added successfully!`, 'success');
  };

  // Delete printer
  const handleDeletePrinter = async (id: string) => {
    try {
      await apiFetch(`/api/printers/${id}`, { method: 'DELETE' });
    } catch {}
    const updated = printers.filter(p => p.id !== id);
    setPrinters(updated);
    localDb.savePrinters(updated);
    if (activePrinterId === id) {
      if (updated.length > 0) setActivePrinterId(updated[0].id);
      else setActivePrinterId('');
    }
    showToast('Printer removed', 'info');
  };

  // Set default printer
  const handleSetDefaultPrinter = async (id: string) => {
    try {
      await apiFetch(`/api/printers/${id}/default`, { method: 'PATCH' });
    } catch {}
    const updated = printers.map(p => ({ ...p, isDefault: p.id === id }));
    setPrinters(updated);
    localDb.savePrinters(updated);
    setActivePrinterId(id);
    showToast('Default printer set', 'success');
  };

  // Clear all printers
  const handleClearAllPrinters = async () => {
    try {
      await apiFetch('/api/printers', { method: 'DELETE' });
    } catch {}
    setPrinters([]);
    localDb.savePrinters([]);
    setActivePrinterId('');
    showToast('All printers deleted', 'info');
  };

  // Create custom new job
  const handleCreateJob = async (jobData: Partial<PrintJob>) => {
    const newJob: PrintJob = {
      id: jobData.id || `job_${Date.now()}`,
      orderNumber: jobData.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      title: jobData.title || 'Print Job',
      type: jobData.type || 'tax_invoice',
      paperWidth: jobData.paperWidth || paperWidth,
      status: 'pending',
      priority: jobData.priority || 'normal',
      createdAt: new Date().toISOString(),
      source: jobData.source || 'Manual Job',
      customerName: jobData.customerName,
      customerPhone: jobData.customerPhone,
      amount: jobData.amount,
      items: jobData.items,
      notes: jobData.notes,
    };

    try {
      const res = await apiFetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Job ${data.job.orderNumber} added to queue!`, 'success');
        fetchJobs(true);
        setActiveTab('queue');
        return;
      }
    } catch {}

    localDb.addJob(newJob);
    setJobs(prev => [newJob, ...prev]);
    showToast(`Job ${newJob.orderNumber} added to queue!`, 'success');
    setActiveTab('queue');
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
        onOpenServerSettings={() => setShowServerModal(true)}
        isServerOnline={!isOfflineModeActive() && serverOnline}
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

      {/* Server & Network Connection Settings Modal */}
      <ServerSettingsModal
        isOpen={showServerModal}
        onClose={() => setShowServerModal(false)}
        onSettingsChanged={() => {
          fetchCurrentShop();
          fetchJobs();
          fetchPrinters();
        }}
      />

      {/* Hidden A4 Print Spooler iframe for Direct Local Printer Window */}
      <iframe id="a4-print-iframe" className="hidden w-0 h-0 border-0 pointer-events-none" title="A4 Print Spooler" />
    </div>
  );
}
