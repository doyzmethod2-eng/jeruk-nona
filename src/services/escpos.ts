import { Transaction, StoreSettings } from '../types';

export interface FormattedReceipt {
  plainText: string;
  escposBytes: Uint8Array;
}

// Format Rupiah into clean ASCII string: e.g. "Rp 15.000"
export function formatRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

// Sanitize text to pure ASCII only (removes non-ascii characters to prevent weird printer glitches)
export function sanitizeAscii(text: string): string {
  return text.replace(/[^\x20-\x7E\n\r]/g, '');
}

// Align Left and Right on a single line of fixed width
export function padRow(left: string, right: string, width: number): string {
  const l = sanitizeAscii(left);
  const r = sanitizeAscii(right);
  const total = l.length + r.length;
  if (total >= width) {
    const spaceNeeded = 1;
    const maxLeft = Math.max(0, width - r.length - spaceNeeded);
    return l.substring(0, maxLeft) + ' '.repeat(spaceNeeded) + r;
  }
  const spaces = ' '.repeat(width - total);
  return l + spaces + r;
}

// Center align text
export function centerText(text: string, width: number): string {
  const clean = sanitizeAscii(text);
  if (clean.length >= width) return clean.substring(0, width);
  const padLeft = Math.floor((width - clean.length) / 2);
  const padRight = width - clean.length - padLeft;
  return ' '.repeat(padLeft) + clean + ' '.repeat(padRight);
}

