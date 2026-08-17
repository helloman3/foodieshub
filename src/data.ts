import { Table, InventoryItem, StaffAccount } from './types';
import { MENU_CATALOG } from './menuCatalog';

export const INITIAL_TABLES: Table[] = [
  { id: '01', name: 'Table 01', seats: 4, status: 'available' },
  { id: '02', name: 'Table 02', seats: 2, status: 'available' },
  { id: '03', name: 'Table 03', seats: 4, status: 'available' },
  { id: '04', name: 'Table 04', seats: 6, status: 'available' },
  { id: '05', name: 'Table 05', seats: 4, status: 'available' },
  { id: '06', name: 'Table 06', seats: 4, status: 'available' },
  { id: '07', name: 'Table 07', seats: 2, status: 'available' },
  { id: '08', name: 'Table 08', seats: 6, status: 'available' },
  { id: '12', name: 'Table 12', seats: 2, status: 'available' },
];

export const INITIAL_MENU = MENU_CATALOG;

// Empty clean inventory
export const INITIAL_INVENTORY: InventoryItem[] = [];

// Initialize master staff from environment variables (.env.local) if configured
const envAdminName = (import.meta.env.VITE_INITIAL_ADMIN_NAME as string | undefined)?.trim() || 'Admin';
const envAdminPin = (import.meta.env.VITE_INITIAL_ADMIN_PIN as string | undefined)?.trim() || '';

export const INITIAL_STAFF: StaffAccount[] = envAdminPin
  ? [
      {
        id: 'staff-admin-01',
        name: envAdminName,
        role: 'Admin' as const,
        pin: envAdminPin,
        active: true,
        createdAt: '2026-08-16T00:00:00.000Z',
      },
    ]
  : [];
