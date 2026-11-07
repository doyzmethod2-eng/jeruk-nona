import {
  Category,
  Product,
  Transaction,
  StockMutation,
  Shift,
  HeldOrder,
  StoreSettings,
  AddonOption,
  PackagingItem,
  QueueStatus,
} from '../types';

const DB_NAME = 'JerukNonaPOS_DB';
const DB_VERSION = 2;

// Default Store Settings with Profile Picture
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'JERUK NONA',
  tagline: 'Segar Alami Setiap Hari',
  address: 'Jl. Surya Kencana No. 88, Bogor',
  phone: '0812-3456-7890',
  email: 'halo@jeruknona.id',
  receiptFooter: 'Terima kasih atas kunjungan Anda!\nFollow IG & TikTok: @jeruknona.id\nKepuasan Anda adalah Semangat Kami.',
  paperWidth: '58mm',
  taxPercent: 0,
  serviceChargePercent: 0,
  qrisImageUrl: '',
  soundEnabled: true,
  hapticEnabled: true,
  adminPin: '1234',
  bluetoothServiceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
  bluetoothCharacteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
  lastPrinterName: '',
  printReceiptLogo: true,
  // User Profile
  userProfileName: 'Admin Jeruk Nona',
  userProfileRole: 'Owner / Head Barista',
  userProfileAvatar: '',
};

// Master Add-ons / Toppings
export const DEFAULT_ADDONS: AddonOption[] = [
  { id: 'addon-selasih', name: 'Biji Selasih', price: 2000, costPrice: 500 },
  { id: 'addon-yakult', name: 'Yakult (1 Botol)', price: 4000, costPrice: 2200 },
  { id: 'addon-jelly', name: 'Jelly Kelapa Kenyal', price: 3000, costPrice: 900 },
  { id: 'addon-nata', name: 'Nata de Coco', price: 3000, costPrice: 1000 },
  { id: 'addon-lemon', name: 'Irisan Lemon Segar', price: 2000, costPrice: 700 },
  { id: 'addon-madu', name: 'Madu Murni Sumbawa', price: 4000, costPrice: 1500 },
];

// Master Kemasan & Barang Kering
export const DEFAULT_PACKAGING: PackagingItem[] = [
  {
    id: 'pkg-cup-reg',
    name: 'Cup Plastik Regular 16oz',
    stock: 250,
    unit: 'Pcs',
    costPrice: 350,
    minStockAlert: 50,
    category: 'cup',
    description: 'Wadah minuman cup ukuran sedang/reguler',
  },
  {
    id: 'pkg-cup-jumbo',
    name: 'Cup Plastik Jumbo 22oz',
    stock: 150,
    unit: 'Pcs',
    costPrice: 500,
    minStockAlert: 40,
    category: 'cup',
    description: 'Wadah minuman cup ukuran jumbo',
  },
  {
    id: 'pkg-seal',
    name: 'Plastik Seal Cup Roll',
    stock: 1200,
    unit: 'Pcs',
    costPrice: 65,
    minStockAlert: 150,
    category: 'seal',
    description: 'Plastik penutup press seal cup minuman',
  },
  {
    id: 'pkg-sedotan',
    name: 'Sedotan Runcing Steril',
    stock: 300,
    unit: 'Pcs',
    costPrice: 80,
    minStockAlert: 50,
    category: 'straw',
    description: 'Sedotan higienis terbungkus plastik',
  },
  {
    id: 'pkg-kresek',
    name: 'Kantong Kresek Take Away',
    stock: 200,
    unit: 'Pcs',
    costPrice: 150,
    minStockAlert: 30,
    category: 'plastic',
    description: 'Kantong jinjing pembungkus bawa pulang',
  },
];

// Initial Categories
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-jeruk', name: 'Minuman Jeruk', color: '#F97316' },
  { id: 'cat-teh-kopi', name: 'Kopi & Teh', color: '#D97706' },
  { id: 'cat-snack', name: 'Snack & Camilan', color: '#EF4444' },
];

