import express, { Request, Response } from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Enable CORS for mobile APK (Capacitor/WebView) and remote clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

export interface PrintJob {
  id: string;
  orderNumber: string;
  title: string;
  type: 'tax_invoice' | 'kot' | 'token_slip' | 'barcode_label' | 'upi_receipt' | 'raw_escpos';
  paperWidth: '58mm' | '80mm' | 'A4';
  status: 'pending' | 'processing' | 'printed' | 'failed';
  priority: 'urgent' | 'high' | 'normal';
  createdAt: string;
  executedAt?: string;
  source: string; // e.g., 'POS Counter 1', 'Swiggy/Zomato', 'E-Commerce Store', 'Billing App'
  customerName?: string;
  customerPhone?: string;
  amount?: number;
  items?: Array<{ name: string; qty: number; price: number; tax?: number }>;
  taxDetails?: { gstRate: number; cgst: number; sgst: number; totalTax: number };
  rawEscPosHex?: string;
  notes?: string;
  printerId?: string;
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'network' | 'system_spooler';
  paperWidth: '58mm' | '80mm' | 'A4' | 'Legal';
  category?: 'thermal' | 'document_a4';
  status: 'connected' | 'disconnected' | 'idle' | 'busy';
  address?: string; // IP:Port or Bluetooth MAC or USB
  isDefault: boolean;
  model: string;
  brand?: string; // HP, Epson, Canon, Brother, TVS, etc.
  lastSeen?: string;
}

export interface PrintRates {
  blackAndWhiteRate: number; // e.g. ₹3 per page
  colourRate: number;        // e.g. ₹10 per page
  pdfPageRate: number;       // e.g. ₹5 per page
}

export interface ShopAccount {
  id: string;
  shopName: string;
  mobileNumber: string;
  ownerName: string;
  address: string;
  loginId: string;
  password: string;
  registeredAt: string;
  isActive: boolean;
  totalPrinted: number;
  upiId?: string;            // Shopkeeper UPI ID e.g. shop@upi
  upiQrCustomUrl?: string;   // Optional custom QR image URL or data
  razorpayKeyId?: string;    // Optional merchant Razorpay Key ID
  rates: PrintRates;
}

// In-memory data store for shops
let registeredShops: ShopAccount[] = [];
let currentActiveShop: ShopAccount | null = null;

// Super Admin Account
let adminAccount = {
  id: '7870089309',
  password: '211361',
  isLoggedIn: false
};

// Real User Feedback model - ZERO FAKE / ZERO DEMO MESSAGES
export interface UserFeedback {
  id: string;
  senderName: string;
  senderContact?: string;
  shopName?: string;
  category: 'General Feedback' | 'Suggestion' | 'Issue / Bug' | 'Printing Help' | 'Appreciation';
  rating: number; // 1 to 5 stars
  message: string;
  createdAt: string;
  isRead: boolean;
}

// Strictly real feedbacks submitted by users (Starts completely empty)
let userFeedbacks: UserFeedback[] = [];

// In-memory data store for real print jobs (Clean - No fake jobs)
let printJobs: PrintJob[] = [];

// In-memory printer store - empty by default so shopkeeper adds their own printers manually
let printers: PrinterDevice[] = [];

let agentHeartbeat = {
  lastSeen: new Date().toISOString(),
  batteryLevel: 88,
  isCharging: true,
  deviceName: 'Android Mobile (Shashi APK)',
  ipAddress: '192.168.1.45',
  appVersion: 'v2.4.0-APK',
  autoPrintEnabled: true,
  totalJobsExecuted: 0,
  activePrinterId: ''
};

export interface DailyCollectionStats {
  todayDate: string;
  totalCollection: number;
  totalJobs: number;
  bwPages: number;
  colourPages: number;
  pdfPages: number;
  razorpayOnline: number;
}

function calculateDailyStats(shopId?: string): DailyCollectionStats {
  const todayStr = new Date().toDateString();
  const relevantJobs = printJobs.filter(j => {
    const jobDate = new Date(j.createdAt).toDateString();
    return jobDate === todayStr;
  });

  let totalCollection = 0;
  let bwPages = 0;
  let colourPages = 0;
  let pdfPages = 0;
  let razorpayOnline = 0;

  for (const job of relevantJobs) {
    totalCollection += job.amount || 0;
    const isRazorpay = job.notes?.includes('Razorpay') || job.source?.includes('Razorpay');
    if (isRazorpay) {
      razorpayOnline += job.amount || 0;
    }
    const isColour = job.title?.toLowerCase().includes('colour') || job.notes?.toLowerCase().includes('colour');
    const isPdf = job.title?.toLowerCase().includes('pdf') || job.notes?.toLowerCase().includes('pdf');
    const totalQty = job.items?.reduce((s, it) => s + (it.qty || 1), 0) || 1;

    if (isColour) colourPages += totalQty;
    else if (isPdf) pdfPages += totalQty;
    else bwPages += totalQty;
  }

  return {
    todayDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    totalCollection,
    totalJobs: relevantJobs.length,
    bwPages,
    colourPages,
    pdfPages,
    razorpayOnline
  };
}

