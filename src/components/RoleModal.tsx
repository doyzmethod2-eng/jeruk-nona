import React, { useState } from 'react';
import { ShieldCheck, User, Lock, X, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  adminPin: string;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
  adminPin,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  if (!isOpen) return null;

  const handleSwitchToKasir = () => {
    onSelectRole('kasir');
    onClose();
  };

  const handleStartAdminAuth = () => {
    setIsVerifyingAdmin(true);
    setPinInput('');
    setErrorMsg('');
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === adminPin) {
      onSelectRole('admin');
      setIsVerifyingAdmin(false);
      onClose();
    } else {
      setErrorMsg('PIN Admin salah. Default: 1234');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-[#111111] mb-1">
          {isVerifyingAdmin ? 'Masukkan PIN Admin' : 'Pilih Peran Pengguna'}
        </h3>
        <p className="text-xs text-zinc-500 mb-5">
          {isVerifyingAdmin
            ? 'Akses Admin diperlukan untuk melihat Laporan, Ubah Menu & Setting.'
            : 'Peran saat ini menentukan akses menu dan laporan toko.'}
        </p>

        {isVerifyingAdmin ? (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold ${
                      pinInput.length > idx
                        ? 'border-[#F97316] bg-orange-50 text-[#F97316]'
                        : 'border-zinc-300 bg-zinc-50'
                    }`}
                  >
                    {pinInput.length > idx ? '●' : ''}
                  </div>
                ))}
              </div>

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Ketik PIN Admin..."
                className="w-full text-center text-lg tracking-widest px-4 py-3 border-2 border-zinc-200 rounded-xl focus:border-[#F97316] outline-none"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsVerifyingAdmin(false)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#F97316] hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition active:scale-98"
              >
                Verifikasi
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {/* Kasir Option */}
            <button
              onClick={handleSwitchToKasir}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition text-left active:scale-98 ${
                currentRole === 'kasir'
                  ? 'border-[#F97316] bg-orange-50/70 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[#111111]">Kasir (Staff)</h4>
                  <p className="text-xs text-zinc-500">
                    Akses Transaksi Kasir, Menu, dan Stok Harian
                  </p>
                </div>
              </div>
              {currentRole === 'kasir' && (
                <span className="text-xs bg-[#F97316] text-white px-2 py-0.5 rounded-full font-bold">
                  Aktif
                </span>
              )}
            </button>

            {/* Admin Option */}
            <button
              onClick={currentRole === 'admin' ? onClose : handleStartAdminAuth}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition text-left active:scale-98 ${
                currentRole === 'admin'
                  ? 'border-[#111111] bg-zinc-100 shadow-sm'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-bold text-[#111111]">Admin (Pemilik Toko)</h4>
                  <p className="text-xs text-zinc-500">
                    Akses Penuh: Laporan Laba/Rugi, Setting, Void & Menu
                  </p>
                </div>
              </div>
              {currentRole === 'admin' ? (
                <span className="text-xs bg-[#111111] text-white px-2 py-0.5 rounded-full font-bold">
                  Aktif
                </span>
              ) : (
                <Lock className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