// Initial 10 Products with cup packaging rules and addon links
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Es Jeruk Murni Regular',
    categoryId: 'cat-jeruk',
    price: 15000,
    costPrice: 6500,
    stock: 50,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 10,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-selasih', 'addon-yakult', 'addon-jelly', 'addon-nata', 'addon-lemon', 'addon-madu'],
  },
  {
    id: 'prod-2',
    name: 'Jeruk Peras Jumbo 22oz',
    categoryId: 'cat-jeruk',
    price: 20000,
    costPrice: 9000,
    stock: 40,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 10,
    cupType: 'pkg-cup-jumbo',
    availableAddonIds: ['addon-selasih', 'addon-yakult', 'addon-jelly', 'addon-nata', 'addon-lemon', 'addon-madu'],
  },
  {
    id: 'prod-3',
    name: 'Jeruk Kelapa Muda',
    categoryId: 'cat-jeruk',
    price: 22000,
    costPrice: 10000,
    stock: 25,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 8,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-selasih', 'addon-yakult', 'addon-jelly', 'addon-nata', 'addon-madu'],
  },
  {
    id: 'prod-4',
    name: 'Jeruk Yakult Booster',
    categoryId: 'cat-jeruk',
    price: 20000,
    costPrice: 9500,
    stock: 20,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 8,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-selasih', 'addon-jelly', 'addon-nata'],
  },
  {
    id: 'prod-5',
    name: 'Jeruk Hangat Madu Murni',
    categoryId: 'cat-jeruk',
    price: 18000,
    costPrice: 7500,
    stock: 20,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 5,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-selasih', 'addon-lemon'],
  },
  {
    id: 'prod-6',
    name: 'Es Lemon Tea Nona',
    categoryId: 'cat-teh-kopi',
    price: 12000,
    costPrice: 4500,
    stock: 35,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 10,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-selasih', 'addon-jelly', 'addon-lemon', 'addon-nata'],
  },
  {
    id: 'prod-7',
    name: 'Kopi Susu Jeruk Signature',
    categoryId: 'cat-teh-kopi',
    price: 22000,
    costPrice: 9000,
    stock: 15,
    unit: 'Cup',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 5,
    cupType: 'pkg-cup-reg',
    availableAddonIds: ['addon-jelly'],
  },
  {
    id: 'prod-8',
    name: 'Roti Bakar Jeruk Kaya Crispy',
    categoryId: 'cat-snack',
    price: 18000,
    costPrice: 7000,
    stock: 20,
    unit: 'Porsi',
    imageUrl: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 5,
    cupType: 'none',
  },
  {
    id: 'prod-9',
    name: 'Pisang Goreng Wijen Madu',
    categoryId: 'cat-snack',
    price: 16000,
    costPrice: 6000,
    stock: 15,
    unit: 'Porsi',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 5,
    cupType: 'none',
  },
  {
    id: 'prod-10',
    name: 'Kentang Goreng Jeruk Nona',
    categoryId: 'cat-snack',
    price: 18000,
    costPrice: 7000,
    stock: 25,
    unit: 'Porsi',
    imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
    isActive: true,
    minStockAlert: 6,
    cupType: 'none',
  },
];

