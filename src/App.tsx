import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  Table,
  MenuItem,
  CartItem,
  Order,
  InventoryItem,
  TableStatus,
  Notification,
  Recipe,
  StaffAccount,
  PaymentQrCodes,
  InventoryOptions,
  ManualTransaction,
  RestaurantInfo,
  TicketSnapshot,
  TicketItem,
  ReceiptSnapshot,
} from './types';
import { getAvatarFallback } from './profileAvatar';
import { INITIAL_TABLES, INITIAL_MENU, INITIAL_INVENTORY, INITIAL_STAFF } from './data';
import {
  calculateOrderTotals,
  generateOrderId,
  getTableOrderTotal,
  deductStockForCartItems,
  restoreStockForCartItems,
} from './constants';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import BottomNavBar from './components/BottomNavBar';
import InstallAppButton from './components/InstallAppButton';
import FloorPlanScreen from './components/FloorPlanScreen';
import MenuScreen from './components/MenuScreen';
import BillingScreen from './components/BillingScreen';
import InventoryScreen from './components/InventoryScreen';
import KitchenScreen from './components/KitchenScreen';
import AdminScreen from './components/AdminScreen';
import ProfileScreen from './components/ProfileScreen';
import FoodieHubLogo from './components/FoodieHubLogo';
import { usePersistentState } from './hooks/usePersistentState';

const DEFAULT_RESTAURANT_INFO: RestaurantInfo = {
  name: 'FoodieHub',
  address: 'Kathmandu, Nepal',
  phone: '+977 9800000000',
  panNo: '',
  billGreeting: 'Thank you! Visit again.',
  billPrefix: 'FH-',
  qrCodeImage: '',
};

const DEFAULT_INVENTORY_OPTIONS: InventoryOptions = {
  categories: ['Meats', 'Produce', 'Pantry', 'Bakery', 'Dairy', 'Drinks'],
  units: ['kg', 'pcs', 'L', 'bags'],
};

const DEFAULT_MENU_CATEGORIES = [
  'Chicken Starters', 'Veg Starters', 'Pizza', 'Fried Rice', 'Sekuwa', 'Khaja Sets',
  'Combos', 'Nachos & Tacos', 'Noodles', 'Wings', 'Momo', 'Pakaunda', 'Popcorn',
  'Burger & Hotdogs', 'Sandwich', 'Bar', 'Mains',
];

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  tableId?: string;
  orderId?: string;
}

const formatRelativeTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 45) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return '1m ago';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour === 1) return '1h ago';
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

