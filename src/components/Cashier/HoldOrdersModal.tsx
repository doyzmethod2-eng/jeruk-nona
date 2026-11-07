import React from 'react';
import { Clock, Play, Trash2, X, AlertCircle } from 'lucide-react';
import { HeldOrder } from '../../types';
import { formatRupiah } from '../../services/escpos';

interface HoldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (order: HeldOrder) => void;
  onDeleteHeldOrder: (orderId: string) => void;
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onResumeOrder,
  onDeleteHeldOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-600 mb-1">
          <Clock className="w-6 h-6" />
          <h3 className="text-lg font-black text-[#111111]">Daftar Pesanan Tertahan</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Pilih pesanan yang ingin dilanjutkan untuk pembayaran kasir.
        </p>

        {heldOrders.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-zinc-300 mb-2" />
            <p className="font-bold text-sm text-zinc-600">Tidak ada pesanan tertahan</p>
            <p className="text-xs text-zinc-400 mt-1">
              Gunakan tombol "Tahan" di keranjang jika pelanggan ingin memesan menu tambahan nanti.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {heldOrders.map((order) => {
              const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);
              const totalAmount = order.items.reduce((s, it) => s + it.product.price * it.quantity, 0);
              const timeStr = new Date(order.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 space-y-2 hover:border-amber-400 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-black text-sm text-[#111111]">
                        {order.name || order.tableOrQueueNumber || 'Pesanan Tanpa Nama'}
                      </span>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        Disimpan jam {timeStr} • {order.orderType === 'dine_in' ? 'Makan di Tempat' : 'Bawa Pulang'}
                      </p>
                    </div>
                    <span className="font-black text-sm text-[#F97316]">
                      {formatRupiah(totalAmount)}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-600 line-clamp-2">
                    {order.items.map((it) => `${it.quantity}x ${it.product.name}`).join(', ')}
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-amber-200/50">
                    <button
                      type="button"
                      onClick={() => onDeleteHeldOrder(order.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#DC2626] bg-red-100 hover:bg-red-200 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onResumeOrder(order);
                        onClose();
                      }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-[#F97316] hover:bg-orange-600 shadow-sm transition flex items-center justify-center gap-1.5 active:scale-98"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Lanjutkan Pesanan ({totalItems} Item)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full bg-zinc-100 hover:bg-zinc-200 font-bold py-2.5 rounded-xl text-xs text-zinc-700"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
