import React, { useMemo, useState } from 'react';
import {
  InventoryItem,
  MenuItem,
  Notification,
  Recipe,
  Role,
  StaffAccount,
  MenuCategory,
  Table,
  User,
  PaymentQrCodes,
  InventoryOptions,
  Order,
  ManualTransaction,
  PaymentMethod,
  RestaurantInfo,
  ReceiptSnapshot,
  MenuSection,
} from '../types';
import RoundedSelect from './RoundedSelect';
import ConfirmModal, { ConfirmDialogState } from './ConfirmModal';
import CsvImportModal from './CsvImportModal';
import {
  generateSampleMenuCSV,
  generateSampleInventoryCSV,
  generateSampleRecipesCSV,
  exportMenuToCSV,
  exportInventoryToCSV,
  exportRecipesToCSV,
  downloadCSV,
} from '../utils/csvHelper';

interface AdminScreenProps {
  currentUser: User;
  staff: StaffAccount[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  recipes: Recipe[];
  notifications: Notification[];
  paymentQrs: PaymentQrCodes;
  onUpdatePaymentQrs: (paymentQrs: PaymentQrCodes) => void;
  onUpdateStaff: (staff: StaffAccount[]) => void;
  onUpdateMenu: (items: MenuItem[]) => void;
  onUpdateRecipes: (recipes: Recipe[]) => void;
  onUpdateNotifications: (notifications: Notification[]) => void;
  tables: Table[];
  onUpdateTables: (tables: Table[]) => void;
  menuCategories: string[];
  onUpdateMenuCategories: (categories: string[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  inventoryOptions: InventoryOptions;
  onUpdateInventoryOptions: (options: InventoryOptions) => void;
  orders: Order[];
  onUpdateOrders?: (orders: Order[]) => void;
  manualTransactions: ManualTransaction[];
  onAddManualTransaction: (transaction: ManualTransaction) => void;
  onReverseOrder: (orderId: string, reason: string) => void;
  onReverseManualTransaction: (transactionId: string, reason: string) => void;
  restaurantInfo: RestaurantInfo;
  onUpdateRestaurantInfo: (info: RestaurantInfo) => void;
  onPrintReceipt?: (receipt: ReceiptSnapshot) => void;
}

type AdminTab = 'overview' | 'restaurant' | 'billing_review' | 'csv_import' | 'staff' | 'tables' | 'inventory' | 'menu' | 'recipes' | 'payment' | 'notifications';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export default function AdminScreen({
  currentUser,
  staff,
  menuItems,
  inventory,
  recipes,
  notifications,
  paymentQrs,
  onUpdatePaymentQrs,
  onUpdateStaff: updateStaff,
  onUpdateMenu,
  onUpdateRecipes,
  onUpdateNotifications,
  tables,
  onUpdateTables: updateTables,
  menuCategories,
  onUpdateMenuCategories,
  onUpdateInventory,
  inventoryOptions,
  onUpdateInventoryOptions,
  orders,
  onUpdateOrders,
  manualTransactions,
  onAddManualTransaction,
  onReverseOrder,
  onReverseManualTransaction,
  restaurantInfo,
  onUpdateRestaurantInfo,
  onPrintReceipt,
}: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const safeStaff = Array.isArray(staff) ? staff : [];
  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeMenuCategories = Array.isArray(menuCategories) ? menuCategories : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeManualTransactions = Array.isArray(manualTransactions) ? manualTransactions : [];
  const safePaymentQrs = paymentQrs || { eSewa: '', Khalti: '', 'Bank Transfer': '' };
  const safeInventoryOptions = inventoryOptions || { categories: [], units: [] };
  const safeRestaurantInfo = restaurantInfo || {
    name: 'FoodieHub',
    address: 'Kathmandu, Nepal',
    phone: '+977 9800000000',
    panNo: '',
    billGreeting: 'Thank you! Visit again.',
    billPrefix: 'FH-',
    qrCodeImage: '',
  };

  // Restaurant & Bill Setup state
  const [restName, setRestName] = useState(restaurantInfo?.name || 'FoodieHub');
  const [restAddress, setRestAddress] = useState(restaurantInfo?.address || 'Kathmandu, Nepal');
  const [restPhone, setRestPhone] = useState(restaurantInfo?.phone || '+977 9800000000');
  const [restPan, setRestPan] = useState(restaurantInfo?.panNo || '');
  const [restPrefix, setRestPrefix] = useState(restaurantInfo?.billPrefix || 'FH-');
  const [restGreeting, setRestGreeting] = useState(restaurantInfo?.billGreeting || 'Thank you! Visit again.');
  const [restQr, setRestQr] = useState(restaurantInfo?.qrCodeImage || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form states
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<Role>('Waiter');
  const [staffPin, setStaffPin] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemSection, setItemSection] = useState<'Kitchen' | 'Bar'>('Kitchen');
  const [itemCategory, setItemCategory] = useState<Exclude<MenuCategory, 'All'>>('Mains');
  const [itemDescription, setItemDescription] = useState('');
  const [customMenuCategory, setCustomMenuCategory] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeSection, setRecipeSection] = useState<'Kitchen' | 'Bar'>('Kitchen');
  const [recipeIngredientId, setRecipeIngredientId] = useState(safeInventory[0]?.id ?? '');
  const [recipeQuantity, setRecipeQuantity] = useState('1');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [tableName, setTableName] = useState('');
  const [tableSeats, setTableSeats] = useState('2');
  const [inventoryName, setInventoryName] = useState('');
  const [inventoryStock, setInventoryStock] = useState('0');
  const [inventoryThreshold, setInventoryThreshold] = useState('0');
  const [inventoryUnit, setInventoryUnit] = useState('pcs');
  const [inventoryCost, setInventoryCost] = useState('0');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCustomers, setManualCustomers] = useState('1');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>('Cash');
  const [manualOccurredAt, setManualOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [manualNote, setManualNote] = useState('');
  const [reversalTarget, setReversalTarget] = useState('');
  const [reversalReason, setReversalReason] = useState('');
  const [customInventoryCategory, setCustomInventoryCategory] = useState('');
  const [customInventoryUnit, setCustomInventoryUnit] = useState('');
  const [pendingStaffRemoval, setPendingStaffRemoval] = useState<StaffAccount | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogState | null>(null);

  // CSV Modal State & Handlers
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvModalDefaultType, setCsvModalDefaultType] = useState<'menu' | 'inventory' | 'recipes'>('menu');

  const openCsvModal = (type: 'menu' | 'inventory' | 'recipes') => {
    setCsvModalDefaultType(type);
    setIsCsvModalOpen(true);
  };

  const showCsvNotification = (title: string, message: string) => {
    onUpdateNotifications([
      {
        id: makeId('notif'),
        title,
        message,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        targetScreen: 'admin',
      },
      ...safeNotifications,
    ]);
  };

  const lowStockCount = useMemo(
    () => safeInventory.filter((item) => Number(item?.currentStock ?? 0) <= Number(item?.threshold ?? 0)).length,
    [safeInventory]
  );
  const unreadCount = safeNotifications.filter((notification) => !notification?.read).length;
  const paidOrders = safeOrders.filter((order) => order && order.status === 'paid');
  const activeOrders = safeOrders.filter((order) => order && order.status !== 'paid');

  const allRevenueEntries = [
    ...paidOrders.map((order) => ({
      id: order.id,
      kind: 'order' as const,
      amount: Number(order.total) || 0,
      customers: Number(order.customerCount) || 1,
      occurredAt: order.paidAt ?? new Date().toISOString(),
      label: order.id,
      paymentMethod: order.paymentMethod ?? 'Unknown',
      source: 'Completed order',
      reversed: Boolean(order.reversedAt),
    })),
    ...safeManualTransactions.map((transaction) => ({
      id: transaction.id,
      kind: 'manual' as const,
      amount: Number(transaction.amount) || 0,
      customers: Number(transaction.customerCount) || 1,
      occurredAt: transaction.occurredAt ?? new Date().toISOString(),
      label: transaction.note || transaction.id,
      paymentMethod: transaction.paymentMethod,
      source: 'Manual entry',
      reversed: Boolean(transaction.reversedAt),
    })),
  ];

  const revenueEntries = allRevenueEntries.filter((entry) => !entry.reversed);

  const totalRevenue = revenueEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const totalCustomers = revenueEntries.reduce((sum, entry) => sum + (Number(entry.customers) || 0), 0);

  const filterByDateRange = (startDate: Date) => {
    return revenueEntries.filter((entry) => {
      try {
        const time = new Date(entry.occurredAt).getTime();
        return !isNaN(time) && time >= startDate.getTime();
      } catch {
        return false;
      }
    });
  };

  const getDayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getWeekStart = () => {
    const d = getDayStart();
    d.setDate(d.getDate() - 7);
    return d;
  };

  const getMonthStart = () => {
    const d = getDayStart();
    d.setDate(d.getDate() - 30);
    return d;
  };

  const dailyRevenue = filterByDateRange(getDayStart()).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const weeklyRevenue = filterByDateRange(getWeekStart()).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const monthlyRevenue = filterByDateRange(getMonthStart()).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const dailyCustomers = filterByDateRange(getDayStart()).reduce((sum, entry) => sum + (Number(entry.customers) || 0), 0);
  const weeklyCustomers = filterByDateRange(getWeekStart()).reduce((sum, entry) => sum + (Number(entry.customers) || 0), 0);
  const monthlyCustomers = filterByDateRange(getMonthStart()).reduce((sum, entry) => sum + (Number(entry.customers) || 0), 0);

  const handleSaveRestaurantInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RestaurantInfo = {
      name: restName.trim() || 'FoodieHub',
      address: restAddress.trim(),
      phone: restPhone.trim(),
      panNo: restPan.trim(),
      billPrefix: restPrefix.trim() || 'FH-',
      billGreeting: restGreeting.trim() || 'Thank you! Visit again.',
      qrCodeImage: restQr.trim(),
    };
    onUpdateRestaurantInfo(updated);
    setSaveSuccessMsg('Restaurant details and billing template updated successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const uploadRestaurantQr = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setRestQr(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const addStaff = (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffName.trim() || staffPin.length !== 4) return;
    updateStaff([
      ...safeStaff,
      {
        id: makeId('staff'),
        name: staffName.trim(),
        role: staffRole,
        pin: staffPin,
        active: true,
      },
    ]);
    setStaffName('');
    setStaffPin('');
  };

  const confirmStaffRemoval = () => {
    if (!pendingStaffRemoval) return;
    updateStaff(safeStaff.filter((item) => item.id !== pendingStaffRemoval.id));
    setPendingStaffRemoval(null);
  };

  const addTable = (event: React.FormEvent) => {
    event.preventDefault();
    const seats = Number(tableSeats);
    if (!tableName.trim() || !Number.isFinite(seats) || seats <= 0) return;
    updateTables([
      ...tables,
      {
        id: makeId('table'),
        name: tableName.trim(),
        seats,
        status: 'available',
        orderTotal: 0,
      },
    ]);
    setTableName('');
    setTableSeats('2');
  };

  const addMenuItem = (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(itemPrice);
    if (!itemName.trim() || !Number.isFinite(price) || price < 0) return;
    onUpdateMenu([
      ...menuItems,
      {
        id: makeId('menu'),
        name: itemName.trim(),
        price,
        section: itemSection,
        category: itemCategory,
        description: itemDescription.trim(),
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
      },
    ]);
    setItemName('');
    setItemPrice('');
    setItemDescription('');
  };

  const addMenuCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const category = customMenuCategory.trim();
    if (!category || menuCategories.includes(category)) return;
    onUpdateMenuCategories([...menuCategories, category]);
    setCustomMenuCategory('');
  };

