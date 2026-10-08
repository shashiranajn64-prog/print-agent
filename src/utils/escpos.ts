/**
 * ESC/POS Thermal Printer Driver & Command Generator
 * Supports 58mm (32 chars/line) & 80mm (48 chars/line)
 * Compatible with Android Bluetooth POS-5802, MPT-II, Epson, TVS, Munbyn, RPP
 */

export interface PrintJobData {
  id: string;
  orderNumber: string;
  title: string;
  type: string;
  paperWidth: '58mm' | '80mm';
  customerName?: string;
  customerPhone?: string;
  amount?: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  taxDetails?: { gstRate: number; cgst: number; sgst: number; totalTax: number };
  notes?: string;
  source?: string;
  createdAt?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  shopOwner?: string;
}

// ESC/POS Command Constants
export const ESC_POS = {
  INIT: [0x1B, 0x40],
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  UNDERLINE_ON: [0x1B, 0x2D, 0x01],
  UNDERLINE_OFF: [0x1B, 0x2D, 0x00],
  DOUBLE_HEIGHT_WIDTH: [0x1D, 0x21, 0x11],
  DOUBLE_WIDTH: [0x1D, 0x21, 0x10],
  DOUBLE_HEIGHT: [0x1D, 0x21, 0x01],
  NORMAL_TEXT: [0x1D, 0x21, 0x00],
  FEED_LINE: [0x0A],
  CUT_FULL: [0x1D, 0x56, 0x00],
  CUT_PARTIAL: [0x1D, 0x56, 0x01],
  DRAWER_KICK: [0x1B, 0x70, 0x00, 0x19, 0xFA],
  BEEP: [0x1B, 0x42, 0x02, 0x02],
};

/**
 * Generate formatted monospace text and ESC/POS byte buffers
 */
export function formatReceiptText(job: PrintJobData): string {
  const is58 = job.paperWidth === '58mm';
  const width = is58 ? 32 : 48;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  const padCenter = (str: string, len: number) => {
    if (str.length >= len) return str.slice(0, len);
    const left = Math.floor((len - str.length) / 2);
    const right = len - str.length - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
  };

  const padRow = (left: string, right: string, len: number) => {
    const totalSpaces = len - left.length - right.length;
    if (totalSpaces < 1) return (left.slice(0, len - right.length - 1) + ' ' + right);
    return left + ' '.repeat(totalSpaces) + right;
  };

  const lines: string[] = [];

  // Header
  const headerBrand = job.shopName ? `*** ${job.shopName.toUpperCase()} ***` : '*** SHASHI PRINT AGENT ***';
  lines.push(padCenter(headerBrand, width));
  if (job.shopAddress) {
    lines.push(padCenter(job.shopAddress, width));
  }
  if (job.shopPhone) {
    lines.push(padCenter(`Mo: ${job.shopPhone}`, width));
  }
  lines.push(padCenter(job.title.toUpperCase(), width));
  lines.push(doubleDivider);
  
  lines.push(padRow(`Order: ${job.orderNumber}`, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), width));
  if (job.source) {
    lines.push(padRow(`Src: ${job.source}`, new Date().toLocaleDateString(), width));
  }
  if (job.customerName) {
    lines.push(`Customer: ${job.customerName}`);
  }
  if (job.customerPhone) {
    lines.push(`Phone:    ${job.customerPhone}`);
  }
  lines.push(divider);

  // Items table
  if (job.items && job.items.length > 0) {
    if (is58) {
      lines.push(padRow('ITEM / QTY', 'AMOUNT', width));
      lines.push(divider);
      job.items.forEach(it => {
        const itemLine = `${it.name.slice(0, 18)} x${it.qty}`;
        const total = (it.qty * it.price).toFixed(2);
        lines.push(padRow(itemLine, `Rs.${total}`, width));
      });
    } else {
      lines.push(padRow('ITEM DESCRIPTION', 'QTY x RATE     TOTAL', width));
      lines.push(divider);
      job.items.forEach(it => {
        const itemLine = it.name.slice(0, 24);
        const rightSide = `${it.qty} x ${it.price.toFixed(0)}  Rs.${(it.qty * it.price).toFixed(2)}`;
        lines.push(padRow(itemLine, rightSide, width));
      });
    }
    lines.push(divider);
  }

  // Tax Details if any
  if (job.taxDetails) {
    lines.push(padRow(`CGST (${(job.taxDetails.gstRate / 2).toFixed(1)}%)`, `Rs.${job.taxDetails.cgst.toFixed(2)}`, width));
    lines.push(padRow(`SGST (${(job.taxDetails.gstRate / 2).toFixed(1)}%)`, `Rs.${job.taxDetails.sgst.toFixed(2)}`, width));
    lines.push(divider);
  }

  // Grand Total
  if (job.amount !== undefined) {
    lines.push(padRow('GRAND TOTAL:', `Rs.${job.amount.toFixed(2)}`, width));
    lines.push(doubleDivider);
  }

  // Notes
  if (job.notes) {
    lines.push(`Note: ${job.notes}`);
  }

  // Footer & Barcode simulation
  lines.push('');
  lines.push(padCenter(`* ${job.orderNumber} *`, width));
  lines.push(padCenter('Thank you! Visit again.', width));
  lines.push(padCenter('Powered by Shashi Print Agent Mobile', width));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}

/**
 * Builds Raw ESC/POS Binary Commands (Uint8Array)
 */
