import React, { useState, useEffect } from 'react';
import {
  Banknote,
  QrCode,
  X,
  Printer,
  Check,
  Maximize2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { CartItem, OrderType, PaymentMethod, StoreSettings } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  orderType: OrderType;
  tableOrQueueNumber: string;
  discountType: 'nominal' | 'percent';
  discountValue: number;
  settings: StoreSettings;
  onConfirmPayment: (
    paymentMethod: PaymentMethod,
    amountPaid: number,
    change: number,
    shouldPrint: boolean
  ) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  orderType,
  tableOrQueueNumber,
  discountType,
  discountValue,
  settings,
  onConfirmPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashGiven, setCashGiven] = useState<number>(0);
  const [qrisZoomed, setQrisZoomed] = useState(false);
  const [qrisConfirmed, setQrisConfirmed] = useState(false);

  // Calculations
  const getItemUnitPrice = (item: CartItem) => {
    const addonsTotal = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
    return item.product.price + addonsTotal;
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
    0
  );

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = Math.round((subtotal * discountValue) / 100);
  } else {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const serviceChargeAmount = Math.round((taxableAmount * (settings.serviceChargePercent || 0)) / 100);
  const taxAmount = Math.round(((taxableAmount + serviceChargeAmount) * (settings.taxPercent || 0)) / 100);
  const totalBill = taxableAmount + serviceChargeAmount + taxAmount;

  // Initialize cashGiven to totalBill when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashGiven(totalBill);
      setQrisConfirmed(false);
      setPaymentMethod('cash');
    }
  }, [isOpen, totalBill]);

  // Kembalian calculation
  const changeAmount = Math.max(0, cashGiven - totalBill);
  const isCashSufficient = cashGiven >= totalBill;

  // Bluetooth keyboard shortcut: ENTER key = Bayar & Cetak
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecutePayment(true);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, paymentMethod, isCashSufficient, qrisConfirmed, cashGiven, totalBill]);

  if (!isOpen) return null;

  const handleExecutePayment = (shouldPrint: boolean) => {
    if (paymentMethod === 'cash') {
      if (!isCashSufficient) {
        alert('Nominal uang tunai yang diterima masih kurang!');
        return;
      }
      onConfirmPayment('cash', cashGiven, changeAmount, shouldPrint);
    } else {
      if (!qrisConfirmed) {
        alert('Silakan centang/konfirmasi bahwa pembayaran QRIS sudah diterima di mutasi bank/e-wallet Anda.');
        return;
      }
      onConfirmPayment('qris', totalBill, 0, shouldPrint);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 safe-bottom">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#111111]">Pembayaran Kasir</h3>
              <p className="text-[11px] text-zinc-500 font-medium">
                {orderType === 'dine_in' ? 'Dine In' : 'Take Away'}
                {tableOrQueueNumber ? ` • ${tableOrQueueNumber}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Total Bill Banner */}
            <div className="bg-orange-50 border-2 border-orange-200 p-3.5 rounded-2xl text-center">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
                Total yang Harus Dibayar
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#F97316] tracking-tight mt-0.5">
                {formatRupiah(totalBill)}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
                  paymentMethod === 'cash'
                    ? 'bg-[#111111] text-white shadow-md'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Uang Tunai (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
                  paymentMethod === 'qris'
                    ? 'bg-[#111111] text-white shadow-md'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS Statis</span>
              </button>
            </div>

            {/* Cash Payment Section */}
            {paymentMethod === 'cash' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-zinc-400 font-bold text-base">
                      Rp
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={cashGiven || ''}
                      onChange={(e) => setCashGiven(Number(e.target.value))}
                      className="w-full pl-12 pr-4 py-3 border-2 border-zinc-200 rounded-2xl font-black text-xl text-[#111111] focus:border-[#F97316] outline-none"
                    />
                  </div>
                </div>

                {/* Quick Nominal Chips */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashGiven(totalBill)}
                    className="py-2.5 px-1 bg-orange-100 hover:bg-orange-200 text-[#F97316] font-extrabold text-xs rounded-xl transition border border-orange-200 active:scale-95"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(20000)}
                    className="py-2.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition border border-zinc-200 active:scale-95"
                  >
                    Rp 20.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(50000)}
                    className="py-2.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition border border-zinc-200 active:scale-95"
                  >
                    Rp 50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(100000)}
                    className="py-2.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition border border-zinc-200 active:scale-95"
                  >
                    Rp 100.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven(200000)}
                    className="py-2.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition border border-zinc-200 active:scale-95"
                  >
                    Rp 200.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven((prev) => prev + 10000)}
                    className="py-2.5 px-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition border border-zinc-200 active:scale-95"
                  >
                    + Rp 10.000
                  </button>
                </div>

                {/* Kembalian Banner */}
                <div
                  className={`p-3.5 rounded-2xl border text-center transition ${
                    isCashSufficient
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-[#DC2626]'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    {isCashSufficient ? 'Uang Kembalian' : 'Uang Kurang'}
                  </span>
                  <span className="text-2xl font-black block mt-0.5">
                    {isCashSufficient
                      ? formatRupiah(changeAmount)
                      : '-' + formatRupiah(totalBill - cashGiven)}
                  </span>
                </div>
              </div>
            ) : (
              /* QRIS Statis Section */
              <div className="space-y-3 text-center">
                <div className="relative inline-block mx-auto bg-white p-3 rounded-2xl border-2 border-zinc-200 shadow-sm max-w-[220px]">
                  {settings.qrisImageUrl ? (
                    <img
                      src={settings.qrisImageUrl}
                      alt="QRIS Toko JERUK NONA"
                      className="w-48 h-48 object-contain rounded-xl mx-auto"
                    />
                  ) : (
                    /* Default Generated QR Code SVG Display */
                    <div className="w-48 h-48 bg-zinc-100 rounded-xl flex flex-col items-center justify-center p-3 text-zinc-400">
                      <QrCode className="w-20 h-20 text-[#111111] mb-2" />
                      <span className="text-[11px] font-bold text-zinc-600">QRIS JERUK NONA</span>
                      <span className="text-[10px] text-zinc-400">Upload QRIS di Setting</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setQrisZoomed(true)}
                    className="absolute bottom-2 right-2 bg-black/75 hover:bg-black text-white p-1.5 rounded-lg text-xs flex items-center gap-1 shadow-md"
                    title="Perbesar Layar Penuh"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-left flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-bold">Periksa Pembayaran Manual:</p>
                    <p className="text-[11px] text-amber-800">
                      Minta pelanggan menunjukkan bukti transfer / cek notifikasi EDC/BCA/Gojek Anda. Setelah dana masuk, tekan centang di bawah.
                    </p>
                  </div>
                </div>

                {/* Cashier verification checkbox */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-200 bg-zinc-50 cursor-pointer text-left select-none">
                  <input
                    type="checkbox"
                    checked={qrisConfirmed}
                    onChange={(e) => setQrisConfirmed(e.target.checked)}
                    className="w-5 h-5 rounded accent-[#F97316] shrink-0"
                  />
                  <span className="text-xs font-bold text-zinc-800">
                    Saya sudah mengecek dan dana <span className="text-[#F97316]">{formatRupiah(totalBill)}</span> sudah masuk
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Action Buttons (Pinned Bottom) */}
          <div className="p-4 bg-zinc-50 border-t border-zinc-200 space-y-2 shrink-0">
            {/* Primary: BAYAR & CETAK (Big button, 54px min height) */}
            <button
              type="button"
              disabled={paymentMethod === 'cash' ? !isCashSufficient : !qrisConfirmed}
              onClick={() => handleExecutePayment(true)}
              className="w-full min-h-[54px] bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-base rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              <span>BAYAR & CETAK STRUK</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold ml-1 hidden xs:inline">
                ENTER
              </span>
            </button>

            {/* Secondary: BAYAR TANPA CETAK */}
            <button
              type="button"
              disabled={paymentMethod === 'cash' ? !isCashSufficient : !qrisConfirmed}
              onClick={() => handleExecutePayment(false)}
              className="w-full min-h-[44px] bg-[#111111] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Bayar Tanpa Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* QRIS Fullscreen Zoom Modal for Customer Scanning */}
      {qrisZoomed && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setQrisZoomed(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-black p-1"
            >
              <X className="w-6 h-6" />
            </button>

            <h4 className="font-black text-lg text-[#111111] mb-1">
              QRIS {settings.storeName}
            </h4>
            <p className="text-xs text-zinc-500 mb-4">
              Silakan pindai / scan menggunakan GoPay, OVO, Dana, BCA, Livin, dll.
            </p>

            <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-2xl mb-4">
              <span className="text-[11px] text-orange-700 font-bold">TOTAL TAGIHAN:</span>
              <div className="text-2xl font-black text-[#F97316]">
                {formatRupiah(totalBill)}
              </div>
            </div>

            {settings.qrisImageUrl ? (
              <img
                src={settings.qrisImageUrl}
                alt="QRIS Toko Fullscreen"
                className="w-full aspect-square object-contain rounded-2xl border-2 border-zinc-200"
              />
            ) : (
              <div className="w-full aspect-square bg-zinc-100 rounded-2xl flex flex-col items-center justify-center p-4">
                <QrCode className="w-32 h-32 text-[#111111] mb-2" />
                <span className="text-xs text-zinc-500">Scan QRIS</span>
              </div>
            )}

            <button
              onClick={() => setQrisZoomed(false)}
              className="mt-5 w-full bg-[#111111] text-white font-bold py-3 rounded-xl text-sm"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </>
  );
};