  const addRecipe = (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(recipeQuantity);
    const ingredient = inventory.find((item) => item.id === recipeIngredientId);
    if (!recipeName.trim() || !ingredient || !Number.isFinite(quantity) || quantity <= 0) return;

    onUpdateRecipes([
      ...recipes,
      {
        id: makeId('recipe'),
        name: recipeName.trim(),
        section: recipeSection,
        ingredients: [
          {
            inventoryItemId: ingredient.id,
            quantity,
            unit: ingredient.unit,
          },
        ],
        instructions: recipeInstructions.trim(),
      },
    ]);
    setRecipeName('');
    setRecipeQuantity('1');
    setRecipeInstructions('');
  };

  const addInventory = (event: React.FormEvent) => {
    event.preventDefault();
    const currentStock = Number(inventoryStock);
    const threshold = Number(inventoryThreshold);
    if (!inventoryName.trim() || !Number.isFinite(currentStock) || !Number.isFinite(threshold) || !inventoryUnit.trim()) return;
    onUpdateInventory([
      ...inventory,
      {
        id: makeId('inventory'),
        name: inventoryName.trim(),
        category: 'Pantry',
        currentStock,
        threshold,
        unit: inventoryUnit.trim(),
        unitCost: Number(inventoryCost) || 0,
        icon: 'inventory_2',
      },
    ]);
    setInventoryName('');
    setInventoryStock('0');
    setInventoryThreshold('0');
    setInventoryCost('0');
  };

