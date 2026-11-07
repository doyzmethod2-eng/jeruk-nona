import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { RoleModal } from './components/RoleModal';
import { ShiftModal } from './components/ShiftModal';
import { MenuGrid } from './components/Cashier/MenuGrid';
import { CartBottomSheet } from './components/Cashier/CartBottomSheet';
import { HoldOrdersModal } from './components/Cashier/HoldOrdersModal';
import { AddonModal } from './components/Cashier/AddonModal';
import { PaymentModal } from './components/Payment/PaymentModal';
import { ReceiptModal } from './components/Payment/ReceiptModal';
import { OrderQueueDisplay } from './components/Queue/OrderQueueDisplay';
import { MenuManagement } from './components/Menu/MenuManagement';
import { StockManagement } from './components/Stock/StockManagement';
import { SalesReports } from './components/Reports/SalesReports';
import { StoreSettings } from './components/Settings/StoreSettings';

import {
  Product,
  Category,
  CartItem,
  Transaction,
  StockMutation,
  Shift,
  HeldOrder,
  StoreSettings as StoreSettingsType,
  UserRole,
  OrderType,
  PaymentMethod,
  PackagingItem,
  AddonOption,
  QueueStatus,
  OrderItem,
} from './types';

import { StorageService, DEFAULT_SETTINGS } from './services/storage';
import { PrinterService } from './services/printer';
import { FeedbackService } from './services/sound';