// Build receipt plain text and ESC/POS byte sequence
export function generateReceipt(
  transaction: Transaction,
  settings: StoreSettings
): FormattedReceipt {
  const width = settings.paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  // Date format e.g. "06/11/2026 14:35"
  const dateObj = new Date(transaction.createdAt);
  const dateStr =
    dateObj.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    dateObj.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const lines: string[] = [];

  // Header Store Info
  lines.push(centerText(settings.storeName, width));
  if (settings.tagline) {
    lines.push(centerText(settings.tagline, width));
  }
  if (settings.address) {
    lines.push(centerText(settings.address, width));
  }
  if (settings.phone) {
    lines.push(centerText('Telp: ' + settings.phone, width));
  }
  lines.push(doubleDivider);

  // Queue Number Banner
  if (transaction.queueNumber) {
    lines.push(centerText(`*** NOMOR ANTRIAN: ${transaction.queueNumber} ***`, width));
    lines.push(divider);
  }

  lines.push(
    padRow(
      'No: ' + transaction.invoiceNumber,
      transaction.orderType === 'dine_in' ? 'DINE IN' : 'TAKE AWAY',
      width
    )
  );
  if (transaction.tableOrQueueNumber) {
    lines.push(
      padRow('Tipe: ' + transaction.tableOrQueueNumber, 'Kasir: ' + transaction.cashierName, width)
    );
    lines.push(padRow('Waktu: ' + dateStr, '', width));
  } else {
    lines.push(padRow('Waktu: ' + dateStr, 'Kasir: ' + transaction.cashierName, width));
  }
  lines.push(divider);

  // Items
  transaction.items.forEach((item) => {
    lines.push(sanitizeAscii(item.productName));

    // Addons listing
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      const addonsText = item.selectedAddons.map((a) => `+${a.name}`).join(', ');
      lines.push('  ' + sanitizeAscii(addonsText));
    }

    const priceToDisplay = item.unitPrice || item.basePrice || 0;
    const qtyPrice = `${item.quantity} x ${formatRupiah(priceToDisplay)}`;
    const subtotalStr = formatRupiah(item.subtotal);
    lines.push(padRow('  ' + qtyPrice, subtotalStr, width));

    if (item.notes && item.notes.trim()) {
      lines.push('  * ' + sanitizeAscii(item.notes.trim()));
    }
  });

  lines.push(divider);

  // Subtotal & Calculations
  lines.push(padRow('Subtotal', formatRupiah(transaction.subtotal), width));

  if (transaction.discountAmount > 0) {
    const discLabel =
      transaction.discountType === 'percent'
        ? `Diskon (${transaction.discountValue}%)`
        : 'Diskon';
    lines.push(padRow(discLabel, '-' + formatRupiah(transaction.discountAmount), width));
  }

  if (transaction.serviceChargeAmount > 0) {
    lines.push(
      padRow(
        `Service Charge (${transaction.serviceChargePercent}%)`,
        formatRupiah(transaction.serviceChargeAmount),
        width
      )
    );
  }

  if (transaction.taxAmount > 0) {
    lines.push(
      padRow(`Pajak (${transaction.taxPercent}%)`, formatRupiah(transaction.taxAmount), width)
    );
  }

  lines.push(doubleDivider);
  lines.push(padRow('TOTAL', formatRupiah(transaction.total), width));
  lines.push(
    padRow(
      'Metode Bayar',
      transaction.paymentMethod === 'cash' ? 'TUNAI (CASH)' : 'QRIS',
      width
    )
  );

  if (transaction.paymentMethod === 'cash') {
    lines.push(padRow('Bayar', formatRupiah(transaction.amountPaid), width));
    lines.push(padRow('Kembali', formatRupiah(transaction.change), width));
  }

  lines.push(divider);

  // Footer
  if (settings.receiptFooter) {
    settings.receiptFooter.split('\n').forEach((fLine) => {
      if (fLine.trim()) {
        lines.push(centerText(fLine.trim(), width));
      }
    });
  }

  lines.push('');
  lines.push('');

  const plainText = lines.join('\n');

  // Binary ESC/POS Command Generation
  const bytes: number[] = [];

  // ESC @ : Initialize printer
  bytes.push(0x1b, 0x40);

  // Center Align
  bytes.push(0x1b, 0x61, 0x01);

  // Store name: Double Height & Width + Bold
  bytes.push(0x1d, 0x21, 0x11);
  bytes.push(0x1b, 0x45, 0x01);
  appendAscii(bytes, settings.storeName + '\n');

  // Normal text size + Bold off
  bytes.push(0x1d, 0x21, 0x00);
  bytes.push(0x1b, 0x45, 0x00);

  if (settings.tagline) {
    appendAscii(bytes, settings.tagline + '\n');
  }
  if (settings.address) {
    appendAscii(bytes, settings.address + '\n');
  }
  if (settings.phone) {
    appendAscii(bytes, 'Telp: ' + settings.phone + '\n');
  }

  appendAscii(bytes, doubleDivider + '\n');

  // Queue Number Big on Thermal
  if (transaction.queueNumber) {
    bytes.push(0x1b, 0x45, 0x01);
    bytes.push(0x1d, 0x21, 0x11);
    appendAscii(bytes, `ANTRIAN: ${transaction.queueNumber}\n`);
    bytes.push(0x1d, 0x21, 0x00);
    bytes.push(0x1b, 0x45, 0x00);
    appendAscii(bytes, divider + '\n');
  }

  // Left Align
  bytes.push(0x1b, 0x61, 0x00);

  appendAscii(
    bytes,
    padRow(
      'No: ' + transaction.invoiceNumber,
      transaction.orderType === 'dine_in' ? 'DINE IN' : 'TAKE AWAY',
      width
    ) + '\n'
  );
  if (transaction.tableOrQueueNumber) {
    appendAscii(
      bytes,
      padRow('Tipe: ' + transaction.tableOrQueueNumber, 'Kasir: ' + transaction.cashierName, width) +
        '\n'
    );
    appendAscii(bytes, padRow('Waktu: ' + dateStr, '', width) + '\n');
  } else {
    appendAscii(bytes, padRow('Waktu: ' + dateStr, 'Kasir: ' + transaction.cashierName, width) + '\n');
  }

  appendAscii(bytes, divider + '\n');

  // Items
  transaction.items.forEach((item) => {
    appendAscii(bytes, sanitizeAscii(item.productName) + '\n');
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      const addonsText = item.selectedAddons.map((a) => `+${a.name}`).join(', ');
      appendAscii(bytes, '  ' + sanitizeAscii(addonsText) + '\n');
    }
    const priceToDisplay = item.unitPrice || item.basePrice || 0;
    const qtyPrice = `${item.quantity} x ${formatRupiah(priceToDisplay)}`;
    const subtotalStr = formatRupiah(item.subtotal);
    appendAscii(bytes, padRow('  ' + qtyPrice, subtotalStr, width) + '\n');
    if (item.notes && item.notes.trim()) {
      appendAscii(bytes, '  * ' + sanitizeAscii(item.notes.trim()) + '\n');
    }
  });

  appendAscii(bytes, divider + '\n');

  // Subtotal
  appendAscii(bytes, padRow('Subtotal', formatRupiah(transaction.subtotal), width) + '\n');

  if (transaction.discountAmount > 0) {
    const discLabel =
      transaction.discountType === 'percent'
        ? `Diskon (${transaction.discountValue}%)`
        : 'Diskon';
    appendAscii(bytes, padRow(discLabel, '-' + formatRupiah(transaction.discountAmount), width) + '\n');
  }

  if (transaction.serviceChargeAmount > 0) {
    appendAscii(
      bytes,
      padRow(
        `Service Charge (${transaction.serviceChargePercent}%)`,
        formatRupiah(transaction.serviceChargeAmount),
        width
      ) + '\n'
    );
  }

  if (transaction.taxAmount > 0) {
    appendAscii(
      bytes,
      padRow(`Pajak (${transaction.taxPercent}%)`, formatRupiah(transaction.taxAmount), width) + '\n'
    );
  }

  appendAscii(bytes, doubleDivider + '\n');

  // TOTAL
  bytes.push(0x1b, 0x45, 0x01);
  bytes.push(0x1d, 0x21, 0x01);
  appendAscii(bytes, padRow('TOTAL', formatRupiah(transaction.total), width) + '\n');
  bytes.push(0x1d, 0x21, 0x00);
  bytes.push(0x1b, 0x45, 0x00);

  appendAscii(
    bytes,
    padRow('Metode Bayar', transaction.paymentMethod === 'cash' ? 'TUNAI' : 'QRIS', width) + '\n'
  );

  if (transaction.paymentMethod === 'cash') {
    appendAscii(bytes, padRow('Bayar', formatRupiah(transaction.amountPaid), width) + '\n');
    appendAscii(bytes, padRow('Kembali', formatRupiah(transaction.change), width) + '\n');
  }

  appendAscii(bytes, divider + '\n');

  // Footer: Center align
  bytes.push(0x1b, 0x61, 0x01);
  if (settings.receiptFooter) {
    settings.receiptFooter.split('\n').forEach((fLine) => {
      if (fLine.trim()) {
        appendAscii(bytes, fLine.trim() + '\n');
      }
    });
  }

  appendAscii(bytes, '\n\n\n\n');
  bytes.push(0x1d, 0x56, 0x41, 0x03);

  return {
    plainText,
    escposBytes: new Uint8Array(bytes),
  };
}

