import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Printer,
  Search,
  Filter,
  Check,
  RotateCcw,
  Citrus,
  ArrowRight,
} from 'lucide-react';
import { Transaction, QueueStatus, StoreSettings } from '../../types';
import { formatRupiah, sanitizeAscii } from '../../services/escpos';
import { PrinterService } from '../../services/printer';
import { FeedbackService } from '../../services/sound';

interface OrderQueueDisplayProps {
  transactions: Transaction[];
  onUpdateQueueStatus: (transactionId: string, status: QueueStatus) => void;
  settings: StoreSettings;
}

export const OrderQueueDisplay: React.FC<OrderQueueDisplayProps> = ({
  transactions,
  onUpdateQueueStatus,
  settings,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [search, setSearch] = useState('');

  // Only consider completed non-void transactions for queue
  const validTransactions = transactions.filter((t) => t.status === 'completed');

  // Filter
  const filtered = validTransactions.filter((t) => {
    const qStatus = t.queueStatus || 'waiting';
    const matchFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'active'
        ? qStatus !== 'completed'
        : qStatus === filterStatus;

    const matchSearch =
      (t.queueNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.tableOrQueueNumber || '').toLowerCase().includes(search.toLowerCase());

    return matchFilter && matchSearch;
  });

  const waitingCount = validTransactions.filter((t) => (t.queueStatus || 'waiting') === 'waiting').length;
  const inProgressCount = validTransactions.filter((t) => t.queueStatus === 'in_progress').length;
  const readyCount = validTransactions.filter((t) => t.queueStatus === 'ready').length;

  const handleAdvanceStatus = (trx: Transaction) => {
    const current = trx.queueStatus || 'waiting';
    let next: QueueStatus = 'in_progress';
    if (current === 'waiting') {
      next = 'in_progress';
      FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
    } else if (current === 'in_progress') {
      next = 'ready';
      FeedbackService.success(settings.soundEnabled, settings.hapticEnabled);
    } else if (current === 'ready') {
      next = 'completed';
      FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
    }
    onUpdateQueueStatus(trx.id, next);
  };

  const handlePrintKitchenSlip = async (trx: Transaction) => {
    const width = settings.paperWidth === '80mm' ? 48 : 32;
    const divider = '-'.repeat(width);

    const lines: string[] = [];
    lines.push('*** TIKET DAPUR / BARISTA ***');
    lines.push(`ANTRIAN: ${trx.queueNumber}`);
    lines.push(`No: ${trx.invoiceNumber}`);
    lines.push(`Tipe: ${trx.orderType === 'dine_in' ? 'DINE IN' : 'TAKE AWAY'}`);
    if (trx.tableOrQueueNumber) lines.push(`Meja: ${trx.tableOrQueueNumber}`);
    lines.push(`Waktu: ${new Date(trx.createdAt).toLocaleTimeString('id-ID')}`);
    lines.push(divider);

    trx.items.forEach((item) => {
      lines.push(`${item.quantity}x ${sanitizeAscii(item.productName)}`);
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        lines.push(`  + ${item.selectedAddons.map((a) => a.name).join(', ')}`);
      }
      if (item.notes) {
        lines.push(`  * Catatan: ${sanitizeAscii(item.notes)}`);
      }
    });

    lines.push(divider);
    lines.push('\n\n\n');

    // Create simple ESC/POS bytes
    const bytes: number[] = [0x1b, 0x40, 0x1b, 0x61, 0x01, 0x1d, 0x21, 0x11, 0x1b, 0x45, 0x01];
    const text = lines.join('\n');
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i));
    }
    bytes.push(0x1d, 0x56, 0x41, 0x03);

    if (PrinterService.isConnected()) {
      await PrinterService.sendToBluetooth(new Uint8Array(bytes));
      alert('Tiket dapur berhasil dicetak ke printer Bluetooth!');
    } else {
      PrinterService.printViaRawBT(new Uint8Array(bytes));
    }
  };

  const getElapsedMinutes = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    return `${diffMins} mnt lalu`;
  };

  return (
    <div className="p-3 max-w-5xl mx-auto pb-32">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div>
          <h2 className="text-lg font-black text-[#111111] flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-[#F97316]" />
            <span>Antrian Pesanan Dapur & Bar</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Pantau status pembuatan minuman per order pelanggan.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu: {waitingCount}</span>
          </div>
          <div className="px-2.5 py-1 bg-orange-100 text-[#F97316] rounded-xl text-xs font-bold flex items-center gap-1">
            <ChefHat className="w-3.5 h-3.5" />
            <span>Dibuat: {inProgressCount}</span>
          </div>
          <div className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1">
            <BellRing className="w-3.5 h-3.5 text-emerald-600" />
            <span>Siap: {readyCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-2.5 rounded-2xl border border-zinc-200/80 shadow-2xs mb-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'active', label: `Aktif (${waitingCount + inProgressCount + readyCount})` },
            { id: 'waiting', label: `Menunggu (${waitingCount})` },
            { id: 'in_progress', label: `Sedang Dibuat (${inProgressCount})` },
            { id: 'ready', label: `Siap Diambil (${readyCount})` },
            { id: 'all', label: 'Semua Nota' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                filterStatus === tab.id
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor antrian (e.g. A-01) atau no. nota..."
            className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:border-[#F97316]"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 bg-white rounded-3xl border border-zinc-200/80">
          <ChefHat className="w-12 h-12 mx-auto mb-2 text-zinc-300" />
          <p className="font-bold text-sm text-zinc-600">Tidak ada pesanan dalam antrian ini</p>
          <p className="text-xs text-zinc-400 mt-1">
            Pesanan baru dari kasir akan otomatis muncul di layar antrian ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((trx) => {
            const status = trx.queueStatus || 'waiting';
            const isWaiting = status === 'waiting';
            const isInProgress = status === 'in_progress';
            const isReady = status === 'ready';
            const isCompleted = status === 'completed';

            const statusColor = isWaiting
              ? 'border-amber-400 bg-amber-50/40'
              : isInProgress
              ? 'border-[#F97316] bg-orange-50/50'
              : isReady
              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-300'
              : 'border-zinc-200 bg-zinc-50 opacity-70';

            const statusBadge = isWaiting ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Menunggu
              </span>
            ) : isInProgress ? (
              <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                <ChefHat className="w-3 h-3 text-[#F97316]" />
                <span>Sedang Dibuat</span>
              </span>
            ) : isReady ? (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 animate-pulse">
                <BellRing className="w-3 h-3" />
                <span>Siap Diambil</span>
              </span>
            ) : (
              <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Selesai
              </span>
            );

            return (
              <div
                key={trx.id}
                className={`rounded-3xl border-2 p-4 shadow-xs flex flex-col justify-between transition-all ${statusColor}`}
              >
                <div>
                  {/* Card Header: Queue Number & Time */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                          #{trx.queueNumber || 'ANTRIAN'}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-700">
                          {trx.orderType === 'dine_in' ? 'Dine In' : 'Take Away'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                        {trx.tableOrQueueNumber ? `${trx.tableOrQueueNumber} • ` : ''}
                        {getElapsedMinutes(trx.createdAt)}
                      </p>
                    </div>

                    <div>{statusBadge}</div>
                  </div>

                  {/* Item List with Addons */}
                  <div className="space-y-2 py-2 border-t border-b border-zinc-200/70 my-2">
                    {trx.items.map((it, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between items-baseline">
                          <span className="font-extrabold text-[#111111]">
                            {it.quantity}x {it.productName}
                          </span>
                        </div>

                        {/* Addons List */}
                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                          <div className="pl-3 mt-0.5 text-[11px] font-bold text-[#F97316] flex items-center gap-1">
                            <span>+</span>
                            <span>{it.selectedAddons.map((a) => a.name).join(', ')}</span>
                          </div>
                        )}

                        {/* Item Notes */}
                        {it.notes && (
                          <div className="pl-3 text-[11px] text-zinc-500 italic mt-0.5">
                            * {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-zinc-400 flex justify-between items-center mb-3">
                    <span>Nota: #{trx.invoiceNumber}</span>
                    <span>Kasir: {trx.cashierName}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-1.5 pt-1">
                  {!isCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(trx)}
                      className={`w-full py-3 px-3 rounded-2xl font-black text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2 ${
                        isWaiting
                          ? 'bg-[#F97316] hover:bg-orange-600 text-white'
                          : isInProgress
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#111111] hover:bg-black text-white'
                      }`}
                    >
                      {isWaiting && (
                        <>
                          <ChefHat className="w-4 h-4" />
                          <span>Mulai Buat Pesanan</span>
                        </>
                      )}
                      {isInProgress && (
                        <>
                          <BellRing className="w-4 h-4" />
                          <span>Pesanan Siap Diambil</span>
                        </>
                      )}
                      {isReady && (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Selesai / Sudah Diserahkan</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-100 rounded-xl">
                      ✓ Pesanan Selesai
                    </div>
                  )}

                  {/* Print Kitchen Slip */}
                  <button
                    type="button"
                    onClick={() => handlePrintKitchenSlip(trx)}
                    className="w-full py-2 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Cetak Tiket Dapur</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