export default function App() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<NavTab>('kasir');
  const [isQueueViewOpen, setIsQueueViewOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('kasir');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  const [addons, setAddons] = useState<AddonOption[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [settings, setSettings] = useState<StoreSettingsType>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Cashier Active Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableOrQueueNumber, setTableOrQueueNumber] = useState('');
  const [discountType, setDiscountType] = useState<'nominal' | 'percent'>('nominal');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Modals State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState(false);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [printStatusMessage, setPrintStatusMessage] = useState('');
  const [isPrintSuccess, setIsPrintSuccess] = useState(false);

  // Load all initial data from IndexedDB
  const loadData = async () => {
    try {
      await StorageService.init();
      const [prods, pkgs, adds, cats, trxs, muts, shs, curShift, held, sett] =
        await Promise.all([
          StorageService.getProducts(),
          StorageService.getPackaging(),
          StorageService.getAddons(),
          StorageService.getCategories(),
          StorageService.getTransactions(),
          StorageService.getStockMutations(),
          StorageService.getShifts(),
          StorageService.getCurrentShift(),
          StorageService.getHeldOrders(),
          StorageService.getSettings(),
        ]);

      setProducts(prods);
      setPackaging(pkgs);
      setAddons(adds);
      setCategories(cats);
      setTransactions(trxs);
      setMutations(muts);
      setShifts(shs);
      setCurrentShift(curShift);
      setHeldOrders(held);
      setSettings(sett);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Low stock counter for bottom nav badge
  const lowStockCount =
    products.filter((p) => p.stock <= (p.minStockAlert || 5) && p.stock > 0).length +
    packaging.filter((pkg) => pkg.stock <= pkg.minStockAlert).length;

  // Active queue orders counter
  const activeQueueCount = transactions.filter(
    (t) => t.status === 'completed' && (t.queueStatus || 'waiting') !== 'completed'
  ).length;

  // Open Addon Modal for product
  const handleOpenAddonModal = (product: Product) => {
    setAddonProduct(product);
    setIsAddonModalOpen(true);
  };

  // Add Item to Cart (from Addon Modal)
  const handleConfirmAddToCart = (newCartItem: CartItem) => {
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);

    setCartItems((prev) => {
      // Check if identical item with identical addons exists
      const newAddonIds = (newCartItem.selectedAddons || []).map((a) => a.id).sort().join(',');
      const existingIndex = prev.findIndex((item) => {
        const itemAddonIds = (item.selectedAddons || []).map((a) => a.id).sort().join(',');
        return item.product.id === newCartItem.product.id && itemAddonIds === newAddonIds;
      });

      if (existingIndex >= 0) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const combinedQty = Math.min(newCartItem.product.stock, existing.quantity + newCartItem.quantity);
        updated[existingIndex] = {
          ...existing,
          quantity: combinedQty,
          notes: newCartItem.notes || existing.notes,
        };
        return updated;
      }

      return [...prev, newCartItem];
    });
  };

  // Quick Add Direct
  const handleQuickAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    handleConfirmAddToCart({
      product,
      quantity: 1,
      selectedAddons: [],
    });
  };

  // Update Cart Quantity
  const handleUpdateCartQuantity = (productId: string, delta: number, itemIndex?: number) => {
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);

    setCartItems((prev) => {
      return prev
        .map((item, idx) => {
          if (itemIndex !== undefined ? idx === itemIndex : item.product.id === productId) {
            const newQty = item.quantity + delta;
            return { ...item, quantity: Math.min(newQty, item.product.stock) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  // Update Item Note
  const handleUpdateItemNotes = (productId: string, notes: string, itemIndex?: number) => {
    setCartItems((prev) =>
      prev.map((item, idx) =>
        (itemIndex !== undefined ? idx === itemIndex : item.product.id === productId)
          ? { ...item, notes }
          : item
      )
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (productId: string, itemIndex?: number) => {
    FeedbackService.warning(false, settings.hapticEnabled);
    setCartItems((prev) =>
      prev.filter((item, idx) =>
        itemIndex !== undefined ? idx !== itemIndex : item.product.id !== productId
      )
    );
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cartItems.length > 0) {
      FeedbackService.warning(false, settings.hapticEnabled);
      setCartItems([]);
      setDiscountValue(0);
      setTableOrQueueNumber('');
    }
  };

  // Hold Order
  const handleHoldOrder = async () => {
    if (cartItems.length === 0) return;

    const label = tableOrQueueNumber.trim() || `Pelanggan #${heldOrders.length + 1}`;
    const newHold: HeldOrder = {
      id: `hold-${Date.now()}`,
      name: label,
      createdAt: new Date().toISOString(),
      orderType,
      tableOrQueueNumber,
      items: [...cartItems],
      discountType,
      discountValue,
    };

    const updated = [newHold, ...heldOrders];
    setHeldOrders(updated);
    await StorageService.saveHeldOrders(updated);

    setCartItems([]);
    setDiscountValue(0);
    setTableOrQueueNumber('');
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
  };

  // Resume Held Order
  const handleResumeOrder = async (order: HeldOrder) => {
    setCartItems(order.items);
    setOrderType(order.orderType);
    setTableOrQueueNumber(order.tableOrQueueNumber || '');
    setDiscountType(order.discountType);
    setDiscountValue(order.discountValue);

    const updated = heldOrders.filter((h) => h.id !== order.id);
    setHeldOrders(updated);
    await StorageService.saveHeldOrders(updated);

    setActiveTab('kasir');
    setIsQueueViewOpen(false);
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
  };

  // Delete Held Order
  const handleDeleteHeldOrder = async (orderId: string) => {
    const updated = heldOrders.filter((h) => h.id !== orderId);
    setHeldOrders(updated);
    await StorageService.saveHeldOrders(updated);
  };

  // Execute Payment & Complete Order
  const handleConfirmPayment = async (
    method: PaymentMethod,
    amountPaid: number,
    change: number,
    shouldPrint: boolean
  ) => {
    const now = new Date();
    const dateCode = now.toISOString().slice(2, 10).replace(/-/g, '');
    const seq = transactions.filter((t) => t.createdAt.startsWith(now.toISOString().slice(0, 10))).length + 1;
    const queueSeq = String(seq).padStart(2, '0');
    const queueNumber = tableOrQueueNumber.trim() || `A-${queueSeq}`;
    const invoiceNumber = `JN-${dateCode}-${String(seq).padStart(3, '0')}`;

    // Calculate subtotal with add-ons
    const getItemUnitPrice = (item: CartItem) => {
      const addonsTotal = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      return item.product.price + addonsTotal;
    };

    const subtotal = cartItems.reduce(
      (sum, item) => sum + getItemUnitPrice(item) * item.quantity,
      0
    );

    let discountAmount = 0;
    if (discountType === 'percent') {
      discountAmount = Math.round((subtotal * discountValue) / 100);
    } else {
      discountAmount = Math.min(subtotal, discountValue);
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const serviceChargeAmount = Math.round((taxableAmount * (settings.serviceChargePercent || 0)) / 100);
    const taxAmount = Math.round(((taxableAmount + serviceChargeAmount) * (settings.taxPercent || 0)) / 100);
    const total = taxableAmount + serviceChargeAmount + taxAmount;

    const orderItems: OrderItem[] = cartItems.map((c) => {
      const addonsPrice = (c.selectedAddons || []).reduce((s, a) => s + a.price, 0);
      const unitPrice = c.product.price + addonsPrice;
      return {
        productId: c.product.id,
        productName: c.product.name,
        quantity: c.quantity,
        basePrice: c.product.price,
        selectedAddons: c.selectedAddons ? [...c.selectedAddons] : [],
        addonsPricePerUnit: addonsPrice,
        unitPrice,
        costPrice: c.product.costPrice || 0,
        subtotal: unitPrice * c.quantity,
        notes: c.notes,
      };
    });

    const newTransaction: Transaction = {
      id: `trx-${Date.now()}`,
      invoiceNumber,
      queueNumber,
      createdAt: now.toISOString(),
      orderType,
      tableOrQueueNumber: tableOrQueueNumber.trim() || undefined,
      cashierName: currentShift?.cashierName || settings.userProfileName || 'Kasir 1',
      items: orderItems,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxPercent: settings.taxPercent || 0,
      taxAmount,
      serviceChargePercent: settings.serviceChargePercent || 0,
      serviceChargeAmount,
      total,
      paymentMethod: method,
      amountPaid,
      change,
      status: 'completed',
      queueStatus: 'waiting',
      shiftId: currentShift?.id,
    };

    // Save transaction and automatically deduct menu stock & cup/seal packaging!
    await StorageService.addTransaction(newTransaction);

    // Refresh data
    const [updatedProds, updatedPkgs, updatedTrxs, updatedMuts] = await Promise.all([
      StorageService.getProducts(),
      StorageService.getPackaging(),
      StorageService.getTransactions(),
      StorageService.getStockMutations(),
    ]);
    setProducts(updatedProds);
    setPackaging(updatedPkgs);
    setTransactions(updatedTrxs);
    setMutations(updatedMuts);

    // Reset cashier cart
    setCartItems([]);
    setDiscountValue(0);
    setTableOrQueueNumber('');
    setIsPaymentModalOpen(false);

    // Audio & Haptic & Confetti
    FeedbackService.success(settings.soundEnabled, settings.hapticEnabled);
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#F97316', '#EA580C', '#4ADE80', '#FDE047'],
      });
    } catch {
      // ignore
    }

    setLastTransaction(newTransaction);

    // Printer Handling
    if (shouldPrint) {
      const printRes = await PrinterService.printTransaction(newTransaction, settings);
      setIsPrintSuccess(printRes.success);
      setPrintStatusMessage(printRes.message);
    } else {
      setIsPrintSuccess(true);
      setPrintStatusMessage('Transaksi selesai tanpa cetak struk.');
    }

    setIsReceiptModalOpen(true);
  };

  // Update Queue Status
  const handleUpdateQueueStatus = async (transactionId: string, status: QueueStatus) => {
    await StorageService.updateQueueStatus(transactionId, status);
    const updatedTrxs = await StorageService.getTransactions();
    setTransactions(updatedTrxs);
  };

  // Reprint Receipt
  const handleReprintReceipt = async (transaction: Transaction) => {
    setLastTransaction(transaction);
    const printRes = await PrinterService.printTransaction(transaction, settings);
    setIsPrintSuccess(printRes.success);
    setPrintStatusMessage(printRes.message);
    setIsReceiptModalOpen(true);
  };

  // Void Transaction
  const handleVoidTransaction = async (transactionId: string, reason: string) => {
    await StorageService.voidTransaction(
      transactionId,
      reason,
      currentRole === 'admin' ? 'Admin' : currentShift?.cashierName || 'Kasir'
    );
    FeedbackService.warning(settings.soundEnabled, settings.hapticEnabled);
    const [updatedProds, updatedPkgs, updatedTrxs, updatedMuts] = await Promise.all([
      StorageService.getProducts(),
      StorageService.getPackaging(),
      StorageService.getTransactions(),
      StorageService.getStockMutations(),
    ]);
    setProducts(updatedProds);
    setPackaging(updatedPkgs);
    setTransactions(updatedTrxs);
    setMutations(updatedMuts);
  };

  // Save Product
  const handleSaveProduct = async (product: Product) => {
    const existingIndex = products.findIndex((p) => p.id === product.id);
    let updated: Product[];
    if (existingIndex >= 0) {
      updated = [...products];
      updated[existingIndex] = product;
    } else {
      updated = [product, ...products];
    }
    setProducts(updated);
    await StorageService.saveProducts(updated);
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    await StorageService.saveProducts(updated);
    FeedbackService.warning(false, settings.hapticEnabled);
  };

  // Save Category
  const handleSaveCategory = async (cat: Category) => {
    const updated = [...categories, cat];
    setCategories(updated);
    await StorageService.saveCategories(updated);
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    await StorageService.saveCategories(updated);
  };

  // Product Stock Mutation
  const handleAddProductMutation = async (
    productId: string,
    type: 'in' | 'out_damaged' | 'out_expired' | 'out_manual',
    quantity: number,
    note: string
  ) => {
    const targetProd = products.find((p) => p.id === productId);
    if (!targetProd) return;

    const delta = type === 'in' ? quantity : -quantity;
    const prev = targetProd.stock;
    const newStock = Math.max(0, prev + delta);

    const newMut: StockMutation = {
      id: `mut-${Date.now()}`,
      targetId: targetProd.id,
      targetName: targetProd.name,
      itemKind: 'product',
      type,
      quantity: delta,
      previousStock: prev,
      newStock,
      note,
      createdAt: new Date().toISOString(),
      createdBy: currentRole === 'admin' ? 'Admin' : currentShift?.cashierName || 'Kasir',
    };

    await StorageService.addStockMutation(newMut);

    const updatedProds = products.map((p) =>
      p.id === targetProd.id ? { ...p, stock: newStock } : p
    );
    setProducts(updatedProds);
    await StorageService.saveProducts(updatedProds);

    const updatedMuts = await StorageService.getStockMutations();
    setMutations(updatedMuts);
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
  };

  // Packaging Supplies Mutation (Restock / Damaged Cup & Seal)
  const handleAddPackagingMutation = async (
    packagingId: string,
    type: 'in' | 'out_damaged' | 'out_expired' | 'out_manual',
    quantity: number,
    note: string
  ) => {
    const targetPkg = packaging.find((p) => p.id === packagingId);
    if (!targetPkg) return;

    const delta = type === 'in' ? quantity : -quantity;
    const prev = targetPkg.stock;
    const newStock = Math.max(0, prev + delta);

    const newMut: StockMutation = {
      id: `mut-pkg-${Date.now()}`,
      targetId: targetPkg.id,
      targetName: targetPkg.name,
      itemKind: 'packaging',
      type,
      quantity: delta,
      previousStock: prev,
      newStock,
      note,
      createdAt: new Date().toISOString(),
      createdBy: currentRole === 'admin' ? 'Admin' : currentShift?.cashierName || 'Kasir',
    };

    await StorageService.addStockMutation(newMut);

    const updatedPkgs = packaging.map((p) =>
      p.id === targetPkg.id ? { ...p, stock: newStock } : p
    );
    setPackaging(updatedPkgs);
    await StorageService.savePackaging(updatedPkgs);

    const updatedMuts = await StorageService.getStockMutations();
    setMutations(updatedMuts);
    FeedbackService.beep(settings.soundEnabled, settings.hapticEnabled);
  };

  // Open Shift
  const handleOpenShift = async (cashierName: string, initialCash: number) => {
    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashierName,
      startTime: new Date().toISOString(),
      initialCash,
      status: 'open',
    };
    const updated = [newShift, ...shifts];
    setShifts(updated);
    setCurrentShift(newShift);
    await StorageService.saveShifts(updated);
    FeedbackService.success(settings.soundEnabled, settings.hapticEnabled);
  };

  // Close Shift
  const handleCloseShift = async (actualCash: number, notes: string) => {
    if (!currentShift) return;

    const shiftTrxs = transactions.filter((t) => {
      const tTime = new Date(t.createdAt).getTime();
      const sTime = new Date(currentShift.startTime).getTime();
      return tTime >= sTime && t.status === 'completed';
    });

    const shiftCashSales = shiftTrxs
      .filter((t) => t.paymentMethod === 'cash')
      .reduce((s, t) => s + t.total, 0);

    const shiftQrisSales = shiftTrxs
      .filter((t) => t.paymentMethod === 'qris')
      .reduce((s, t) => s + t.total, 0);

    const expected = currentShift.initialCash + shiftCashSales;
    const diff = actualCash - expected;

    const closed: Shift = {
      ...currentShift,
      endTime: new Date().toISOString(),
      expectedCash: expected,
      actualCash,
      difference: diff,
      totalCashSales: shiftCashSales,
      totalQrisSales: shiftQrisSales,
      transactionCount: shiftTrxs.length,
      status: 'closed',
      notes,
    };

    const updated = shifts.map((s) => (s.id === closed.id ? closed : s));
    setShifts(updated);
    setCurrentShift(null);
    await StorageService.saveShifts(updated);
    FeedbackService.success(settings.soundEnabled, settings.hapticEnabled);
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: StoreSettingsType) => {
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);
    FeedbackService.success(newSettings.soundEnabled, newSettings.hapticEnabled);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-[#F97316] animate-pulse mb-3">
          <span className="text-3xl">🍊</span>
        </div>
        <h2 className="text-lg font-black text-[#111111]">JERUK NONA POS</h2>
        <p className="text-xs text-zinc-400 mt-1">Memuat database kasir offline...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111111] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        currentShift={currentShift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        heldOrdersCount={heldOrders.length}
        onOpenHeldOrders={() => setIsHeldOrdersOpen(true)}
        activeQueueCount={activeQueueCount}
        onOpenQueue={() => setIsQueueViewOpen(!isQueueViewOpen)}
        settings={settings}
        onOpenPrinterSettings={() => {
          setIsQueueViewOpen(false);
          if (currentRole === 'admin') {
            setActiveTab('setting');
          } else {
            setIsRoleModalOpen(true);
          }
        }}
      />

      {/* Main Tab Views */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {/* If Queue View is toggled from Header, display Kitchen / Bar Order Queue */}
        {isQueueViewOpen ? (
          <OrderQueueDisplay
            transactions={transactions}
            onUpdateQueueStatus={handleUpdateQueueStatus}
            settings={settings}
          />
        ) : (
          <>
            {activeTab === 'kasir' && (
              <div className="relative h-full">
                <MenuGrid
                  products={products}
                  categories={categories}
                  cartItems={cartItems}
                  onAddToCart={handleQuickAddToCart}
                  onOpenAddonModal={handleOpenAddonModal}
                />

                {/* Bottom Sheet Cart */}
                <CartBottomSheet
                  cartItems={cartItems}
                  orderType={orderType}
                  onChangeOrderType={setOrderType}
                  tableOrQueueNumber={tableOrQueueNumber}
                  onChangeTableOrQueue={setTableOrQueueNumber}
                  onUpdateQuantity={handleUpdateCartQuantity}
                  onUpdateNotes={handleUpdateItemNotes}
                  onRemoveItem={handleRemoveFromCart}
                  onClearCart={handleClearCart}
                  onHoldOrder={handleHoldOrder}
                  onProceedToPayment={() => setIsPaymentModalOpen(true)}
                  discountType={discountType}
                  discountValue={discountValue}
                  onChangeDiscount={(type, val) => {
                    setDiscountType(type);
                    setDiscountValue(val);
                  }}
                  settings={settings}
                />
              </div>
            )}

            {activeTab === 'menu' && (
              <MenuManagement
                products={products}
                categories={categories}
                currentRole={currentRole}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onRequireAdmin={() => setIsRoleModalOpen(true)}
              />
            )}

            {activeTab === 'stok' && (
              <StockManagement
                products={products}
                packaging={packaging}
                mutations={mutations}
                onAddProductMutation={handleAddProductMutation}
                onAddPackagingMutation={handleAddPackagingMutation}
                currentRole={currentRole}
              />
            )}

            {activeTab === 'laporan' && (
              <SalesReports
                transactions={transactions}
                settings={settings}
                currentRole={currentRole}
                onReprintReceipt={handleReprintReceipt}
                onVoidTransaction={handleVoidTransaction}
                onRequireAdmin={() => setIsRoleModalOpen(true)}
              />
            )}

            {activeTab === 'setting' && (
              <StoreSettings
                settings={settings}
                onSaveSettings={handleSaveSettings}
                currentRole={currentRole}
                onRequireAdmin={() => setIsRoleModalOpen(true)}
                onRefreshData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setIsQueueViewOpen(false);
          setActiveTab(tab);
        }}
        lowStockCount={lowStockCount}
        currentRole={currentRole}
        onRequireAdmin={() => setIsRoleModalOpen(true)}
      />

      {/* Add-on Selection Modal */}
      <AddonModal
        isOpen={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        product={addonProduct}
        addons={addons}
        onConfirmAddToCart={handleConfirmAddToCart}
      />

      {/* Role Switcher & PIN Auth Modal */}
      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        adminPin={settings.adminPin || '1234'}
      />

      {/* Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentShift={currentShift}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        transactions={transactions}
        settings={settings}
      />

      {/* Held Orders Modal */}
      <HoldOrdersModal
        isOpen={isHeldOrdersOpen}
        onClose={() => setIsHeldOrdersOpen(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeOrder}
        onDeleteHeldOrder={handleDeleteHeldOrder}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartItems={cartItems}
        orderType={orderType}
        tableOrQueueNumber={tableOrQueueNumber}
        discountType={discountType}
        discountValue={discountValue}
        settings={settings}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Receipt Preview & Print Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        transaction={lastTransaction}
        settings={settings}
        printStatusMessage={printStatusMessage}
        isPrintSuccess={isPrintSuccess}
      />
    </div>
  );
}
