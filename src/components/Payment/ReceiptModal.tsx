import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle,
  AlertTriangle,
  Share2,
  Download,
  Smartphone,
  RotateCw,
  X,
  FileText,
  Citrus,
} from 'lucide-react';
import { Transaction, StoreSettings } from '../../types';
import { generateReceipt } from '../../services/escpos';
import { PrinterService } from '../../services/printer';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  settings: StoreSettings;
  printStatusMessage?: string;
  isPrintSuccess?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  settings,
  printStatusMessage = '',
  isPrintSuccess = false,
}) => {
  const [statusMsg, setStatusMsg] = useState(printStatusMessage);
  const [success, setSuccess] = useState(isPrintSuccess);
  const [isPrinting, setIsPrinting] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  useEffect(() => {
    setStatusMsg(printStatusMessage);
    setSuccess(isPrintSuccess);
  }, [printStatusMessage, isPrintSuccess]);

  if (!isOpen || !transaction) return null;

  const { plainText, escposBytes } = generateReceipt(transaction, settings);

  // Try Bluetooth Print
  const handlePrintBluetooth = async () => {
    setIsPrinting(true);
    setStatusMsg('Mengirim data ke printer Bluetooth...');
    const res = await PrinterService.sendToBluetooth(escposBytes);
    setIsPrinting(false);
    if (res.success) {
      setSuccess(true);
      setStatusMsg('Struk berhasil dicetak ke printer Bluetooth!');
    } else {
      setSuccess(false);
      setStatusMsg(res.message || 'Gagal mencetak ke Bluetooth. Pastikan printer menyala & terhubung.');
    }
  };

  // RawBT Android App Print
  const handlePrintRawBT = () => {
    const ok = PrinterService.printViaRawBT(escposBytes);
    if (ok) {
      setStatusMsg('Membuka aplikasi RawBT...');
    }
  };

  // Browser Print / PDF
  const handleBrowserPrint = () => {
    window.print();
  };

  // Download Receipt Text File (.txt)
  const handleDownloadReceipt = () => {
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Struk-${transaction.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Share WhatsApp
  const handleShareWhatsApp = () => {
    const url = PrinterService.generateWhatsAppShareUrl(transaction, settings, whatsappPhone);
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Hidden container strictly for window.print() CSS */}
      <div id="receipt-print-area" className="hidden print:block whitespace-pre font-receipt text-black">
        {plainText}
      </div>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 safe-bottom">
        <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-[#111111] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Citrus className="w-5 h-5 text-[#F97316]" />
              <span className="font-black text-sm">Struk Transaksi Selesai</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Alert Banner */}
          {statusMsg && (
            <div
              className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
                success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-[#DC2626] border-red-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                )}
                <span className="truncate">{statusMsg}</span>
              </div>
              {!success && (
                <button
                  onClick={handlePrintBluetooth}
                  disabled={isPrinting}
                  className="bg-[#DC2626] text-white px-2 py-0.5 rounded-md text-[11px] shrink-0 ml-2"
                >
                  Coba Lagi
                </button>
              )}
            </div>
          )}

          {/* Thermal Paper Monospace Preview */}
          <div className="p-3 bg-zinc-100 flex-1 overflow-y-auto">
            <div className="bg-white p-4 rounded-xl shadow-inner border border-zinc-200/90 max-w-xs mx-auto">
              <pre className="font-receipt text-[11px] leading-[1.3] text-black whitespace-pre-wrap select-all">
                {plainText}
              </pre>
            </div>
          </div>

          {/* Action Tools & Share */}
          <div className="p-3 bg-zinc-50 border-t border-zinc-200 space-y-2 shrink-0">
            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={isPrinting}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isPrinting ? 'animate-spin' : ''}`} />
                <span>Cetak Bluetooth</span>
              </button>

              <button
                type="button"
                onClick={handlePrintRawBT}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
                title="Cetak via aplikasi RawBT Android"
              >
                <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                <span>Via RawBT (HP)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPhoneInput(!showPhoneInput)}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleBrowserPrint}
                className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Layar / PDF</span>
              </button>
            </div>

            {/* Optional WhatsApp phone input */}
            {showPhoneInput && (
              <div className="flex gap-1.5 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="Nomor WA (contoh: 0812...)"
                  className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  Kirim
                </button>
              </div>
            )}

            {/* Finish Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-black shadow-md transition active:scale-98 mt-1"
            >
              TRANSAKSI BARU / SELESAI
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