function useSessionState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Best-effort local storage
    }
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [currentUser, setCurrentUser] = useSessionState<User | null>('foodiehub.session.user', null);
  const [activeScreen, setActiveScreen] = useSessionState<string>('foodiehub.session.screen', 'floorplan');
  const [tables, setTables] = usePersistentState<Table[]>('foodiehub.v4.tables',
    INITIAL_TABLES.map((table) => ({
      ...table,
      status: 'available' as TableStatus,
      guests: undefined,
      seatedTime: undefined,
      orderTotal: 0,
      reservationInfo: undefined,
    }))
  );
  const [menuItems, setMenuItems] = usePersistentState<MenuItem[]>('foodiehub.v5.menu', INITIAL_MENU);
  const [menuCategories, setMenuCategories] = usePersistentState<string[]>('foodiehub.v1.menu-categories', DEFAULT_MENU_CATEGORIES);
  const [inventory, setInventory] = usePersistentState<InventoryItem[]>('foodiehub.v4.inventory', INITIAL_INVENTORY);
  const [savedInventoryOptions, setSavedInventoryOptions] = usePersistentState<InventoryOptions>('foodiehub.v2.inventory-options', DEFAULT_INVENTORY_OPTIONS);
  const safeInventoryOptions = savedInventoryOptions || DEFAULT_INVENTORY_OPTIONS;
  const inventoryOptions: InventoryOptions = {
    categories: Array.from(new Set([...DEFAULT_INVENTORY_OPTIONS.categories, ...(safeInventoryOptions?.categories || [])])),
    units: Array.from(new Set([...DEFAULT_INVENTORY_OPTIONS.units, ...(safeInventoryOptions?.units || [])])),
  };
  const [activeTableId, setActiveTableId] = useSessionState<string | null>('foodiehub.session.table', null);

  // Cart state stored per table ID and persisted in storage
  const [tableCarts, setTableCarts] = usePersistentState<Record<string, CartItem[]>>('foodiehub.v2.table-carts', {});

  // Clean empty orders database
  const [orders, setOrders] = usePersistentState<Order[]>('foodiehub.v4.orders', []);
  const [manualTransactions, setManualTransactions] = usePersistentState<ManualTransaction[]>('foodiehub.v2.manual-transactions', []);

  const [notifications, setNotifications] = usePersistentState<Notification[]>('foodiehub.v4.notifications', []);
  const [staff, setStaff] = usePersistentState<StaffAccount[]>('foodiehub.v4.staff', INITIAL_STAFF);
  const [recipes, setRecipes] = usePersistentState<Recipe[]>('foodiehub.v4.recipes', []);
  const [paymentQrs, setPaymentQrs] = usePersistentState<PaymentQrCodes>('foodiehub.v1.payment-qrs', {
    eSewa: '',
    Khalti: '',
    'Bank Transfer': '',
  });

  // Persistent Restaurant Profile & Bill Settings
  const [restaurantInfo, setRestaurantInfo] = usePersistentState<RestaurantInfo>('foodiehub.v1.restaurant-info', DEFAULT_RESTAURANT_INFO);
  
  // Safe cleanup of legacy test keys and outdated browser cache storage
  useEffect(() => {
    try {
      const legacyKeys = [
        'foodiehub.v3.tables',
        'foodiehub.v3.orders',
        'foodiehub.v3.inventory',
        'foodiehub.v3.recipes',
        'foodiehub.v3.staff',
        'foodiehub.v3.notifications',
        'foodiehub.v1.table-carts',
        'foodiehub.v1.manual-transactions',
      ];
      legacyKeys.forEach((k) => {
        try { localStorage.removeItem(k); } catch {}
      });

      // Clear old Service Worker asset caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            if (name !== 'foodiehub-pos-v6') {
              caches.delete(name);
            }
          });
        });
      }
    } catch {}
  }, []);

  // Notification panel & filter state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const notificationContainerRef = useRef<HTMLDivElement>(null);

  // Highlighting targets
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);

  const [syncConflicts, setSyncConflicts] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Root Print Snapshots (KOT/BOT and Bill)
  const [ticketToPrint, setTicketToPrint] = useState<TicketSnapshot | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<ReceiptSnapshot | null>(null);

  const seenNotificationIds = useRef<Set<string>>(new Set());
  const notificationSoundUser = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Unified Print Prompt Handler (KOT, BOT, Bill)
  useEffect(() => {
    if (!ticketToPrint && !receiptToPrint) return;
    const printTimer = window.setTimeout(() => window.print(), 120);
    const clearPrinted = () => {
      setTicketToPrint(null);
      setReceiptToPrint(null);
    };
    window.addEventListener('afterprint', clearPrinted);
    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener('afterprint', clearPrinted);
    };
  }, [ticketToPrint, receiptToPrint]);

  // Outside-click & Escape handler to close notification dropdown smoothly across laptop mouse, trackpad, and touch
  useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    // Use capture phase on window so laptop mouse clicks and trackpad taps are caught reliably
    window.addEventListener('mousedown', handleClickOutside, { capture: true });
    window.addEventListener('pointerdown', handleClickOutside, { capture: true });
    window.addEventListener('click', handleClickOutside, { capture: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside, { capture: true });
      window.removeEventListener('pointerdown', handleClickOutside, { capture: true });
      window.removeEventListener('click', handleClickOutside, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  // Unlock AudioContext on first user interaction so audio plays reliably
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') {
          void audioContextRef.current.resume();
        }
      } catch {
        // Ignored
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const handleSyncConflict = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key) return;
      setSyncConflicts((current) => current.includes(key) ? current : [...current, key]);
    };
    const handleSyncConflictResolved = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key) return;
      setSyncConflicts((current) => current.filter((item) => item !== key));
    };
    window.addEventListener('foodiehub-sync-conflict', handleSyncConflict);
    window.addEventListener('foodiehub-sync-conflict-resolved', handleSyncConflictResolved);
    return () => {
      window.removeEventListener('foodiehub-sync-conflict', handleSyncConflict);
      window.removeEventListener('foodiehub-sync-conflict-resolved', handleSyncConflictResolved);
    };
  }, []);

  const resolveSyncConflict = (key: string, resolution: 'server' | 'local') => {
    window.dispatchEvent(new CustomEvent('foodiehub-sync-resolve', { detail: { key, resolution } }));
  };

  const playNotificationSound = (type: ToastItem['type'] = 'info') => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current || new AudioContextClass();
      if (context.state === 'suspended') {
        void context.resume();
      }

      const now = context.currentTime;

      if (type === 'success') {
        // High-end POS 3-chord major chime (C5 -> E5 -> G5)
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.09);
          gain.gain.setValueAtTime(0.0001, now + i * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.09 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now + i * 0.09);
          osc.stop(now + i * 0.09 + 0.35);
        });
      } else if (type === 'warning') {
        // Warm 2-tone alert chime (A4 -> F4)
        const notes = [440, 349.23];
        notes.forEach((freq, i) => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(0.0001, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.3);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.3);
        });
      } else if (type === 'critical') {
        // Urgent alert
        [587.33, 587.33].forEach((freq, i) => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(0.0001, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.2);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.2);
        });
      } else {
        // Standard pleasant 2-tone kitchen dinner bell (D5 -> A5)
        const notes = [587.33, 880];
        notes.forEach((freq, i) => {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.0001, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.4);
        });
      }
    } catch {
      // Audio playback best-effort
    }
  };

  const showToast = (title: string, message: string, type: ToastItem['type'] = 'info', tableId?: string, orderId?: string) => {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((current) => [{ id: toastId, title, message, type, tableId, orderId }, ...current.slice(0, 1)]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== toastId));
    }, 3800);
  };

  useEffect(() => {
    if (!currentUser) return;
    const userKey = `${currentUser.name}:${currentUser.role}`;
    if (notificationSoundUser.current !== userKey) {
      notificationSoundUser.current = userKey;
      seenNotificationIds.current = new Set(notifications.map((notification) => notification.id));
      return;
    }
    const newNotifications = notifications.filter((notification) => !seenNotificationIds.current.has(notification.id));
    newNotifications.forEach((notification) => {
      seenNotificationIds.current.add(notification.id);
      showToast(notification.title, notification.message, notification.type, notification.tableId, notification.orderId);
    });

    const shouldPlay = newNotifications.some((notification) =>
      (currentUser.role === 'Chef' && (notification.title.includes('kitchen') || notification.title.includes('Order sent'))) ||
      (currentUser.role === 'Waiter' && (notification.title.includes('ready') || notification.title.includes('service') || notification.title.includes('void') || notification.title.includes('pass'))) ||
      currentUser.role === 'Admin' ||
      currentUser.role === 'Accountant'
    );
    if (shouldPlay && newNotifications.length > 0) {
      const primaryType = newNotifications[0]?.type || 'info';
      playNotificationSound(primaryType);
    }
  }, [currentUser, notifications]);

  const handleNavigate = (screen: string) => {
    if (screen === 'profile') {
      setActiveScreen('profile');
      return;
    }
    if (currentUser?.role === 'Accountant' && screen !== 'billing') {
      return;
    }
    if (currentUser?.role === 'Chef' && screen !== 'kitchen' && screen !== 'inventory') {
      return;
    }
    if (currentUser?.role === 'Waiter' && (screen === 'kitchen' || screen === 'inventory' || screen === 'admin')) {
      return;
    }
    if (screen === 'admin' && currentUser?.role !== 'Admin') {
      return;
    }
    setActiveScreen(screen);
  };

  const handleUpdateStaffPin = (staffName: string, newPin: string) => {
    setStaff((prev) => {
      const existing = prev.find((s) => s.name.toLowerCase() === staffName.toLowerCase());
      if (existing) {
        return prev.map((s) => s.name.toLowerCase() === staffName.toLowerCase() ? { ...s, pin: newPin } : s);
      }
      return [
        ...prev,
        {
          id: `staff-${Date.now()}`,
          name: staffName,
          role: currentUser?.role || 'Waiter',
          pin: newPin,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ];
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen('floorplan');
    try {
      localStorage.removeItem('foodiehub.session.user');
      localStorage.removeItem('foodiehub.session.screen');
      localStorage.removeItem('foodiehub.session.table');
    } catch {
      // Best-effort
    }
  };

  const unreadNotifications = notifications.filter((notification) => !notification.read);

  const handleSelectTable = (tableId: string) => {
    setActiveTableId(tableId);
  };

  const handleUpdateInventory = (updatedInventory: InventoryItem[]) => {
    const newlyLow = updatedInventory.filter((item) => {
      const previous = inventory.find((previousItem) => previousItem.id === item.id);
      return item.currentStock <= item.threshold && (previous?.currentStock ?? item.threshold + 1) > (previous?.threshold ?? item.threshold);
    });
    setInventory(updatedInventory);
    if (newlyLow.length > 0) {
      setNotifications((previousNotifications) => [
        ...newlyLow.map((item) => ({
          id: `low-stock-${item.id}-${Date.now()}`,
          title: 'Low stock alert',
          message: `${item.name} is at ${item.currentStock} ${item.unit}; reorder threshold is ${item.threshold} ${item.unit}.`,
          type: 'warning' as const,
          createdAt: new Date().toISOString(),
          read: false,
          targetScreen: 'inventory' as const,
          itemId: item.id,
        })),
        ...previousNotifications.filter((notification) => !newlyLow.some((item) => notification.id.startsWith(`low-stock-${item.id}`))),
      ]);
    }
  };

  // Waiter navigating to order menu for a table
  const handleNavigateToOrder = (tableId: string) => {
    setActiveTableId(tableId);
    setActiveScreen('menu');
  };

  const handleNavigateToBilling = (tableId: string) => {
    setActiveTableId(tableId);
    setActiveScreen('billing');
  };

  // Waiter or Admin unseating an accidental / empty table back to Available
  const handleUnseatTable = (tableId: string) => {
    const tableUnpaid = orders.filter((o) => o.tableId === tableId && o.status !== 'paid');
    if (tableUnpaid.length > 0) {
      setNotifications((prev) => [
        {
          id: generateOrderId(),
          title: 'Cannot Unseat Table',
          message: `Table ${tableId} has ${tableUnpaid.length} active order(s). Please void tickets or settle bill first.`,
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
          tableId,
        },
        ...prev,
      ]);
      return;
    }

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'available' as TableStatus,
              guests: undefined,
              seatedTime: undefined,
              orderTotal: 0,
              reservationInfo: undefined,
            }
          : t
      )
    );

    setTableCarts((prev) => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });

    setNotifications((prev) => [
      {
        id: generateOrderId(),
        title: 'Table Released',
        message: `Table ${tableId} has been reset to Available.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId,
        targetScreen: 'floorplan',
      },
      ...prev,
    ]);

    setActiveScreen('floorplan');
  };

  // Smart notification click handler: marks read and navigates directly to target table and screen
  const handleNotificationClick = (notification: Notification) => {
    // 1. Mark this notification as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );

    // 2. Extract or resolve target tableId
    let targetTableId = notification.tableId;
    if (!targetTableId) {
      const match = notification.message.match(/Table\s+([A-Za-z0-9_-]+)/i) ||
                    notification.title.match(/Table\s+([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        targetTableId = match[1];
      }
    }

    // 3. Extract or resolve target orderId
    let targetOrderId = notification.orderId;
    if (!targetOrderId) {
      const orderMatch = notification.message.match(/Order\s+([A-Za-z0-9_-]+)/i) ||
                         notification.title.match(/Order\s+([A-Za-z0-9_-]+)/i);
      if (orderMatch && orderMatch[1]) {
        const partial = orderMatch[1];
        const foundOrder = orders.find(
          (o) => o.id === partial || o.id.endsWith(partial) || o.id.slice(-6) === partial
        );
        if (foundOrder) targetOrderId = foundOrder.id;
      }
    }

    if (targetTableId) {
      setActiveTableId(targetTableId);
      setHighlightedTableId(targetTableId);
      setTimeout(() => setHighlightedTableId(null), 3000);
    }

    if (targetOrderId) {
      setHighlightedOrderId(targetOrderId);
      setTimeout(() => setHighlightedOrderId(null), 3500);
    }

    // 4. Resolve destination screen
    let destinationScreen = notification.targetScreen;

    if (!destinationScreen) {
      const titleLower = notification.title.toLowerCase();
      const msgLower = notification.message.toLowerCase();

      if (
        titleLower.includes('ready') ||
        msgLower.includes('ready for pickup') ||
        titleLower.includes('cooking') ||
        titleLower.includes('kitchen pass')
      ) {
        if (currentUser?.role === 'Chef' || currentUser?.role === 'Waiter' || currentUser?.role === 'Admin') {
          destinationScreen = 'kitchen';
        } else {
          destinationScreen = 'floorplan';
        }
      } else if (
        titleLower.includes('order sent') ||
        titleLower.includes('order arrived') ||
        titleLower.includes('new order')
      ) {
        if (currentUser?.role === 'Chef') {
          destinationScreen = 'kitchen';
        } else {
          destinationScreen = 'floorplan';
        }
      } else if (
        titleLower.includes('payment') ||
        titleLower.includes('bill') ||
        titleLower.includes('settled')
      ) {
        destinationScreen = 'billing';
      } else if (titleLower.includes('stock') || titleLower.includes('inventory')) {
        destinationScreen = currentUser?.role === 'Admin' ? 'admin' : 'inventory';
      } else if (titleLower.includes('served')) {
        destinationScreen = 'floorplan';
      } else {
        destinationScreen = 'floorplan';
      }
    }

    // Validate screen permission for current role
    if (currentUser?.role === 'Chef' && destinationScreen !== 'kitchen' && destinationScreen !== 'inventory') {
      destinationScreen = 'kitchen';
    } else if (currentUser?.role === 'Accountant' && destinationScreen !== 'billing') {
      destinationScreen = 'billing';
    } else if (currentUser?.role === 'Waiter' && destinationScreen === 'inventory') {
      destinationScreen = 'floorplan';
    }

    if (destinationScreen) {
      setActiveScreen(destinationScreen);
    }

    // 5. Close notification popover
    setIsNotificationsOpen(false);
  };

  const handleToastClick = (toast: ToastItem) => {
    const match = notifications.find((n) => n.id === toast.id || n.title === toast.title || n.message === toast.message);
    if (match) {
      handleNotificationClick(match);
    } else {
      if (toast.tableId) {
        setActiveTableId(toast.tableId);
        setHighlightedTableId(toast.tableId);
        setTimeout(() => setHighlightedTableId(null), 3000);
      }
      if (toast.orderId) {
        setHighlightedOrderId(toast.orderId);
        setTimeout(() => setHighlightedOrderId(null), 3500);
      }
      if (toast.title.toLowerCase().includes('ready') || toast.title.toLowerCase().includes('kitchen')) {
        setActiveScreen(currentUser?.role === 'Chef' ? 'kitchen' : currentUser?.role === 'Waiter' ? 'kitchen' : 'floorplan');
      }
    }
    setToasts((curr) => curr.filter((t) => t.id !== toast.id));
  };

  const handleCancelOrder = (orderId: string) => {
    if (currentUser?.role !== 'Waiter' && currentUser?.role !== 'Admin') {
      setNotifications((previous) => [
        {
          id: generateOrderId(),
          title: 'Permission Required',
          message: 'Only a Waiter or Admin can cancel an accidental kitchen ticket.',
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...previous,
      ]);
      return;
    }
    const targetOrder = orders.find((order) => order.id === orderId);
    if (!targetOrder || !['pending', 'cooking', 'ready'].includes(targetOrder.status)) {
      setNotifications((previous) => [
        {
          id: generateOrderId(),
          title: 'Cannot Cancel Ticket',
          message: 'Only pending, cooking, or ready tickets can be cancelled.',
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...previous,
      ]);
      return;
    }

    const nextOrders = orders.filter((order) => order.id !== orderId);
    setOrders(nextOrders);

    const remainingForTable = nextOrders.filter(
      (order) => order.tableId === targetOrder.tableId && order.status !== 'paid'
    );

    setTables((previousTables) =>
      previousTables.map((table) => {
        if (table.id === targetOrder.tableId) {
          return {
            ...table,
            orderTotal: getTableOrderTotal(targetOrder.tableId, nextOrders),
            status: remainingForTable.length === 0 ? ('available' as TableStatus) : table.status,
            seatedTime: remainingForTable.length === 0 ? undefined : table.seatedTime,
          };
        }
        return table;
      })
    );

    // Restore recipe stock to inventory if recipes exist
    if (recipes.length > 0) {
      const restoredInventory = restoreStockForCartItems(targetOrder.items, recipes, inventory);
      handleUpdateInventory(restoredInventory);
    }

    setNotifications((previousNotifications) => [
      {
        id: generateOrderId(),
        title: 'Kitchen ticket cancelled',
        message: `Order ${targetOrder.id.slice(-6)} for Table ${targetOrder.tableId} was cancelled by ${currentUser?.name ?? 'staff'}.`,
        type: 'warning',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: targetOrder.tableId,
        orderId,
        targetScreen: 'kitchen',
      },
      ...previousNotifications,
    ]);
  };

  // Get active cart for current table
  const currentCart = activeTableId ? tableCarts[activeTableId] || [] : [];

  const handleUpdateCart = (newCart: CartItem[]) => {
    if (!activeTableId) return;
    setTableCarts((previousCarts) => ({
      ...previousCarts,
      [activeTableId]: newCart,
    }));
  };

  // Send the waiter's cart to the kitchen & bar
  const handleSendToKitchen = (printMode?: 'KOT' | 'BOT' | 'ALL' | boolean) => {
    if (!activeTableId || currentCart.length === 0) return;

    // Calculate pricing
    const subtotal = currentCart.reduce((acc, cartItem) => {
      const menuObj = menuItems.find((m) => m.id === cartItem.menuItemId);
      return acc + (menuObj ? menuObj.price * cartItem.quantity : 0);
    }, 0);

    const totals = calculateOrderTotals(subtotal);
    const orderIndex = orders.length + 1;
    const kotNumber = `KOT-${String(orderIndex).padStart(2, '0')}`;
    const botNumber = `BOT-${String(orderIndex).padStart(2, '0')}`;
    const billNumber = `${restaurantInfo.billPrefix || 'FH-'}${1000 + orderIndex}`;

    const newOrder: Order = {
      id: generateOrderId(),
      tableId: activeTableId,
      items: [...currentCart],
      subtotal: totals.subtotal,
      tax: totals.tax,
      serviceCharge: totals.serviceCharge,
      discount: 0,
      total: totals.total,
      status: 'pending',
      serverName: currentUser?.name || 'Waiter',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kotNumber,
      botNumber,
      billNumber,
    };

    // If ticket print requested, construct snapshot matching Image 1
    const activeTable = tables.find((t) => t.id === activeTableId);
    if (printMode && activeTable) {
      const kitchenItems: TicketItem[] = [];
      const barItems: TicketItem[] = [];

      currentCart.forEach((c) => {
        const m = menuItems.find((item) => item.id === c.menuItemId);
        const name = m ? m.name : 'Custom Dish';
        const section = m?.section || 'Kitchen';
        const ticketItem: TicketItem = {
          name,
          quantity: c.quantity,
          notes: c.notes,
          section,
        };
        if (section === 'Bar') {
          barItems.push(ticketItem);
        } else {
          kitchenItems.push(ticketItem);
        }
      });

      if (printMode === 'BOT' || (printMode === true && kitchenItems.length === 0 && barItems.length > 0)) {
        setTicketToPrint({
          type: 'BOT',
          ticketNumber: botNumber,
          orderNumber: newOrder.id,
          tableName: activeTable.name,
          printedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          serverName: currentUser?.name || 'Waiter',
          orderType: 'Table',
          items: barItems.length > 0 ? barItems : kitchenItems,
          totalItems: (barItems.length > 0 ? barItems : kitchenItems).reduce((sum, it) => sum + it.quantity, 0),
        });
      } else {
        setTicketToPrint({
          type: 'KOT',
          ticketNumber: kotNumber,
          orderNumber: newOrder.id,
          tableName: activeTable.name,
          printedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          serverName: currentUser?.name || 'Waiter',
          orderType: 'Table',
          items: kitchenItems.length > 0 ? kitchenItems : barItems,
          totalItems: (kitchenItems.length > 0 ? kitchenItems : barItems).reduce((sum, it) => sum + it.quantity, 0),
        });
      }
    }

    // 1. Add to orders database
    const nextOrders = [...orders, newOrder];
    setOrders(nextOrders);

    // 2. Update table status to occupied and link cumulative totals
    const updatedTables = tables.map((t) => {
      if (t.id === activeTableId) {
        return {
          ...t,
          status: 'occupied' as TableStatus,
          orderTotal: getTableOrderTotal(activeTableId, nextOrders),
          seatedTime: t.seatedTime || 'Order Placed',
        };
      }
      return t;
    });
    setTables(updatedTables);

    // 3. Clear table cart
    setTableCarts((previousCarts) => ({
      ...previousCarts,
      [activeTableId]: [],
    }));

    // 4. Deduct ingredients from inventory if recipes exist
    if (recipes.length > 0) {
      const nextInventory = deductStockForCartItems(currentCart, recipes, inventory);
      handleUpdateInventory(nextInventory);
    }

    // 5. Send notification with metadata
    setNotifications((previousNotifications) => [
      {
        id: generateOrderId(),
        title: 'Order sent to Kitchen & Bar',
        message: `Order for ${activeTable?.name || 'Table'} (${currentCart.length} items) sent to Kitchen & Bar!`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: activeTableId,
        orderId: newOrder.id,
        targetScreen: 'kitchen',
      },
      ...previousNotifications,
    ]);

    addToast('success', 'Order Sent', `${activeTable?.name || 'Table'} order dispatched.`);
    setActiveScreen('floorplan');
  };

  // Settle bill / complete payment for all unpaid orders on the table
  const handleCompletePayment = (
    tableId: string,
    paymentMethod: string,
    paymentDetails?: {
      discount?: number;
      discountReason?: string;
      tenderAmount?: number;
      changeAmount?: number;
      andPrint?: boolean;
    }
  ) => {
    if (currentUser?.role !== 'Accountant' && currentUser?.role !== 'Admin' && currentUser?.role !== 'Waiter') {
      setNotifications((previous) => [
        {
          id: generateOrderId(),
          title: 'Permission Required',
          message: 'Only an Accountant, Admin, or Waiter can complete payments.',
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...previous,
      ]);
      return;
    }

    const unpaidForTable = orders.filter(
      (o) => o.tableId === tableId && o.status !== 'paid'
    );
    if (unpaidForTable.length === 0) {
      return;
    }

    const discount = paymentDetails?.discount || 0;
    const subtotal = unpaidForTable.reduce((sum, o) => sum + o.subtotal, 0);
    const totalPaid = Math.max(0, subtotal - discount);
    const targetTable = tables.find((t) => t.id === tableId);
    const orderIndex = orders.length + 1;
    const billNumber = unpaidForTable[0]?.billNumber || `${restaurantInfo.billPrefix || 'FH-'}${1000 + orderIndex}`;

    // If andPrint is requested, set root receiptToPrint
    if (paymentDetails?.andPrint) {
      const allItems = unpaidForTable.flatMap((order) =>
        order.items.flatMap((cartItem) => {
          const m = menuItems.find((item) => item.id === cartItem.menuItemId);
          const name = m ? m.name : 'Dish';
          const rate = m ? m.price : 0;
          return Array.from({ length: cartItem.quantity }, () => ({
            name,
            quantity: 1,
            rate,
            amount: rate,
            notes: cartItem.notes,
          }));
        })
      );

      setReceiptToPrint({
        restaurantName: restaurantInfo.name || 'FoodieHub',
        restaurantAddress: restaurantInfo.address || 'Kathmandu, Nepal',
        restaurantPhone: restaurantInfo.phone || '+977 9800000000',
        restaurantPanNo: restaurantInfo.panNo || '',
        billGreeting: restaurantInfo.billGreeting || 'Thank you! Visit again.',
        printedAt: new Date().toLocaleString(),
        billNumber,
        orderNumber: unpaidForTable[0]?.id || `ORD-${orderIndex}`,
        kotNumber: unpaidForTable[0]?.kotNumber,
        botNumber: unpaidForTable[0]?.botNumber,
        tableName: targetTable?.name || `Table ${tableId}`,
        cashierName: currentUser.name,
        serverName: unpaidForTable[0]?.serverName || currentUser.name,
        paymentMethod,
        tenderAmount: paymentDetails.tenderAmount,
        changeAmount: paymentDetails.changeAmount,
        items: allItems,
        subtotal,
        discount,
        total: totalPaid,
        qrCode: paymentMethod === 'QR' ? (restaurantInfo.qrCodeImage || paymentQrs['QR'] || paymentQrs['eSewa'] || '') : undefined,
      });
    }

    // 1. Mark all unpaid orders as paid
    const updatedOrders = orders.map((o) => {
      if (o.tableId === tableId && o.status !== 'paid') {
        return {
          ...o,
          status: 'paid' as const,
          paymentMethod,
          paidAt: new Date().toISOString(),
          completedBy: currentUser.name,
          customerCount: o.customerCount ?? 1,
          discount,
          total: totalPaid,
          billNumber,
        };
      }
      return o;
    });
    setOrders(updatedOrders);

    // 2. Set table to cleaning
    const updatedTables = tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'cleaning' as TableStatus,
          guests: undefined,
          orderTotal: 0,
          seatedTime: undefined,
        };
      }
      return t;
    });
    setTables(updatedTables);

    // Clear any table cart
    setTableCarts((prev) => ({ ...prev, [tableId]: [] }));

    setNotifications((previousNotifications) => [
      {
        id: generateOrderId(),
        title: 'Payment completed',
        message: `Table ${tableId} bill settled for Rs. ${totalPaid.toFixed(2)} via ${paymentMethod}.`,
        type: 'success',
        createdAt: new Date().toISOString(),
        read: false,
        tableId,
        targetScreen: 'billing',
      },
      ...previousNotifications,
    ]);

    setActiveScreen('floorplan');
  };

  const handlePrintTicket = (ticket: TicketSnapshot) => {
    setTicketToPrint(ticket);
  };

  const handlePrintReceipt = (receipt: ReceiptSnapshot) => {
    setReceiptToPrint(receipt);
  };

  const handleReverseOrder = (orderId: string, reason: string) => {
    if (currentUser?.role !== 'Admin') return;
    const target = orders.find((order) => order.id === orderId);
    if (!target || target.status !== 'paid' || target.reversedAt) return;
    setOrders((previous) => previous.map((order) => order.id === orderId ? { ...order, reversedAt: new Date().toISOString(), reversedBy: currentUser.name, reversalReason: reason } : order));
    setNotifications((previous) => [
      {
        id: generateOrderId(),
        title: 'Transaction reversed',
        message: `Order ${orderId} was reversed by ${currentUser.name}.`,
        type: 'warning',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: target.tableId,
        orderId,
        targetScreen: 'billing',
      },
      ...previous,
    ]);
  };

  const handleReverseManualTransaction = (transactionId: string, reason: string) => {
    if (currentUser?.role !== 'Admin') return;
    const target = manualTransactions.find((transaction) => transaction.id === transactionId);
    if (!target || target.reversedAt) return;
    setManualTransactions((previous) => previous.map((transaction) => transaction.id === transactionId ? { ...transaction, reversedAt: new Date().toISOString(), reversedBy: currentUser.name, reversalReason: reason } : transaction));
    setNotifications((previous) => [
      {
        id: generateOrderId(),
        title: 'Manual transaction reversed',
        message: `${transactionId} was reversed by ${currentUser.name}.`,
        type: 'warning',
        createdAt: new Date().toISOString(),
        read: false,
        targetScreen: 'billing',
      },
      ...previous,
    ]);
  };

  const effectiveStaff = staff.length > 0 ? staff : INITIAL_STAFF;

  // Handle Login
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setActiveScreen(user.role === 'Chef' ? 'kitchen' : user.role === 'Accountant' ? 'billing' : 'floorplan');
        }}
        staff={effectiveStaff}
        onCreateStaff={(account) => setStaff((previousStaff) => [...previousStaff, account])}
      />
    );
  }

  // Render correct active screen
  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'floorplan':
        if (currentUser.role === 'Accountant') {
          return (
            <BillingScreen
              currentUser={currentUser}
              tables={tables}
              menuItems={menuItems}
              activeTableId={activeTableId}
              orders={orders}
              restaurantInfo={restaurantInfo}
              paymentQrs={paymentQrs}
              onCompletePayment={handleCompletePayment}
              onSelectTable={handleSelectTable}
              onPrintReceipt={handlePrintReceipt}
              onUpdateOrders={setOrders}
            />
          );
        }
        if (currentUser.role === 'Chef') {
          return (
            <KitchenScreen
              currentUser={currentUser}
              orders={orders}
              menuItems={menuItems}
              tables={tables}
              onUpdateOrders={setOrders}
              onUpdateTables={setTables}
              onOrderServed={(tableId) => {
                setActiveTableId(tableId);
              }}
              onCancelOrder={handleCancelOrder}
              onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
              highlightedOrderId={highlightedOrderId}
              onPrintTicket={handlePrintTicket}
            />
          );
        }
        return (
          <FloorPlanScreen
            tables={tables}
            orders={orders}
            onUpdateTables={setTables}
            onUpdateOrders={setOrders}
            onNavigateToOrder={handleNavigateToOrder}
            onNavigateToBilling={handleNavigateToBilling}
            onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
            highlightedTableId={highlightedTableId}
          />
        );
      case 'menu':
        if (currentUser.role === 'Accountant' || currentUser.role === 'Chef') {
          return (
            <BillingScreen
              currentUser={currentUser}
              tables={tables}
              menuItems={menuItems}
              activeTableId={activeTableId}
              orders={orders}
              restaurantInfo={restaurantInfo}
              paymentQrs={paymentQrs}
              onCompletePayment={handleCompletePayment}
              onSelectTable={handleSelectTable}
              onPrintReceipt={handlePrintReceipt}
              onUpdateOrders={setOrders}
            />
          );
        }
        return (
          <MenuScreen
            currentUser={currentUser}
            tables={tables}
            menuItems={menuItems}
            menuCategories={menuCategories}
            activeTableId={activeTableId}
            cart={currentCart}
            onUpdateCart={handleUpdateCart}
            onSendToKitchen={handleSendToKitchen}
            onSelectTable={handleSelectTable}
            onUnseatTable={handleUnseatTable}
          />
        );
      case 'billing':
        if (currentUser.role === 'Chef') {
          return (
            <KitchenScreen
              currentUser={currentUser}
              orders={orders}
              menuItems={menuItems}
              tables={tables}
              onUpdateOrders={setOrders}
              onUpdateTables={setTables}
              onOrderServed={(tableId) => {
                setActiveTableId(tableId);
              }}
              onCancelOrder={handleCancelOrder}
              onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
              highlightedOrderId={highlightedOrderId}
              onPrintTicket={handlePrintTicket}
            />
          );
        }
        return (
          <BillingScreen
            currentUser={currentUser}
            tables={tables}
            menuItems={menuItems}
            activeTableId={activeTableId}
            orders={orders}
            restaurantInfo={restaurantInfo}
            paymentQrs={paymentQrs}
            onCompletePayment={handleCompletePayment}
            onSelectTable={handleSelectTable}
            onPrintReceipt={handlePrintReceipt}
            onUpdateOrders={setOrders}
          />
        );
      case 'inventory':
        if (currentUser.role === 'Waiter' || currentUser.role === 'Accountant') {
          return (
            <FloorPlanScreen
              tables={tables}
              orders={orders}
              onUpdateTables={setTables}
              onUpdateOrders={setOrders}
              onNavigateToOrder={handleNavigateToOrder}
              onNavigateToBilling={handleNavigateToBilling}
              onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
              highlightedTableId={highlightedTableId}
            />
          );
        }
        return (
          <InventoryScreen
            currentUser={currentUser}
            inventory={inventory}
            inventoryOptions={inventoryOptions}
            onUpdateInventory={handleUpdateInventory}
          />
        );
      case 'kitchen':
        if (currentUser.role === 'Waiter' || currentUser.role === 'Accountant') {
          return (
            <FloorPlanScreen
              tables={tables}
              orders={orders}
              onUpdateTables={setTables}
              onUpdateOrders={setOrders}
              onNavigateToOrder={handleNavigateToOrder}
              onNavigateToBilling={handleNavigateToBilling}
              onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
              highlightedTableId={highlightedTableId}
            />
          );
        }
        return (
          <KitchenScreen
            currentUser={currentUser}
            orders={orders}
            menuItems={menuItems}
            tables={tables}
            onUpdateOrders={setOrders}
            onUpdateTables={setTables}
            onOrderServed={(tableId) => {
              setActiveTableId(tableId);
            }}
            onCancelOrder={handleCancelOrder}
            onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
            highlightedOrderId={highlightedOrderId}
            onPrintTicket={handlePrintTicket}
          />
        );
      case 'admin':
        if (currentUser.role !== 'Admin') return null;
        return (
          <AdminScreen
            currentUser={currentUser}
            staff={Array.isArray(staff) ? staff : INITIAL_STAFF}
            tables={Array.isArray(tables) ? tables : INITIAL_TABLES}
            menuItems={Array.isArray(menuItems) ? menuItems : INITIAL_MENU}
            menuCategories={Array.isArray(menuCategories) ? menuCategories : DEFAULT_MENU_CATEGORIES}
            inventory={Array.isArray(inventory) ? inventory : INITIAL_INVENTORY}
            inventoryOptions={inventoryOptions || DEFAULT_INVENTORY_OPTIONS}
            onUpdateInventoryOptions={setSavedInventoryOptions}
            orders={Array.isArray(orders) ? orders : []}
            onUpdateOrders={setOrders}
            manualTransactions={Array.isArray(manualTransactions) ? manualTransactions : []}
            onAddManualTransaction={(transaction) => setManualTransactions((previous) => [transaction, ...(Array.isArray(previous) ? previous : [])])}
            onReverseOrder={handleReverseOrder}
            onReverseManualTransaction={handleReverseManualTransaction}
            recipes={Array.isArray(recipes) ? recipes : []}
            notifications={Array.isArray(notifications) ? notifications : []}
            paymentQrs={paymentQrs || { eSewa: '', Khalti: '', 'Bank Transfer': '' }}
            onUpdatePaymentQrs={setPaymentQrs}
            onUpdateStaff={setStaff}
            onUpdateTables={setTables}
            onUpdateMenu={setMenuItems}
            onUpdateMenuCategories={setMenuCategories}
            onUpdateInventory={handleUpdateInventory}
            onUpdateRecipes={setRecipes}
            onUpdateNotifications={setNotifications}
            restaurantInfo={restaurantInfo || DEFAULT_RESTAURANT_INFO}
            onUpdateRestaurantInfo={setRestaurantInfo}
            onPrintReceipt={handlePrintReceipt}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            currentUser={currentUser}
            orders={orders}
            tables={tables}
            staff={staff}
            onUpdateStaffPin={handleUpdateStaffPin}
            onLogout={handleLogout}
            onTestSound={() => playNotificationSound('success')}
            onNavigate={handleNavigate}
          />
        );
      default:
        return (
          <FloorPlanScreen
            tables={tables}
            orders={orders}
            onUpdateTables={setTables}
            onUpdateOrders={setOrders}
            onNavigateToOrder={handleNavigateToOrder}
            onNavigateToBilling={handleNavigateToBilling}
            onNotify={(notification) => setNotifications((previous) => [notification, ...previous])}
            highlightedTableId={highlightedTableId}
          />
        );
    }
  };

  const getHeaderTitle = () => {
    switch (activeScreen) {
      case 'floorplan': return 'Main Dining Floor';
      case 'menu': return 'Order Intake';
      case 'billing': return 'Payments Portal';
      case 'inventory': return 'Stock Inventory';
      case 'kitchen': return currentUser.role === 'Waiter' ? 'Ready for Service' : 'Kitchen Queue';
      case 'admin': return 'Administration';
      case 'profile': return 'Staff Profile & Shift Dashboard';
      default: return 'FoodieHub';
    }
  };

  const activeTableObj = tables.find((t) => t.id === activeTableId);

  // Filtered notifications list for dropdown
  const filteredNotificationsList = notifications.filter((notification) => {
    if (notificationFilter === 'unread') return !notification.read;
    if (notificationFilter === 'alerts') return notification.type === 'warning' || notification.type === 'critical';
    return true;
  });

  return (
    <div id="bistroflow-shell" className="h-screen h-dvh max-h-screen w-full bg-background text-on-surface antialiased font-sans overflow-hidden">
      <div id="app-interactive-shell" className="h-full w-full flex flex-col md:flex-row overflow-hidden">
        {/* Toast Notifications (Floating top-right with click-to-navigate action) */}
        <div className="fixed top-18 right-3 left-3 sm:left-auto sm:right-4 z-50 flex flex-col gap-2.5 pointer-events-none sm:max-w-sm">
        {toasts.map((toast) => {
          let iconBg = 'bg-primary/10 text-primary border-primary/25';
          let iconName = 'restaurant';
          let borderAccent = 'border-l-4 border-l-primary';

          if (toast.type === 'success') {
            iconBg = 'bg-[#E7F2D8] text-primary border-primary/30';
            iconName = 'check_circle';
            borderAccent = 'border-l-4 border-l-primary';
          } else if (toast.type === 'warning') {
            iconBg = 'bg-amber-100 text-amber-900 border-amber-300';
            iconName = 'warning';
            borderAccent = 'border-l-4 border-l-amber-500';
          } else if (toast.type === 'critical') {
            iconBg = 'bg-red-100 text-red-900 border-red-300';
            iconName = 'error';
            borderAccent = 'border-l-4 border-l-red-600';
          }

          return (
            <div
              key={toast.id}
              onClick={() => handleToastClick(toast)}
              className={`pointer-events-auto p-3 sm:p-3.5 rounded-2xl border border-border-light bg-white/98 shadow-xl flex items-start gap-3 backdrop-blur-md cursor-pointer transition-all duration-200 animate-slide-in hover:shadow-2xl hover:scale-[1.01] ${borderAccent}`}
              title="Click to jump to table / order"
            >
              <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}>
                <span className="material-symbols-outlined text-lg">{iconName}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-on-surface leading-tight">{toast.title}</p>
                  <span className="text-[10px] font-bold text-primary flex items-center gap-0.5 shrink-0 opacity-80">
                    <span>View</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug font-medium">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((curr) => curr.filter((t) => t.id !== toast.id));
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Sidebar Navigation (Desktop) */}
      <Sidebar 
        currentUser={currentUser} 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate} 
        onLogout={handleLogout}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-72 h-screen h-dvh max-h-screen relative bg-background overflow-hidden transition-all duration-300">
        
        {/* Top AppBar / Header */}
        <header className="bg-surface-bright border-b border-border-light flex justify-between items-center px-4 md:px-6 h-16 w-full sticky top-0 shrink-0 z-30 shadow-2xs">
          
          {/* Logo / Screen context */}
          <div className="flex items-center gap-2.5">
            <FoodieHubLogo size={28} showText={true} />
            <span className="hidden md:inline text-xs font-bold text-outline uppercase tracking-wider px-2 py-0.5 bg-surface-container rounded-md">
              {getHeaderTitle()}
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Table context indicator bubble (for Waiter & Admin taking orders) */}
            {activeTableObj && activeScreen === 'menu' && (currentUser.role === 'Waiter' || currentUser.role === 'Admin') && (
              <button
                type="button"
                onClick={() => setActiveScreen('floorplan')}
                className="bg-secondary-container hover:bg-secondary-container/80 text-on-secondary-container px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer text-xs transition-colors shadow-2xs font-semibold select-none"
              >
                <span className="material-symbols-outlined text-sm">table_restaurant</span>
                <span>{activeTableObj.name}</span>
              </button>
            )}

            {/* Notifications tray icon with indicator & outside-click listener */}
            <InstallAppButton />
            <div ref={notificationContainerRef} className="relative">
              <button 
                type="button"
                id="notifications-bell-btn"
                onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
                aria-label="Open notifications"
                className={`p-2 rounded-full transition-colors cursor-pointer relative ${
                  isNotificationsOpen
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-white animate-pulse flex items-center justify-center"></span>
                )}
              </button>

              {/* Notification Popover with global click-to-dismiss backdrop */}
              {isNotificationsOpen && (
                <>
                  <div
                    id="notifications-backdrop"
                    className="fixed inset-0 z-40 bg-transparent cursor-default select-none"
                    onClick={() => setIsNotificationsOpen(false)}
                    onMouseDown={() => setIsNotificationsOpen(false)}
                    aria-hidden="true"
                  />
                  <div 
                    id="notifications-dropdown-panel"
                    className="fixed right-2 sm:absolute sm:right-0 top-16 sm:top-full mt-0 sm:mt-2 w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] bg-white border border-border-light rounded-2xl shadow-2xl z-50 overflow-hidden font-sans animate-scale-up"
                  >
                  {/* Panel Header */}
                  <div className="px-4 py-3 border-b border-border-light bg-surface-container-lowest flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface font-display">Notifications</p>
                      {unreadNotifications.length > 0 && (
                        <span className="text-[10px] font-bold bg-primary text-on-primary px-2 py-0.5 rounded-full shadow-2xs">
                          {unreadNotifications.length} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => playNotificationSound('success')}
                        className="text-[11px] font-semibold text-on-surface-variant hover:text-primary flex items-center gap-0.5 px-2 py-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                        title="Test chime sound"
                      >
                        <span className="material-symbols-outlined text-sm">volume_up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifications((items) => items.map((item) => ({ ...item, read: true })))}
                        className="text-[11px] font-bold text-primary hover:underline px-1.5 py-1 rounded cursor-pointer"
                        title="Mark all as read"
                      >
                        Mark all read
                      </button>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNotifications([])}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Clear all notifications"
                        >
                          <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Chips */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-low/60 border-b border-border-light">
                    {[
                      { id: 'all', label: `All (${notifications.length})` },
                      { id: 'unread', label: `Unread (${unreadNotifications.length})` },
                      { id: 'alerts', label: `Alerts (${notifications.filter((n) => n.type === 'warning' || n.type === 'critical').length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotificationFilter(tab.id as 'all' | 'unread' | 'alerts')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                          notificationFilter === tab.id
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-84 overflow-y-auto p-2 flex flex-col gap-1.5">
                    {filteredNotificationsList.slice(0, 20).map((notification) => {
                      let iconName = 'notifications';
                      let iconBg = 'bg-primary/10 text-primary';
                      let borderStyle = 'border-transparent';

                      if (notification.type === 'success') {
                        iconName = 'check_circle';
                        iconBg = 'bg-[#E7F2D8] text-primary';
                      } else if (notification.type === 'warning') {
                        iconName = 'warning';
                        iconBg = 'bg-amber-100 text-amber-900';
                        borderStyle = 'border-amber-200';
                      } else if (notification.type === 'critical') {
                        iconName = 'error';
                        iconBg = 'bg-red-100 text-red-900';
                        borderStyle = 'border-red-200';
                      }

                      const relTime = formatRelativeTime(notification.createdAt);

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start gap-2.5 relative ${
                            notification.read
                              ? 'bg-surface-container-lowest hover:bg-surface-container-low opacity-80 border-border-light/40'
                              : 'bg-[#F4F9EC] hover:bg-[#eaf5dd] border-primary/30 shadow-2xs'
                          } ${borderStyle}`}
                          title="Click to view details"
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${iconBg}`}>
                            <span className="material-symbols-outlined text-sm">{iconName}</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start gap-1">
                              <p className="text-xs font-bold text-on-surface flex items-center gap-1.5 leading-snug">
                                {!notification.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse"></span>
                                )}
                                <span className="line-clamp-1">{notification.title}</span>
                              </p>
                              <span className="text-[9px] font-semibold text-on-surface-variant/80 shrink-0 ml-1">
                                {relTime || new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug font-medium line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {notification.tableId && (
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">table_restaurant</span>
                                  <span>Table {notification.tableId}</span>
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-on-surface-variant group-hover:text-primary transition-colors flex items-center gap-0.5 ml-auto">
                                <span>Go to action</span>
                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                              </span>
                            </div>
                          </div>

                          {/* Individual delete / dismiss button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-red-600 p-1 rounded-md hover:bg-surface-container transition-all shrink-0"
                            title="Dismiss notification"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      );
                    })}

                    {filteredNotificationsList.length === 0 && (
                      <div className="py-10 text-center text-on-surface-variant">
                        <div className="w-12 h-12 rounded-full bg-secondary-container/50 flex items-center justify-center mx-auto mb-2">
                          <span className="material-symbols-outlined text-2xl opacity-50">notifications_off</span>
                        </div>
                        <p className="text-xs font-bold">
                          {notificationFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                          You're completely up to date!
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User profile button -> navigates directly to Profile Dashboard */}
            <button
              type="button"
              onClick={() => handleNavigate('profile')}
              className={`flex items-center gap-2 p-1.5 pl-3 rounded-full hover:bg-surface-container transition-all cursor-pointer border ${
                activeScreen === 'profile'
                  ? 'bg-primary/15 border-primary/40 ring-2 ring-primary/20'
                  : 'border-transparent hover:border-border-light bg-surface-container-low'
              }`}
              title="Open Staff Profile & Shift Dashboard"
              aria-label="User profile dashboard"
            >
              <span className="hidden sm:inline text-xs font-bold text-on-surface truncate max-w-[110px]">
                {currentUser.name}
              </span>
              <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary-container flex items-center justify-center border border-outline-variant shrink-0 shadow-2xs">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = getAvatarFallback(currentUser.name);
                  }}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Page Workspace */}
        <div className={`flex-1 flex flex-col relative min-h-0 bg-background ${activeScreen === 'menu' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {syncConflicts.length > 0 && (
            <div className="mx-4 mt-4 md:mx-6 lg:mx-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 shadow-xs" role="status">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-700 text-base">sync_problem</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Sync conflict detected</p>
                  <p className="mt-1">Another device changed shared data while this device was editing. Your local changes were kept here and were not allowed to overwrite the server.</p>
                  <p className="mt-1 text-[11px]">Affected data: {syncConflicts.map((key) => key.replace(/^foodiehub\.[^.]+\./, '')).join(', ')}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {syncConflicts.map((key) => (
                      <React.Fragment key={key}>
                        <button type="button" onClick={() => resolveSyncConflict(key, 'server')} className="rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-200">Keep server: {key.replace(/^foodiehub\.[^.]+\./, '')}</button>
                        <button type="button" onClick={() => resolveSyncConflict(key, 'local')} className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-on-primary hover:bg-surface-tint">Retry local: {key.replace(/^foodiehub\.[^.]+\./, '')}</button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {renderActiveScreen()}
        </div>

        {/* Bottom Navigation (Mobile viewports only) */}
        <BottomNavBar 
          currentUser={currentUser} 
          activeScreen={activeScreen} 
          onNavigate={handleNavigate} 
        />
      </div>
      </div>

      {/* Thermal Receipt Print Output (Image 2 format) */}
      {receiptToPrint && (
        <div id="thermal-receipt" className={`format-${localStorage.getItem('foodiehub.v1.printer-format') || 'auto'}`} aria-hidden="true">
          <div className="thermal-center thermal-title">{receiptToPrint.restaurantName.toUpperCase()}</div>
          {receiptToPrint.restaurantAddress && (
            <div className="thermal-center thermal-subtitle">{receiptToPrint.restaurantAddress}</div>
          )}
          {receiptToPrint.restaurantPanNo && (
            <div className="thermal-center thermal-subtitle">PAN / Reg: {receiptToPrint.restaurantPanNo}</div>
          )}
          {receiptToPrint.restaurantPhone && (
            <div className="thermal-center thermal-subtitle">Phone: {receiptToPrint.restaurantPhone}</div>
          )}
          <div className="thermal-rule" />
          
          <div className="thermal-meta-grid">
            <span>Bill No:</span><strong>{receiptToPrint.billNumber}</strong>
            <span>Date:</span><span>{receiptToPrint.printedAt}</span>
            <span>Table:</span><strong>{receiptToPrint.tableName}</strong>
            {receiptToPrint.kotNumber && (
              <><span>KOT No:</span><span>{receiptToPrint.kotNumber}</span></>
            )}
            {receiptToPrint.botNumber && (
              <><span>BOT No:</span><span>{receiptToPrint.botNumber}</span></>
            )}
            <span>Cashier:</span><span>{receiptToPrint.cashierName}</span>
            <span>Waiter:</span><span>{receiptToPrint.serverName}</span>
          </div>

          <div className="thermal-rule" />

          <table className="thermal-table">
            <thead>
              <tr>
                <th className="col-item">Item</th>
                <th className="col-qty">Qty</th>
                <th className="col-rate">Rate</th>
                <th className="col-amt">Amt</th>
              </tr>
            </thead>
            <tbody>
              {receiptToPrint.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="col-item">
                    <div>{item.name}</div>
                    {item.notes && <div style={{ fontSize: '8.5px', color: '#444' }}>* {item.notes}</div>}
                  </td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-rate">{item.rate.toFixed(2)}</td>
                  <td className="col-amt">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="thermal-rule" />

          <div className="thermal-total-row">
            <span>Subtotal</span>
            <span>Rs. {receiptToPrint.subtotal.toFixed(2)}</span>
          </div>

          {receiptToPrint.discount > 0 && (
            <div className="thermal-total-row">
              <span>Discount</span>
              <span>- Rs. {receiptToPrint.discount.toFixed(2)}</span>
            </div>
          )}

          <div className="thermal-total-row thermal-grand-total">
            <span>Grand Total</span>
            <span>Rs. {receiptToPrint.total.toFixed(2)}</span>
          </div>

          <div className="thermal-rule" />

          <div className="thermal-total-row">
            <span>Payment Mode</span>
            <strong>{receiptToPrint.paymentMethod}</strong>
          </div>

          {receiptToPrint.tenderAmount !== undefined && receiptToPrint.tenderAmount > 0 && (
            <>
              <div className="thermal-total-row">
                <span>Paid Amount</span>
                <span>Rs. {receiptToPrint.tenderAmount.toFixed(2)}</span>
              </div>
              <div className="thermal-total-row">
                <span>Balance / Change</span>
                <span>Rs. {(receiptToPrint.changeAmount || 0).toFixed(2)}</span>
              </div>
            </>
          )}

          {receiptToPrint.qrCode && (
            <div className="thermal-qr-container">
              <div style={{ fontSize: '9px', fontWeight: 700, marginBottom: '4px' }}>Scan & Pay (QR)</div>
              <img src={receiptToPrint.qrCode} alt="Payment QR" className="thermal-qr-img" />
            </div>
          )}

          <div className="thermal-rule" />
          <div className="thermal-thanks">{receiptToPrint.billGreeting || 'Thank you! Visit again.'}</div>
        </div>
      )}

      {/* Thermal KOT / BOT Print Output (Image 1 format) */}
      {ticketToPrint && (
        <div id="thermal-kot" className={`format-${localStorage.getItem('foodiehub.v1.printer-format') || 'auto'}`} aria-hidden="true">
          <div className="kot-header-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="kot-badge-title">{ticketToPrint.type === 'BOT' ? 'Bot No' : 'Kot No'}</span>
              <span style={{ fontSize: '10px' }}>{ticketToPrint.printedAt}</span>
            </div>
            <div className="kot-big-number">{ticketToPrint.ticketNumber}</div>
          </div>

          <div className="kot-info-row">
            <span>Customer: <strong>Visitor</strong></span>
            <span>OrderType: <strong>{ticketToPrint.orderType || 'Table'}</strong></span>
          </div>
          <div className="kot-info-row">
            <span>Table No: <strong>{ticketToPrint.tableName}</strong></span>
            <span>Captain: <strong>Staff</strong></span>
          </div>
          <div className="kot-info-row">
            <span>Order: <strong>{ticketToPrint.orderNumber}</strong></span>
            <span>Waiter: <strong>{ticketToPrint.serverName}</strong></span>
          </div>

          <div className="thermal-solid-rule" />

          <table className="thermal-table">
            <thead>
              <tr>
                <th className="col-sr">SrNo</th>
                <th className="col-item">Item</th>
                <th className="col-qty">Qty</th>
                <th className="col-remark">Remark</th>
              </tr>
            </thead>
            <tbody>
              {ticketToPrint.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="col-sr">{idx + 1}</td>
                  <td className="col-item font-bold">{item.name.toUpperCase()}</td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-remark">{item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="thermal-rule" />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', fontWeight: 800, fontSize: '12px', padding: '4px 0' }}>
            <span>Total Qty</span>
            <span>{ticketToPrint.totalItems}</span>
          </div>

          <div className="thermal-double-rule" />
        </div>
      )}
    </div>
  );
}