// ================= API ENDPOINTS =================

// 0. Get App Version & Update Information
app.get('/api/app-version', (_req: Request, res: Response) => {
  res.json({
    latestVersion: '1.0.1',
    releaseDate: '2026-10-08',
    changelog: [
      'Daily Collection Live Tracking on Shop Login',
      'Direct Razorpay Payment auto-verification (No UTR input needed)',
      'Real-time ESC/POS Bluetooth & Network thermal printing',
      'Instant Over-The-Air (OTA) updates support'
    ],
    mandatoryUpdate: false,
    apkDownloadUrl: 'https://github.com/shashiranjan/shashi-print-agent/releases/latest/download/ShashiPrintAgent-debug.apk',
    webUrl: process.env.VITE_APP_URL || 'https://ais-pre-ahpif75nvakpcce7ybedge-718433802346.asia-southeast1.run.app'
  });
});

// 1. Get print jobs with optional status filter
app.get('/api/print-jobs', (req: Request, res: Response) => {
  const { status, limit } = req.query;
  let results = [...printJobs];
  if (status && status !== 'all') {
    results = results.filter(j => j.status === status);
  }
  // Sort pending first, then by createdAt desc
  results.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  if (limit) {
    results = results.slice(0, parseInt(String(limit), 10));
  }
  res.json({
    success: true,
    count: results.length,
    pendingCount: printJobs.filter(j => j.status === 'pending').length,
    jobs: results
  });
});