export function generateTestReceipt(settings: StoreSettings): FormattedReceipt {
  const testTrx: Transaction = {
    id: 'test-print',
    invoiceNumber: 'TEST-PRINTER',
    queueNumber: 'A-01',
    createdAt: new Date().toISOString(),
    orderType: 'dine_in',
    tableOrQueueNumber: 'Tes Koneksi',
    cashierName: 'Admin POS',
    items: [
      {
        productId: 'test-1',
        productName: 'TES CETAK THERMAL POS',
        quantity: 1,
        basePrice: 10000,
        selectedAddons: [{ id: 'addon-selasih', name: 'Selasih', price: 2000 }],
        addonsPricePerUnit: 2000,
        unitPrice: 12000,
        costPrice: 5000,
        subtotal: 12000,
        notes: 'Printer Terhubung!',
      },
    ],
    subtotal: 12000,
    discountType: 'nominal',
    discountValue: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    serviceChargePercent: 0,
    serviceChargeAmount: 0,
    total: 12000,
    paymentMethod: 'cash',
    amountPaid: 12000,
    change: 0,
    status: 'completed',
    queueStatus: 'completed',
  };

  return generateReceipt(testTrx, settings);
}

function appendAscii(bytes: number[], text: string) {
  const clean = sanitizeAscii(text);
  for (let i = 0; i < clean.length; i++) {
    bytes.push(clean.charCodeAt(i));
  }
}
