import React, { useState } from 'react';
import { X, Plus, Minus, Check, Citrus, Sparkles } from 'lucide-react';
import { Product, AddonOption, SelectedAddon, CartItem } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface AddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  addons: AddonOption[];
  onConfirmAddToCart: (cartItem: CartItem) => void;
}

export const AddonModal: React.FC<AddonModalProps> = ({
  isOpen,
  onClose,
  product,
  addons,
  onConfirmAddToCart,
}) => {
  if (!isOpen || !product) return null;

  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [note, setNote] = useState('');

  // Filter available addons for this product
  const availableAddons = addons.filter((a) => {
    if (!product.availableAddonIds || product.availableAddonIds.length === 0) {
      // Default allow beverage addons for drinks, or none for snacks
      return product.unit.toLowerCase() === 'cup';
    }
    return product.availableAddonIds.includes(a.id);
  });

  const toggleAddon = (addon: AddonOption) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, { id: addon.id, name: addon.name, price: addon.price }];
      }
    });
  };

  const addonsTotalPerUnit = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = product.price + addonsTotalPerUnit;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onConfirmAddToCart({
      product,
      quantity,
      selectedAddons: [...selectedAddons],
      notes: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 safe-bottom">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="relative p-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-8">
            <div className="w-12 h-12 rounded-xl bg-orange-100 shrink-0 overflow-hidden border border-orange-200">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#F97316]">
                  <Citrus className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-sm text-[#111111] truncate">{product.name}</h3>
              <p className="text-xs font-black text-[#F97316]">{formatRupiah(product.price)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:text-black flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Add-on selection */}
          {availableAddons.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-zinc-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Pilihan Topping & Add-on</span>
                </span>
                <span className="text-[11px] text-zinc-400">Bisa pilih lebih dari satu</span>
              </div>

              <div className="space-y-2">
                {availableAddons.map((addon) => {
                  const isSelected = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <div
                      key={addon.id}
                      onClick={() => toggleAddon(addon)}
                      className={`p-3 rounded-2xl border cursor-pointer transition select-none flex items-center justify-between ${
                        isSelected
                          ? 'border-[#F97316] bg-orange-50/70 text-[#111111] shadow-xs'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                            isSelected ? 'bg-[#F97316] text-white' : 'border border-zinc-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="font-bold text-xs">{addon.name}</span>
                      </div>

                      <span className="font-black text-xs text-[#F97316]">
                        +{formatRupiah(addon.price)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 text-[11px] text-zinc-600">
              Menu ini tidak memerlukan add-on tambahan. Anda dapat menambahkan catatan rasa di bawah.
            </div>
          )}

          {/* Special Notes */}
          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">
              Catatan Pesanan (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Kurang manis, es sedikit, gelas terpisah..."
              className="w-full px-3.5 py-2.5 border-2 border-zinc-200 rounded-xl text-xs font-medium focus:border-[#F97316] outline-none"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
            <span className="font-bold text-zinc-700 text-xs uppercase">Jumlah Porsi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-700 active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-black text-base text-[#111111]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
                className="w-9 h-9 rounded-xl bg-[#F97316] hover:bg-orange-600 text-white flex items-center justify-center active:scale-95 disabled:opacity-40"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Confirm Button */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full min-h-[50px] bg-[#F97316] hover:bg-orange-600 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-between px-5"
          >
            <span>MASUKKAN KERANJANG</span>
            <span className="text-base">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