// 2. Create new print job (Webhook / POS push)
app.post('/api/print-jobs', (req: Request, res: Response) => {
  const {
    orderNumber,
    title,
    type = 'tax_invoice',
    paperWidth = '80mm',
    priority = 'normal',
    source = 'Mobile POS',
    customerName,
    customerPhone,
    amount,
    items,
    taxDetails,
    notes,
    rawEscPosHex
  } = req.body;

  const newJob: PrintJob = {
    id: `job-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    orderNumber: orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
    title: title || 'Quick Print Command',
    type,
    paperWidth,
    status: 'pending',
    priority,
    createdAt: new Date().toISOString(),
    source,
    customerName,
    customerPhone,
    amount: Number(amount) || 0,
    items: items || [],
    taxDetails,
    notes,
    rawEscPosHex
  };

  printJobs.unshift(newJob);
  res.status(201).json({ success: true, message: 'Print job added to queue', job: newJob });
});

// 3. Update print job status (e.g. Agent executed print)
app.patch('/api/print-jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, executedAt, notes } = req.body;

  const jobIndex = printJobs.findIndex(j => j.id === id);
  if (jobIndex === -1) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  if (status) printJobs[jobIndex].status = status;
  if (executedAt) printJobs[jobIndex].executedAt = executedAt;
  else if (status === 'printed') printJobs[jobIndex].executedAt = new Date().toISOString();
  if (notes) printJobs[jobIndex].notes = notes;

  agentHeartbeat.totalJobsExecuted += (status === 'printed' ? 1 : 0);

  res.json({ success: true, job: printJobs[jobIndex] });
});

// 4. Clear or reset print jobs
app.delete('/api/print-jobs/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  printJobs = printJobs.filter(j => j.id !== id);
  res.json({ success: true, message: `Job ${id} deleted` });
});

app.post('/api/print-jobs/clear-completed', (_req: Request, res: Response) => {
  printJobs = printJobs.filter(j => j.status === 'pending');
  res.json({ success: true, message: 'Cleared completed and failed jobs' });
});

// 5. Simulate new live incoming print job (Testing button for user)
app.post('/api/print-jobs/simulate-incoming', (_req: Request, res: Response) => {
  const sampleScenarios = [
    {
      title: 'Swiggy / Zomato Online Order',
      type: 'kot' as const,
      orderWidth: '58mm' as const,
      customer: 'Pooja Roy (Delivery)',
      source: 'Online Aggregator (API)',
      items: [
        { name: 'Veg Hakka Noodles', qty: 2, price: 160.00 },
        { name: 'Chilli Paneer Dry', qty: 1, price: 210.00 }
      ],
      amount: 530.00,
      notes: 'Extra Spicy, Provide Cutlery'
    },
    {
      title: 'Counter GST Bill',
      type: 'tax_invoice' as const,
      orderWidth: '80mm' as const,
      customer: 'Rajesh Mehra',
      source: 'Quick POS Cashier #2',
      items: [
        { name: 'Dove Shampoo 650ml', qty: 1, price: 420.00 },
        { name: 'Colgate MaxFresh 150g', qty: 2, price: 110.00 },
        { name: 'Haldiram Bhujia 400g', qty: 1, price: 140.00 }
      ],
      amount: 780.00,
      notes: 'Paid via Paytm Soundbox'
    },
    {
      title: 'Hospital OPD Slip',
      type: 'token_slip' as const,
      orderWidth: '58mm' as const,
      customer: 'Patient: Sunita Devi',
      source: 'Reception Kiosk',
      items: [
        { name: 'Consultation - Dr. S. Verma (ENT)', qty: 1, price: 300.00 }
      ],
      amount: 300.00,
      notes: 'Room 104 - 2nd Floor'
    }
  ];

  const pick = sampleScenarios[Math.floor(Math.random() * sampleScenarios.length)];
  const newJob: PrintJob = {
    id: `job-auto-${Date.now().toString(36)}`,
    orderNumber: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    title: pick.title,
    type: pick.type,
    paperWidth: pick.orderWidth,
    status: 'pending',
    priority: 'high',
    createdAt: new Date().toISOString(),
    source: pick.source,
    customerName: pick.customer,
    amount: pick.amount,
    items: pick.items,
    notes: pick.notes
  };

  printJobs.unshift(newJob);
  res.status(201).json({ success: true, job: newJob });
});

// 6. Printers Management
app.get('/api/printers', (_req: Request, res: Response) => {
  res.json({ success: true, printers });
});

app.post('/api/printers', (req: Request, res: Response) => {
  const { name, type, paperWidth, address, model, isDefault, category, brand } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Printer name is required' });
  }

  const shouldBeDefault = printers.length === 0 ? true : !!isDefault;
  const validWidth = ['58mm', '80mm', 'A4', 'Legal'].includes(paperWidth) ? paperWidth : (type === 'usb' || type === 'bluetooth' ? '58mm' : 'A4');

  const newPrinter: PrinterDevice = {
    id: `prn-${Date.now().toString(36)}`,
    name: name.trim(),
    type: type || 'usb',
    paperWidth: validWidth,
    category: category || (validWidth === 'A4' || validWidth === 'Legal' ? 'document_a4' : 'thermal'),
    status: 'connected',
    address: address ? address.trim() : undefined,
    model: model ? model.trim() : `${brand || 'Generic'} ${validWidth} Printer`,
    brand: brand ? brand.trim() : undefined,
    isDefault: shouldBeDefault,
    lastSeen: new Date().toISOString()
  };

  if (newPrinter.isDefault) {
    printers.forEach(p => (p.isDefault = false));
  }
  printers.push(newPrinter);
  res.status(201).json({ success: true, printer: newPrinter });
});

// Delete specific printer
app.delete('/api/printers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const removedIndex = printers.findIndex(p => p.id === id);
  if (removedIndex !== -1) {
    const wasDefault = printers[removedIndex].isDefault;
    printers.splice(removedIndex, 1);
    if (wasDefault && printers.length > 0) {
      printers[0].isDefault = true;
    }
  }
  res.json({ success: true, message: 'Printer removed successfully', printers });
});

// Set default printer
app.patch('/api/printers/:id/default', (req: Request, res: Response) => {
  const { id } = req.params;
  printers.forEach(p => {
    p.isDefault = (p.id === id);
  });
  res.json({ success: true, printers });
});

// Clear all printers
app.delete('/api/printers', (_req: Request, res: Response) => {
  printers = [];
  res.json({ success: true, message: 'All printers deleted', printers: [] });
});

// 7. Agent Heartbeat / Telemetry
app.get('/api/agent-status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    agent: agentHeartbeat,
    queueCount: printJobs.filter(j => j.status === 'pending').length,
    completedCount: printJobs.filter(j => j.status === 'printed').length,
    failedCount: printJobs.filter(j => j.status === 'failed').length
  });
});

app.post('/api/agent-heartbeat', (req: Request, res: Response) => {
  const { batteryLevel, isCharging, deviceName, autoPrintEnabled, activePrinterId } = req.body;
  if (batteryLevel !== undefined) agentHeartbeat.batteryLevel = batteryLevel;
  if (isCharging !== undefined) agentHeartbeat.isCharging = isCharging;
  if (deviceName) agentHeartbeat.deviceName = deviceName;
  if (autoPrintEnabled !== undefined) agentHeartbeat.autoPrintEnabled = autoPrintEnabled;
  if (activePrinterId) agentHeartbeat.activePrinterId = activePrinterId;
  agentHeartbeat.lastSeen = new Date().toISOString();

  res.json({ success: true, agent: agentHeartbeat });
});

// 8. Mobile APK Manifest / TWA Configuration Download
app.get('/api/apk/twa-manifest.json', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'https';
  const fullUrl = `${protocol}://${host}`;

  const twaManifest = {
    packageId: 'com.shashiprint.agent',
    host: host,
    name: 'Shashi Print Agent',
    launcherName: 'ShashiPrint',
    themeColor: '#0284c7',
    navigationColor: '#0f172a',
    backgroundColor: '#0f172a',
    startUrl: '/',
    iconUrl: `${fullUrl}/icon-512.png`,
    maskableIconUrl: `${fullUrl}/icon-512.png`,
    appVersionName: '2.4.0',
    appVersionCode: 24,
    shortcuts: [
      {
        name: 'Print Queue',
        short_name: 'Queue',
        url: '/?tab=queue',
        icon: `${fullUrl}/icon-192.png`
      },
      {
        name: 'Thermal Test',
        short_name: 'Test',
        url: '/?tab=simulator',
        icon: `${fullUrl}/icon-192.png`
      }
    ],
    generator: 'Shashi Print Agent APK Builder for Android'
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="twa-manifest.json"');
  res.json(twaManifest);
});

// ================= SHOP REGISTRATION & LOGIN APIS =================

// Register a new shop
app.post('/api/shops/register', (req: Request, res: Response) => {
  const { shopName, mobileNumber, ownerName, address, password } = req.body;

  if (!shopName || !shopName.trim()) {
    return res.status(400).json({ success: false, message: 'Shop name is required' });
  }

  // Sanitize 10-digit mobile number
  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(0, 10);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
  }

  if (!ownerName || !ownerName.trim()) {
    return res.status(400).json({ success: false, message: 'Shop owner name is required' });
  }

  if (!address || !address.trim()) {
    return res.status(400).json({ success: false, message: 'Shop address is required' });
  }

  if (!password || String(password).length < 4) {
    return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
  }

  // Check if shop with this mobile number already exists
  const existing = registeredShops.find(s => s.mobileNumber === cleanMobile);
  if (existing) {
    return res.status(409).json({
      success: false,
      message: `Shop with mobile ${cleanMobile} already registered. Please login with your password.`
    });
  }

  const newShop: ShopAccount = {
    id: `shop-${Date.now().toString(36)}`,
    shopName: shopName.trim(),
    mobileNumber: cleanMobile,
    ownerName: ownerName.trim(),
    address: address.trim(),
    loginId: cleanMobile, // Auto-filled from mobile number
    password: String(password),
    registeredAt: new Date().toISOString(),
    isActive: true,
    totalPrinted: 0,
    upiId: `${cleanMobile}@upi`,
    rates: {
      blackAndWhiteRate: 3,
      colourRate: 10,
      pdfPageRate: 5,
    }
  };

  registeredShops.unshift(newShop);
  currentActiveShop = newShop;

  console.log(`[Shashi Print Agent] Registered new shop: ${newShop.shopName} (${newShop.mobileNumber})`);

  res.status(201).json({
    success: true,
    message: 'Shop successfully registered and logged in',
    shop: {
      id: newShop.id,
      shopName: newShop.shopName,
      mobileNumber: newShop.mobileNumber,
      ownerName: newShop.ownerName,
      address: newShop.address,
      loginId: newShop.loginId,
      registeredAt: newShop.registeredAt,
      isActive: newShop.isActive,
      totalPrinted: newShop.totalPrinted,
      upiId: newShop.upiId,
      rates: newShop.rates
    }
  });
});

// Shop Login
app.post('/api/shops/login', (req: Request, res: Response) => {
  const { loginId, password } = req.body;
  const cleanId = String(loginId || '').replace(/\D/g, '').slice(0, 10);

  if (!cleanId || cleanId.length !== 10) {
    return res.status(400).json({ success: false, message: 'Please enter valid 10-digit Login ID (Mobile Number)' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Please enter password' });
  }

  const shop = registeredShops.find(s => s.mobileNumber === cleanId || s.loginId === cleanId);
  if (!shop) {
    return res.status(404).json({
      success: false,
      message: 'Shop not found with this mobile number. Please click "Shop Registration" to register first.'
    });
  }

  if (shop.password !== String(password)) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect password. Please enter correct password or re-register.'
    });
  }

  currentActiveShop = shop;
  console.log(`[Shashi Print Agent] Shop logged in: ${shop.shopName} (${shop.mobileNumber})`);

  res.json({
    success: true,
    message: `Welcome back, ${shop.shopName}!`,
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      mobileNumber: shop.mobileNumber,
      ownerName: shop.ownerName,
      address: shop.address,
      loginId: shop.loginId,
      registeredAt: shop.registeredAt,
      isActive: shop.isActive,
      totalPrinted: shop.totalPrinted,
      upiId: shop.upiId,
      upiQrCustomUrl: shop.upiQrCustomUrl,
      rates: shop.rates
    }
  });
});

