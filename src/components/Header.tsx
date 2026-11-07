import React, { useState, useEffect } from 'react';
import {
  Citrus,
  Bluetooth,
  User,
  Clock,
  Download,
  ShieldCheck,
  ChefHat,
} from 'lucide-react';
import { UserRole, Shift, StoreSettings } from '../types';
import { PrinterService } from '../services/printer';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentRole: UserRole;
  onOpenRoleModal: () => void;
  currentShift: Shift | null;
  onOpenShiftModal: () => void;
  heldOrdersCount: number;
  onOpenHeldOrders: () => void;
  activeQueueCount: number;
  onOpenQueue: () => void;
  settings: StoreSettings;
  onOpenPrinterSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onOpenRoleModal,
  currentShift,
  onOpenShiftModal,
  heldOrdersCount,
  onOpenHeldOrders,
  activeQueueCount,
  onOpenQueue,
  settings,
  onOpenPrinterSettings,
}) => {
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const { isInstallable, install, isIOS } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const unsub = PrinterService.subscribe((connected, name) => {
      setPrinterConnected(connected);
      setPrinterName(name);
    });
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#F97316] text-white shadow-md safe-top">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <Citrus className="w-6 h-6 text-white" />
          </div>
          <div className="truncate">
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate drop-shadow-xs">
              {settings.storeName || 'JERUK NONA'}
            </h1>
            <p className="text-[11px] text-orange-100 font-medium truncate flex items-center gap-1">
              <span>{settings.tagline || 'Segar Alami'}</span>
              <span className="opacity-60">•</span>
              <span className="capitalize">{settings.paperWidth}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions (Right Header) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Order Queue (Antrian Dapur/Bar) Button */}
          <button
            onClick={onOpenQueue}
            className={`relative flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition ${
              activeQueueCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-black/25 text-orange-100 hover:bg-black/35'
            }`}
            title="Lihat Antrian Pesanan Dapur & Barista"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Antrian</span>
            {activeQueueCount > 0 && (
              <span className="bg-white text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                {activeQueueCount}
              </span>
            )}
          </button>

          {/* Held Orders Badge */}
          {heldOrdersCount > 0 && (
            <button
              onClick={onOpenHeldOrders}
              className="relative flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-sm active:scale-95 transition"
              title="Pesanan Tertahan"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tahan</span>
              <span className="bg-white text-red-600 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {heldOrdersCount}
              </span>
            </button>
          )}

          {/* Bluetooth Status Chip */}
          <button
            onClick={onOpenPrinterSettings}
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-xl transition active:scale-95 ${
              printerConnected
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-black/25 text-orange-100 hover:bg-black/35'
            }`}
            title={printerConnected ? `Printer: ${printerName}` : 'Klik untuk hubungkan printer'}
          >
            <Bluetooth className={`w-3.5 h-3.5 ${printerConnected ? 'animate-pulse' : 'opacity-70'}`} />
            <span className={`w-2 h-2 rounded-full ${printerConnected ? 'bg-emerald-300' : 'bg-red-400'}`} />
          </button>

          {/* Shift Button */}
          <button
            onClick={onOpenShiftModal}
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-xl transition active:scale-95 ${
              currentShift
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
            }`}
            title="Kelola Shift Kasir"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {currentShift ? 'Shift' : 'Buka Shift'}
            </span>
          </button>

          {/* User Profile / Role Button */}
          <button
            onClick={onOpenRoleModal}
            className="flex items-center gap-1.5 bg-[#111111] hover:bg-black text-white text-xs font-bold p-1 pr-2.5 rounded-xl shadow-sm active:scale-95 transition"
            title="Profil Pengguna & Ganti Peran"
          >
            {settings.userProfileAvatar ? (
              <img
                src={settings.userProfileAvatar}
                alt="Profile"
                className="w-6 h-6 rounded-lg object-cover border border-orange-400 shrink-0"
              />
            ) : currentRole === 'admin' ? (
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-orange-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-orange-300">
                <User className="w-4 h-4" />
              </div>
            )}
            <span className="uppercase text-[11px] tracking-wide max-w-[65px] truncate">
              {settings.userProfileName ? settings.userProfileName.split(' ')[0] : currentRole}
            </span>
          </button>
        </div>
      </div>

      {/* iOS PWA Install Instruction Dialog */}
      {showIOSHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white text-[#111111] rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 text-[#F97316] font-bold text-base mb-2">
              <Citrus className="w-6 h-6" />
              <span>Install di iPhone / iPad</span>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              Jadikan aplikasi kasir fullscreen tanpa navigasi browser:
            </p>
            <ol className="text-xs text-zinc-700 space-y-2 mb-4 bg-orange-50 p-3 rounded-2xl border border-orange-200">
              <li>1. Ketuk tombol <strong>Share</strong> (ikon kotak panah ke atas) di Safari.</li>
              <li>2. Gulir ke bawah lalu ketuk <strong>Add to Home Screen</strong>.</li>
              <li>3. Tekan <strong>Tambah (Add)</strong> di pojok kanan atas.</li>
            </ol>
            <button
              onClick={() => setShowIOSHint(false)}
              className="w-full bg-[#F97316] text-white font-bold py-2.5 rounded-xl active:scale-98 transition"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
