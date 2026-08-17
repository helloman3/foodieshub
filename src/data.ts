import { Table, InventoryItem } from './types';
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

// Only the Admin account is preserved
export const INITIAL_STAFF = [
  { id: 'staff-admin-01', name: 'Admin', role: 'Admin' as const, pin: '1234', active: true, createdAt: '2026-08-16T00:00:00.000Z' },
];