  const addInventoryOption = (kind: keyof InventoryOptions, rawValue: string) => {
    const value = rawValue.trim();
    const currentList = safeInventoryOptions[kind] || [];
    if (!value || currentList.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onUpdateInventoryOptions({ ...safeInventoryOptions, [kind]: [...currentList, value] });
    if (kind === 'categories') setCustomInventoryCategory('');
    if (kind === 'units') setCustomInventoryUnit('');
  };

  const markAllRead = () => {
    onUpdateNotifications(safeNotifications.map((notification) => ({ ...notification, read: true })));
  };

  const updatePaymentQr = (method: keyof PaymentQrCodes, value: string) => {
    onUpdatePaymentQrs({ ...safePaymentQrs, [method]: value.trim() });
  };

  const uploadPaymentQr = (method: keyof PaymentQrCodes, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updatePaymentQr(method, typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'restaurant', label: 'Restaurant & Bill', icon: 'storefront' },
    { id: 'billing_review', label: 'Billing Review', icon: 'point_of_sale' },
    { id: 'csv_import', label: 'CSV Bulk Hub', icon: 'upload_file' },
    { id: 'staff', label: 'Staff & Access', icon: 'group_add' },
    { id: 'tables', label: 'Tables', icon: 'table_restaurant' },
    { id: 'inventory', icon: 'inventory_2', label: 'Inventory' },
    { id: 'menu', label: 'Menu & Bar', icon: 'restaurant_menu' },
    { id: 'recipes', label: 'Recipes', icon: 'menu_book' },
    { id: 'payment', label: 'Payment QR', icon: 'qr_code_2' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  ];

  return (
    <div id="admin-screen" className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-28 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Administration</p>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface mt-1">Restaurant Control Centre</h1>
          <p className="text-sm text-on-surface-variant mt-1">Configure restaurant info, custom billing, staff, menus, and monitor live passes.</p>
        </div>
        <button
          type="button"
          onClick={() => openCsvModal('menu')}
          className="px-4 py-2.5 bg-primary text-on-primary rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-surface-tint shadow-xs cursor-pointer w-fit"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          <span>Bulk Upload / Export (CSV)</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 pb-2 mb-6 sm:flex sm:overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-w-0 justify-center px-2 sm:px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
            {tab.id === 'notifications' && unreadCount > 0 && (
              <span className="rounded-full bg-error text-white px-1.5 py-0.5 text-[10px]">{unreadCount}</span>
            )}
            {tab.id === 'billing_review' && activeOrders.length > 0 && (
              <span className="rounded-full bg-primary-container text-on-primary-container px-1.5 py-0.5 text-[10px]">
                {activeOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Staff accounts', safeStaff.length, 'group'],
            ['Menu items', safeMenuItems.length, 'restaurant_menu'],
            ['Recipes', safeRecipes.length, 'menu_book'],
            ['Low stock items', lowStockCount, 'warning'],
          ].map(([label, value, icon]) => (
            <div key={label as string} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
              <span className="material-symbols-outlined text-primary">{icon}</span>
              <p className="text-3xl font-display font-extrabold text-on-surface mt-4">{value}</p>
              <p className="text-xs font-semibold text-on-surface-variant mt-1">{label}</p>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-4 bg-primary-container/30 border border-primary/20 rounded-2xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary">store</span>
            <div>
              <p className="text-sm font-bold text-on-surface">{safeRestaurantInfo.name || 'FoodieHub'} Management Hub</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Location: {safeRestaurantInfo.address || 'Kathmandu, Nepal'} • Phone: {safeRestaurantInfo.phone || 'N/A'} • Prefix: {safeRestaurantInfo.billPrefix || 'FH-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RESTAURANT & BILL SETUP */}
      {activeTab === 'restaurant' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="border-b border-border-light pb-3">
              <h2 className="font-display font-bold text-lg text-on-surface">Restaurant Profile & Bill Settings</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Customize the restaurant name, location/address, contact details, bill prefix, and footer greeting appearing on customer bills.
              </p>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-green-50 text-green-800 border border-green-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveRestaurantInfo} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={restName}
                    onChange={(e) => setRestName(e.target.value)}
                    placeholder="e.g. FoodieHub"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={restPhone}
                    onChange={(e) => setRestPhone(e.target.value)}
                    placeholder="e.g. +977 9800000000"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Address / Location</label>
                  <input
                    type="text"
                    value={restAddress}
                    onChange={(e) => setRestAddress(e.target.value)}
                    placeholder="e.g. 123 Market Road, Kathmandu"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">PAN / Tax Reg. No (Optional)</label>
                  <input
                    type="text"
                    value={restPan}
                    onChange={(e) => setRestPan(e.target.value)}
                    placeholder="e.g. 600123456"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Bill Serial Prefix</label>
                  <input
                    type="text"
                    value={restPrefix}
                    onChange={(e) => setRestPrefix(e.target.value)}
                    placeholder="e.g. FH-"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">Bill Footer Greeting</label>
                  <input
                    type="text"
                    value={restGreeting}
                    onChange={(e) => setRestGreeting(e.target.value)}
                    placeholder="e.g. Thank you! Visit again."
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">Primary Payment QR Code (Image)</label>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadRestaurantQr(e.target.files?.[0])}
                    className="text-xs text-on-surface-variant file:mr-2 file:rounded-full file:border-0 file:bg-primary-container file:px-3 file:py-2 file:font-bold"
                  />
                  {restQr && (
                    <button
                      type="button"
                      onClick={() => setRestQr('')}
                      className="text-xs font-bold text-error hover:underline"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
              </div>

              <button type="submit" className="primary-action w-full sm:w-auto self-start mt-2">
                Save Restaurant & Bill Settings
              </button>
            </form>
          </section>

          {/* Live Receipt Mockup Preview */}
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3">
            <h3 className="font-display font-bold text-sm text-on-surface">Live Bill Mockup Preview</h3>
            <div className="bg-[#FAF8F3] border border-dashed border-outline-variant/60 p-4 font-mono text-[11px] text-left text-on-surface-variant/90 rounded-xl shadow-xs">
              <div className="text-center font-bold text-on-surface uppercase text-sm">{restName || 'FOODIEHUB'}</div>
              {restAddress && <div className="text-center text-[9.5px] text-on-surface-variant">{restAddress}</div>}
              {restPan && <div className="text-center text-[9.5px] text-on-surface-variant">PAN: {restPan}</div>}
              {restPhone && <div className="text-center text-[9.5px] text-on-surface-variant">Phone: {restPhone}</div>}
              <div className="border-t border-dashed border-outline-variant/50 my-1"></div>
              <div className="flex justify-between"><span>Bill No:</span><span>{restPrefix || 'FH-'}1001</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>Table:</span><span>T1</span></div>
              <div className="flex justify-between"><span>Cashier:</span><span>{currentUser.name}</span></div>
              <div className="border-t border-dashed border-outline-variant/50 my-1"></div>
              <div className="grid grid-cols-4 font-bold text-[10px] pb-1 border-b border-dashed border-outline-variant/40">
                <span className="col-span-2">Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Amt</span>
              </div>
              <div className="grid grid-cols-4 text-[10px] py-1">
                <span className="col-span-2">Sample Dish</span>
                <span className="text-center">1</span>
                <span className="text-right">250.00</span>
              </div>
              <div className="border-t border-dashed border-outline-variant/50 my-1"></div>
              <div className="flex justify-between font-bold text-on-surface text-xs">
                <span>Grand Total:</span>
                <span>Rs. 250.00</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Payment Mode:</span>
                <span>Cash / QR</span>
              </div>
              {restQr && (
                <div className="mt-2 text-center">
                  <div className="text-[9px] font-bold">Scan & Pay</div>
                  <img src={restQr} alt="QR Preview" className="w-20 h-20 object-contain mx-auto border p-0.5 bg-white rounded my-1" />
                </div>
              )}
              <div className="border-t border-dashed border-outline-variant/50 my-1"></div>
              <div className="text-center text-[9.5px] italic text-on-surface-variant">{restGreeting || 'Thank you! Visit again.'}</div>
            </div>
          </section>
        </div>
      )}

      {/* 3. BILLING REVIEW TAB */}
      {activeTab === 'billing_review' && (
        <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-border-light pb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-on-surface">Active Dining Bills Review</h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Admin review of active table bills, live totals, and print guest checks.
              </p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary-container px-3 py-1 rounded-full">
              {safeTables.filter((t) => safeOrders.some((o) => o?.tableId === t.id && o?.status !== 'paid')).length} Tables Billing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeTables.map((table) => {
              const tableOrders = safeOrders.filter((o) => o?.tableId === table.id && o?.status !== 'paid');
              if (tableOrders.length === 0) return null;

              const totalItems = tableOrders.reduce((sum, o) => sum + (o?.items || []).reduce((s, it) => s + (it?.quantity || 0), 0), 0);
              const subtotal = tableOrders.reduce((sum, o) => sum + (Number(o?.subtotal) || 0), 0);
              const total = tableOrders.reduce((sum, o) => sum + (Number(o?.total) || 0), 0);

              return (
                <div key={table.id} className="bg-surface-container-low p-4 rounded-xl border border-border-light flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm text-on-surface">{table.name}</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded">
                        {tableOrders.length} Tickets
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">{totalItems} dishes ordered</p>
                  </div>

                  <div className="pt-2 border-t border-dashed border-border-light flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Bill Total</span>
                      <strong className="text-sm font-black text-primary">Rs. {total.toFixed(2)}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onPrintReceipt) {
                          const snapshot: ReceiptSnapshot = {
                            restaurantName: restName,
                            restaurantAddress: restAddress,
                            restaurantPhone: restPhone,
                            restaurantPanNo: restPan,
                            billGreeting: restGreeting,
                            printedAt: new Date().toLocaleString(),
                            billNumber: `${restPrefix}PREVIEW`,
                            orderNumber: tableOrders[0]?.id || 'ORD-01',
                            kotNumber: tableOrders[0]?.kotNumber,
                            botNumber: tableOrders[0]?.botNumber,
                            tableName: table.name,
                            cashierName: currentUser.name,
                            serverName: tableOrders[0]?.serverName || 'Staff',
                            paymentMethod: 'Guest Check (Review)',
                            items: tableOrders.flatMap(o => (o?.items || []).map(it => ({
                              name: safeMenuItems.find(m => m.id === it.menuItemId)?.name || 'Dish',
                              quantity: it.quantity,
                              rate: safeMenuItems.find(m => m.id === it.menuItemId)?.price || 0,
                              amount: (safeMenuItems.find(m => m.id === it.menuItemId)?.price || 0) * it.quantity,
                            }))),
                            subtotal,
                            discount: 0,
                            total,
                          };
                          onPrintReceipt(snapshot);
                        }
                      }}
                      className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-surface-tint cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      <span>Print Check</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. CSV BULK HUB TAB */}
      {activeTab === 'csv_import' && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-base">cloud_sync</span>
                <span>Fast Spreadsheet Ingestion</span>
              </div>
              <h2 className="text-xl font-bold font-display text-on-surface mt-1">Bulk CSV Management Hub</h2>
              <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                Upload comma-separated (.csv) spreadsheets to quickly register your entire restaurant menu, stock inventory, and multi-ingredient cooking recipes in one click.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCsvModal('menu')}
                className="px-4 py-2.5 bg-primary text-on-primary rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-surface-tint shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                <span>Open File Uploader</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Menu & Bar Items */}
            <div className="bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                </div>
                <h3 className="font-display font-bold text-base text-on-surface">Menu & Bar Catalog</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Import food and drink items with prices, categories, section (Kitchen/Bar), and descriptions.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>Current items in system:</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold">{safeMenuItems.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => openCsvModal('menu')}
                  className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-tint shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Upload Menu CSV</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCSV('foodiehub_sample_menu.csv', generateSampleMenuCSV())}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">download</span>
                    <span>Sample (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCSV(`foodiehub_menu_${new Date().toISOString().slice(0, 10)}.csv`, exportMenuToCSV(safeMenuItems))}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    <span>Export (.csv)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Inventory & Stock */}
            <div className="bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">inventory_2</span>
                </div>
                <h3 className="font-display font-bold text-base text-on-surface">Inventory & Stock Supplies</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Import stock counts, threshold reorder triggers, measurement units (kg, L, pcs), and unit costs.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <span>Current stock items:</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold">{safeInventory.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => openCsvModal('inventory')}
                  className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-tint shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Upload Inventory CSV</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCSV('foodiehub_sample_inventory.csv', generateSampleInventoryCSV())}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">download</span>
                    <span>Sample (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCSV(`foodiehub_inventory_${new Date().toISOString().slice(0, 10)}.csv`, exportInventoryToCSV(safeInventory))}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    <span>Export (.csv)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Recipes */}
            <div className="bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">menu_book</span>
                </div>
                <h3 className="font-display font-bold text-base text-on-surface">Dish Recipes & Preparation</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Import recipe formulas linking menu items to inventory ingredients, quantities, and prep instructions.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <span>Configured recipes:</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold">{safeRecipes.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => openCsvModal('recipes')}
                  className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-tint shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">upload</span>
                  <span>Upload Recipes CSV</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadCSV('foodiehub_sample_recipes.csv', generateSampleRecipesCSV())}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">download</span>
                    <span>Sample (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCSV(`foodiehub_recipes_${new Date().toISOString().slice(0, 10)}.csv`, exportRecipesToCSV(safeRecipes, safeInventory))}
                    className="py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    <span>Export (.csv)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CSV Format Reference Guide */}
          <div className="bg-surface-container-lowest border border-border-light rounded-3xl p-6 shadow-xs">
            <h3 className="font-display font-bold text-sm text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">table_chart</span>
              <span>CSV Column Structure Cheat Sheet</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-surface-container-low rounded-2xl border border-border-light flex flex-col gap-2">
                <p className="font-bold text-on-surface">1. Menu & Bar Columns</p>
                <code className="text-[11px] bg-white p-2 rounded-lg border border-border-light font-mono block overflow-x-auto text-primary">
                  Name, Price, Category, Section, Description, Image
                </code>
                <p className="text-[11px] text-on-surface-variant">
                  • <strong>Section</strong>: <code>Kitchen</code> (default) or <code>Bar</code>.
                  <br />• <strong>Price</strong>: Numeric amount (e.g. <code>220</code>).
                </p>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-border-light flex flex-col gap-2">
                <p className="font-bold text-on-surface">2. Inventory Columns</p>
                <code className="text-[11px] bg-white p-2 rounded-lg border border-border-light font-mono block overflow-x-auto text-primary">
                  Name, Category, CurrentStock, Threshold, Unit, UnitCost
                </code>
                <p className="text-[11px] text-on-surface-variant">
                  • <strong>Unit</strong>: <code>kg</code>, <code>L</code>, <code>pcs</code>, <code>bottle</code>, etc.
                  <br />• <strong>Threshold</strong>: Minimum low stock warning level.
                </p>
              </div>

              <div className="p-4 bg-surface-container-low rounded-2xl border border-border-light flex flex-col gap-2">
                <p className="font-bold text-on-surface">3. Recipe Columns</p>
                <code className="text-[11px] bg-white p-2 rounded-lg border border-border-light font-mono block overflow-x-auto text-primary">
                  DishName, Section, IngredientName, Quantity, Unit, Instructions
                </code>
                <p className="text-[11px] text-on-surface-variant">
                  • Multiple rows with the same <strong>DishName</strong> automatically combine into a multi-ingredient recipe.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display font-bold text-lg">Staff accounts</h2>
                <p className="text-xs text-on-surface-variant mt-1">Create role-based access for the team.</p>
              </div>
              <span className="text-xs font-bold text-primary">{safeStaff.length} accounts</span>
            </div>
            <div className="flex flex-col gap-2">
              {safeStaff.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low">
                  <div>
                    <p className="text-sm font-bold">{member.name}</p>
                    <p className="text-xs text-on-surface-variant">{member.role} · PIN protected</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateStaff(safeStaff.map((item) => item.id === member.id ? { ...item, active: !item.active } : item))}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer ${
                        member.active ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {member.active ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStaff(safeStaff.filter((item) => item.id !== member.id))}
                      className="text-error text-xs font-bold cursor-pointer hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {safeStaff.length === 0 && (
                <p className="text-sm text-on-surface-variant py-8 text-center">No staff accounts yet.</p>
              )}
            </div>
          </section>
          <form onSubmit={addStaff} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3 h-fit">
            <h2 className="font-display font-bold text-lg">Add staff member</h2>
            <input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Full name" className="input-field" required />
            <RoundedSelect
              value={staffRole}
              onChange={setStaffRole}
              ariaLabel="Staff role"
              options={[
                { value: 'Waiter', label: 'Waiter' },
                { value: 'Chef', label: 'Chef' },
                { value: 'Accountant', label: 'Accountant' },
                { value: 'Admin', label: 'Admin' },
              ]}
            />
            <input
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="4-digit PIN"
              className="input-field"
              required
            />
            <button type="submit" className="primary-action cursor-pointer">Create account</button>
          </form>
        </div>
      )}

      {/* 5. TABLES TAB */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <h2 className="font-display font-bold text-lg mb-4">Dining tables</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {safeTables.map((table) => (
                <div key={table.id} className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{table.name}</p>
                    <p className="text-xs text-on-surface-variant">{table.seats} seats · {table.status}</p>
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={table.seats}
                    onChange={(e) => updateTables(safeTables.map((item) => item.id === table.id ? { ...item, seats: Math.max(1, Number(e.target.value)) } : item))}
                    className="w-16 input-field px-2"
                  />
                  <button
                    type="button"
                    disabled={table.status !== 'available'}
                    onClick={() => updateTables(safeTables.filter((item) => item.id !== table.id))}
                    className="text-error text-xs font-bold disabled:opacity-30 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
          <form onSubmit={addTable} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3 h-fit">
            <h2 className="font-display font-bold text-lg">Add table</h2>
            <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Table name" className="input-field" required />
            <input value={tableSeats} onChange={(e) => setTableSeats(e.target.value)} type="number" min="1" placeholder="Seats" className="input-field" required />
            <button type="submit" className="primary-action cursor-pointer">Add table</button>
          </form>
        </div>
      )}

      {/* 6. INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-lg">Inventory items</h2>
              <button
                type="button"
                onClick={() => openCsvModal('inventory')}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>Import / Export CSV</span>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {safeInventory.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">{item.currentStock} {item.unit} · reorder at {item.threshold} {item.unit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateInventory(safeInventory.filter((entry) => entry.id !== item.id))}
                    className="text-error text-xs font-bold cursor-pointer hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {safeInventory.length === 0 && <p className="text-sm text-on-surface-variant text-center py-8">No inventory items configured.</p>}
            </div>
          </section>
          <form onSubmit={addInventory} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3 h-fit">
            <h2 className="font-display font-bold text-lg">Add inventory item</h2>
            <input value={inventoryName} onChange={(e) => setInventoryName(e.target.value)} placeholder="Ingredient or supply" className="input-field" required />
            <div className="grid grid-cols-2 gap-2">
              <input value={inventoryStock} onChange={(e) => setInventoryStock(e.target.value)} type="number" min="0" step="0.01" placeholder="Current stock" className="input-field" required />
              <input value={inventoryUnit} onChange={(e) => setInventoryUnit(e.target.value)} placeholder="Unit" className="input-field" required />
            </div>
            <input value={inventoryThreshold} onChange={(e) => setInventoryThreshold(e.target.value)} type="number" min="0" step="0.01" placeholder="Reorder threshold" className="input-field" required />
            <button type="submit" className="primary-action cursor-pointer">Add inventory item</button>
          </form>
        </div>
      )}

      {/* 7. MENU & BAR TAB */}
      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <section className="lg:col-span-2 bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-lg">Menu categories</h2>
                <p className="text-xs text-on-surface-variant mt-1">Categories appear in the menu filters and order screen.</p>
              </div>
              <form onSubmit={addMenuCategory} className="flex w-full sm:w-auto gap-2">
                <input value={customMenuCategory} onChange={(e) => setCustomMenuCategory(e.target.value)} placeholder="Custom category" className="input-field min-w-0" />
                <button type="submit" className="primary-action shrink-0 cursor-pointer">Add category</button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {safeMenuCategories.map((category) => (
                <span key={category} className="rounded-full bg-primary-container px-3 py-1.5 text-xs font-semibold">
                  {category}
                </span>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display font-bold text-lg">Menu catalogue</h2>
                <p className="text-xs text-on-surface-variant mt-1">Kitchen items (KOT) & Bar items (BOT).</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary">{safeMenuItems.length} items</span>
                <button
                  type="button"
                  onClick={() => openCsvModal('menu')}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Import / Export CSV</span>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {safeMenuItems.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-surface-container-low">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 inline-block ${
                        item.section === 'Bar' ? 'bg-amber-100 text-amber-900' : 'bg-primary-container text-on-primary-container'
                      }`}>
                        {item.section ?? 'Kitchen'} · {item.category}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs font-bold text-primary">Rs. {item.price.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateMenu(safeMenuItems.filter((entry) => entry.id !== item.id))}
                        className="text-error text-[11px] font-bold cursor-pointer hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <form onSubmit={addMenuItem} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3 h-fit">
            <h2 className="font-display font-bold text-lg">Add Kitchen / Bar Item</h2>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name" className="input-field" required />
            <div className="grid grid-cols-2 gap-2">
              <input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="Price (Rs.)" className="input-field" required />
              <RoundedSelect
                value={itemSection}
                onChange={setItemSection}
                ariaLabel="Menu section"
                options={[
                  { value: 'Kitchen', label: 'Kitchen (KOT)' },
                  { value: 'Bar', label: 'Bar (BOT)' },
                ]}
              />
            </div>
            <RoundedSelect
              value={itemCategory}
              onChange={setItemCategory}
              ariaLabel="Menu category"
              options={safeMenuCategories.map((value) => ({ value, label: value }))}
            />
            <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="Description" className="input-field min-h-20" />
            <button type="submit" className="primary-action cursor-pointer">Add to catalogue</button>
          </form>
        </div>
      )}

      {/* 8. RECIPES TAB */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-bold text-lg">Recipes & ingredients</h2>
              <button
                type="button"
                onClick={() => openCsvModal('recipes')}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>Import / Export CSV</span>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {safeRecipes.map((recipe) => (
                <div key={recipe.id} className="p-3 rounded-xl bg-surface-container-low">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm font-bold">{recipe.name}</p>
                    <span className="text-[11px] font-bold text-primary">{recipe.section}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {recipe.ingredients.map((ingredient) => `${safeInventory.find((item) => item.id === ingredient.inventoryItemId)?.name ?? 'Ingredient'} · ${ingredient.quantity} ${ingredient.unit}`).join(', ')}
                  </p>
                </div>
              ))}
              {safeRecipes.length === 0 && <p className="text-sm text-on-surface-variant py-8 text-center">No recipes created yet.</p>}
            </div>
          </section>
          <form onSubmit={addRecipe} className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs flex flex-col gap-3 h-fit">
            <h2 className="font-display font-bold text-lg">Add recipe</h2>
            <input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Recipe name" className="input-field" required />
            <RoundedSelect
              value={recipeSection}
              onChange={setRecipeSection}
              ariaLabel="Recipe section"
              options={[
                { value: 'Kitchen', label: 'Kitchen' },
                { value: 'Bar', label: 'Bar' },
              ]}
            />
            <RoundedSelect
              value={recipeIngredientId}
              onChange={setRecipeIngredientId}
              ariaLabel="Recipe ingredient"
              options={safeInventory.map((item) => ({ value: item.id, label: `${item.name} (${item.unit})` }))}
            />
            <input value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Ingredient quantity" className="input-field" required />
            <textarea value={recipeInstructions} onChange={(e) => setRecipeInstructions(e.target.value)} placeholder="Preparation instructions" className="input-field min-h-20" />
            <button type="submit" className="primary-action cursor-pointer">Save recipe</button>
          </form>
        </div>
      )}

      {/* 9. NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-display font-bold text-lg">Operational notifications</h2>
              <p className="text-xs text-on-surface-variant mt-1">Low stock, kitchen, payment, and staff events belong here.</p>
            </div>
            <button type="button" onClick={markAllRead} className="text-xs font-bold text-primary hover:underline cursor-pointer">
              Mark all read
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {safeNotifications.map((notification) => (
              <div key={notification.id} className={`p-3 rounded-xl border ${notification.read ? 'bg-surface-container-low border-transparent' : 'bg-primary-container/20 border-primary/20'}`}>
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-bold">{notification.title}</p>
                  <span className="text-[10px] text-on-surface-variant">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{notification.message}</p>
              </div>
            ))}
            {safeNotifications.length === 0 && <p className="text-sm text-on-surface-variant py-8 text-center">No notifications yet.</p>}
          </div>
        </section>
      )}

      {/* 10. PAYMENT QR TAB */}
      {activeTab === 'payment' && (
        <section className="bg-surface-container-lowest border border-border-light rounded-2xl p-5 shadow-xs">
          <div className="mb-5">
            <h2 className="font-display font-bold text-lg">Payment QR codes</h2>
            <p className="text-xs text-on-surface-variant mt-1">Upload receiving QR images for QR payment mode.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['eSewa', 'Khalti', 'Bank Transfer'] as const).map((method) => (
              <div key={method} className="rounded-2xl bg-surface-container-low p-4 flex flex-col gap-3">
                <h3 className="text-sm font-bold">{method}</h3>
                <input value={safePaymentQrs[method] || ''} onChange={(e) => updatePaymentQr(method, e.target.value)} placeholder="Paste image URL or upload below" className="input-field" />
                <input type="file" accept="image/*" onChange={(e) => uploadPaymentQr(method, e.target.files?.[0])} className="text-xs text-on-surface-variant file:mr-2 file:rounded-full file:border-0 file:bg-primary-container file:px-3 file:py-2 file:font-bold" />
                {safePaymentQrs[method] && <img src={safePaymentQrs[method]} alt={`${method} QR preview`} className="w-36 h-36 object-contain bg-white rounded-xl border border-border-light self-center" />}
                <button type="button" onClick={() => updatePaymentQr(method, '')} disabled={!safePaymentQrs[method]} className="text-error text-xs font-bold disabled:opacity-40 cursor-pointer">Remove QR</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Remove staff confirmation */}
      {pendingStaffRemoval && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-surface-container-lowest rounded-2xl border border-border-light shadow-xl max-w-md w-full p-6">
            <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mb-4"><span className="material-symbols-outlined">person_remove</span></div>
            <h2 className="font-display font-bold text-xl">Remove staff account?</h2>
            <p className="text-sm text-on-surface-variant mt-2">Remove <strong className="text-on-surface">{pendingStaffRemoval.name}</strong> ({pendingStaffRemoval.role})? They will no longer be able to sign in.</p>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setPendingStaffRemoval(null)} className="flex-1 py-3 bg-surface-container text-on-surface font-semibold text-sm rounded-xl cursor-pointer">Cancel</button>
              <button type="button" onClick={confirmStaffRemoval} className="flex-1 py-3 bg-error text-white font-semibold text-sm rounded-xl cursor-pointer">Remove account</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal dialog={confirmModal} onClose={() => setConfirmModal(null)} />

      {/* CSV Bulk Import / Export Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        defaultType={csvModalDefaultType}
        menuItems={safeMenuItems}
        onUpdateMenu={onUpdateMenu}
        menuCategories={safeMenuCategories}
        onUpdateMenuCategories={onUpdateMenuCategories}
        inventory={safeInventory}
        onUpdateInventory={onUpdateInventory}
        inventoryOptions={safeInventoryOptions}
        onUpdateInventoryOptions={onUpdateInventoryOptions}
        recipes={safeRecipes}
        onUpdateRecipes={onUpdateRecipes}
        onShowNotification={showCsvNotification}
      />
    </div>
  );
}