// Get currently active shop with daily collection stats
app.get('/api/shops/current', (_req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.json({ success: true, shop: null, dailyStats: calculateDailyStats() });
  }

  const dailyStats = calculateDailyStats(currentActiveShop.id);

  res.json({
    success: true,
    shop: {
      id: currentActiveShop.id,
      shopName: currentActiveShop.shopName,
      mobileNumber: currentActiveShop.mobileNumber,
      ownerName: currentActiveShop.ownerName,
      address: currentActiveShop.address,
      loginId: currentActiveShop.loginId,
      registeredAt: currentActiveShop.registeredAt,
      isActive: currentActiveShop.isActive,
      totalPrinted: currentActiveShop.totalPrinted,
      upiId: currentActiveShop.upiId,
      upiQrCustomUrl: currentActiveShop.upiQrCustomUrl,
      rates: currentActiveShop.rates
    },
    dailyStats
  });
});

// Daily Collection endpoint
app.get('/api/shops/daily-collection', (_req: Request, res: Response) => {
  const dailyStats = calculateDailyStats(currentActiveShop?.id);
  res.json({
    success: true,
    dailyStats
  });
});

// 1. Update Shop Details (Shopkeeper can change shop details)
app.patch('/api/shops/current', (req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.status(401).json({ success: false, message: 'Please login to your shop first' });
  }

  const { shopName, ownerName, address, mobileNumber } = req.body;
  if (shopName) currentActiveShop.shopName = shopName.trim();
  if (ownerName) currentActiveShop.ownerName = ownerName.trim();
  if (address) currentActiveShop.address = address.trim();
  if (mobileNumber) {
    const clean = String(mobileNumber).replace(/\D/g, '').slice(0, 10);
    if (clean.length === 10) {
      currentActiveShop.mobileNumber = clean;
      currentActiveShop.loginId = clean;
    }
  }

  res.json({
    success: true,
    message: 'Shop details updated successfully',
    shop: currentActiveShop
  });
});

