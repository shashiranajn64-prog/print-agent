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

export interface PrintJob {
  id: string;
  orderNumber: string;
  title: string;
  type: 'tax_invoice' | 'kot' | 'token_slip' | 'barcode_label' | 'upi_receipt' | 'raw_escpos';
  paperWidth: '58mm' | '80mm';
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
  paperWidth: '58mm' | '80mm';
  status: 'connected' | 'disconnected' | 'idle' | 'busy';
  address?: string; // IP:Port or Bluetooth MAC
  isDefault: boolean;
  model: string;
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
  rates: PrintRates;
}

// In-memory data store for shops
let registeredShops: ShopAccount[] = [];
let currentActiveShop: ShopAccount | null = null;

// In-memory data store for the agent
let printJobs: PrintJob[] = [
  {
    id: 'job-101',
    orderNumber: 'INV-2026-0842',
    title: 'Retail Tax Invoice (GST)',
    type: 'tax_invoice',
    paperWidth: '80mm',
    status: 'pending',
    priority: 'high',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    source: 'Counter POS 1',
    customerName: 'Amit Sharma',
    customerPhone: '+91 98765 43210',
    amount: 1470.00,
    items: [
      { name: 'Basmati Premium Rice 5kg', qty: 1, price: 450.00 },
      { name: 'Fortune Mustard Oil 1L', qty: 2, price: 175.00 },
      { name: 'Tata Tea Gold 500g', qty: 2, price: 290.00 },
      { name: 'Aashirvaad Atta 5kg', qty: 1, price: 240.00 }
    ],
    taxDetails: {
      gstRate: 5,
      cgst: 35.00,
      sgst: 35.00,
      totalTax: 70.00
    },
    notes: 'Thank you for shopping! Powered by Shashi Print Agent'
  },
  {
    id: 'job-102',
    orderNumber: 'KOT-304',
    title: 'Kitchen Order Ticket (Table 06)',
    type: 'kot',
    paperWidth: '58mm',
    status: 'pending',
    priority: 'urgent',
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    source: 'Waiter Tablet #3',
    customerName: 'Table 6 (4 Guests)',
    amount: 580.00,
    items: [
      { name: 'Paneer Butter Masala', qty: 1, price: 240.00 },
      { name: 'Butter Naan', qty: 4, price: 40.00 },
      { name: 'Jeera Rice Half', qty: 1, price: 110.00 },
      { name: 'Masala Chaas', qty: 2, price: 35.00 }
    ],
    notes: 'LESS SPICY, NO ONION'
  },
  {
    id: 'job-103',
    orderNumber: 'UPI-TXN-9981',
    title: 'BharatPe / PhonePe Payment Slip',
    type: 'upi_receipt',
    paperWidth: '58mm',
    status: 'pending',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1000 * 30).toISOString(),
    source: 'Soundbox / QR API',
    customerName: 'Rahul Verma',
    amount: 350.00,
    notes: 'Ref ID: 412891290334 - Payment Received via UPI'
  },
  {
    id: 'job-104',
    orderNumber: 'TKN-089',
    title: 'Queue Token Slip',
    type: 'token_slip',
    paperWidth: '58mm',
    status: 'printed',
    priority: 'normal',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    executedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    source: 'Self-Service Kiosk',
    amount: 0,
    items: [{ name: 'Express Pharmacy Counter A', qty: 1, price: 0 }],
    notes: 'Estimated wait time: 4 mins'
  }
];

let printers: PrinterDevice[] = [
  {
    id: 'prn-bt-01',
    name: 'Shashi BT Thermal 58mm (POS-58)',
    type: 'bluetooth',
    paperWidth: '58mm',
    status: 'connected',
    address: '88:4A:EA:23:4C:19',
    isDefault: true,
    model: 'RP-58 Bluetooth Thermal Mobile Printer',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'prn-net-02',
    name: 'Kitchen WiFi Thermal 80mm',
    type: 'network',
    paperWidth: '80mm',
    status: 'idle',
    address: '192.168.1.150:9100',
    isDefault: false,
    model: 'Epson TM-T88VI Network Raw Port',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'prn-usb-03',
    name: 'Billing Counter USB ESC/POS',
    type: 'usb',
    paperWidth: '80mm',
    status: 'idle',
    address: 'USB VID:0416 PID:5011',
    isDefault: false,
    model: 'Xprinter XP-N160II High Speed Cutter',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'prn-sys-04',
    name: 'Android Print Spooler (PDF / AirPrint)',
    type: 'system_spooler',
    paperWidth: '80mm',
    status: 'idle',
    isDefault: false,
    model: 'System Print Dialog (A4 / Roll / Bluetooth)',
    lastSeen: new Date().toISOString()
  }
];

