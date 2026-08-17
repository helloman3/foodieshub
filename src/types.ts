export type Role = 'Waiter' | 'Chef' | 'Accountant' | 'Admin';

export type PaymentMethod = 'Cash' | 'QR' | 'eSewa' | 'Khalti' | 'Bank Transfer';

export type PaymentQrCodes = Record<string, string>;

export interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
  panNo?: string;
  billGreeting: string;
  billPrefix: string;
  qrCodeImage?: string;
  qrPayload?: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  role: Role;
  pin: string;
  active: boolean;
  createdAt: string;
}

export interface User {
  name: string;
  role: Role;
  avatar: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Table {
  id: string;
  name: string;
  seats: number;
  status: TableStatus;
  guests?: number;
  seatedTime?: string;
  orderTotal?: number;
  reservationInfo?: string;
  serverName?: string;
}

export type MenuCategory = 'All' | string;
export type MenuSection = 'Kitchen' | 'Bar';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<MenuCategory, 'All'>;
  section?: MenuSection;
  description: string;
  image: string;
  fallbackImage?: string;
}

export interface CartItem {
  menuItemId: string;
  quantity: number;
  notes: string;
}

export interface Order {
  id: string;
  tableId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount?: number;
  discountReason?: string;
  billNumber?: string;
  kotNumber?: string;
  botNumber?: string;
  total: number;
  status: 'pending' | 'cooking' | 'ready' | 'served' | 'paid';
  serverName: string;
  timestamp: string;
  paymentMethod?: string;
  paidAt?: string;
  completedBy?: string;
  customerCount?: number;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Meats' | 'Produce' | 'Pantry' | 'Bakery' | string;
  currentStock: number;
  threshold: number;
  unit: string;
  icon: string;
  unitCost?: number;
}

export interface InventoryOptions {
  categories: string[];
  units: string[];
}

export interface RecipeIngredient {
  inventoryItemId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  menuItemId?: string;
  section: MenuSection;
  ingredients: RecipeIngredient[];
  instructions: string;
  yieldAmount: number;
  yieldUnit: string;
}

export type NotificationType = 'info' | 'warning' | 'success' | 'critical';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  tableId?: string;
  orderId?: string;
  targetScreen?: 'floorplan' | 'menu' | 'billing' | 'kitchen' | 'inventory' | 'admin' | 'profile';
  itemId?: string;
}

export interface ManualTransaction {
  id: string;
  amount: number;
  customerCount: number;
  paymentMethod: PaymentMethod;
  occurredAt: string;
  note: string;
  createdBy: string;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
}

export type PrinterPaperFormat = 'auto' | '58mm' | '80mm' | 'a4';

export type TicketType = 'KOT' | 'BOT';

export interface TicketItem {
  name: string;
  quantity: number;
  notes?: string;
  section?: MenuSection;
}

export interface TicketSnapshot {
  type: TicketType;
  ticketNumber: string;
  orderNumber: string;
  tableName: string;
  printedAt: string;
  serverName: string;
  orderType: string;
  items: TicketItem[];
  totalItems: number;
}

export interface ReceiptSnapshot {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantPanNo?: string;
  billGreeting?: string;
  printedAt: string;
  billNumber: string;
  orderNumber: string;
  kotNumber?: string;
  botNumber?: string;
  tableName: string;
  cashierName: string;
  serverName: string;
  paymentMethod: string;
  tenderAmount?: number;
  changeAmount?: number;
  items: Array<{ name: string; quantity: number; rate: number; amount: number; notes?: string }>;
  subtotal: number;
  discount: number;
  total: number;
  qrCode?: string;
}