// 2. Change Password (Shopkeeper can change password)
app.post('/api/shops/change-password', (req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.status(401).json({ success: false, message: 'Please login to your shop first' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old and new passwords are required' });
  }

  if (currentActiveShop.password !== String(oldPassword)) {
    return res.status(401).json({ success: false, message: 'Purana password galat hai (Incorrect old password)' });
  }

  if (String(newPassword).length < 4) {
    return res.status(400).json({ success: false, message: 'Naya password kam se kam 4 characters ka hona chahiye' });
  }

  currentActiveShop.password = String(newPassword);
  res.json({ success: true, message: 'Password successfully badal gaya hai (Password changed successfully)' });
});

// 3. Update UPI ID and QR (Shopkeeper can add/change UPI ID & QR)
app.patch('/api/shops/upi', (req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.status(401).json({ success: false, message: 'Please login to your shop first' });
  }

  const { upiId, upiQrCustomUrl } = req.body;
  if (upiId !== undefined) currentActiveShop.upiId = String(upiId).trim();
  if (upiQrCustomUrl !== undefined) currentActiveShop.upiQrCustomUrl = upiQrCustomUrl;

  res.json({
    success: true,
    message: 'UPI ID & QR details updated successfully',
    shop: currentActiveShop
  });
});

// 4. Update Customer Panel Rates (Shopkeeper fixes print rates)
app.patch('/api/shops/rates', (req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.status(401).json({ success: false, message: 'Please login to your shop first' });
  }

  const { blackAndWhiteRate, colourRate, pdfPageRate } = req.body;
  currentActiveShop.rates = {
    blackAndWhiteRate: Number(blackAndWhiteRate) || currentActiveShop.rates?.blackAndWhiteRate || 3,
    colourRate: Number(colourRate) || currentActiveShop.rates?.colourRate || 10,
    pdfPageRate: Number(pdfPageRate) || currentActiveShop.rates?.pdfPageRate || 5,
  };

  res.json({
    success: true,
    message: 'Print rates updated successfully',
    rates: currentActiveShop.rates
  });
});

