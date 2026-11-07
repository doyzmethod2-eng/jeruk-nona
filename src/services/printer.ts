import { Transaction, StoreSettings } from '../types';
import { generateReceipt, formatRupiah } from './escpos';

// Known BLE Service UUIDs for thermal printers
export const COMMON_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Common Chinese POS (RPP02, MPT, IMin, GOOJPRT)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Posnet / Seiko
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
];

export const COMMON_BLE_CHARACTERISTICS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-1e4d-4bd9-ba61-23c647249616',
];

interface BluetoothState {
  device: BluetoothDevice | null;
  server: BluetoothRemoteGATTServer | null;
  characteristic: BluetoothRemoteGATTCharacteristic | null;
  isConnected: boolean;
  deviceName: string;
}

const state: BluetoothState = {
  device: null,
  server: null,
  characteristic: null,
  isConnected: false,
  deviceName: '',
};

type StateListener = (connected: boolean, deviceName: string) => void;
const listeners = new Set<StateListener>();

function notifyListeners() {
  listeners.forEach((l) => l(state.isConnected, state.deviceName));
}

export const PrinterService = {
  subscribe(listener: StateListener): () => void {
    listeners.add(listener);
    listener(state.isConnected, state.deviceName);
    return () => listeners.delete(listener);
  },

  isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  },

  isSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  },

  isConnected(): boolean {
    return state.isConnected && !!state.characteristic;
  },

  getDeviceName(): string {
    return state.deviceName;
  },

  async connectBluetooth(
    customServiceUuid?: string,
    customCharUuid?: string
  ): Promise<{ success: boolean; deviceName: string; message: string }> {
    if (!this.isBluetoothSupported() || !navigator.bluetooth) {
      return {
        success: false,
        deviceName: '',
        message: 'Browser ini belum mendukung Web Bluetooth (gunakan Google Chrome / Edge di Android atau PC).',
      };
    }

    try {
      const services = customServiceUuid ? [customServiceUuid, ...COMMON_BLE_SERVICES] : COMMON_BLE_SERVICES;

      // Request device with all common thermal printer services
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: services,
      });

      if (!device) {
        throw new Error('Tidak ada perangkat printer yang dipilih.');
      }

      device.addEventListener('gattserverdisconnected', () => {
        state.isConnected = false;
        state.characteristic = null;
        state.server = null;
        notifyListeners();
      });

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Gagal menghubungkan GATT Server printer.');
      }

      // Discover writable characteristic
      let foundChar: BluetoothRemoteGATTCharacteristic | null = null;

      for (const serviceUuid of services) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              if (!customCharUuid || char.uuid.toLowerCase() === customCharUuid.toLowerCase()) {
                foundChar = char;
                break;
              }
            }
          }
          if (foundChar) break;
        } catch {
          // Continue to next service
        }
      }

      if (!foundChar) {
        throw new Error('Karakteristik cetak ESC/POS tidak ditemukan pada printer ini. Silakan periksa Service UUID di Setting.');
      }

      state.device = device;
      state.server = server;
      state.characteristic = foundChar;
      state.isConnected = true;
      state.deviceName = device.name || 'Printer Bluetooth POS';
      notifyListeners();

      return {
        success: true,
        deviceName: state.deviceName,
        message: `Berhasil terhubung ke ${state.deviceName}`,
      };
    } catch (err: unknown) {
      state.isConnected = false;
      state.characteristic = null;
      notifyListeners();
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        deviceName: '',
        message: errMsg || 'Gagal menyambungkan Bluetooth.',
      };
    }
  },

  async disconnectBluetooth(): Promise<void> {
    try {
      if (state.server && state.server.connected) {
        state.server.disconnect();
      }
    } catch {
      // ignore
    }
    state.device = null;
    state.server = null;
    state.characteristic = null;
    state.isConnected = false;
    state.deviceName = '';
    notifyListeners();
  },

  // Send byte chunks to Bluetooth Printer
  async sendToBluetooth(escposBytes: Uint8Array): Promise<{ success: boolean; message?: string }> {
    if (!state.characteristic || !state.isConnected) {
      return { success: false, message: 'Printer Bluetooth belum terhubung.' };
    }

    try {
      const chunkSize = 120; // 120 bytes chunks for smooth BLE transmission without buffer overflow
      for (let i = 0; i < escposBytes.length; i += chunkSize) {
        const slice = escposBytes.slice(i, i + chunkSize);
        if (state.characteristic.properties.writeWithoutResponse) {
          await state.characteristic.writeValueWithoutResponse(slice);
        } else {
          await state.characteristic.writeValue(slice);
        }
        // Small delay to allow printer MCU to flush serial FIFO
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return { success: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Koneksi printer terputus saat mencetak.';
      return { success: false, message: errMsg };
    }
  },

  // Send to RawBT Android App via URL scheme
  printViaRawBT(escposBytes: Uint8Array): boolean {
    try {
      // Convert bytes to base64
      let binary = '';
      const len = escposBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(escposBytes[i]);
      }
      const base64 = btoa(binary);
      const url = `rawbt:data:base64,${base64}`;

      // Open URL scheme
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.click();
      return true;
    } catch (err) {
      console.error('RawBT launch error:', err);
      return false;
    }
  },

  // Web Serial API (For USB Thermal Printers)
  async printViaWebSerial(escposBytes: Uint8Array): Promise<{ success: boolean; message?: string }> {
    if (!this.isSerialSupported()) {
      return { success: false, message: 'Browser tidak mendukung Web Serial (USB/COM).' };
    }
    try {
      const navAny = navigator as unknown as { serial: { requestPort: () => Promise<unknown> } };
      const port = (await navAny.serial.requestPort()) as {
        open: (opts: { baudRate: number }) => Promise<void>;
        writable: { getWriter: () => { write: (data: Uint8Array) => Promise<void>; close: () => Promise<void> } };
        close: () => Promise<void>;
      };
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(escposBytes);
      await writer.close();
      await port.close();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal mencetak via Serial USB.',
      };
    }
  },

  // WhatsApp formatted receipt text generator
  generateWhatsAppShareUrl(
    transaction: Transaction,
    settings: StoreSettings,
    phoneTarget = ''
  ): string {
    const dateObj = new Date(transaction.createdAt);
    const dateFormatted = dateObj.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let text = `🍊 *${settings.storeName}*\n`;
    if (settings.tagline) text += `_${settings.tagline}_\n`;
    text += `📍 ${settings.address}\n`;
    text += `📞 ${settings.phone}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🧾 *STRUK PEMBAYARAN*\n`;
    if (transaction.queueNumber) {
      text += `🎟️ *ANTRIAN  : #${transaction.queueNumber}*\n`;
    }
    text += `No. Nota : *${transaction.invoiceNumber}*\n`;
    text += `Waktu    : ${dateFormatted}\n`;
    text += `Tipe     : ${transaction.orderType === 'dine_in' ? 'Makan di Tempat (Dine In)' : 'Bawa Pulang (Take Away)'}\n`;
    if (transaction.tableOrQueueNumber) {
      text += `Meja/Antri: ${transaction.tableOrQueueNumber}\n`;
    }
    text += `Kasir    : ${transaction.cashierName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    transaction.items.forEach((item) => {
      text += `*${item.productName}*\n`;
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        text += `  _(+ ${item.selectedAddons.map((a) => a.name).join(', ')})_\n`;
      }
      const priceToDisplay = item.unitPrice || item.basePrice || 0;
      text += `  ${item.quantity} x ${formatRupiah(priceToDisplay)} = *${formatRupiah(item.subtotal)}*\n`;
      if (item.notes) text += `  _(Catatan: ${item.notes})_\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Subtotal : ${formatRupiah(transaction.subtotal)}\n`;

    if (transaction.discountAmount > 0) {
      const disc = transaction.discountType === 'percent' ? `(${transaction.discountValue}%)` : '';
      text += `Diskon ${disc}: -${formatRupiah(transaction.discountAmount)}\n`;
    }

    if (transaction.serviceChargeAmount > 0) {
      text += `Service Charge (${transaction.serviceChargePercent}%): ${formatRupiah(transaction.serviceChargeAmount)}\n`;
    }

    if (transaction.taxAmount > 0) {
      text += `Pajak (${transaction.taxPercent}%): ${formatRupiah(transaction.taxAmount)}\n`;
    }

    text += `*TOTAL    : ${formatRupiah(transaction.total)}*\n`;
    text += `Metode   : ${transaction.paymentMethod === 'cash' ? 'Tunai (Cash)' : 'QRIS'}\n`;

    if (transaction.paymentMethod === 'cash') {
      text += `Dibayar  : ${formatRupiah(transaction.amountPaid)}\n`;
      text += `Kembali  : ${formatRupiah(transaction.change)}\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `${settings.receiptFooter || 'Terima kasih atas kunjungan Anda!'}\n`;

    let cleanPhone = phoneTarget.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  },

  // Main Print Dispatcher
  async printTransaction(
    transaction: Transaction,
    settings: StoreSettings
  ): Promise<{ success: boolean; mode: 'bluetooth' | 'rawbt' | 'browser' | 'none'; message: string }> {
    const { escposBytes, plainText } = generateReceipt(transaction, settings);

    // If Bluetooth is connected, print directly via Web Bluetooth
    if (this.isConnected()) {
      const res = await this.sendToBluetooth(escposBytes);
      if (res.success) {
        return { success: true, mode: 'bluetooth', message: 'Struk berhasil dicetak ke printer Bluetooth!' };
      } else {
        return { success: false, mode: 'bluetooth', message: res.message || 'Gagal mengirim data ke Bluetooth.' };
      }
    }

    // If on Android, try RawBT scheme fallback or browser print
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');

    return {
      success: false,
      mode: isAndroid ? 'rawbt' : 'browser',
      message: 'Printer Bluetooth belum terhubung. Anda dapat mencetak via RawBT, Cetak Layar, atau kirim WhatsApp.',
    };
  },
};
