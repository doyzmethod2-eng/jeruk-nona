import React, { useState } from 'react';
import {
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  History,
  Search,
  Plus,
  Minus,
  X,
  Citrus,
  Box,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, StockMutation, PackagingItem, UserRole } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface StockManagementProps {
  products: Product[];
  packaging: PackagingItem[];
  mutations: StockMutation[];
  onAddProductMutation: (
    productId: string,
    type: 'in' | 'out_damaged' | 'out_expired' | 'out_manual',
    quantity: number,
    note: string
  ) => void;
  onAddPackagingMutation: (
    packagingId: string,
    type: 'in' | 'out_damaged' | 'out_expired' | 'out_manual',
    quantity: number,
    note: string
  ) => void;
  currentRole: UserRole;
}

export const StockManagement: React.FC<StockManagementProps> = ({
  products,
  packaging,
  mutations,
  onAddProductMutation,
  onAddPackagingMutation,
  currentRole,
}) => {
  const [activeTab, setActiveTab] = useState<'packaging' | 'products' | 'history'>('packaging');
  const [search, setSearch] = useState('');

  // Stock Adjustment Modal
  const [modalMode, setModalMode] = useState<'in' | 'out' | null>(null);
  const [targetKind, setTargetKind] = useState<'product' | 'packaging'>('packaging');
  const [selectedId, setSelectedId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [outReason, setOutReason] = useState<'out_damaged' | 'out_expired' | 'out_manual'>('out_damaged');
  const [note, setNote] = useState('');

  // Low stock checks
  const lowPackaging = packaging.filter((pkg) => pkg.stock <= pkg.minStockAlert);
  const lowProducts = products.filter((p) => p.stock <= (p.minStockAlert || 5));

  const totalPackagingValuation = packaging.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
  const totalProductsValuation = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);

  // Filters
  const filteredPackaging = packaging.filter((pkg) =>
    pkg.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMutations = mutations.filter((m) =>
    m.targetName.toLowerCase().includes(search.toLowerCase()) ||
    (m.note || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenRestockPackaging = (pkg?: PackagingItem) => {
    setTargetKind('packaging');
    setSelectedId(pkg ? pkg.id : packaging[0]?.id || '');
    setQuantity(pkg?.category === 'seal' ? 1200 : 250);
    setNote('Barang masuk dari supplier/distributor');
    setModalMode('in');
  };

  const handleOpenRestockProduct = (prod?: Product) => {
    setTargetKind('product');
    setSelectedId(prod ? prod.id : products[0]?.id || '');
    setQuantity(20);
    setNote('Produksi / Restock harian');
    setModalMode('in');
  };

  const handleOpenOut = (item: PackagingItem | Product, kind: 'packaging' | 'product') => {
    setTargetKind(kind);
    setSelectedId(item.id);
    setQuantity(kind === 'packaging' ? 5 : 1);
    setOutReason('out_damaged');
    setNote('');
    setModalMode('out');
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || quantity <= 0) return;

    if (targetKind === 'packaging') {
      const type = modalMode === 'in' ? 'in' : outReason;
      onAddPackagingMutation(selectedId, type, quantity, note.trim() || 'Penyesuaian stok kemasan');
    } else {
      const type = modalMode === 'in' ? 'in' : outReason;
      onAddProductMutation(selectedId, type, quantity, note.trim() || 'Penyesuaian stok menu');
    }

    setModalMode(null);
  };

  return (
    <div className="p-3 max-w-5xl mx-auto pb-32">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block truncate">
            Stok Kemasan
          </span>
          <span className="text-base sm:text-lg font-black text-[#111111]">
            {packaging.length} Jenis
          </span>
          {lowPackaging.length > 0 && (
            <span className="text-[10px] text-[#DC2626] font-bold block">
              {lowPackaging.length} jenis menipis
            </span>
          )}
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block truncate">
            Menu Produk
          </span>
          <span className="text-base sm:text-lg font-black text-[#111111]">
            {products.length} SKU
          </span>
          {lowProducts.length > 0 && (
            <span className="text-[10px] text-[#DC2626] font-bold block">
              {lowProducts.length} menu menipis
            </span>
          )}
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide block truncate">
            Nilai Aset Stok
          </span>
          <span className="text-xs sm:text-sm font-black text-[#F97316] truncate block mt-0.5">
            {formatRupiah(totalPackagingValuation + totalProductsValuation)}
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-zinc-200/80 p-1 rounded-2xl mb-3">
        <button
          onClick={() => setActiveTab('packaging')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'packaging' ? 'bg-[#111111] text-white shadow-xs' : 'text-zinc-600'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-orange-400" />
          <span>Bahan & Kemasan Kering ({packaging.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'products' ? 'bg-[#111111] text-white shadow-xs' : 'text-zinc-600'
          }`}
        >
          <Citrus className="w-3.5 h-3.5 text-orange-400" />
          <span>Produk Menu ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-[#111111] text-white shadow-xs' : 'text-zinc-600'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Mutasi ({mutations.length})</span>
        </button>
      </div>

      {/* Search Bar & Quick Restock Button */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'packaging'
                ? 'Cari cup, seal roll, sedotan...'
                : activeTab === 'products'
                ? 'Cari menu jeruk, kopi, snack...'
                : 'Cari riwayat mutasi stok...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:border-[#F97316] outline-none shadow-2xs"
          />
        </div>

        {activeTab === 'packaging' && (
          <button
            type="button"
            onClick={() => handleOpenRestockPackaging()}
            className="py-2.5 px-3 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Masuk Kemasan</span>
          </button>
        )}

        {activeTab === 'products' && (
          <button
            type="button"
            onClick={() => handleOpenRestockProduct()}
            className="py-2.5 px-3 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Masuk Menu</span>
          </button>
        )}
      </div>

      {/* TAB 1: KEMASAN & BARANG KERING */}
      {activeTab === 'packaging' && (
        <div className="space-y-2.5">
          <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl text-xs text-orange-950 flex items-start gap-2">
            <Box className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
            <p>
              <strong>Otomatisasi Stok Kemasan:</strong> Setiap transaksi cup terjual di kasir akan <strong>otomatis memotong stok Cup Plastik dan Plastik Seal Roll</strong> secara real-time. Jika transaksi di-void, stok kemasan akan dikembalikan otomatis.
            </p>
          </div>

          {filteredPackaging.map((pkg) => {
            const isLow = pkg.stock <= pkg.minStockAlert;
            return (
              <div
                key={pkg.id}
                className={`p-3.5 rounded-2xl border transition bg-white shadow-2xs flex items-center justify-between gap-3 ${
                  isLow ? 'border-red-300 ring-1 ring-red-100' : 'border-zinc-200/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      pkg.category === 'cup'
                        ? 'bg-amber-100 text-amber-700'
                        : pkg.category === 'seal'
                        ? 'bg-orange-100 text-[#F97316]'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <Box className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-[#111111] truncate">{pkg.name}</h4>
                      {isLow && (
                        <span className="text-[10px] bg-red-100 text-[#DC2626] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Tipis</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {pkg.description || 'Kemasan kering'} • Modal: {formatRupiah(pkg.costPrice)}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          isLow ? 'bg-red-100 text-[#DC2626]' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Sisa: {pkg.stock} {pkg.unit}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        (Alert: &le; {pkg.minStockAlert})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick In / Out Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenRestockPackaging(pkg)}
                    className="w-8 h-8 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F97316] flex items-center justify-center transition active:scale-90"
                    title="Restock Kemasan Ini"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOut(pkg, 'packaging')}
                    className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition active:scale-90"
                    title="Catat Rusak / Bocor"
                  >
                    <Minus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PRODUK MENU */}
      {activeTab === 'products' && (
        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const isLow = p.stock <= (p.minStockAlert || 5);
            return (
              <div
                key={p.id}
                className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 overflow-hidden shrink-0 border border-zinc-200">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-orange-400">
                        <Citrus className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-xs sm:text-sm text-[#111111] truncate">{p.name}</h4>
                    <p className="text-[11px] text-zinc-400">
                      Modal: {formatRupiah(p.costPrice)} • Jual: {formatRupiah(p.price)}
                    </p>

                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          isLow ? 'bg-red-100 text-[#DC2626]' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                      {isLow && (
                        <span className="text-[10px] text-[#DC2626] font-bold flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Menipis</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenRestockProduct(p)}
                    className="w-8 h-8 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F97316] flex items-center justify-center transition active:scale-90"
                    title="Restock Menu"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenOut(p, 'product')}
                    className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center transition active:scale-90"
                    title="Catat Keluar / Rusak"
                  >
                    <Minus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: RIWAYAT MUTASI STOK */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {filteredMutations.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200">
              <History className="w-8 h-8 mx-auto mb-1 text-zinc-300" />
              <p className="text-xs font-bold text-zinc-600">Belum ada riwayat mutasi stok</p>
            </div>
          ) : (
            filteredMutations.map((m) => {
              const isPositive = m.quantity > 0;
              const dateStr = new Date(m.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isPositive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-[#DC2626]'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                      </span>
                      <h4 className="font-extrabold text-[#111111] truncate">{m.targetName}</h4>
                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold uppercase">
                        {m.itemKind === 'packaging' ? 'Kemasan' : 'Menu'}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 mt-1 pl-8">
                      {m.note || 'Mutasi sistem'} • Oleh: <strong>{m.createdBy}</strong> • {dateStr}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black ${
                        isPositive ? 'text-emerald-600' : 'text-[#DC2626]'
                      }`}
                    >
                      {isPositive ? `+${m.quantity}` : `${m.quantity}`}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {m.previousStock} &rarr; {m.newStock}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Adjustment / Restock Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 safe-bottom">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setModalMode(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-base text-[#111111] mb-1">
              {modalMode === 'in'
                ? `Barang Masuk (${targetKind === 'packaging' ? 'Kemasan' : 'Menu'})`
                : `Barang Keluar (${targetKind === 'packaging' ? 'Kemasan' : 'Menu'})`}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {modalMode === 'in'
                ? 'Tambah stok barang dari pembelian supplier/distributor.'
                : 'Kurangi stok karena barang rusak, kadaluarsa, atau penyesuaian.'}
            </p>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Pilih Item
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none bg-white"
                >
                  {targetKind === 'packaging'
                    ? packaging.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} (Stok: {pkg.stock} {pkg.unit})
                        </option>
                      ))
                    : products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} (Stok: {prod.stock} {prod.unit})
                        </option>
                      ))}
                </select>
              </div>

              {modalMode === 'out' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Alasan Keluar
                  </label>
                  <select
                    value={outReason}
                    onChange={(e) => setOutReason(e.target.value as any)}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none bg-white"
                  >
                    <option value="out_damaged">Barang Rusak / Pecah / Bocor</option>
                    <option value="out_expired">Kadaluarsa (Expired)</option>
                    <option value="out_manual">Penyesuaian Manual / Selisih</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Jumlah {modalMode === 'in' ? 'Barang Masuk' : 'Dikurangi'}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-base font-black focus:border-[#F97316] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Keterangan / Supplier
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Beli dari Pabrik Plastik Bogor, cup pecah, dll..."
                  className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#F97316] outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 font-bold rounded-xl text-xs text-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-98 ${
                    modalMode === 'in'
                      ? 'bg-[#F97316] hover:bg-orange-600'
                      : 'bg-[#DC2626] hover:bg-red-700'
                  }`}
                >
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
