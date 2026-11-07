import React, { useState } from 'react';
import { Search, X, Plus, AlertTriangle, Citrus, Sparkles } from 'lucide-react';
import { Product, Category, CartItem } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface MenuGridProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onOpenAddonModal: (product: Product) => void;
}

export const MenuGrid: React.FC<MenuGridProps> = ({
  products,
  categories,
  cartItems,
  onAddToCart,
  onOpenAddonModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.isActive) return false;
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCartQuantity = (productId: string) => {
    return cartItems
      .filter((c) => c.product.id === productId)
      .reduce((sum, c) => sum + c.quantity, 0);
  };

  const handleItemClick = (product: Product) => {
    if (product.stock <= 0) return;
    // Always open Addon modal if it has addons configured or is a cup beverage
    if (
      (product.availableAddonIds && product.availableAddonIds.length > 0) ||
      product.unit.toLowerCase() === 'cup'
    ) {
      onOpenAddonModal(product);
    } else {
      onAddToCart(product);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar & Category Chips */}
      <div className="sticky top-0 z-20 bg-[#FAF8F5] pt-2 pb-2 px-3 shadow-xs">
        {/* Search Input */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu jeruk, kopi, snack..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-[#111111] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-[#F97316] text-white shadow-sm'
                : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Semua Menu
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#F97316] text-white shadow-sm'
                    : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Grid: 2 columns on mobile, 3-4 on larger screens */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pb-36">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-400">
            <Citrus className="w-12 h-12 mx-auto mb-2 text-zinc-300" />
            <p className="font-bold text-sm text-zinc-600">Menu tidak ditemukan</p>
            <p className="text-xs text-zinc-400 mt-1">Coba kata kunci lain atau ubah filter kategori.</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCartQty = getCartQuantity(product.id);
            const isLowStock = product.stock <= (product.minStockAlert || 5) && product.stock > 0;
            const isOutOfStock = product.stock <= 0;
            const hasAddons =
              (product.availableAddonIds && product.availableAddonIds.length > 0) ||
              product.unit.toLowerCase() === 'cup';

            return (
              <div
                key={product.id}
                onClick={() => handleItemClick(product)}
                className={`group relative bg-white rounded-2xl border transition-all select-none overflow-hidden flex flex-col justify-between shadow-xs ${
                  isOutOfStock
                    ? 'opacity-60 cursor-not-allowed border-zinc-200'
                    : 'cursor-pointer hover:border-[#F97316] active:scale-97 border-zinc-200/80 hover:shadow-md'
                }`}
              >
                {/* Product Image */}
                <div className="relative aspect-4/3 w-full bg-orange-50 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100 text-[#F97316]">
                      <Citrus className="w-10 h-10 opacity-70" />
                    </div>
                  )}

                  {/* Low Stock or Out of Stock Badge */}
                  {isOutOfStock ? (
                    <span className="absolute top-2 left-2 bg-[#DC2626] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                      Habis
                    </span>
                  ) : isLowStock ? (
                    <span className="absolute top-2 left-2 bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Sisa {product.stock}</span>
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 bg-black/50 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                      Stok: {product.stock}
                    </span>
                  )}

                  {/* Add-on Indicator */}
                  {hasAddons && !isOutOfStock && (
                    <span className="absolute bottom-1.5 left-2 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>+Topping</span>
                    </span>
                  )}

                  {/* Quantity In Cart Badge */}
                  {inCartQty > 0 && (
                    <div className="absolute top-2 right-2 bg-[#DC2626] text-white text-xs font-black min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center shadow-md animate-bounce ring-2 ring-white">
                      {inCartQty}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-2.5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-extrabold text-[#111111] text-xs sm:text-sm line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1">
                    <span className="font-black text-sm sm:text-base text-[#F97316]">
                      {formatRupiah(product.price)}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(product);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${
                        isOutOfStock
                          ? 'bg-zinc-200 text-zinc-400'
                          : 'bg-[#F97316] text-white hover:bg-orange-600 active:scale-90 shadow-sm'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
