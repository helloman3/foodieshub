import React, { useState, useEffect, useRef } from 'react';
import { Notification, Order, MenuItem, Table, User, TicketSnapshot, TicketItem, MenuSection } from '../types';
import { getTableOrderTotal, recalculateOrderTotalsFromItems } from '../constants';
import ConfirmModal, { ConfirmDialogState } from './ConfirmModal';

interface KitchenScreenProps {
  currentUser: User;
  orders: Order[];
  menuItems: MenuItem[];
  tables: Table[];
  onUpdateOrders: (updatedOrders: Order[]) => void;
  onUpdateTables: (updatedTables: Table[]) => void;
  onOrderServed: (tableId: string) => void;
  onNotify: (notification: Notification) => void;
  onCancelOrder: (orderId: string) => void;
  highlightedOrderId?: string | null;
  onPrintTicket?: (ticket: TicketSnapshot) => void;
}

type KitchenFilter = 'all' | 'pending' | 'cooking' | 'ready' | 'served';
type SectionFilter = 'all' | 'Kitchen' | 'Bar';

const getTimeElapsed = (timestampStr: string): string => {
  try {
    let orderDate = new Date(timestampStr);
    if (isNaN(orderDate.getTime())) {
      const today = new Date().toDateString();
      orderDate = new Date(`${today} ${timestampStr}`);
    }
    if (isNaN(orderDate.getTime())) return timestampStr;
    const diffMinutes = Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / 60000));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1m ago';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ${diffMinutes % 60}m ago`;
  } catch {
    return timestampStr;
  }
};