export function buildEscPosBytes(job: PrintJobData): Uint8Array {
  const chunks: number[] = [];
  const textEncoder = new TextEncoder();

  const addBytes = (arr: number[]) => {
    chunks.push(...arr);
  };

  const addText = (text: string) => {
    const encoded = textEncoder.encode(text);
    for (let i = 0; i < encoded.length; i++) {
      chunks.push(encoded[i]);
    }
  };

  // 1. Initialize
  addBytes(ESC_POS.INIT);

  // 2. Center Align Header
  addBytes(ESC_POS.ALIGN_CENTER);
  addBytes(ESC_POS.BOLD_ON);
  addBytes(ESC_POS.DOUBLE_HEIGHT_WIDTH);
  addText('SHASHI PRINT AGENT\n');
  
  addBytes(ESC_POS.NORMAL_TEXT);
  addText(`${job.title}\n`);
  addBytes(ESC_POS.BOLD_OFF);
  addText('--------------------------------\n');

  // 3. Left Align Body
  addBytes(ESC_POS.ALIGN_LEFT);
  addText(`Order: ${job.orderNumber}\n`);
  addText(`Date:  ${new Date().toLocaleString()}\n`);
  if (job.customerName) addText(`Party: ${job.customerName}\n`);
  addText('--------------------------------\n');

  // 4. Items
  if (job.items) {
    job.items.forEach(it => {
      const line = `${it.name.slice(0, 16)} x${it.qty}  Rs.${(it.qty * it.price).toFixed(0)}\n`;
      addText(line);
    });
    addText('--------------------------------\n');
  }

  // 5. Total
  if (job.amount) {
    addBytes(ESC_POS.BOLD_ON);
    addBytes(ESC_POS.DOUBLE_HEIGHT);
    addText(`TOTAL: Rs. ${job.amount.toFixed(2)}\n`);
    addBytes(ESC_POS.NORMAL_TEXT);
    addBytes(ESC_POS.BOLD_OFF);
    addText('================================\n');
  }

  if (job.notes) {
    addText(`Note: ${job.notes}\n`);
  }

  // 6. Footer & Cut
  addBytes(ESC_POS.ALIGN_CENTER);
  addText('*** THANK YOU ***\n');
  addText('Live Agent Execution\n\n\n\n');
  addBytes(ESC_POS.CUT_PARTIAL);
  addBytes(ESC_POS.FEED_LINE);

  return new Uint8Array(chunks);
}

/**
 * Web Audio Synthesizer: Play motorized mechanical receipt feed & beep sounds
 */
export function playPrinterSoundEffect() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // 1. Motor buzzing noise (simulating thermal printer head advancing paper)
    const bufferSize = ctx.sampleRate * 0.45; // 450ms motor sound
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Modulated white noise for motor gear sound
      const modulation = Math.sin((i / bufferSize) * Math.PI * 40);
      output[i] = (Math.random() * 2 - 1) * 0.15 * (0.8 + 0.2 * modulation);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 3;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    whiteNoise.start();

    // 2. Beep chime on job completion (high-pitched POS double beep)
    setTimeout(() => {
      try {
        const osc = ctx.createOscillator();
        const beepGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1800, ctx.currentTime);
        osc.frequency.setValueAtTime(2400, ctx.currentTime + 0.08);

        beepGain.gain.setValueAtTime(0.2, ctx.currentTime);
        beepGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

        osc.connect(beepGain);
        beepGain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {
        // ignore audio error
      }
    }, 400);
  } catch (err) {
    console.warn('Audio feedback not allowed without interaction:', err);
  }
}

/**
 * Mobile Vibration feedback
 */
export function triggerVibration(pattern: number[] = [120, 60, 120]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

/**
 * Screen Wake Lock API helper so the phone screen stays on when serving as cashier print agent
 */
export async function requestScreenWakeLock(): Promise<{ active: boolean; release: () => void }> {
  try {
    if ('wakeLock' in navigator) {
      const wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release: () => void }> } }).wakeLock.request('screen');
      return {
        active: true,
        release: () => wakeLock.release()
      };
    }
  } catch (err) {
    console.warn('Wake Lock not supported or rejected:', err);
  }
  return { active: false, release: () => {} };
}

/**
 * Web Bluetooth Printer Connection Handler
 */
export interface BluetoothPrinterConnection {
  device: unknown;
  server: unknown;
  characteristic: unknown;
  name: string;
}

export async function connectWebBluetoothPrinter(): Promise<{
  success: boolean;
  deviceName?: string;
  error?: string;
}> {
  if (typeof navigator === 'undefined' || !(navigator as unknown as { bluetooth?: unknown }).bluetooth) {
    return {
      success: false,
      error: 'Web Bluetooth API is not supported in this browser. Please use Chrome on Android or install as APK.'
    };
  }

  try {
    const bluetooth = (navigator as unknown as {
      bluetooth: {
        requestDevice: (options: unknown) => Promise<{
          name?: string;
          gatt?: {
            connect: () => Promise<{
              getPrimaryServices: () => Promise<unknown[]>;
            }>;
          };
        }>;
      };
    }).bluetooth;

    // Scan for thermal printers
    const device = await bluetooth.requestDevice({
      filters: [
        { namePrefix: 'POS' },
        { namePrefix: 'RP' },
        { namePrefix: 'MPT' },
        { namePrefix: 'Blue' },
        { namePrefix: 'Print' },
        { namePrefix: 'MTP' },
        { namePrefix: 'XP' },
        { namePrefix: 'TP' },
        { namePrefix: 'InnerPrinter' },
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        0xffe0,
        0xff00
      ]
    });

    return {
      success: true,
      deviceName: device.name || 'Bluetooth Thermal Printer'
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message.includes('cancelled') ? 'Bluetooth scan cancelled by user' : message
    };
  }
}
