import { Order, MenuItem, Recipe, InventoryItem, CartItem } from './types';

export const TAX_RATE = 0.13;
export const SERVICE_CHARGE_RATE = 0.10;

export function calculateOrderTotals(
  subtotal: number,
  options?: { discount?: number; applyVat?: boolean; applyServiceCharge?: boolean }
) {
  const discount = Math.max(0, options?.discount ?? 0);
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  return { subtotal, discount, tax: 0, serviceCharge: 0, total };
}

export function generateOrderId(): string {
  return `FDHB-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function getUnpaidOrdersForTable(tableId: string, orders: Order[]): Order[] {
  return orders.filter((o) => o.tableId === tableId && o.status !== 'paid');
}

export function getServedUnpaidOrdersForTable(tableId: string, orders: Order[]): Order[] {
  return orders.filter((o) => o.tableId === tableId && o.status === 'served');
}

export function getTableOrderTotal(tableId: string, orders: Order[]): number {
  return getUnpaidOrdersForTable(tableId, orders).reduce((acc, o) => acc + o.total, 0);
}

export function hasKitchenOrdersInProgress(tableId: string, orders: Order[]): boolean {
  return orders.some(
    (o) => o.tableId === tableId && (o.status === 'pending' || o.status === 'cooking' || o.status === 'ready')
  );
}

/**
 * Recalculate an order's subtotal, tax, service charge, and total when items are modified or voided
 */
export function recalculateOrderTotalsFromItems(
  items: CartItem[],
  menuItems: MenuItem[],
  options?: { applyVat?: boolean; applyServiceCharge?: boolean }
): { subtotal: number; tax: number; serviceCharge: number; total: number; applyVat?: boolean; applyServiceCharge?: boolean } {
  const subtotal = items.reduce((sum, cartItem) => {
    const item = menuItems.find((m) => m.id === cartItem.menuItemId);
    return sum + (item ? item.price * cartItem.quantity : 0);
  }, 0);
  return calculateOrderTotals(subtotal, options);
}

/**
 * Deduct inventory stock for ordered items based on linked recipes
 */
export function deductStockForCartItems(
  cartItems: CartItem[],
  recipes: Recipe[],
  inventory: InventoryItem[]
): InventoryItem[] {
  if (!recipes || recipes.length === 0) return inventory;
  const stockMap = new Map<string, number>(inventory.map((inv) => [inv.id, inv.currentStock]));

  for (const item of cartItems) {
    const recipe = recipes.find((r) => r.menuItemId === item.menuItemId);
    if (!recipe) continue;
    const yieldFactor = recipe.yieldAmount && recipe.yieldAmount > 0 ? recipe.yieldAmount : 1;
    for (const ing of recipe.ingredients) {
      const current = stockMap.get(ing.inventoryItemId);
      if (current !== undefined) {
        const deduction = (ing.quantity / yieldFactor) * item.quantity;
        stockMap.set(ing.inventoryItemId, Math.max(0, Math.round((current - deduction) * 100) / 100));
      }
    }
  }

  return inventory.map((inv) => ({
    ...inv,
    currentStock: stockMap.get(inv.id) ?? inv.currentStock,
  }));
}

/**
 * Restore inventory stock when an order or item is cancelled/voided
 */
export function restoreStockForCartItems(
  cartItems: CartItem[],
  recipes: Recipe[],
  inventory: InventoryItem[]
): InventoryItem[] {
  if (!recipes || recipes.length === 0) return inventory;
  const stockMap = new Map<string, number>(inventory.map((inv) => [inv.id, inv.currentStock]));

  for (const item of cartItems) {
    const recipe = recipes.find((r) => r.menuItemId === item.menuItemId);
    if (!recipe) continue;
    const yieldFactor = recipe.yieldAmount && recipe.yieldAmount > 0 ? recipe.yieldAmount : 1;
    for (const ing of recipe.ingredients) {
      const current = stockMap.get(ing.inventoryItemId);
      if (current !== undefined) {
        const addition = (ing.quantity / yieldFactor) * item.quantity;
        stockMap.set(ing.inventoryItemId, Math.round((current + addition) * 100) / 100);
      }
    }
  }

  return inventory.map((inv) => ({
    ...inv,
    currentStock: stockMap.get(inv.id) ?? inv.currentStock,
  }));
}
