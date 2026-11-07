import React, { useState } from 'react';
import { Clock, DollarSign, X, CheckCircle, AlertCircle, ArrowRight, Printer } from 'lucide-react';
import { Shift, Transaction, StoreSettings } from '../types';
import { formatRupiah } from '../services/escpos';
import { PrinterService } from '../services/printer';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: Shift | null;
  onOpenShift: (cashierName: string, initialCash: number) => void;
  onCloseShift: (actualCash: number, notes: string) => void;
  transactions: Transaction[];
  settings: StoreSettings;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  onOpenShift,
  onCloseShift,
  transactions,
  settings,
}) => {
  const [cashierName, setCashierName] = useState('Kasir 1');
  const [initialCash, setInitialCash] = useState<number>(100000);
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isClosingStep, setIsClosingStep] = useState(false);

  if (!isOpen) return null;

  // Calculate shift stats from transactions
  const shiftTrxs = currentShift
    ? transactions.filter((t) => {
        const tTime = new Date(t.createdAt).getTime();
        const sTime = new Date(currentShift.startTime).getTime();
        return tTime >= sTime && t.status === 'completed';
      })
    : [];

  const shiftCashSales = shiftTrxs
    .filter((t) => t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.total, 0);

  const shiftQrisSales = shiftTrxs
    .filter((t) => t.paymentMethod === 'qris')
    .reduce((sum, t) => sum + t.total, 0);

  const expectedCashInDrawer = (currentShift?.initialCash || 0) + shiftCashSales;
  const cashDifference = actualCash - expectedCashInDrawer;

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashierName.trim()) return;
    onOpenShift(cashierName.trim(), Number(initialCash) || 0);
    onClose();
  };

  const handleFinishClosingShift = () => {
    onCloseShift(actualCash, notes);
    setIsClosingStep(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {!currentShift ? (
          // Buka Shift Form
          <div>
            <div className="flex items-center gap-2.5 text-[#F97316] mb-1">
              <Clock className="w-6 h-6" />
              <h3 className="text-lg font-black text-[#111111]">Buka Shift Kasir Baru</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-5">
              Masukkan nama kasir bertugas dan modal awal di laci uang kasir (cash drawer).
            </p>

            <form onSubmit={handleStartShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Nama Kasir Bertugas
                </label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Contoh: Kasir 1 / Sarah"
                  className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-[#F97316] outline-none font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Modal Awal Kasir (Uang Pecahan)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    step={1000}
                    value={initialCash || ''}
                    onChange={(e) => setInitialCash(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-[#F97316] outline-none font-bold text-base"
                  />
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[50000, 100000, 200000, 300000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInitialCash(amt)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition ${
                        initialCash === amt
                          ? 'border-[#F97316] bg-orange-50 text-[#F97316]'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-98 mt-2 flex items-center justify-center gap-2"
              >
                <span>Mulai Shift Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : !isClosingStep ? (
          // Current Shift Summary
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-6 h-6" />
                <h3 className="text-lg font-black text-[#111111]">Shift Sedang Berjalan</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                AKTIF
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Kasir: <strong>{currentShift.cashierName}</strong> • Dimulai:{' '}
              {new Date(currentShift.startTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            <div className="space-y-2.5 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 mb-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Modal Awal Laci:</span>
                <span className="font-bold text-[#111111]">{formatRupiah(currentShift.initialCash)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Penjualan Tunai (Cash):</span>
                <span className="font-bold text-emerald-600">+{formatRupiah(shiftCashSales)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Penjualan QRIS:</span>
                <span className="font-bold text-blue-600">{formatRupiah(shiftQrisSales)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Total Transaksi Selesai:</span>
                <span className="font-bold text-[#111111]">{shiftTrxs.length} Nota</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-sm font-extrabold">
                <span className="text-zinc-700">Estimasi Uang Fisik di Laci:</span>
                <span className="text-[#F97316]">{formatRupiah(expectedCashInDrawer)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-xl transition"
              >
                Lanjutkan Kasir
              </button>
              <button
                type="button"
                onClick={() => {
                  setActualCash(expectedCashInDrawer);
                  setIsClosingStep(true);
                }}
                className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-98"
              >
                Tutup Shift
              </button>
            </div>
          </div>
        ) : (
          // Tutup Shift Form (Cash Count)
          <div>
            <div className="flex items-center gap-2 text-[#DC2626] mb-1">
              <Clock className="w-6 h-6" />
              <h3 className="text-lg font-black text-[#111111]">Rekap & Tutup Shift</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Hitung uang fisik yang ada di laci kasir dan cocokkan dengan data sistem.
            </p>

            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-orange-800 font-medium">Uang Sistem di Laci:</span>
                <span className="text-base font-black text-orange-900">{formatRupiah(expectedCashInDrawer)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Uang Fisik Dihitung (Real Cash)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-zinc-500 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    step={1000}
                    value={actualCash || ''}
                    onChange={(e) => setActualCash(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-[#F97316] outline-none font-black text-lg"
                  />
                </div>
              </div>

              {/* Difference Status */}
              <div
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                  cashDifference === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : cashDifference > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>Status Selisih:</span>
                <span className="text-sm">
                  {cashDifference === 0
                    ? '✓ Uang Pas (Sesuai)'
                    : cashDifference > 0
                    ? `+ Lebih ${formatRupiah(cashDifference)}`
                    : `- Kurang ${formatRupiah(Math.abs(cashDifference))}`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Catatan Tutup Shift (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan jika ada uang rusak, tip, atau selisih..."
                  className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl focus:border-[#F97316] outline-none text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosingStep(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-xl transition"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleFinishClosingShift}
                  className="flex-1 bg-[#111111] hover:bg-black text-white font-bold py-3 rounded-xl shadow-md transition active:scale-98"
                >
                  Konfirmasi Tutup Shift
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
