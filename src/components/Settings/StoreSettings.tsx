import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Store,
  Printer,
  QrCode,
  Volume2,
  Vibrate,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Camera,
  CheckCircle,
  AlertTriangle,
  Bluetooth,
  User,
  Trash2,
  Citrus,
  Sparkles,
  Bot,
  Send,
} from 'lucide-react';
import { StoreSettings as StoreSettingsType, UserRole } from '../../types';
import { PrinterService } from '../../services/printer';
import { generateTestReceipt } from '../../services/escpos';
import { compressImage } from '../../utils/imageCompressor';
import { StorageService } from '../../services/storage';
import { checkAiStatus, askAiConsultant, AiStatus } from '../../services/gemini';

interface StoreSettingsProps {
  settings: StoreSettingsType;
  onSaveSettings: (settings: StoreSettingsType) => void;
  currentRole: UserRole;
  onRequireAdmin: () => void;
  onRefreshData: () => void;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  settings,
  onSaveSettings,
  currentRole,
  onRequireAdmin,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<StoreSettingsType>(settings);
  const [saveAlert, setSaveAlert] = useState(false);

  // Bluetooth state
  const [isBtConnected, setIsBtConnected] = useState(false);
  const [btDeviceName, setBtDeviceName] = useState('');
  const [btStatusMsg, setBtStatusMsg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // File input refs
  const profileAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);