export default function KitchenScreen({
  currentUser,
  orders,
  menuItems,
  tables,
  onUpdateOrders,
  onUpdateTables,
  onOrderServed,
  onNotify,
  onCancelOrder,
  highlightedOrderId,
  onPrintTicket,
}: KitchenScreenProps) {
  const [filter, setFilter] = useState<KitchenFilter>('all');
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [ticketToPrint, setTicketToPrint] = useState<TicketSnapshot | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmDialogState | null>(null);
  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isWaiter = currentUser.role === 'Waiter';
  const isChef = currentUser.role === 'Chef';
  const isAdmin = currentUser.role === 'Admin';

  useEffect(() => {
    if (!highlightedOrderId) return;
    const targetOrder = orders.find((o) => o.id === highlightedOrderId);
    if (targetOrder) {
      if (targetOrder.status === 'served') {
        setFilter('served');
      } else if (filter !== 'all' && filter !== targetOrder.status) {
        setFilter(targetOrder.status as KitchenFilter);
      }
      setTimeout(() => {
        const el = ticketRefs.current[highlightedOrderId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightedOrderId, orders]);

  useEffect(() => {
    if (!ticketToPrint) return;
    const printTimer = window.setTimeout(() => window.print(), 150);
    const clearPrintedTicket = () => setTicketToPrint(null);
    window.addEventListener('afterprint', clearPrintedTicket);
    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener('afterprint', clearPrintedTicket);
    };
  }, [ticketToPrint]);

  const handlePrintTicket = (order: Order, type: 'KOT' | 'BOT') => {
    const targetTable = tables.find((t) => t.id === order.tableId);
    const tableName = targetTable?.name || `Table ${order.tableId}`;

    const itemsForType: TicketItem[] = [];
    order.items.forEach((cartItem) => {
      const m = menuItems.find((item) => item.id === cartItem.menuItemId);
      const name = m ? m.name : 'Dish';
      const section: MenuSection = m?.section || 'Kitchen';
      const count = Math.max(1, cartItem.quantity);

      if (type === 'BOT' && section === 'Bar') {
        itemsForType.push({ name, quantity: count, notes: cartItem.notes, section });
      } else if (type === 'KOT' && section !== 'Bar') {
        itemsForType.push({ name, quantity: count, notes: cartItem.notes, section });
      }
    });

    const finalItems = itemsForType.length > 0 ? itemsForType : order.items.map(ci => {
      const m = menuItems.find(item => item.id === ci.menuItemId);
      return { name: m ? m.name : 'Dish', quantity: ci.quantity, notes: ci.notes, section: m?.section };
    });

    const snapshot: TicketSnapshot = {
      type,
      ticketNumber: type === 'BOT' ? (order.botNumber || `BOT-${order.id.slice(-2)}`) : (order.kotNumber || `KOT-${order.id.slice(-2)}`),
      orderNumber: order.id,
      tableName,
      printedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      serverName: order.serverName || 'Staff',
      orderType: 'Table',
      items: finalItems,
      totalItems: finalItems.reduce((acc, it) => acc + it.quantity, 0),
    };

    if (onPrintTicket) {
      onPrintTicket(snapshot);
    } else {
      setTicketToPrint(snapshot);
    }
  };

  const displayableOrders = orders.filter((o) => o.status !== 'paid');

  const filteredOrders = displayableOrders.filter((o) => {
    const statusMatch = filter === 'all'
      ? o.status === 'pending' || o.status === 'cooking' || o.status === 'ready'
      : o.status === filter;

    if (!statusMatch) return false;

    if (sectionFilter === 'all') return true;
    if (sectionFilter === 'Bar') {
      return o.items.some((ci) => menuItems.find((m) => m.id === ci.menuItemId)?.section === 'Bar');
    }
    if (sectionFilter === 'Kitchen') {
      return o.items.some((ci) => menuItems.find((m) => m.id === ci.menuItemId)?.section !== 'Bar');
    }
    return true;
  });

  const handleStatusChange = (orderId: string, nextStatus: 'pending' | 'cooking' | 'ready' | 'served') => {
    const currentOrder = orders.find((order) => order.id === orderId);
    if (!currentOrder) return;

    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus };
      }
      return o;
    });
    onUpdateOrders(updatedOrders);

    if (nextStatus === 'cooking') {
      onNotify({
        id: `cooking-${orderId}-${Date.now()}`,
        title: 'Cooking started',
        message: `Kitchen started preparing Order ${orderId.slice(-6)} for Table ${currentOrder.tableId}.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: currentOrder.tableId,
        orderId,
        targetScreen: 'kitchen',
      });
    } else if (nextStatus === 'ready') {
      onNotify({
        id: `ready-${orderId}-${Date.now()}`,
        title: 'Order ready for service',
        message: `Order ${orderId.slice(-6)} for Table ${currentOrder.tableId} is READY for pickup!`,
        type: 'success',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: currentOrder.tableId,
        orderId,
        targetScreen: 'kitchen',
      });
    } else if (nextStatus === 'served') {
      const updatedTables = tables.map((t) => {
        if (t.id === currentOrder.tableId) {
          return {
            ...t,
            status: 'occupied' as const,
            orderTotal: getTableOrderTotal(currentOrder.tableId, updatedOrders),
            seatedTime: t.seatedTime || 'Seated & Served',
          };
        }
        return t;
      });
      onUpdateTables(updatedTables);

      onNotify({
        id: `served-${orderId}-${Date.now()}`,
        title: 'Order served to table',
        message: `Order ${orderId.slice(-6)} for Table ${currentOrder.tableId} was served to guests.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId: currentOrder.tableId,
        orderId,
        targetScreen: 'floorplan',
      });

      onOrderServed(currentOrder.tableId);
    }
  };

  const handlePingWaiter = (order: Order) => {
    onNotify({
      id: `ping-${order.id}-${Date.now()}`,
      title: 'Food ready at kitchen pass!',
      message: `Table ${order.tableId} order is waiting at the kitchen/bar counter. Please collect and serve!`,
      type: 'warning',
      createdAt: new Date().toISOString(),
      read: false,
      tableId: order.tableId,
      orderId: order.id,
      targetScreen: 'floorplan',
    });
  };

  const handleVoidItem = (orderId: string, itemIndex: number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const remainingItems = targetOrder.items.filter((_, idx) => idx !== itemIndex);

    if (remainingItems.length === 0) {
      onCancelOrder(orderId);
      return;
    }

    const { subtotal, tax, serviceCharge, total } = recalculateOrderTotalsFromItems(
      remainingItems,
      menuItems
    );

    const updatedOrders = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          items: remainingItems,
          subtotal,
          tax,
          serviceCharge,
          total,
        };
      }
      return o;
    });

    onUpdateOrders(updatedOrders);
  };

  const getItemDetails = (menuItemId: string) => {
    const item = menuItems.find((m) => m.id === menuItemId);
    return {
      name: item?.name ?? 'Dish',
      section: item?.section ?? 'Kitchen',
    };
  };

  const pendingCount = displayableOrders.filter((o) => o.status === 'pending').length;
  const cookingCount = displayableOrders.filter((o) => o.status === 'cooking').length;
  const readyCount = displayableOrders.filter((o) => o.status === 'ready').length;
  const servedCount = displayableOrders.filter((o) => o.status === 'served').length;

  return (
    <div id="kitchen-screen" className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-28 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-border-light pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface">
            Kitchen & Bar Order Passes
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Real-time live queue for Kitchen (KOT) and Bar (BOT) tickets
          </p>
        </div>

        {/* Section Tabs: All vs Kitchen vs Bar */}
        <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-border-light text-xs font-bold">
          <button
            type="button"
            onClick={() => setSectionFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              sectionFilter === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Passes
          </button>
          <button
            type="button"
            onClick={() => setSectionFilter('Kitchen')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              sectionFilter === 'Kitchen' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">skillet</span>
            <span>Kitchen (KOT)</span>
          </button>
          <button
            type="button"
            onClick={() => setSectionFilter('Bar')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              sectionFilter === 'Bar' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">local_bar</span>
            <span>Bar (BOT)</span>
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {[
          { id: 'all', label: `Active (${pendingCount + cookingCount + readyCount})`, icon: 'apps' },
          { id: 'pending', label: `Pending (${pendingCount})`, icon: 'hourglass_top' },
          { id: 'cooking', label: `Cooking (${cookingCount})`, icon: 'local_fire_department' },
          { id: 'ready', label: `Ready (${readyCount})`, icon: 'room_service' },
          { id: 'served', label: `Served (${servedCount})`, icon: 'done_all' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as KitchenFilter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
              filter === tab.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-secondary-container'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Grid of Tickets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredOrders.map((order) => {
          const isPending = order.status === 'pending';
          const isCooking = order.status === 'cooking';
          const isReady = order.status === 'ready';
          const isServed = order.status === 'served';
          const isHighlighted = highlightedOrderId === order.id;

          const hasBarItems = order.items.some((ci) => getItemDetails(ci.menuItemId).section === 'Bar');
          const hasKitchenItems = order.items.some((ci) => getItemDetails(ci.menuItemId).section !== 'Bar');

          let headerBg = 'bg-surface-container-low text-on-surface';
          let borderStyle = 'border-outline-variant/60';
          let statusBadge = 'bg-amber-100 text-amber-900 border border-amber-300';
          let statusText = 'Pending';

          if (isCooking) {
            headerBg = 'bg-primary/10 text-primary border-b border-primary/20';
            borderStyle = 'border-primary ring-1 ring-primary/20';
            statusBadge = 'bg-primary text-on-primary';
            statusText = 'Cooking Now';
          } else if (isReady) {
            headerBg = 'bg-green-50 text-green-950 border-b border-green-200';
            borderStyle = 'border-green-600 ring-2 ring-green-600/30';
            statusBadge = 'bg-green-700 text-white animate-pulse';
            statusText = 'Ready for Pickup';
          } else if (isServed) {
            headerBg = 'bg-surface-container text-on-surface-variant';
            borderStyle = 'border-border-light opacity-90';
            statusBadge = 'bg-green-100 text-green-800 border border-green-300';
            statusText = 'Delivered & Served';
          }

          if (isHighlighted) {
            borderStyle += ' ring-4 ring-primary ring-offset-2';
          }

          return (
            <div
              key={order.id}
              ref={(el) => { ticketRefs.current[order.id] = el; }}
              className={`bg-white rounded-2xl border flex flex-col overflow-hidden shadow-sm transition-all ${borderStyle}`}
            >
              {/* Ticket Header */}
              <div className={`p-3.5 sm:p-4 flex justify-between items-start ${headerBg}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-on-surface font-display">Table {order.tableId}</span>
                    <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md font-semibold">
                      {order.id.slice(-6)}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>Server: <strong>{order.serverName}</strong></span>
                    <span>•</span>
                    <span>{order.timestamp}</span>
                    <span className="text-[10px] text-on-surface-variant/80 bg-surface-container/60 px-1.5 py-0.2 rounded font-mono">
                      ⏱️ {getTimeElapsed(order.timestamp)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    {hasKitchenItems && (
                      <button
                        type="button"
                        onClick={() => handlePrintTicket(order, 'KOT')}
                        className="px-2 py-1 rounded-lg bg-white/90 hover:bg-white text-on-surface-variant hover:text-primary transition-colors border border-outline-variant/40 cursor-pointer shadow-2xs flex items-center gap-1"
                        title="Print Kitchen Order Ticket (KOT)"
                      >
                        <span className="material-symbols-outlined text-xs">print</span>
                        <span className="text-[10px] font-bold">KOT</span>
                      </button>
                    )}
                    {hasBarItems && (
                      <button
                        type="button"
                        onClick={() => handlePrintTicket(order, 'BOT')}
                        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors border border-amber-300 cursor-pointer shadow-2xs flex items-center gap-1"
                        title="Print Bar Order Ticket (BOT)"
                      >
                        <span className="material-symbols-outlined text-xs">local_bar</span>
                        <span className="text-[10px] font-bold">BOT</span>
                      </button>
                    )}
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="flex-1 p-3.5 sm:p-4 flex flex-col gap-2.5 bg-white">
                {order.items.map((cartItem, idx) => {
                  const details = getItemDetails(cartItem.menuItemId);
                  const isBarItem = details.section === 'Bar';

                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-start border-b border-dashed border-outline-variant/40 pb-2 last:border-none last:pb-0 group"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs font-semibold text-on-surface leading-snug flex items-center gap-1.5 flex-wrap">
                          <strong className="text-primary text-xs font-black bg-primary/10 px-1.5 py-0.5 rounded">
                            {cartItem.quantity}x
                          </strong>
                          <span>{details.name}</span>
                          {isBarItem && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                              BAR
                            </span>
                          )}
                        </div>
                        {cartItem.notes && (
                          <p className="text-[10px] text-amber-900 font-semibold mt-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            📝 {cartItem.notes}
                          </p>
                        )}
                      </div>

                      {/* Void item */}
                      {(isWaiter || isAdmin || isChef) && !isServed && (
                        <button
                          type="button"
                          onClick={() => handleVoidItem(order.id, idx)}
                          className="opacity-40 hover:opacity-100 text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer shrink-0"
                          title={`Void ${details.name}`}
                        >
                          <span className="material-symbols-outlined text-sm">remove_circle_outline</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-surface-container-low border-t border-outline-variant/30 flex flex-wrap gap-2">
                {(isWaiter || isAdmin) && !isServed && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Cancel Ticket',
                        message: `Cancel order #${order.id.slice(-6)} for Table ${order.tableId}? This ticket will be removed and stock restored.`,
                        confirmLabel: 'Yes, Cancel Ticket',
                        cancelLabel: 'Keep Ticket',
                        isDestructive: true,
                        icon: 'cancel',
                        onConfirm: () => onCancelOrder(order.id),
                      });
                    }}
                    className="py-2 px-2.5 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold rounded-xl border border-red-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                {/* Chef / Kitchen / Admin Status Progression */}
                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(order.id, 'cooking')}
                    className="flex-1 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-surface-tint shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                    <span>Start Cooking</span>
                  </button>
                )}

                {isCooking && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(order.id, 'ready')}
                    className="flex-1 py-2 bg-green-700 text-white text-xs font-bold rounded-xl hover:bg-green-800 shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Mark Ready for Pickup</span>
                  </button>
                )}

                {isReady && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePingWaiter(order)}
                      className="py-2 px-3 bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold rounded-xl shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">notifications_active</span>
                      <span>Alert Server</span>
                    </button>
                    {(isWaiter || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, 'served')}
                        className="flex-1 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-surface-tint shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        <span>Mark Served to Table</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-border-light">
            <div className="w-16 h-16 rounded-full bg-secondary-container/50 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl opacity-50">restaurant</span>
            </div>
            <p className="text-sm font-semibold">No active tickets in queue</p>
            <p className="text-xs opacity-75 mt-1">Orders taken by waiters will appear here immediately.</p>
          </div>
        )}
      </div>

      <ConfirmModal dialog={confirmModal} onClose={() => setConfirmModal(null)} />
    </div>
  );
}
