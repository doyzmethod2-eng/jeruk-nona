import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Share2,
  Download,
  Search,
  Printer,
  Ban,
  Calendar,
  X,
  ChevronRight,
  Citrus,
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { Transaction, StoreSettings, UserRole } from '../../types';
import { formatRupiah } from '../../services/escpos';
import { generateSalesAnalysis } from '../../services/gemini';

interface SalesReportsProps {
  transactions: Transaction[];
  settings: StoreSettings;
  currentRole: UserRole;
  onReprintReceipt: (transaction: Transaction) => void;
  onVoidTransaction: (transactionId: string, reason: string) => void;
  onRequireAdmin: () => void;
}

type PeriodType = 'today' | '7days' | 'month' | 'custom';

export const SalesReports: React.FC<SalesReportsProps> = ({
  transactions,
  settings,
  currentRole,
  onReprintReceipt,
  onVoidTransaction,
  onRequireAdmin,
}) => {
  const [period, setPeriod] = useState<PeriodType>('today');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0]
  );
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTrx, setSearchTrx] = useState('');

  // Selected Transaction for Detail Modal
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);

  // Void confirmation state
  const [trxToVoid, setTrxToVoid] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // AI Gemini Analysis State
  const [aiAnalysisText, setAiAnalysisText] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');

  // Filter transactions by period
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOf7Days = startOfToday - 86400000 * 6;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredByPeriod = transactions.filter((t) => {
    const tTime = new Date(t.createdAt).getTime();
    if (period === 'today') {
      return tTime >= startOfToday;
    } else if (period === '7days') {
      return tTime >= startOf7Days;
    } else if (period === 'month') {
      return tTime >= startOfMonth;
    } else if (period === 'custom') {
      const s = new Date(customStart).getTime();
      const e = new Date(customEnd).setHours(23, 59, 59, 999);
      return tTime >= s && tTime <= e;
    }
    return true;
  });

  // Calculate KPIs (only completed transactions count towards revenue)
  const completedTrxs = filteredByPeriod.filter((t) => t.status === 'completed');
  const voidTrxs = filteredByPeriod.filter((t) => t.status === 'void');

  const totalRevenue = completedTrxs.reduce((sum, t) => sum + t.total, 0);
  const totalTransactionsCount = completedTrxs.length;
  const avgBasketSize = totalTransactionsCount > 0 ? Math.round(totalRevenue / totalTransactionsCount) : 0;

  // Gross profit calculation: Revenue - Total Cost of Goods Sold (HPP)
  const totalCOGS = completedTrxs.reduce((sum, t) => {
    const trxCost = t.items.reduce((itemSum, item) => itemSum + (item.costPrice || 0) * item.quantity, 0);
    return sum + trxCost;
  }, 0);
  const grossProfit = totalRevenue - totalCOGS;

  // Cash vs QRIS Breakdown
  const cashTotal = completedTrxs
    .filter((t) => t.paymentMethod === 'cash')
    .reduce((sum, t) => sum + t.total, 0);
  const qrisTotal = completedTrxs
    .filter((t) => t.paymentMethod === 'qris')
    .reduce((sum, t) => sum + t.total, 0);

  const cashPercent = totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 0;
  const qrisPercent = totalRevenue > 0 ? 100 - cashPercent : 0;

  // Best Selling Items
  const itemMap: { [name: string]: { qty: number; revenue: number } } = {};
  completedTrxs.forEach((t) => {
    t.items.forEach((item) => {
      if (!itemMap[item.productName]) {
        itemMap[item.productName] = { qty: 0, revenue: 0 };
      }
      itemMap[item.productName].qty += item.quantity;
      itemMap[item.productName].revenue += item.subtotal;
    });
  });

  const topItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Daily Trend Data (Last 7 days or matching period)
  const dayBuckets: { [dateStr: string]: number } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    dayBuckets[key] = 0;
  }

  completedTrxs.forEach((t) => {
    const d = new Date(t.createdAt);
    const key = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    if (dayBuckets[key] !== undefined) {
      dayBuckets[key] += t.total;
    }
  });

  const chartData = Object.entries(dayBuckets);
  const maxDayRevenue = Math.max(1, ...chartData.map(([, val]) => val));

  // Run AI Sales & Business Analysis with Gemini API
  const handleRunAiAnalysis = async (focusTopic?: string) => {
    setIsAiAnalyzing(true);
    setAiError('');
    try {
      const summaryContext = {
        storeName: settings.storeName,
        periode: period,
        totalOmzet: totalRevenue,
        estimasiLabaKotor: grossProfit,
        totalNota: totalTransactionsCount,
        rataRataPerNota: avgBasketSize,
        cashTotal,
        cashPercent,
        qrisTotal,
        qrisPercent,
        menuTerlaris: topItems,
      };

      const prompt =
        focusTopic ||
        'Berikan analisis performa penjualan, evaluasi margin keuntungan laba kotor, dan berikan 3 ide taktis konkrit (misal bundling menu, antisipasi stok kemasan cup/seal, atau promosi jam sepi) untuk meningkatkan profit gerai Jeruk Nona.';
      const res = await generateSalesAnalysis(summaryContext, prompt);
      setAiAnalysisText(res);
    } catch (err: any) {
      setAiError(err.message || 'Gagal mengambil analisis AI');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Filter transaction list by search query
  const searchedTrxs = filteredByPeriod.filter((t) => {
    const matchInv = t.invoiceNumber.toLowerCase().includes(searchTrx.toLowerCase());
    const matchTable = (t.tableOrQueueNumber || '').toLowerCase().includes(searchTrx.toLowerCase());
    const matchCashier = t.cashierName.toLowerCase().includes(searchTrx.toLowerCase());
    return matchInv || matchTable || matchCashier;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'No. Nota',
      'Tanggal',
      'Waktu',
      'Tipe',
      'Meja/Antrian',
      'Kasir',
      'Metode Bayar',
      'Subtotal',
      'Diskon',
      'Pajak',
      'Service',
      'Total',
      'Status',
      'Item Terjual',
    ];

    const rows = filteredByPeriod.map((t) => {
      const d = new Date(t.createdAt);
      const itemsStr = t.items.map((it) => `${it.quantity}x ${it.productName}`).join('; ');
      return [
        `"${t.invoiceNumber}"`,
        `"${d.toLocaleDateString('id-ID')}"`,
        `"${d.toLocaleTimeString('id-ID')}"`,
        `"${t.orderType}"`,
        `"${t.tableOrQueueNumber || ''}"`,
        `"${t.cashierName}"`,
        `"${t.paymentMethod}"`,
        t.subtotal,
        t.discountAmount,
        t.taxAmount,
        t.serviceChargeAmount,
        t.total,
        `"${t.status}"`,
        `"${itemsStr}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan-Penjualan-JerukNona-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share Summary WhatsApp
  const handleShareSummaryWA = () => {
    const periodName =
      period === 'today'
        ? 'Hari Ini'
        : period === '7days'
        ? '7 Hari Terakhir'
        : period === 'month'
        ? 'Bulan Ini'
        : `${customStart} s/d ${customEnd}`;

    let text = `🍊 *LAPORAN PENJUALAN - ${settings.storeName}*\n`;
    text += `📅 Periode: *${periodName}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Total Omzet  : ${formatRupiah(totalRevenue)}*\n`;
    text += `📈 Total Laba Kotor: ${formatRupiah(grossProfit)}\n`;
    text += `🧾 Total Transaksi: ${totalTransactionsCount} Nota\n`;
    text += `🛒 Rata-rata/Nota : ${formatRupiah(avgBasketSize)}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 *Rincian Pembayaran:*\n`;
    text += `  • Tunai (Cash) : ${formatRupiah(cashTotal)} (${cashPercent}%)\n`;
    text += `  • QRIS Statis  : ${formatRupiah(qrisTotal)} (${qrisPercent}%)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏆 *5 Menu Terlaris:*\n`;
    topItems.forEach((it, idx) => {
      text += `  ${idx + 1}. ${it.name}: ${it.qty} porsi (${formatRupiah(it.revenue)})\n`;
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Diekspor otomatis dari JERUK NONA POS_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleConfirmVoid = () => {
    if (!trxToVoid || !voidReason.trim()) return;
    onVoidTransaction(trxToVoid.id, voidReason.trim());
    setTrxToVoid(null);
    setVoidReason('');
    setSelectedTrx(null);
  };

  return (
    <div className="p-3 max-w-5xl mx-auto pb-28">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-black text-[#111111] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#F97316]" />
            <span>Laporan & Riwayat Penjualan</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Analisis omzet, laba kotor, metode pembayaran, dan riwayat nota.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareSummaryWA}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-zinc-200/80 shadow-2xs mb-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7days', label: '7 Hari Terakhir' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'custom', label: 'Pilih Tanggal' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as PeriodType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                period === p.id
                  ? 'bg-[#F97316] text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold outline-none flex-1"
            />
            <span className="text-zinc-400 font-bold">s/d</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold outline-none flex-1"
            />
          </div>
        )}
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {/* Total Omzet */}
        <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block">
            Total Omzet Penjualan
          </span>
          <span className="text-lg sm:text-xl font-black text-[#F97316] block mt-0.5">
            {formatRupiah(totalRevenue)}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            Dari {totalTransactionsCount} transaksi nota
          </span>
        </div>

        {/* Laba Kotor (Gross Profit) */}
        <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block">
            Estimasi Laba Kotor
          </span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 block mt-0.5">
            {formatRupiah(grossProfit)}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            (Omzet - HPP Modal Menu)
          </span>
        </div>

        {/* Total Transaksi */}
        <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block">
            Transaksi Selesai
          </span>
          <span className="text-lg sm:text-xl font-black text-[#111111] block mt-0.5">
            {totalTransactionsCount} Nota
          </span>
          {voidTrxs.length > 0 && (
            <span className="text-[10px] text-[#DC2626] font-bold">
              +{voidTrxs.length} Nota Void
            </span>
          )}
        </div>

        {/* Basket Size / Rata-rata */}
        <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block">
            Rata-rata per Nota
          </span>
          <span className="text-lg sm:text-xl font-black text-[#111111] block mt-0.5">
            {formatRupiah(avgBasketSize)}
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            Belanja per pelanggan
          </span>
        </div>
      </div>

      {/* AI Asisten & Analisis Penjualan Jeruk Nona */}
      <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50/40 p-4 rounded-2xl border-2 border-orange-200/90 shadow-2xs mb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F97316] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#111111] uppercase tracking-wide flex items-center gap-1.5">
                <span>AI Asisten Bisnis & Analisis Penjualan</span>
                <span className="bg-orange-100 text-[#F97316] text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-orange-300">
                  Gemini API Aktif
                </span>
              </h4>
              <p className="text-[11px] text-zinc-500">
                Analisis otomatis margin, rekomendasi promo bundling, dan prediksi kebutuhan bahan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRunAiAnalysis()}
            disabled={isAiAnalyzing}
            className="px-3 py-2 bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            {isAiAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menganalisis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analisis AI</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            type="button"
            disabled={isAiAnalyzing}
            onClick={() => handleRunAiAnalysis('Berikan 2 ide paket bundling menu jeruk terlaris dengan add-on (yakult, jelly, selasih) untuk menaikkan basket size belanja.')}
            className="px-2.5 py-1 bg-white hover:bg-orange-100 border border-orange-200 rounded-lg text-[11px] font-bold text-orange-950 shrink-0 transition active:scale-95"
          >
            💡 Saran Promo Bundling
          </button>
          <button
            type="button"
            disabled={isAiAnalyzing}
            onClick={() => handleRunAiAnalysis('Berdasarkan jumlah transaksi saat ini, berikan saran manajemen stok cup plastik, seal press, dan bahan jeruk agar tidak kehabisan saat jam sibuk.')}
            className="px-2.5 py-1 bg-white hover:bg-orange-100 border border-orange-200 rounded-lg text-[11px] font-bold text-orange-950 shrink-0 transition active:scale-95"
          >
            🥤 Prediksi Kebutuhan Cup & Seal
          </button>
          <button
            type="button"
            disabled={isAiAnalyzing}
            onClick={() => handleRunAiAnalysis('Berikan tips taktis bagi kasir untuk menawarkan upsell add-on (misal Yakult atau Selasih) secara ramah kepada pembeli.')}
            className="px-2.5 py-1 bg-white hover:bg-orange-100 border border-orange-200 rounded-lg text-[11px] font-bold text-orange-950 shrink-0 transition active:scale-95"
          >
            🎯 Tips Upselling Kasir
          </button>
        </div>

        {aiError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            {aiError}
          </div>
        )}

        {aiAnalysisText && (
          <div className="p-3 bg-white rounded-xl border border-orange-200 text-xs text-zinc-800 space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
              <span className="font-black text-[#111111] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Hasil Analisis Gemini AI Jeruk Nona:</span>
              </span>
              <button
                type="button"
                onClick={() => setAiAnalysisText('')}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 font-bold"
              >
                Tutup
              </button>
            </div>
            <div className="whitespace-pre-line leading-relaxed text-zinc-700 font-medium">
              {aiAnalysisText}
            </div>
          </div>
        )}
      </div>

      {/* Cash vs QRIS Breakdown Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs mb-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-xs font-black text-[#111111] uppercase tracking-wide">
            Komposisi Metode Pembayaran
          </h4>
          <span className="text-xs font-extrabold text-zinc-500">
            {formatRupiah(totalRevenue)}
          </span>
        </div>

        {/* Percentage bar */}
        <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex mb-2">
          <div
            style={{ width: `${cashPercent}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Tunai: ${formatRupiah(cashTotal)}`}
          />
          <div
            style={{ width: `${qrisPercent}%` }}
            className="bg-blue-500 h-full transition-all duration-500"
            title={`QRIS: ${formatRupiah(qrisTotal)}`}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-600 font-medium">Tunai (Cash):</span>
            <span className="font-bold text-emerald-700">
              {formatRupiah(cashTotal)} ({cashPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-zinc-600 font-medium">QRIS:</span>
            <span className="font-bold text-blue-700">
              {formatRupiah(qrisTotal)} ({qrisPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Trend Chart (Simple Responsive SVG Bars) */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs mb-3">
        <h4 className="text-xs font-black text-[#111111] uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#F97316]" />
          <span>Tren Penjualan Harian</span>
        </h4>

        <div className="flex items-end justify-between gap-1.5 h-36 pt-4 px-1 border-b border-zinc-100">
          {chartData.map(([dayLabel, dayRevenue]) => {
            const heightPercent = maxDayRevenue > 0 ? (dayRevenue / maxDayRevenue) * 100 : 0;
            return (
              <div key={dayLabel} className="flex-1 flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-bold text-zinc-500 opacity-0 group-hover:opacity-100 transition truncate mb-1">
                  {formatRupiah(dayRevenue)}
                </span>
                <div
                  style={{ height: `${Math.max(6, heightPercent)}%` }}
                  className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 ${
                    dayRevenue > 0
                      ? 'bg-[#F97316] group-hover:bg-orange-600'
                      : 'bg-zinc-200'
                  }`}
                />
                <span className="text-[10px] text-zinc-500 font-medium mt-1.5 truncate">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 5 Best Sellers */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs mb-3">
        <h4 className="text-xs font-black text-[#111111] uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Citrus className="w-4 h-4 text-[#F97316]" />
          <span>Menu Terlaris (Top 5)</span>
        </h4>

        {topItems.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 text-center">Belum ada transaksi di periode ini.</p>
        ) : (
          <div className="space-y-2">
            {topItems.map((it, idx) => (
              <div key={it.name} className="flex items-center justify-between text-xs py-1 border-b border-zinc-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-orange-100 text-[#F97316] font-black text-[11px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-[#111111]">{it.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-[#F97316]">{it.qty} Porsi</span>
                  <span className="text-zinc-400 text-[10px] ml-2">({formatRupiah(it.revenue)})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-black text-[#111111] uppercase tracking-wide">
            Riwayat Transaksi Nota ({searchedTrxs.length})
          </h4>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchTrx}
              onChange={(e) => setSearchTrx(e.target.value)}
              placeholder="Cari no. nota / meja / kasir..."
              className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:border-[#F97316]"
            />
          </div>
        </div>

        {searchedTrxs.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs">
            Tidak ada transaksi ditemukan.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {searchedTrxs.map((t) => {
              const d = new Date(t.createdAt);
              const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              const isVoid = t.status === 'void';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrx(t)}
                  className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-2 hover:border-zinc-400 ${
                    isVoid
                      ? 'bg-red-50/50 border-red-200 opacity-75'
                      : 'bg-zinc-50 border-zinc-200/80'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black text-xs text-[#111111]">
                        #{t.invoiceNumber}
                      </span>
                      {isVoid && (
                        <span className="bg-[#DC2626] text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                          VOID
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {dateStr} {timeStr}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {t.orderType === 'dine_in' ? 'Dine In' : 'Take Away'}
                      {t.tableOrQueueNumber ? ` • ${t.tableOrQueueNumber}` : ''} • Kasir: {t.cashierName}
                    </p>

                    <p className="text-[11px] text-zinc-600 truncate mt-0.5 font-medium">
                      {t.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black ${
                        isVoid ? 'text-[#DC2626] line-through' : 'text-[#F97316]'
                      }`}
                    >
                      {formatRupiah(t.total)}
                    </span>
                    <span className="block text-[10px] text-zinc-400 uppercase font-bold">
                      {t.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 safe-bottom">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-[#111111]">
                  Detail Nota #{selectedTrx.invoiceNumber}
                </h3>
                <p className="text-[10px] text-zinc-400">
                  {new Date(selectedTrx.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrx(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              {selectedTrx.status === 'void' && (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-red-800 text-xs">
                  <span className="font-bold block">TRANSAKSI TELAH DIVOID</span>
                  <span className="text-[11px]">
                    Alasan: {selectedTrx.voidReason} (oleh: {selectedTrx.voidBy})
                  </span>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5 border-b border-zinc-200 pb-2">
                {selectedTrx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-[#111111]">{it.productName}</span>
                      {it.selectedAddons && it.selectedAddons.length > 0 && (
                        <span className="text-[#F97316] font-semibold block text-[10px]">
                          + {it.selectedAddons.map((a) => a.name).join(', ')}
                        </span>
                      )}
                      <span className="text-zinc-400 block text-[10px]">
                        {it.quantity} x {formatRupiah(it.unitPrice || it.basePrice || 0)}
                      </span>
                    </div>
                    <span className="font-black text-[#111111]">{formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-1 text-zinc-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">{formatRupiah(selectedTrx.subtotal)}</span>
                </div>
                {selectedTrx.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Diskon:</span>
                    <span className="font-bold">-{formatRupiah(selectedTrx.discountAmount)}</span>
                  </div>
                )}
                {selectedTrx.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Pajak ({selectedTrx.taxPercent}%):</span>
                    <span className="font-bold">{formatRupiah(selectedTrx.taxAmount)}</span>
                  </div>
                )}
                {selectedTrx.serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Service ({selectedTrx.serviceChargePercent}%):</span>
                    <span className="font-bold">{formatRupiah(selectedTrx.serviceChargeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#F97316] pt-1 border-t border-zinc-100">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(selectedTrx.total)}</span>
                </div>
              </div>

              <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-[11px] space-y-1">
                <p>
                  Metode: <strong>{selectedTrx.paymentMethod === 'cash' ? 'Tunai' : 'QRIS'}</strong>
                </p>
                {selectedTrx.paymentMethod === 'cash' && (
                  <>
                    <p>Uang Diterima: {formatRupiah(selectedTrx.amountPaid)}</p>
                    <p>Kembalian: {formatRupiah(selectedTrx.change)}</p>
                  </>
                )}
                <p>Kasir Bertugas: {selectedTrx.cashierName}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex gap-2 shrink-0">
              {/* Void Button (Only if completed and user has admin permission) */}
              {selectedTrx.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentRole !== 'admin') {
                      onRequireAdmin();
                    } else {
                      setTrxToVoid(selectedTrx);
                    }
                  }}
                  className="px-3 py-2.5 bg-red-100 hover:bg-red-200 text-[#DC2626] font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  <Ban className="w-4 h-4" />
                  <span>Void Nota</span>
                </button>
              )}

              {/* Reprint Button */}
              <button
                type="button"
                onClick={() => {
                  onReprintReceipt(selectedTrx);
                  setSelectedTrx(null);
                }}
                className="flex-1 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Ulang Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal (Mandatory Reason) */}
      {trxToVoid && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-t-4 border-[#DC2626]">
            <div className="flex items-center gap-2 text-[#DC2626] mb-2">
              <AlertCircle className="w-6 h-6" />
              <h4 className="font-black text-base text-[#111111]">Konfirmasi Void Nota</h4>
            </div>
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Void nota <strong>#{trxToVoid.invoiceNumber}</strong> akan membatalkan transaksi dan{' '}
              <strong className="text-emerald-700">mengembalikan stok barang otomatis</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Alasan Pembatalan / Void *
              </label>
              <textarea
                rows={2}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Pelanggan salah pesan, pesanan batal..."
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#DC2626] outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTrxToVoid(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!voidReason.trim()}
                onClick={handleConfirmVoid}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