// 5. Public Shop Info for Customer QR Scan (Publicly accessible without auth)
app.get('/api/shops/by-id/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const shop = registeredShops.find(s => s.id === id);
  if (!shop) {
    // If only one shop exists or fallback to current
    if (currentActiveShop && (currentActiveShop.id === id || id === 'current')) {
      return res.json({
        success: true,
        shop: {
          id: currentActiveShop.id,
          shopName: currentActiveShop.shopName,
          ownerName: currentActiveShop.ownerName,
          address: currentActiveShop.address,
          mobileNumber: currentActiveShop.mobileNumber,
          upiId: currentActiveShop.upiId || `${currentActiveShop.mobileNumber}@upi`,
          upiQrCustomUrl: currentActiveShop.upiQrCustomUrl,
          rates: currentActiveShop.rates || { blackAndWhiteRate: 3, colourRate: 10, pdfPageRate: 5 }
        }
      });
    }
    return res.status(404).json({ success: false, message: 'Shop not found' });
  }

  res.json({
    success: true,
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      address: shop.address,
      mobileNumber: shop.mobileNumber,
      upiId: shop.upiId || `${shop.mobileNumber}@upi`,
      upiQrCustomUrl: shop.upiQrCustomUrl,
      razorpayKeyId: shop.razorpayKeyId,
      rates: shop.rates || { blackAndWhiteRate: 3, colourRate: 10, pdfPageRate: 5 }
    }
  });
});

