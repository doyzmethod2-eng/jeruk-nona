import React, { useState } from 'react';
import {
  ShoppingBag,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Minus,
  Clock,
  Edit3,
  Percent,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { CartItem, OrderType, StoreSettings } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface CartBottomSheetProps {
  cartItems: CartItem[];
  orderType: OrderType;
  onChangeOrderType: (type: OrderType) => void;
  tableOrQueueNumber: string;
  onChangeTableOrQueue: (val: string) => void;
  onUpdateQuantity: (productId: string, delta: number, itemIndex?: number) => void;
  onUpdateNotes: (productId: string, notes: string, itemIndex?: number) => void;
  onRemoveItem: (productId: string, itemIndex?: number) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onProceedToPayment: () => void;
  discountType: 'nominal' | 'percent';
  discountValue: number;
  onChangeDiscount: (type: 'nominal' | 'percent', val: number) => void;
  settings: StoreSettings;
}

export const CartBottomSheet: React.FC<CartBottomSheetProps> = ({
  cartItems,
  orderType,
  onChangeOrderType,
  tableOrQueueNumber,
  onChangeTableOrQueue,
  onUpdateQuantity,
  onUpdateNotes,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onProceedToPayment,
  discountType,
  discountValue,
  onChangeDiscount,
  settings,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNotesIndex, setEditingNotesIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  const getItemUnitPrice = (item: CartItem) => {
    const addonsTotal = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
    return item.product.price + addonsTotal;
  };

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Subtotal (including add-ons)
  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
    0
  );

  // Discount calculation
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = Math.round((subtotal * discountValue) / 100);
  } else {
    discountAmount = Math.min(subtotal, discountValue);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const serviceChargeAmount = Math.round((taxableAmount * (settings.serviceChargePercent || 0)) / 100);
  const taxAmount = Math.round(((taxableAmount + serviceChargeAmount) * (settings.taxPercent || 0)) / 100);
  const grandTotal = taxableAmount + serviceChargeAmount + taxAmount;

  if (cartItems.length === 0) {
    return null;
  }

  const handleOpenNoteModal = (item: CartItem, idx: number) => {
    setEditingNotesIndex(idx);
    setTempNote(item.notes || '');
  };

  const handleSaveNote = () => {
    if (editingNotesIndex !== null && cartItems[editingNotesIndex]) {
      const target = cartItems[editingNotesIndex];
      onUpdateNotes(target.product.id, tempNote.trim(), editingNotesIndex);
      setEditingNotesIndex(null);
    }
  };

  return (
    <>
      {/* Background Backdrop when expanded on mobile */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-2xs transition-opacity"
        />
      )}

      {/* Bottom Sheet Container */}
      <div
        className={`fixed left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl border-t border-zinc-200 transition-all duration-300 ease-in-out ${
          isExpanded ? 'bottom-0 max-h-[88vh] flex flex-col' : 'bottom-16'
        }`}
      >
        {/* Collapsed Bar / Drag Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-3 bg-white hover:bg-orange-50/40 rounded-t-3xl cursor-pointer border-b border-zinc-100 flex items-center justify-between select-none"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-orange-100 text-[#F97316] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-[#DC2626] text-white text-[11px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
                {totalItemsCount}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Total Tagihan ({totalItemsCount} Item)
              </p>
              <p className="text-base sm:text-lg font-black text-[#111111] leading-tight">
                {formatRupiah(grandTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isExpanded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onProceedToPayment();
                }}
                className="bg-[#F97316] hover:bg-orange-600 text-white font-black text-sm px-5 py-2.5 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <span>BAYAR</span>
                <CreditCard className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded Sheet Content */}
        {isExpanded && (
          <div className="flex flex-col flex-1 overflow-hidden safe-bottom">
            {/* Order Controls (Dine In / Take Away & Table Number) */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                {/* Dine In vs Take Away Switch */}
                <div className="flex bg-zinc-200/80 p-0.5 rounded-xl flex-1 max-w-xs">
                  <button
                    type="button"
                    onClick={() => onChangeOrderType('dine_in')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      orderType === 'dine_in'
                        ? 'bg-white text-[#111111] shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Makan Sini (Dine In)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeOrderType('take_away')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      orderType === 'take_away'
                        ? 'bg-white text-[#111111] shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Bawa Pulang
                  </button>
                </div>

                {/* Actions: Hold & Clear */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onHoldOrder}
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-xl transition"
                    title="Simpan sementara pesanan ini"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Tahan</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="flex items-center gap-1 text-xs font-bold text-[#DC2626] bg-red-100 hover:bg-red-200 px-2.5 py-1.5 rounded-xl transition"
                    title="Hapus semua item keranjang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              {/* Table / Queue Number input */}
              <div>
                <input
                  type="text"
                  value={tableOrQueueNumber}
                  onChange={(e) => onChangeTableOrQueue(e.target.value)}
                  placeholder="Nomor Meja atau Nama Pelanggan (opsional, e.g. Meja 05)..."
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-[#111111] focus:border-[#F97316] outline-none"
                />
              </div>
            </div>

            {/* Cart Items List (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[140px]">
              {cartItems.map((item, index) => {
                const unitPrice = getItemUnitPrice(item);
                const itemSubtotal = unitPrice * item.quantity;
                const hasAddons = item.selectedAddons && item.selectedAddons.length > 0;

                return (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-[#111111] truncate">
                        {item.product.name}
                      </h4>

                      {/* Addon details badge */}
                      {hasAddons && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {item.selectedAddons!.map((addon) => (
                            <span
                              key={addon.id}
                              className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-[#F97316]" />
                              <span>{addon.name} (+{formatRupiah(addon.price)})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs font-black text-[#F97316] mt-0.5">
                        {formatRupiah(unitPrice)} <span className="text-zinc-400 font-normal">/ cup</span>
                      </p>

                      {/* Note badge or Add note button */}
                      {item.notes ? (
                        <button
                          onClick={() => handleOpenNoteModal(item, index)}
                          className="mt-1 text-[11px] text-zinc-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-orange-100 transition truncate max-w-full"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-[#F97316] shrink-0" />
                          <span className="truncate italic">"{item.notes}"</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenNoteModal(item, index)}
                          className="mt-1 text-[10px] text-zinc-400 hover:text-[#F97316] flex items-center gap-0.5"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>+ Catatan</span>
                        </button>
                      )}
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, -1, index)}
                        className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:scale-90 flex items-center justify-center text-zinc-700 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-black text-sm text-[#111111]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.product.id, 1, index)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-8 h-8 rounded-xl bg-orange-100 hover:bg-orange-200 active:scale-90 flex items-center justify-center text-[#F97316] transition disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.product.id, index)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 active:scale-90 flex items-center justify-center text-[#DC2626] transition ml-1"
                        title="Hapus Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations & Discount Section */}
            <div className="p-3 bg-zinc-50 border-t border-zinc-200 space-y-1.5 shrink-0 text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span>Subtotal ({totalItemsCount} item):</span>
                <span className="font-bold text-[#111111]">{formatRupiah(subtotal)}</span>
              </div>

              {/* Discount Row */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(true)}
                  className="text-xs text-[#F97316] font-bold hover:underline flex items-center gap-1"
                >
                  <Percent className="w-3 h-3" />
                  <span>
                    {discountAmount > 0
                      ? `Diskon (${discountType === 'percent' ? `${discountValue}%` : 'Nominal'})`
                      : '+ Tambah Diskon'}
                  </span>
                </button>
                <span className="font-bold text-red-600">
                  {discountAmount > 0 ? `-${formatRupiah(discountAmount)}` : 'Rp 0'}
                </span>
              </div>

              {/* Service charge if active */}
              {settings.serviceChargePercent > 0 && (
                <div className="flex justify-between items-center text-zinc-600">
                  <span>Service Charge ({settings.serviceChargePercent}%):</span>
                  <span className="font-bold text-[#111111]">{formatRupiah(serviceChargeAmount)}</span>
                </div>
              )}

              {/* Tax if active */}
              {settings.taxPercent > 0 && (
                <div className="flex justify-between items-center text-zinc-600">
                  <span>Pajak Resto ({settings.taxPercent}%):</span>
                  <span className="font-bold text-[#111111]">{formatRupiah(taxAmount)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-base font-black text-[#111111]">
                <span>Total Tagihan:</span>
                <span className="text-[#F97316] text-lg">{formatRupiah(grandTotal)}</span>
              </div>

              {/* Big Checkout Button */}
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onProceedToPayment();
                }}
                className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-center gap-2 text-base mt-2"
              >
                <span>LANJUT KE PEMBAYARAN</span>
                <CreditCard className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Item Note Modal */}
      {editingNotesIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl">
            <h4 className="font-black text-sm text-[#111111] mb-2">
              Tambah Catatan Pesanan
            </h4>
            <textarea
              rows={3}
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Contoh: Kurang manis, es batu dipisah, jangan pakai sedotan..."
              className="w-full p-3 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#F97316] outline-none"
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setEditingNotesIndex(null)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 font-bold py-2.5 rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="flex-1 bg-[#F97316] hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Configuration Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl">
            <h4 className="font-black text-sm text-[#111111] mb-3">
              Atur Diskon Transaksi
            </h4>

            <div className="flex bg-zinc-100 p-1 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => onChangeDiscount('percent', discountValue || 10)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  discountType === 'percent' ? 'bg-[#F97316] text-white shadow-xs' : 'text-zinc-600'
                }`}
              >
                Persen (%)
              </button>
              <button
                type="button"
                onClick={() => onChangeDiscount('nominal', discountValue || 5000)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  discountType === 'nominal' ? 'bg-[#F97316] text-white shadow-xs' : 'text-zinc-600'
                }`}
              >
                Nominal (Rp)
              </button>
            </div>

            <div className="relative mb-3">
              <span className="absolute left-3 top-2.5 font-bold text-zinc-400 text-xs">
                {discountType === 'percent' ? '%' : 'Rp'}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={discountType === 'percent' ? 100 : subtotal}
                value={discountValue || ''}
                onChange={(e) => onChangeDiscount(discountType, Number(e.target.value))}
                placeholder={discountType === 'percent' ? 'Contoh: 10' : 'Contoh: 5000'}
                className="w-full pl-9 pr-3 py-2 border-2 border-zinc-200 rounded-xl font-bold text-sm focus:border-[#F97316] outline-none"
              />
            </div>

            {discountType === 'percent' && (
              <div className="flex gap-2 mb-4">
                {[5, 10, 15, 20].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChangeDiscount('percent', p)}
                    className="flex-1 py-1 bg-orange-50 hover:bg-orange-100 text-[#F97316] border border-orange-200 text-xs font-bold rounded-lg"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeDiscount('nominal', 0);
                  setShowDiscountModal(false);
                }}
                className="flex-1 bg-red-50 text-[#DC2626] font-bold py-2 rounded-xl text-xs"
              >
                Hapus Diskon
              </button>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 bg-[#111111] text-white font-bold py-2 rounded-xl text-xs"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