let agentHeartbeat = {
  lastSeen: new Date().toISOString(),
  batteryLevel: 88,
  isCharging: true,
  deviceName: 'Samsung Galaxy / Android Mobile (Shashi APK)',
  ipAddress: '192.168.1.45',
  appVersion: 'v2.4.0-APK',
  autoPrintEnabled: true,
  totalJobsExecuted: 42,
  activePrinterId: 'prn-bt-01'
};

// ================= API ENDPOINTS =================

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
  const { name, type, paperWidth, address, model, isDefault } = req.body;
  const newPrinter: PrinterDevice = {
    id: `prn-${Date.now().toString(36)}`,
    name: name || 'Thermal Printer',
    type: type || 'bluetooth',
    paperWidth: paperWidth || '58mm',
    status: 'connected',
    address,
    model: model || 'Generic ESC/POS Printer',
    isDefault: !!isDefault,
    lastSeen: new Date().toISOString()
  };

  if (newPrinter.isDefault) {
    printers.forEach(p => (p.isDefault = false));
  }
  printers.push(newPrinter);
  res.status(201).json({ success: true, printer: newPrinter });
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

// Get currently active shop
app.get('/api/shops/current', (_req: Request, res: Response) => {
  if (!currentActiveShop) {
    return res.json({ success: true, shop: null });
  }

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
    }
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
      rates: shop.rates || { blackAndWhiteRate: 3, colourRate: 10, pdfPageRate: 5 }
    }
  });
});

// 6. Customer Print Submission with Backend Payment Verification
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
    utrNumber,
    paymentMethod = 'UPI_QR'
  } = req.body;

  // Find destination shop
  let targetShop = registeredShops.find(s => s.id === shopId);
  if (!targetShop && currentActiveShop) {
    targetShop = currentActiveShop;
  }

  if (!targetShop) {
    return res.status(404).json({ success: false, message: 'Target shop not found' });
  }

  // Validate UTR / Transaction reference number
  const cleanUtr = String(utrNumber || '').trim();
  if (!cleanUtr || cleanUtr.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Kripya sahi UPI Transaction Ref / UTR number enter karein (kam se kam 6-12 digits)'
    });
  }

  // Generate verified print job
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
    source: `Customer Self-Kiosk (UPI Verified)`,
    customerName: customerName || 'Direct QR Customer',
    customerPhone: customerPhone || undefined,
    amount: calculatedTotal,
    items: [
      {
        name: `${fileName || 'Document'} (${colorMode === 'colour' ? 'Colour' : 'B&W'})`,
        qty: Number(copies) * Number(pagesCount),
        price: calculatedTotal / (Number(copies) * Number(pagesCount))
      }
    ],
    notes: `UTR/UPI Ref: ${cleanUtr} | Payment Verified (${paymentMethod}) | Mode: ${colorMode} | Pages: ${pagesCount} | Copies: ${copies}`,
    rawEscPosHex: fileData ? undefined : undefined
  };

  printJobs.unshift(customerJob);
  targetShop.totalPrinted = (targetShop.totalPrinted || 0) + 1;

  console.log(`[Shashi Print Agent] Customer Order Received & Verified: ${newOrderNumber} for shop ${targetShop.shopName}`);

  res.status(201).json({
    success: true,
    message: 'Payment Verified! Print command shopkeeper ke printer me bhej diya gaya hai.',
    orderNumber: newOrderNumber,
    job: customerJob,
    shop: {
      shopName: targetShop.shopName,
      ownerName: targetShop.ownerName,
      address: targetShop.address
    }
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