// Open IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung pada browser ini.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('addons')) {
        db.createObjectStore('addons', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('packaging')) {
        db.createObjectStore('packaging', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stockMutations')) {
        db.createObjectStore('stockMutations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('shifts')) {
        db.createObjectStore('shifts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('heldOrders')) {
        db.createObjectStore('heldOrders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic IDB operations
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    const saved = localStorage.getItem(`jn_${storeName}`);
    return saved ? JSON.parse(saved) : [];
  }
}

async function saveAllToStore<T>(storeName: string, items: T[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
      items.forEach((item) => store.put(item));
      transaction.oncomplete = () => {
        try {
          localStorage.setItem(`jn_${storeName}`, JSON.stringify(items));
        } catch {
          // ignore
        }
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    localStorage.setItem(`jn_${storeName}`, JSON.stringify(items));
  }
}

export const StorageService = {
  async init(): Promise<void> {
    const products = await this.getProducts();
    const packaging = await this.getPackaging();
    const addons = await this.getAddons();

    if (products.length === 0) {
      await this.saveProducts(DEFAULT_PRODUCTS);
      await this.saveCategories(DEFAULT_CATEGORIES);
      await this.saveSettings(DEFAULT_SETTINGS);

      // Mutasi awal produk
      const initialMutations: StockMutation[] = DEFAULT_PRODUCTS.map((p) => ({
        id: `mut-init-${p.id}`,
        targetId: p.id,
        targetName: p.name,
        itemKind: 'product',
        type: 'in',
        quantity: p.stock,
        previousStock: 0,
        newStock: p.stock,
        note: 'Stok awal menu',
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      }));
      await this.saveStockMutations(initialMutations);
    }

    if (packaging.length === 0) {
      await this.savePackaging(DEFAULT_PACKAGING);
      const pkgMutations: StockMutation[] = DEFAULT_PACKAGING.map((pkg) => ({
        id: `mut-init-pkg-${pkg.id}`,
        targetId: pkg.id,
        targetName: pkg.name,
        itemKind: 'packaging',
        type: 'in',
        quantity: pkg.stock,
        previousStock: 0,
        newStock: pkg.stock,
        note: 'Stok awal kemasan & barang kering',
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      }));
      const existingMuts = await this.getStockMutations();
      await this.saveStockMutations([...pkgMutations, ...existingMuts]);
    }

    if (addons.length === 0) {
      await this.saveAddons(DEFAULT_ADDONS);
    }

    // Ensure clean state for publish (wipes previous test transactions once)
    if (typeof localStorage !== 'undefined' && localStorage.getItem('jn_published_clean_v2') !== 'true') {
      await this.resetToCleanProduction();
      localStorage.setItem('jn_published_clean_v2', 'true');
    }
  },

  async getProducts(): Promise<Product[]> {
    return getAllFromStore<Product>('products');
  },

  async saveProducts(products: Product[]): Promise<void> {
    return saveAllToStore('products', products);
  },

  async getCategories(): Promise<Category[]> {
    return getAllFromStore<Category>('categories');
  },

  async saveCategories(categories: Category[]): Promise<void> {
    return saveAllToStore('categories', categories);
  },

  async getAddons(): Promise<AddonOption[]> {
    return getAllFromStore<AddonOption>('addons');
  },

  async saveAddons(addons: AddonOption[]): Promise<void> {
    return saveAllToStore('addons', addons);
  },

  async getPackaging(): Promise<PackagingItem[]> {
    return getAllFromStore<PackagingItem>('packaging');
  },

  async savePackaging(packaging: PackagingItem[]): Promise<void> {
    return saveAllToStore('packaging', packaging);
  },

  async getTransactions(): Promise<Transaction[]> {
    const trxs = await getAllFromStore<Transaction>('transactions');
    return trxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    return saveAllToStore('transactions', transactions);
  },

  // Save transaction and automatically deduct menu stock & cup/seal packaging supplies!
  async addTransaction(transaction: Transaction): Promise<void> {
    const transactions = await this.getTransactions();
    transactions.unshift(transaction);
    await this.saveTransactions(transactions);

    const products = await this.getProducts();
    const packaging = await this.getPackaging();
    const mutations = await this.getStockMutations();

    // 1. Deduct Product stock
    const updatedProducts = products.map((prod) => {
      const itemSold = transaction.items.find((it) => it.productId === prod.id);
      if (itemSold) {
        const prev = prod.stock;
        const newStock = Math.max(0, prev - itemSold.quantity);
        mutations.unshift({
          id: `mut-sale-${transaction.id}-${prod.id}`,
          targetId: prod.id,
          targetName: prod.name,
          itemKind: 'product',
          type: 'out_sale',
          quantity: -itemSold.quantity,
          previousStock: prev,
          newStock: newStock,
          note: `Penjualan #${transaction.invoiceNumber}`,
          createdAt: transaction.createdAt,
          createdBy: transaction.cashierName,
        });
        return { ...prod, stock: newStock };
      }
      return prod;
    });

    // 2. Count packaging supplies usage
    let regCupsUsed = 0;
    let jumboCupsUsed = 0;

    transaction.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        if (prod.cupType === 'pkg-cup-jumbo' || prod.name.toLowerCase().includes('jumbo')) {
          jumboCupsUsed += item.quantity;
        } else if (prod.cupType === 'pkg-cup-reg' || prod.unit.toLowerCase() === 'cup') {
          regCupsUsed += item.quantity;
        }
      }
    });

    const totalCupsUsed = regCupsUsed + jumboCupsUsed;
    const sealUsed = totalCupsUsed; // 1 cup = 1 seal
    const strawUsed = totalCupsUsed; // 1 cup = 1 straw
    const kresekUsed = transaction.orderType === 'take_away' ? 1 : 0;

    // Deduct packaging items
    const updatedPackaging = packaging.map((pkg) => {
      let qtyDeduct = 0;
      if (pkg.id === 'pkg-cup-reg') qtyDeduct = regCupsUsed;
      else if (pkg.id === 'pkg-cup-jumbo') qtyDeduct = jumboCupsUsed;
      else if (pkg.id === 'pkg-seal') qtyDeduct = sealUsed;
      else if (pkg.id === 'pkg-sedotan') qtyDeduct = strawUsed;
      else if (pkg.id === 'pkg-kresek') qtyDeduct = kresekUsed;

      if (qtyDeduct > 0) {
        const prev = pkg.stock;
        const newStock = Math.max(0, prev - qtyDeduct);
        mutations.unshift({
          id: `mut-pkg-${transaction.id}-${pkg.id}`,
          targetId: pkg.id,
          targetName: pkg.name,
          itemKind: 'packaging',
          type: 'out_sale',
          quantity: -qtyDeduct,
          previousStock: prev,
          newStock: newStock,
          note: `Pemakaian kemasan #${transaction.invoiceNumber} (${qtyDeduct} ${pkg.unit})`,
          createdAt: transaction.createdAt,
          createdBy: transaction.cashierName,
        });
        return { ...pkg, stock: newStock };
      }
      return pkg;
    });

    await this.saveProducts(updatedProducts);
    await this.savePackaging(updatedPackaging);
    await this.saveStockMutations(mutations);
  },

  // Update order queue status (e.g. waiting -> in_progress -> ready -> completed)
  async updateQueueStatus(transactionId: string, newStatus: QueueStatus): Promise<void> {
    const transactions = await this.getTransactions();
    const target = transactions.find((t) => t.id === transactionId);
    if (!target) return;

    target.queueStatus = newStatus;
    await this.saveTransactions(transactions);
  },

  // Void transaction & restore product + packaging stock!
  async voidTransaction(transactionId: string, reason: string, voidBy: string): Promise<void> {
    const transactions = await this.getTransactions();
    const target = transactions.find((t) => t.id === transactionId);
    if (!target || target.status === 'void') return;

    target.status = 'void';
    target.voidReason = reason;
    target.voidAt = new Date().toISOString();
    target.voidBy = voidBy;

    const products = await this.getProducts();
    const packaging = await this.getPackaging();
    const mutations = await this.getStockMutations();

    // 1. Restore Product Stock
    const updatedProducts = products.map((prod) => {
      const itemSold = target.items.find((it) => it.productId === prod.id);
      if (itemSold) {
        const prev = prod.stock;
        const newStock = prev + itemSold.quantity;
        mutations.unshift({
          id: `mut-void-${target.id}-${prod.id}`,
          targetId: prod.id,
          targetName: prod.name,
          itemKind: 'product',
          type: 'void_return',
          quantity: itemSold.quantity,
          previousStock: prev,
          newStock: newStock,
          note: `Void Transaksi #${target.invoiceNumber} (${reason})`,
          createdAt: new Date().toISOString(),
          createdBy: voidBy,
        });
        return { ...prod, stock: newStock };
      }
      return prod;
    });

    // 2. Restore Packaging Supplies Stock
    let regCupsUsed = 0;
    let jumboCupsUsed = 0;
    target.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        if (prod.cupType === 'pkg-cup-jumbo' || prod.name.toLowerCase().includes('jumbo')) {
          jumboCupsUsed += item.quantity;
        } else if (prod.cupType === 'pkg-cup-reg' || prod.unit.toLowerCase() === 'cup') {
          regCupsUsed += item.quantity;
        }
      }
    });

    const totalCupsUsed = regCupsUsed + jumboCupsUsed;
    const sealUsed = totalCupsUsed;
    const strawUsed = totalCupsUsed;
    const kresekUsed = target.orderType === 'take_away' ? 1 : 0;

    const updatedPackaging = packaging.map((pkg) => {
      let qtyRestore = 0;
      if (pkg.id === 'pkg-cup-reg') qtyRestore = regCupsUsed;
      else if (pkg.id === 'pkg-cup-jumbo') qtyRestore = jumboCupsUsed;
      else if (pkg.id === 'pkg-seal') qtyRestore = sealUsed;
      else if (pkg.id === 'pkg-sedotan') qtyRestore = strawUsed;
      else if (pkg.id === 'pkg-kresek') qtyRestore = kresekUsed;

      if (qtyRestore > 0) {
        const prev = pkg.stock;
        const newStock = prev + qtyRestore;
        mutations.unshift({
          id: `mut-void-pkg-${target.id}-${pkg.id}`,
          targetId: pkg.id,
          targetName: pkg.name,
          itemKind: 'packaging',
          type: 'void_return',
          quantity: qtyRestore,
          previousStock: prev,
          newStock: newStock,
          note: `Pengembalian kemasan void #${target.invoiceNumber}`,
          createdAt: new Date().toISOString(),
          createdBy: voidBy,
        });
        return { ...pkg, stock: newStock };
      }
      return pkg;
    });

    await this.saveTransactions(transactions);
    await this.saveProducts(updatedProducts);
    await this.savePackaging(updatedPackaging);
    await this.saveStockMutations(mutations);
  },

  async getStockMutations(): Promise<StockMutation[]> {
    const list = await getAllFromStore<StockMutation>('stockMutations');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async saveStockMutations(mutations: StockMutation[]): Promise<void> {
    return saveAllToStore('stockMutations', mutations);
  },

  async addStockMutation(mutation: StockMutation): Promise<void> {
    const mutations = await this.getStockMutations();
    mutations.unshift(mutation);
    await this.saveStockMutations(mutations);
  },

  async getShifts(): Promise<Shift[]> {
    const list = await getAllFromStore<Shift>('shifts');
    return list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  async saveShifts(shifts: Shift[]): Promise<void> {
    return saveAllToStore('shifts', shifts);
  },

  async getCurrentShift(): Promise<Shift | null> {
    const shifts = await this.getShifts();
    const current = shifts.find((s) => s.status === 'open');
    return current || null;
  },

  async getHeldOrders(): Promise<HeldOrder[]> {
    return getAllFromStore<HeldOrder>('heldOrders');
  },

  async saveHeldOrders(orders: HeldOrder[]): Promise<void> {
    return saveAllToStore('heldOrders', orders);
  },

  async getSettings(): Promise<StoreSettings> {
    try {
      const items = await getAllFromStore<StoreSettings & { id: string }>('settings');
      if (items.length > 0) {
        return { ...DEFAULT_SETTINGS, ...items[0] };
      }
      const saved = localStorage.getItem('jn_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(settings: StoreSettings): Promise<void> {
    const dbItem = { id: 'primary_settings', ...settings };
    await saveAllToStore('settings', [dbItem]);
    localStorage.setItem('jn_settings', JSON.stringify(settings));
  },

  // Reset to Clean Production State (Siap Publish: 0 transactions, clean queues, clean shifts, fresh packaging & menu stock)
  async resetToCleanProduction(): Promise<void> {
    await this.saveTransactions([]);
    await this.saveShifts([]);
    await this.saveHeldOrders([]);
    await this.saveProducts(DEFAULT_PRODUCTS);
    await this.savePackaging(DEFAULT_PACKAGING);
    await this.saveCategories(DEFAULT_CATEGORIES);
    await this.saveAddons(DEFAULT_ADDONS);

    const initialMutations: StockMutation[] = [
      ...DEFAULT_PRODUCTS.map((p) => ({
        id: `mut-init-${p.id}`,
        targetId: p.id,
        targetName: p.name,
        itemKind: 'product' as const,
        type: 'in' as const,
        quantity: p.stock,
        previousStock: 0,
        newStock: p.stock,
        note: 'Stok awal menu siap buka toko',
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      })),
      ...DEFAULT_PACKAGING.map((pkg) => ({
        id: `mut-init-pkg-${pkg.id}`,
        targetId: pkg.id,
        targetName: pkg.name,
        itemKind: 'packaging' as const,
        type: 'in' as const,
        quantity: pkg.stock,
        previousStock: 0,
        newStock: pkg.stock,
        note: 'Stok awal kemasan (Cup & Seal) siap buka toko',
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
      })),
    ];

    await this.saveStockMutations(initialMutations);
  },

  // Export full backup JSON
  async exportBackupData(): Promise<string> {
    const [products, packaging, addons, categories, transactions, stockMutations, shifts, settings] =
      await Promise.all([
        this.getProducts(),
        this.getPackaging(),
        this.getAddons(),
        this.getCategories(),
        this.getTransactions(),
        this.getStockMutations(),
        this.getShifts(),
        this.getSettings(),
      ]);

    const backup = {
      appName: 'JERUK NONA POS',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      data: {
        products,
        packaging,
        addons,
        categories,
        transactions,
        stockMutations,
        shifts,
        settings,
      },
    };

    return JSON.stringify(backup, null, 2);
  },

  // Restore backup JSON
  async restoreBackupData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) throw new Error('Format backup tidak valid.');

      const { products, packaging, addons, categories, transactions, stockMutations, shifts, settings } =
        parsed.data;

      if (products) await this.saveProducts(products);
      if (packaging) await this.savePackaging(packaging);
      if (addons) await this.saveAddons(addons);
      if (categories) await this.saveCategories(categories);
      if (transactions) await this.saveTransactions(transactions);
      if (stockMutations) await this.saveStockMutations(stockMutations);
      if (shifts) await this.saveShifts(shifts);
      if (settings) await this.saveSettings(settings);

      return true;
    } catch (err) {
      console.error('Gagal restore data:', err);
      return false;
    }
  },
};
