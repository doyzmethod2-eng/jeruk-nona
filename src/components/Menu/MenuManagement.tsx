import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Camera,
  FolderPlus,
  X,
  AlertTriangle,
  Citrus,
  Box,
  Sparkles,
} from 'lucide-react';
import { Product, Category, UserRole, AddonOption, CupPackagingType } from '../../types';
import { formatRupiah } from '../../services/escpos';
import { compressImage } from '../../utils/imageCompressor';
import { DEFAULT_ADDONS } from '../../services/storage';
import { generateMenuIdeas } from '../../services/gemini';

interface MenuManagementProps {
  products: Product[];
  categories: Category[];
  currentRole: UserRole;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onRequireAdmin: () => void;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({
  products,
  categories,
  currentRole,
  onSaveProduct,
  onDeleteProduct,
  onSaveCategory,
  onDeleteCategory,
  onRequireAdmin,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Product Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [unit, setUnit] = useState('Cup');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [cupType, setCupType] = useState<CupPackagingType>('pkg-cup-reg');
  const [availableAddonIds, setAvailableAddonIds] = useState<string[]>([
    'addon-selasih',
    'addon-yakult',
    'addon-jelly',
    'addon-nata',
  ]);

  // Delete Confirmation Modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // File input ref for camera & gallery
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // AI Menu Ideas state (Gemini API)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Minuman jeruk segar kekinian dengan topping yakult atau jelly');
  const [aiIdeasResult, setAiIdeasResult] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiIdeaError, setAiIdeaError] = useState('');

  const handleGenerateAiIdeas = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAi(true);
    setAiIdeaError('');
    setAiIdeasResult('');
    try {
      const res = await generateMenuIdeas(aiPrompt);
      setAiIdeasResult(res);
    } catch (err: any) {
      setAiIdeaError(err.message || 'Gagal membuat rekomendasi menu');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchCat = selectedCat === 'all' || p.categoryId === selectedCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setPrice(15000);
    setCostPrice(7000);
    setStock(30);
    setUnit('Cup');
    setImageUrl('');
    setIsActive(true);
    setMinStockAlert(5);
    setCupType('pkg-cup-reg');
    setAvailableAddonIds(DEFAULT_ADDONS.map((a) => a.id));
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.categoryId);
    setPrice(p.price);
    setCostPrice(p.costPrice || 0);
    setStock(p.stock);
    setUnit(p.unit || 'Cup');
    setImageUrl(p.imageUrl || '');
    setIsActive(p.isActive);
    setMinStockAlert(p.minStockAlert || 5);
    setCupType(p.cupType || (p.unit.toLowerCase() === 'cup' ? 'pkg-cup-reg' : 'none'));
    setAvailableAddonIds(p.availableAddonIds || DEFAULT_ADDONS.map((a) => a.id));
    setIsFormOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, 800, 0.8);
      setImageUrl(compressed);
    } catch {
      alert('Gagal memproses foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  const toggleAddonId = (addonId: string) => {
    setAvailableAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: name.trim(),
      categoryId: categoryId || categories[0]?.id || 'cat-general',
      price: Number(price) || 0,
      costPrice: Number(costPrice) || 0,
      stock: Number(stock) || 0,
      unit: unit.trim() || 'Pcs',
      imageUrl: imageUrl.trim(),
      isActive,
      minStockAlert: Number(minStockAlert) || 5,
      cupType,
      availableAddonIds: [...availableAddonIds],
    };

    onSaveProduct(newProd);
    setIsFormOpen(false);
  };

  const handleConfirmDelete = () => {
    if (currentRole !== 'admin') {
      onRequireAdmin();
      return;
    }
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
    };
    onSaveCategory(cat);
    setNewCatName('');
  };

  return (
    <div className="p-3 max-w-5xl mx-auto pb-32">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-black text-[#111111] flex items-center gap-2">
            <Citrus className="w-5 h-5 text-[#F97316]" />
            <span>Manajemen Menu</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Total {products.length} menu terdaftar ({products.filter((p) => p.isActive).length} aktif)
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-100 hover:bg-orange-200 text-[#F97316] border border-orange-300 rounded-xl text-xs font-black shadow-2xs active:scale-95 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ide Menu AI</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 shadow-2xs active:scale-95 transition"
          >
            <FolderPlus className="w-4 h-4 text-orange-500" />
            <span>Kategori</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#F97316] hover:bg-orange-600 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-2.5 rounded-2xl border border-zinc-200/80 mb-3 shadow-2xs space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama menu..."
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs font-medium focus:border-[#F97316] outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
              selectedCat === 'all'
                ? 'bg-[#111111] text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                selectedCat === c.id
                  ? 'bg-[#111111] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-2">
        {filtered.map((product) => {
          const categoryName = categories.find((c) => c.id === product.categoryId)?.name || 'Umum';
          const isLowStock = product.stock <= (product.minStockAlert || 5);

          return (
            <div
              key={product.id}
              className="bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-3 hover:border-zinc-300 transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-xl bg-orange-50 overflow-hidden shrink-0 border border-zinc-200">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#F97316]">
                      <Citrus className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-[#111111] truncate">
                      {product.name}
                    </h4>
                    {!product.isActive && (
                      <span className="text-[10px] bg-zinc-200 text-zinc-600 font-bold px-1.5 rounded">
                        Nonaktif
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 font-medium">
                    {categoryName} • Modal: {formatRupiah(product.costPrice)}
                  </p>

                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-black text-[#F97316]">
                      {formatRupiah(product.price)}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span
                      className={`text-[11px] font-bold ${
                        isLowStock ? 'text-[#DC2626]' : 'text-zinc-600'
                      }`}
                    >
                      Stok: {product.stock} {product.unit}
                    </span>

                    {/* Packaging Rule Tag */}
                    {product.cupType && product.cupType !== 'none' && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-semibold flex items-center gap-0.5">
                        <Box className="w-2.5 h-2.5 text-[#F97316]" />
                        <span>{product.cupType === 'pkg-cup-jumbo' ? 'Cup Jumbo' : 'Cup Reg'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(product)}
                  className="w-9 h-9 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#F97316] flex items-center justify-center transition active:scale-90"
                  title="Edit Menu"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentRole !== 'admin') {
                      onRequireAdmin();
                    } else {
                      setProductToDelete(product);
                    }
                  }}
                  className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-[#DC2626] flex items-center justify-center transition active:scale-90"
                  title="Hapus Menu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 safe-bottom">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="font-black text-base text-[#111111]">
                {editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-4 overflow-y-auto space-y-3.5 flex-1 text-xs">
              {/* Photo Input */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase mb-1">
                  Foto Menu (Kamera / Galeri HP)
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 overflow-hidden flex items-center justify-center shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Pratinjau" className="w-full h-full object-cover" />
                    ) : (
                      <Citrus className="w-8 h-8 text-orange-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="w-full py-2 px-3 bg-orange-50 hover:bg-orange-100 text-[#F97316] border border-orange-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isCompressing ? 'Mengompres...' : 'Ambil Foto / Pilih File'}</span>
                    </button>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-[11px] text-[#DC2626] font-bold block"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase mb-1">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Es Jeruk Murni Regular"
                  className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl font-medium focus:border-[#F97316] outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold text-zinc-700 uppercase mb-1">
                  Kategori
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selling & Cost Price */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-zinc-700 uppercase mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min={0}
                    step={500}
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 uppercase mb-1">
                    Harga Modal / HPP (Rp)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={500}
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none"
                  />
                </div>
              </div>

              {/* Stock, Unit & Min Stock */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                    Stok Menu
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={stock || ''}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                    Satuan
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2 py-2 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none bg-white"
                  >
                    <option value="Cup">Cup</option>
                    <option value="Porsi">Porsi</option>
                    <option value="Botol">Botol</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase mb-1">
                    Alert Tipis
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={minStockAlert || ''}
                    onChange={(e) => setMinStockAlert(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl font-bold focus:border-[#F97316] outline-none"
                  />
                </div>
              </div>

              {/* Packaging Deduction Link */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                <label className="block font-bold text-amber-900 uppercase">
                  📦 Pemakaian Kemasan Cup & Seal Otomatis
                </label>
                <select
                  value={cupType}
                  onChange={(e) => setCupType(e.target.value as CupPackagingType)}
                  className="w-full px-3 py-2 border-2 border-amber-200 rounded-xl font-bold focus:border-[#F97316] outline-none bg-white text-zinc-800"
                >
                  <option value="pkg-cup-reg">Potong Stok Cup 16oz (Regular) + Seal Roll</option>
                  <option value="pkg-cup-jumbo">Potong Stok Cup 22oz (Jumbo) + Seal Roll</option>
                  <option value="none">Tanpa Kemasan Cup (Snack / Piring)</option>
                </select>
                <p className="text-[10px] text-amber-800">
                  Saat menu ini terjual di kasir, stok kemasan cup & seal akan otomatis dipotong.
                </p>
              </div>

              {/* Addons Availability */}
              <div className="space-y-1.5">
                <label className="block font-bold text-zinc-700 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Pilihan Add-on / Topping yang Tersedia</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_ADDONS.map((addon) => {
                    const isChecked = availableAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer select-none transition ${
                          isChecked
                            ? 'border-[#F97316] bg-orange-50/70 font-bold text-zinc-900'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                        }`}
                      >
                        <span className="truncate">{addon.name}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddonId(addon.id)}
                          className="w-4 h-4 rounded accent-[#F97316] ml-1 shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Switch */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#F97316]"
                />
                <span className="font-bold text-zinc-800">
                  Menu Aktif (Tampil di Kasir)
                </span>
              </label>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 font-bold rounded-xl text-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#F97316] hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition active:scale-98"
                >
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Red Delete Confirmation Dialog */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-[#DC2626]">
            <div className="flex items-center gap-2.5 text-[#DC2626] mb-2">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-black text-base text-[#111111]">Hapus Menu?</h4>
            </div>
            <p className="text-xs text-zinc-600 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>"{productToDelete.name}"</strong>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md active:scale-95 transition"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-base text-[#111111] mb-1">
              Kelola Kategori Menu
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Tambah atau hapus kelompok menu jeruk, kopi, snack, dll.
            </p>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="flex-1 px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-semibold focus:border-[#F97316] outline-none"
              />
              <button
                type="submit"
                className="bg-[#F97316] text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 text-xs">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200"
                >
                  <span className="font-bold text-[#111111]">{c.name}</span>
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(c.id)}
                      className="text-[#DC2626] hover:bg-red-50 p-1 rounded-lg"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="mt-4 w-full bg-[#111111] text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* AI Menu Ideas Modal (Gemini API) */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 safe-bottom">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F97316] text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#111111]">
                    Ide Menu AI (Gemini)
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Rekomendasi minuman jeruk inovatif & resep add-on
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-1 pt-3 flex-1 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                  Tema / Keinginan Menu Baru:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Contoh: Menu jeruk creamy, atau jeruk soda yakult..."
                    className="flex-1 px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-semibold focus:border-[#F97316] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiIdeas}
                    disabled={isGeneratingAi || !aiPrompt.trim()}
                    className="px-3.5 py-2 bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow-md transition active:scale-95 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingAi ? 'Membuat...' : 'Generate'}</span>
                  </button>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  'Jeruk Peras Yakult Segar',
                  'Jeruk Nipis Selasih Soda',
                  'Jeruk Madu Hangat Imun',
                  'Jeruk Jelly Boba Brown Sugar',
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setAiPrompt(sug);
                    }}
                    className="px-2 py-1 bg-orange-50 hover:bg-orange-100 text-[#F97316] border border-orange-200 rounded-lg text-[10px] font-bold"
                  >
                    + {sug}
                  </button>
                ))}
              </div>

              {aiIdeaError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                  {aiIdeaError}
                </div>
              )}

              {aiIdeasResult && (
                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200 text-xs text-zinc-800 space-y-2">
                  <span className="font-extrabold text-[#F97316] text-[11px] block">
                    Saran Menu dari Gemini AI:
                  </span>
                  <div className="whitespace-pre-line leading-relaxed text-zinc-700">
                    {aiIdeasResult}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="w-full py-2.5 bg-[#111111] hover:bg-black text-white font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