  const qrisInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingQris, setIsCompressingQris] = useState(false);

  const restoreFileRef = useRef<HTMLInputElement>(null);

  // Gemini AI state
  const [aiStatus, setAiStatus] = useState<AiStatus>({ connected: false });
  const [aiTestPrompt, setAiTestPrompt] = useState('Berikan 1 tips singkat agar kasir Jeruk Nona ramah dan cepat layani pembeli.');
  const [aiTestReply, setAiTestReply] = useState('');
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiTestError, setAiTestError] = useState('');

  useEffect(() => {
    checkAiStatus().then((status) => {
      setAiStatus(status);
    });
  }, []);

  const handleTestAi = async () => {
    if (!aiTestPrompt.trim()) return;
    setIsAskingAi(true);
    setAiTestError('');
    setAiTestReply('');
    try {
      const reply = await askAiConsultant(aiTestPrompt, {
        storeName: formData.storeName,
        tagline: formData.tagline,
      });
      setAiTestReply(reply);
    } catch (err: any) {
      setAiTestError(err.message || 'Gagal menghubungi Gemini API');
    } finally {
      setIsAskingAi(false);
    }
  };

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  useEffect(() => {
    const unsub = PrinterService.subscribe((conn, name) => {
      setIsBtConnected(conn);
      setBtDeviceName(name);
    });
    return unsub;
  }, []);

  const handleChange = (field: keyof StoreSettingsType, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentRole !== 'admin') {
      onRequireAdmin();
      return;
    }
    onSaveSettings(formData);
    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 2500);
  };

  // Avatar upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingAvatar(true);
      const compressed = await compressImage(file, 400, 0.85);
      handleChange('userProfileAvatar', compressed);
    } catch {
      alert('Gagal memproses foto profil.');
    } finally {
      setIsCompressingAvatar(false);
    }
  };

  // Connect Bluetooth Printer
  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setBtStatusMsg('Mencari printer Bluetooth sekitar...');
    const res = await PrinterService.connectBluetooth(
      formData.bluetoothServiceUuid,
      formData.bluetoothCharacteristicUuid
    );
    setIsConnecting(false);
    setBtStatusMsg(res.message);
    if (res.success) {
      handleChange('lastPrinterName', res.deviceName);
    }
  };

  const handleDisconnectBluetooth = async () => {
    await PrinterService.disconnectBluetooth();
    setBtStatusMsg('Printer Bluetooth diputuskan.');
  };

  // Test Print
  const handleTestPrint = async () => {
    const testReceipt = generateTestReceipt(formData);
    if (!PrinterService.isConnected()) {
      alert('Hubungkan printer Bluetooth terlebih dahulu sebelum Tes Print!');
      return;
    }
    setBtStatusMsg('Mengirim struk tes ke printer...');
    const res = await PrinterService.sendToBluetooth(testReceipt.escposBytes);
    if (res.success) {
      setBtStatusMsg('Tes cetak berhasil dikirim ke printer!');
    } else {
      setBtStatusMsg(res.message || 'Gagal mengirim tes cetak.');
    }
  };

  // QRIS upload
  const handleQrisFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingQris(true);
      const compressed = await compressImage(file, 800, 0.85);
      handleChange('qrisImageUrl', compressed);
    } catch {
      alert('Gagal memproses gambar QRIS.');
    } finally {
      setIsCompressingQris(false);
    }
  };

  // Backup JSON
  const handleExportBackup = async () => {
    const jsonStr = await StorageService.exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-jeruk-nona-pos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore JSON
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const ok = await StorageService.restoreBackupData(text);
        if (ok) {
          alert('Data berhasil dipulihkan!');
          onRefreshData();
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch {
        alert('Gagal membaca file cadangan.');
      }
    };
    reader.readAsText(file);
  };

  // Clean Production Reset (Wipe all transactions, clean state for publish)
  const handleCleanProductionReset = async () => {
    const confirmed = window.confirm(
      'PERINGATAN SIAP PUBLISH:\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA TRANSAKSI & RIWAYAT?\n\nAplikasi akan di-reset menjadi BERSIH (0 transaksi, 0 antrian, shift bersih) dengan stok menu dan kemasan cup/seal awal yang segar siap buka toko!'
    );
    if (confirmed) {
      await StorageService.resetToCleanProduction();
      alert('Semua data riwayat berhasil dibersihkan! Aplikasi kini 100% BERSIH & SIAP PUBLISH untuk buka toko.');
      onRefreshData();
    }
  };

  return (
    <div className="p-3 max-w-4xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-black text-[#111111] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#F97316]" />
            <span>Pengaturan Toko & Printer</span>
          </h2>
          <p className="text-xs text-zinc-500">
            Foto profil kasir, printer thermal, kemasan cup, pajak, dan publish.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
        >
          Simpan Setting
        </button>
      </div>

      {saveAlert && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan berhasil disimpan!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 0: Foto Profil Kasir / Pengguna */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <User className="w-4 h-4 text-[#F97316]" />
            <span>Foto Profil Pengguna (Kasir / Admin)</span>
          </h3>

          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl bg-orange-100 border-2 border-orange-300 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              {formData.userProfileAvatar ? (
                <img
                  src={formData.userProfileAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-orange-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="file"
                ref={profileAvatarInputRef}
                accept="image/*"
                capture="user"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => profileAvatarInputRef.current?.click()}
                disabled={isCompressingAvatar}
                className="py-2 px-3 bg-orange-50 hover:bg-orange-100 text-[#F97316] border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{isCompressingAvatar ? 'Mengompres...' : 'Ganti Foto Profil (Kamera/Galeri)'}</span>
              </button>
              {formData.userProfileAvatar && (
                <button
                  type="button"
                  onClick={() => handleChange('userProfileAvatar', '')}
                  className="text-[11px] text-[#DC2626] font-bold block"
                >
                  Hapus Foto Profil
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Nama Pengguna / Kasir
              </label>
              <input
                type="text"
                value={formData.userProfileName || ''}
                onChange={(e) => handleChange('userProfileName', e.target.value)}
                placeholder="Admin Jeruk Nona"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Jabatan / Peran
              </label>
              <input
                type="text"
                value={formData.userProfileRole || ''}
                onChange={(e) => handleChange('userProfileRole', e.target.value)}
                placeholder="Owner / Head Barista"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-medium focus:border-[#F97316] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 1: Profil Usaha */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Store className="w-4 h-4 text-[#F97316]" />
            <span>Profil Toko Jeruk Nona</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Nama Toko / Brand
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="JERUK NONA"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Slogan / Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Segar Alami Setiap Hari"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-medium focus:border-[#F97316] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Alamat Toko (Cetak di Struk)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Jl. Surya Kencana No. 88, Bogor"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#F97316] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#F97316] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
              Pesan Footer Struk Pembayaran
            </label>
            <textarea
              rows={2}
              value={formData.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="Terima kasih atas kunjungan Anda!..."
              className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs focus:border-[#F97316] outline-none"
            />
          </div>
        </div>

        {/* Section 1.5: Koneksi API Google Gemini */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h3 className="font-black text-sm text-[#111111] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <span>AI Asisten Bisnis (Google Gemini API)</span>
            </h3>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                aiStatus.connected
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${aiStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span>{aiStatus.connected ? 'Terhubung (gemini-3.8-flash)' : 'Memeriksa Server...'}</span>
            </span>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed">
            API Gemini terhubung melalui server proxy. Siap memberikan insight penjualan cerdas, saran promo diskon, serta prediksi stok kemasan cup & seal.
          </p>

          {/* Test AI Query Box */}
          <div className="p-3 bg-orange-50/60 border border-orange-200/80 rounded-2xl space-y-2">
            <label className="block text-[11px] font-bold text-orange-900 uppercase">
              Tes Interaksi Asisten AI Jeruk Nona
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTestPrompt}
                onChange={(e) => setAiTestPrompt(e.target.value)}
                placeholder="Tanyakan saran bisnis atau tips kasir..."
                className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-medium outline-none focus:border-[#F97316]"
              />
              <button
                type="button"
                onClick={handleTestAi}
                disabled={isAskingAi || !aiTestPrompt.trim()}
                className="px-3 py-2 bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{isAskingAi ? 'Memproses...' : 'Tanya AI'}</span>
              </button>
            </div>

            {aiTestError && (
              <p className="text-xs text-red-600 font-semibold">{aiTestError}</p>
            )}

            {aiTestReply && (
              <div className="mt-2 p-3 bg-white rounded-xl border border-orange-200 text-xs text-zinc-800 space-y-1">
                <span className="font-extrabold text-[#F97316] text-[11px] block">
                  Jawaban AI Gemini:
                </span>
                <p className="whitespace-pre-line leading-relaxed text-zinc-700">
                  {aiTestReply}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Printer Thermal ESC/POS (Bluetooth / RawBT) */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h3 className="font-black text-sm text-[#111111] flex items-center gap-2">
              <Printer className="w-4 h-4 text-[#F97316]" />
              <span>Pengaturan Printer Thermal ESC/POS</span>
            </h3>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isBtConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {isBtConnected ? `Terhubung: ${btDeviceName}` : 'Belum Terhubung'}
            </span>
          </div>

          {btStatusMsg && (
            <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 font-semibold flex items-center gap-1.5">
              <Bluetooth className="w-4 h-4 text-[#F97316] shrink-0" />
              <span>{btStatusMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isBtConnected ? (
              <button
                type="button"
                onClick={handleConnectBluetooth}
                disabled={isConnecting}
                className="flex-1 py-3 px-4 bg-[#F97316] hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{isConnecting ? 'Menghubungkan...' : 'Hubungkan Printer Bluetooth'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectBluetooth}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-black text-white font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Putuskan Koneksi</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTestPrint}
              disabled={!isBtConnected}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Tes Print</span>
            </button>
          </div>

          {/* Paper Width (58mm vs 80mm) */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
              Ukuran Kertas Thermal Struk
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleChange('paperWidth', '58mm')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  formData.paperWidth === '58mm'
                    ? 'border-[#F97316] bg-orange-50/70 text-[#111111]'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <span className="font-extrabold text-xs block">58 mm (Standar Mini POS)</span>
                <span className="text-[10px] text-zinc-500">32 karakter / baris</span>
              </button>

              <button
                type="button"
                onClick={() => handleChange('paperWidth', '80mm')}
                className={`p-3 rounded-xl border-2 text-left transition ${
                  formData.paperWidth === '80mm'
                    ? 'border-[#F97316] bg-orange-50/70 text-[#111111]'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <span className="font-extrabold text-xs block">80 mm (Printer Lebar)</span>
                <span className="text-[10px] text-zinc-500">48 karakter / baris</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Pajak & Biaya Layanan */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <span>Pajak & Biaya Layanan</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Pajak Restoran / PB1 (%)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={formData.taxPercent}
                onChange={(e) => handleChange('taxPercent', Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none"
              />
              <span className="text-[10px] text-zinc-400 mt-1 block">Isi 0 jika sudah include pajak</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Service Charge (%)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={formData.serviceChargePercent}
                onChange={(e) => handleChange('serviceChargePercent', Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-xs font-bold focus:border-[#F97316] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Gambar QRIS Toko */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <QrCode className="w-4 h-4 text-[#F97316]" />
            <span>Upload QRIS Statis Toko</span>
          </h3>

          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-300 overflow-hidden flex items-center justify-center shrink-0">
              {formData.qrisImageUrl ? (
                <img src={formData.qrisImageUrl} alt="QRIS Toko" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-zinc-300" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="file"
                ref={qrisInputRef}
                accept="image/*"
                onChange={handleQrisFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => qrisInputRef.current?.click()}
                disabled={isCompressingQris}
                className="py-2.5 px-3 bg-orange-50 hover:bg-orange-100 text-[#F97316] border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{isCompressingQris ? 'Mengompres...' : 'Upload Gambar QRIS Toko'}</span>
              </button>
              <p className="text-[11px] text-zinc-400">
                Pilih foto QRIS toko dari Bank BCA, Mandiri, BRI, GoPay, OVO, dll.
              </p>
            </div>
          </div>
        </div>

        {/* Section 5: Audio & Haptic & PIN */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Shield className="w-4 h-4 text-[#F97316]" />
            <span>Preferensi & PIN Admin</span>
          </h3>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                <Volume2 className="w-4 h-4 text-orange-500" />
                <span>Suara Beep Tambah Menu & Pembayaran</span>
              </div>
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                className="w-4 h-4 accent-[#F97316]"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                <Vibrate className="w-4 h-4 text-orange-500" />
                <span>Getar Haptik HP Saat Ketuk Tombol</span>
              </div>
              <input
                type="checkbox"
                checked={formData.hapticEnabled}
                onChange={(e) => handleChange('hapticEnabled', e.target.checked)}
                className="w-4 h-4 accent-[#F97316]"
              />
            </label>

            <div className="pt-2">
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                PIN Admin (Akses Laporan & Setting)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={formData.adminPin}
                onChange={(e) => handleChange('adminPin', e.target.value)}
                placeholder="1234"
                className="w-full sm:w-48 px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold tracking-widest focus:border-[#F97316] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Backup & Clean Production Publish */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2 pb-2 border-b border-zinc-100">
            <Download className="w-4 h-4 text-[#F97316]" />
            <span>Cadangan Data & Siap Buka Toko (Publish)</span>
          </h3>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="/api/download-project-zip"
              download="jeruk-nona-pos-source.zip"
              className="py-2.5 px-3 bg-[#F97316] hover:bg-orange-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File Project (.ZIP)</span>
            </a>

            <button
              type="button"
              onClick={handleExportBackup}
              className="py-2.5 px-3 bg-[#111111] hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Cadangan JSON</span>
            </button>

            <input
              type="file"
              ref={restoreFileRef}
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => restoreFileRef.current?.click()}
              className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 border border-zinc-200"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Pulihkan Data JSON</span>
            </button>
          </div>

          {/* Clean Production Ready Reset */}
          <div className="pt-3 border-t border-zinc-100">
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-[#DC2626] font-black text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Mode Buka Toko Bersih (Siap Publish)</span>
              </div>
              <p className="text-[11px] text-zinc-600">
                Hapus semua transaksi uji coba & antrian lama agar buku kas kembali 0 dan siap digunakan kasir sungguhan saat toko buka.
              </p>
              <button
                type="button"
                onClick={handleCleanProductionReset}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Riwayat Transaksi (Siap Publish)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-4 bg-[#F97316] hover:bg-orange-600 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-98"
          >
            SIMPAN SEMUA PENGATURAN
          </button>
        </div>
      </form>
    </div>
  );
};
