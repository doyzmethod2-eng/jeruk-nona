export type UserRole = 'admin' | 'kasir';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface AddonOption {
  id: string;
  name: string; // e.g. "Selasih", "Yakult", "Jelly Kelapa", "Nata de Coco", "Irisan Lemon", "Madu Murni"
  price: number; // e.g. 2000, 4000
  costPrice: number; // HPP
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export type CupPackagingType = 'pkg-cup-reg' | 'pkg-cup-jumbo' | 'none';

export interface PackagingItem {
  id: string; // e.g. 'pkg-cup-reg', 'pkg-cup-jumbo', 'pkg-seal', 'pkg-sedotan', 'pkg-kresek'
  name: string;
  stock: number;
  unit: string; // 'Pcs', 'Roll', 'Pack'
  costPrice: number;
  minStockAlert: number;
  category: 'cup' | 'seal' | 'straw' | 'plastic' | 'other';
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  price: number; // Harga jual dasar
  costPrice: number; // Harga modal (HPP)
  stock: number;
  unit: string; // 'Cup', 'Botol', 'Pcs', 'Porsi', dll
  imageUrl: string;
  isActive: boolean;
  minStockAlert?: number;
  cupType?: CupPackagingType; // Apakah menu ini memotong stok cup regular / jumbo
  availableAddonIds?: string[]; // IDs addon yang bisa dipilih
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedAddons?: SelectedAddon[];
  notes?: string;
  discountAmount?: number; // per item discount in Rp
}

export type OrderType = 'dine_in' | 'take_away';

export type PaymentMethod = 'cash' | 'qris';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  basePrice: number;
  selectedAddons?: SelectedAddon[];
  addonsPricePerUnit: number;
  unitPrice: number; // basePrice + addonsPricePerUnit
  costPrice: number;
  subtotal: number; // quantity * unitPrice
  notes?: string;
}

export type QueueStatus = 'waiting' | 'in_progress' | 'ready' | 'completed';

export interface OrderQueueItem {
  id: string; // id transaksi
  invoiceNumber: string;
  queueNumber: string; // e.g. "A-01", "A-02", "Meja 04"
  createdAt: string;
  orderType: OrderType;
  tableOrQueueNumber?: string;
  cashierName: string;
  items: OrderItem[];
  customerNote?: string;
  status: QueueStatus;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  queueNumber: string; // e.g. "A-01", "A-02"
  createdAt: string; // ISO string
  orderType: OrderType;
  tableOrQueueNumber?: string;
  cashierName: string;
  items: OrderItem[];
  subtotal: number;
  discountType: 'nominal' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: 'completed' | 'void';
  queueStatus: QueueStatus;
  voidReason?: string;
  voidAt?: string;
  voidBy?: string;
  shiftId?: string;
}

export type MutationType =
  | 'in'
  | 'out_sale'
  | 'out_damaged'
  | 'out_expired'
  | 'out_manual'
  | 'void_return';

export interface StockMutation {
  id: string;
  targetId: string; // productId or packagingId
  targetName: string;
  itemKind: 'product' | 'packaging';
  type: MutationType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface HeldOrder {
  id: string;
  name: string; // Customer name or Table
  createdAt: string;
  orderType: OrderType;
  tableOrQueueNumber?: string;
  items: CartItem[];
  notes?: string;
  discountType: 'nominal' | 'percent';
  discountValue: number;
}

export interface Shift {
  id: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  initialCash: number; // modal awal
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  totalCashSales?: number;
  totalQrisSales?: number;
  transactionCount?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  receiptFooter: string;
  paperWidth: '58mm' | '80mm'; // 58mm = 32 chars, 80mm = 48 chars
  taxPercent: number; // e.g. 10 or 0
  serviceChargePercent: number; // e.g. 0
  qrisImageUrl: string;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  adminPin: string;
  bluetoothServiceUuid: string;
  bluetoothCharacteristicUuid: string;
  lastPrinterName?: string;
  printReceiptLogo: boolean;
  // User Profile
  userProfileName: string;
  userProfileRole: string;
  userProfileAvatar: string;
}