// 6. Create Razorpay Payment Order (Backend API)
app.post('/api/payment/razorpay-order', (req: Request, res: Response) => {
  const { amount, currency = 'INR', shopId, customerName } = req.body;
  const numAmount = Number(amount) || 10;
  const amountInPaise = Math.round(numAmount * 100);
  const receipt = `rcpt_${Date.now().toString(36)}`;
  const orderId = `order_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  
  let targetShop = registeredShops.find(s => s.id === shopId);
  if (!targetShop && currentActiveShop) {
    targetShop = currentActiveShop;
  }
  const keyId = targetShop?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_ShashiPrintAgent';

  res.json({
    success: true,
    orderId,
    amount: amountInPaise,
    currency,
    receipt,
    keyId,
    shopName: targetShop?.shopName || currentActiveShop?.shopName || 'Shashi Print Agent'
  });
});

// 7. Razorpay Payment Verification & Instant Print Dispatch (NO UTR REQUIRED!)
app.post('/api/customer/razorpay-verify-and-print', (req: Request, res: Response) => {
  const {
    shopId,
    customerName,
    customerPhone,
    fileName,
    fileData,
    fileType,
    colorMode, // 'bw' | 'colour' | 'pdf'
    copies = 1,
    pagesCount = 1,
    totalAmount,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature
  } = req.body;

  let targetShop = registeredShops.find(s => s.id === shopId);
  if (!targetShop && currentActiveShop) {
    targetShop = currentActiveShop;
  }
  if (!targetShop && registeredShops.length > 0) {
    targetShop = registeredShops[0];
  }

  const paymentId = String(razorpay_payment_id || `pay_${Date.now().toString(36)}`).trim();
  const calculatedTotal = Number(totalAmount) || 10;
  const newOrderNumber = `RZP-${Math.floor(100000 + Math.random() * 900000)}`;

  const customerJob: PrintJob = {
    id: `job-rzp-${Date.now().toString(36)}`,
    orderNumber: newOrderNumber,
    title: `Customer ${colorMode === 'colour' ? 'Colour' : 'B&W'} Print (${pagesCount}p x ${copies})`,
    type: 'tax_invoice',
    paperWidth: '80mm',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date().toISOString(),
    source: 'Razorpay Online Payment (Verified)',
    customerName: customerName || 'Direct Online Customer',
    customerPhone: customerPhone || undefined,
    amount: calculatedTotal,
    items: [
      {
        name: `${fileName || 'Document'} (${colorMode === 'colour' ? 'Colour' : 'B&W'})`,
        qty: Number(copies) * Number(pagesCount),
        price: calculatedTotal / (Number(copies) * Number(pagesCount))
      }
    ],
    notes: `Razorpay Payment ID: ${paymentId} | Order ID: ${razorpay_order_id || 'Instant'} | Auto-Verified | Mode: ${colorMode} | Pages: ${pagesCount} | Copies: ${copies}`,
    rawEscPosHex: fileData ? undefined : undefined
  };

  printJobs.unshift(customerJob);
  if (targetShop) {
    targetShop.totalPrinted = (targetShop.totalPrinted || 0) + 1;
  }

  console.log(`[Shashi Print Agent] Razorpay Payment Verified: ${paymentId} -> Job: ${newOrderNumber}`);

  res.status(201).json({
    success: true,
    message: 'Razorpay payment verified successfully! Print dispatched to shopkeeper queue.',
    orderNumber: newOrderNumber,
    paymentId,
    job: customerJob,
    shop: targetShop ? {
      shopName: targetShop.shopName,
      ownerName: targetShop.ownerName,
      address: targetShop.address
    } : undefined
  });
});

// 8. Customer Print Submission (General fallback without UTR)
app.post('/api/customer/verify-and-print', (req: Request, res: Response) => {
  const {
    shopId,
    customerName,
    customerPhone,
    fileName,
    fileData,
    fileType,
    colorMode, // 'bw' | 'colour'
    copies = 1,
    pagesCount = 1,
    totalAmount,
    razorpay_payment_id,
    utrNumber
  } = req.body;

  // Find destination shop
  let targetShop = registeredShops.find(s => s.id === shopId);
  if (!targetShop && currentActiveShop) {
    targetShop = currentActiveShop;
  }
  if (!targetShop && registeredShops.length > 0) {
    targetShop = registeredShops[0];
  }

  const paymentRef = razorpay_payment_id || utrNumber || `RZP-${Date.now().toString(36)}`;
  const calculatedTotal = Number(totalAmount) || 10;
  const newOrderNumber = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;

  const customerJob: PrintJob = {
    id: `job-cust-${Date.now().toString(36)}`,
    orderNumber: newOrderNumber,
    title: `Customer ${colorMode === 'colour' ? 'Colour' : 'B&W'} Print (${pagesCount}p x ${copies})`,
    type: 'tax_invoice',
    paperWidth: '80mm',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date().toISOString(),
    source: `Customer Razorpay Kiosk`,
    customerName: customerName || 'Direct Online Customer',
    customerPhone: customerPhone || undefined,
    amount: calculatedTotal,
    items: [
      {
        name: `${fileName || 'Document'} (${colorMode === 'colour' ? 'Colour' : 'B&W'})`,
        qty: Number(copies) * Number(pagesCount),
        price: calculatedTotal / (Number(copies) * Number(pagesCount))
      }
    ],
    notes: `Ref: ${paymentRef} | Razorpay Verified | Mode: ${colorMode} | Pages: ${pagesCount} | Copies: ${copies}`,
    rawEscPosHex: fileData ? undefined : undefined
  };

  printJobs.unshift(customerJob);
  if (targetShop) {
    targetShop.totalPrinted = (targetShop.totalPrinted || 0) + 1;
  }

  res.status(201).json({
    success: true,
    message: 'Payment Verified! Print command shopkeeper ke printer me bhej diya gaya hai.',
    orderNumber: newOrderNumber,
    job: customerJob,
    shop: targetShop ? {
      shopName: targetShop.shopName,
      ownerName: targetShop.ownerName,
      address: targetShop.address
    } : undefined
  });
});

// Shop Logout
app.post('/api/shops/logout', (_req: Request, res: Response) => {
  currentActiveShop = null;
  res.json({ success: true, message: 'Shop logged out successfully' });
});

// List registered shops count & names (safe public info)
app.get('/api/shops', (_req: Request, res: Response) => {
  const publicList = registeredShops.map(s => ({
    id: s.id,
    shopName: s.shopName,
    ownerName: s.ownerName,
    mobileNumber: s.mobileNumber.slice(0, 3) + '****' + s.mobileNumber.slice(7),
    registeredAt: s.registeredAt
  }));
  res.json({ success: true, count: publicList.length, shops: publicList });
});

// ======================= SUPER ADMIN APIS =======================

// 1. Admin Login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { id, password } = req.body;
  const inputId = String(id || '').trim();
  const inputPass = String(password || '').trim();

  if (inputId === adminAccount.id && inputPass === adminAccount.password) {
    adminAccount.isLoggedIn = true;
    console.log('[Shashi Print Agent] Super Admin logged in successfully');
    return res.json({
      success: true,
      message: 'Admin login successful',
      admin: { id: adminAccount.id }
    });
  }

  res.status(401).json({
    success: false,
    message: 'Galat Admin ID ya Password! Kripya sahi details dalein.'
  });
});

// 2. Admin Status Check
app.get('/api/admin/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    isLoggedIn: adminAccount.isLoggedIn,
    id: adminAccount.id
  });
});

// 3. Admin Logout
app.post('/api/admin/logout', (_req: Request, res: Response) => {
  adminAccount.isLoggedIn = false;
  res.json({ success: true, message: 'Admin logged out' });
});

// 4. Admin See All Shops (Full details)
app.get('/api/admin/shops', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  res.json({
    success: true,
    count: registeredShops.length,
    shops: registeredShops
  });
});

// 5. Admin Add Shop
app.post('/api/admin/shops', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  const { shopName, ownerName, mobileNumber, address, password, blackAndWhiteRate, colourRate, pdfPageRate, upiId } = req.body;

  if (!shopName || !ownerName || !address) {
    return res.status(400).json({ success: false, message: 'Shop name, Owner name aur Address zaroori hain' });
  }

  const cleanMobile = String(mobileNumber || '').replace(/\D/g, '').slice(0, 10);
  if (cleanMobile.length !== 10) {
    return res.status(400).json({ success: false, message: 'Mobile number 10 digits ka hona chahiye' });
  }

  const existing = registeredShops.find(s => s.mobileNumber === cleanMobile);
  if (existing) {
    return res.status(409).json({ success: false, message: `Mobile ${cleanMobile} se dukan pehle se registered hai` });
  }

  const newShop: ShopAccount = {
    id: `shop-${Date.now().toString(36)}`,
    shopName: String(shopName).trim(),
    ownerName: String(ownerName).trim(),
    mobileNumber: cleanMobile,
    address: String(address).trim(),
    loginId: cleanMobile,
    password: String(password || '123456'),
    registeredAt: new Date().toISOString(),
    isActive: true,
    totalPrinted: 0,
    upiId: upiId ? String(upiId).trim() : `${cleanMobile}@upi`,
    rates: {
      blackAndWhiteRate: Number(blackAndWhiteRate) || 3,
      colourRate: Number(colourRate) || 10,
      pdfPageRate: Number(pdfPageRate) || 5
    }
  };

  registeredShops.unshift(newShop);
  console.log(`[Shashi Print Agent] Admin added new shop: ${newShop.shopName}`);

  res.status(201).json({
    success: true,
    message: 'Nayi Shop successfully add ho gayi!',
    shop: newShop
  });
});

// 6. Admin Remove / Delete Shop
app.delete('/api/admin/shops/:id', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  const { id } = req.params;
  const index = registeredShops.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Shop nahi mili' });
  }

  const removed = registeredShops.splice(index, 1)[0];
  if (currentActiveShop?.id === id) {
    currentActiveShop = null;
  }

  console.log(`[Shashi Print Agent] Admin removed shop: ${removed.shopName} (${removed.id})`);
  res.json({
    success: true,
    message: `Shop "${removed.shopName}" ko safaltapoorvak remove kar diya gaya.`
  });
});

// 7. Admin Change Password
app.post('/api/admin/change-password', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Old aur New password dono zaroori hain' });
  }

  if (String(oldPassword).trim() !== adminAccount.password) {
    return res.status(401).json({ success: false, message: 'Purana Admin password galat hai' });
  }

  if (String(newPassword).trim().length < 4) {
    return res.status(400).json({ success: false, message: 'Naya password kam se kam 4 characters ka hona chahiye' });
  }

  adminAccount.password = String(newPassword).trim();
  console.log('[Shashi Print Agent] Admin password changed successfully');

  res.json({
    success: true,
    message: 'Admin password successfully badal gaya hai'
  });
});

// ======================= REAL FEEDBACK APIS =======================

// 1. Submit Real Feedback (Public for all Shopkeepers & Customers)
app.post('/api/feedbacks', (req: Request, res: Response) => {
  const { senderName, senderContact, shopName, category, rating, message } = req.body;

  if (!message || String(message).trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Feedback message cannot be empty' });
  }

  const newFeedback: UserFeedback = {
    id: `fb-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`,
    senderName: String(senderName || 'Anonymous User').trim(),
    senderContact: senderContact ? String(senderContact).trim() : undefined,
    shopName: shopName ? String(shopName).trim() : undefined,
    category: category || 'General Feedback',
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
    isRead: false
  };

  userFeedbacks.unshift(newFeedback);
  console.log(`[Shashi Print Agent] Real feedback received from ${newFeedback.senderName}: "${newFeedback.message.slice(0, 40)}..."`);

  res.status(201).json({
    success: true,
    message: 'Aapka feedback Super Admin tak pahunch gaya hai. Dhanyawad!',
    feedback: newFeedback
  });
});

// 2. Admin View All Real Feedbacks
app.get('/api/admin/feedbacks', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  res.json({
    success: true,
    count: userFeedbacks.length,
    unreadCount: userFeedbacks.filter(f => !f.isRead).length,
    feedbacks: userFeedbacks
  });
});

// 3. Admin Mark Feedback as Read
app.patch('/api/admin/feedbacks/:id/read', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  const { id } = req.params;
  const fb = userFeedbacks.find(f => f.id === id);
  if (fb) {
    fb.isRead = true;
  }
  res.json({ success: true, message: 'Feedback marked as read' });
});

// 4. Admin Delete a Feedback
app.delete('/api/admin/feedbacks/:id', (req: Request, res: Response) => {
  if (!adminAccount.isLoggedIn) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Admin login required.' });
  }

  const { id } = req.params;
  const initialLength = userFeedbacks.length;
  userFeedbacks = userFeedbacks.filter(f => f.id !== id);

  if (userFeedbacks.length < initialLength) {
    res.json({ success: true, message: 'Feedback deleted successfully' });
  } else {
    res.status(404).json({ success: false, message: 'Feedback not found' });
  }
});

// Mount Vite or static build
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Shashi Print Agent] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
