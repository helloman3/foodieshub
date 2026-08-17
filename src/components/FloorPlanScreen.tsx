import React, { useState, useEffect, useRef } from 'react';
import { Table, TableStatus, Order, Notification } from '../types';
import { getTableOrderTotal } from '../constants';
import RoundedSelect from './RoundedSelect';

interface FloorPlanScreenProps {
  tables: Table[];
  orders?: Order[];
  onUpdateTables: (updatedTables: Table[]) => void;
  onUpdateOrders?: (updatedOrders: Order[]) => void;
  onNavigateToOrder: (tableId: string) => void;
  onNavigateToBilling: (tableId: string) => void;
  onNotify?: (notification: Notification) => void;
  highlightedTableId?: string | null;
}

export default function FloorPlanScreen({
  tables,
  orders = [],
  onUpdateTables,
  onUpdateOrders,
  onNavigateToOrder,
  onNavigateToBilling,
  onNotify,
  highlightedTableId,
}: FloorPlanScreenProps) {
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInTableId, setWalkInTableId] = useState('');
  const tableCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!highlightedTableId) return;
    setTimeout(() => {
      const el = tableCardRefs.current[highlightedTableId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [highlightedTableId]);

  // Calculate dynamic capacity
  const occupiedTables = tables.filter((table) => table.status === 'occupied').length;
  const emptyOccupiedTables = tables.filter((t) => {
    if (t.status !== 'occupied') return false;
    const unpaid = orders.filter((o) => o.tableId === t.id && o.status !== 'paid');
    return unpaid.length === 0;
  });

  // Handle Quick Clean
  const handleMarkClean = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'available' as TableStatus,
          guests: undefined,
          orderTotal: 0,
          seatedTime: undefined,
        };
      }
      return t;
    });
    onUpdateTables(updated);
  };

  // Handle Unseating a table (Release back to Available)
  const handleUnseatTable = (tableId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Check if table has active unpaid orders
    const tableUnpaid = orders.filter((o) => o.tableId === tableId && o.status !== 'paid');
    
    if (tableUnpaid.length > 0) {
      if (onNotify) {
        onNotify({
          id: `unseat-warn-${tableId}-${Date.now()}`,
          title: 'Cannot Unseat Table with Active Orders',
          message: `Table ${tableId} has ${tableUnpaid.length} active order(s). Please void/cancel tickets or settle the bill first.`,
          type: 'warning',
          createdAt: new Date().toISOString(),
          read: false,
          tableId,
          targetScreen: 'floorplan',
        });
      }
      return;
    }

    const updated = tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'available' as TableStatus,
          guests: undefined,
          seatedTime: undefined,
          orderTotal: 0,
          reservationInfo: undefined,
        };
      }
      return t;
    });
    onUpdateTables(updated);

    if (onNotify) {
      onNotify({
        id: `unseat-success-${tableId}-${Date.now()}`,
        title: 'Table Unseated',
        message: `Table ${tableId} has been reset to Available.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId,
        targetScreen: 'floorplan',
      });
    }
  };

  // Bulk unseat all occupied tables that have 0 orders (handy for clearing accidental seatings)
  const handleUnseatAllEmptyTables = () => {
    const emptyOccupied = tables.filter((t) => {
      if (t.status !== 'occupied') return false;
      const unpaid = orders.filter((o) => o.tableId === t.id && o.status !== 'paid');
      return unpaid.length === 0;
    });

    if (emptyOccupied.length === 0) return;

    const emptyIds = new Set(emptyOccupied.map((t) => t.id));
    const updated = tables.map((t) => {
      if (emptyIds.has(t.id)) {
        return {
          ...t,
          status: 'available' as TableStatus,
          guests: undefined,
          seatedTime: undefined,
          orderTotal: 0,
          reservationInfo: undefined,
        };
      }
      return t;
    });
    onUpdateTables(updated);

    if (onNotify) {
      onNotify({
        id: `unseat-all-${Date.now()}`,
        title: 'Empty Tables Reset',
        message: `Reset ${emptyOccupied.length} empty seated table(s) back to Available.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        targetScreen: 'floorplan',
      });
    }
  };

  // Quick Serve all ready orders on a table directly from the Floor Plan
  const handleQuickServeTable = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orders || !onUpdateOrders) return;
    const targetReadyOrders = orders.filter((o) => o.tableId === tableId && o.status === 'ready');
    if (targetReadyOrders.length === 0) return;

    const updatedOrders = orders.map((o) => {
      if (o.tableId === tableId && o.status === 'ready') {
        return { ...o, status: 'served' as const };
      }
      return o;
    });
    onUpdateOrders(updatedOrders);

    const updatedTables = tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'occupied' as TableStatus,
          orderTotal: getTableOrderTotal(tableId, updatedOrders),
          seatedTime: t.seatedTime || 'Seated & Served',
        };
      }
      return t;
    });
    onUpdateTables(updatedTables);

    if (onNotify) {
      onNotify({
        id: `served-quick-${tableId}-${Date.now()}`,
        title: 'Order delivered to table',
        message: `Order for Table ${tableId} was delivered and marked served.`,
        type: 'info',
        createdAt: new Date().toISOString(),
        read: false,
        tableId,
        targetScreen: 'floorplan',
      });
    }
  };

  // Filter tables
  const filteredTables = tables.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  // Handle Seating Table
  const handleSeatTable = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    const updated = tables.map((t) => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'occupied' as TableStatus,
          guests: undefined,
          seatedTime: 'Just seated',
          orderTotal: 0,
          reservationInfo: undefined,
        };
      }
      return t;
    });
    onUpdateTables(updated);
    onNavigateToOrder(tableId);
  };

  // Walk-in seating requires an explicit table selection
  const handleQuickWalkIn = () => {
    if (walkInTableId) {
      handleSeatTable(walkInTableId);
      setIsWalkInOpen(false);
    }
  };

  const handleCardClick = (table: Table) => {
    if (table.status === 'available') {
      handleSeatTable(table.id);
    } else if (table.status === 'occupied') {
      onNavigateToOrder(table.id);
    } else if (table.status === 'reserved') {
      handleSeatTable(table.id);
    } else if (table.status === 'cleaning') {
      const updated = tables.map((t) => {
        if (t.id === table.id) {
          return { ...t, status: 'available' as TableStatus, guests: undefined, orderTotal: 0 };
        }
        return t;
      });
      onUpdateTables(updated);
    }
  };

  return (
    <div id="floor-plan-screen" className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-28 md:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface leading-tight">Main Dining Room</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Occupied tables: <strong className="text-primary font-bold">{occupiedTables}/{tables.length}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative">
          {/* Custom Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="bg-surface-container text-on-surface-variant hover:bg-surface-container-high px-5 py-2.5 rounded-full font-semibold text-xs transition-colors cursor-pointer flex items-center gap-2 border border-border-light shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm text-primary">filter_list</span>
              <span>
                {statusFilter === 'all' && 'All Tables'}
                {statusFilter === 'available' && 'Available'}
                {statusFilter === 'occupied' && 'Occupied'}
                {statusFilter === 'reserved' && 'Reserved'}
                {statusFilter === 'cleaning' && 'Needs Cleaning'}
              </span>
              <span className={`material-symbols-outlined text-xs text-on-surface-variant transition-transform duration-200 ${isFilterDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {isFilterDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsFilterDropdownOpen(false)}></div>
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white border border-border-light rounded-2xl shadow-xl z-30 py-2 overflow-hidden animate-fade-in font-sans">
                  {[
                    { id: 'all', label: 'All Tables', icon: 'apps' },
                    { id: 'available', label: 'Available', icon: 'event_seat' },
                    { id: 'occupied', label: 'Occupied', icon: 'groups' },
                    { id: 'reserved', label: 'Reserved', icon: 'bookmark' },
                    { id: 'cleaning', label: 'Needs Cleaning', icon: 'cleaning_services' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.id as TableStatus | 'all');
                        setIsFilterDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-primary-container/60 transition-colors cursor-pointer ${
                        statusFilter === option.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">{option.icon}</span>
                        {option.label}
                      </span>
                      {statusFilter === option.id && (
                        <span className="material-symbols-outlined text-xs text-primary font-bold">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {emptyOccupiedTables.length > 0 && (
            <button
              type="button"
              id="unseat-all-empty-tables-btn"
              onClick={handleUnseatAllEmptyTables}
              className="bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 px-4 py-2.5 rounded-full font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              title="Reset all tables that were seated with 0 orders back to Available"
            >
              <span className="material-symbols-outlined text-sm text-amber-800">restart_alt</span>
              <span>Reset {emptyOccupiedTables.length} Empty Table{emptyOccupiedTables.length > 1 ? 's' : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { setWalkInTableId(tables.find((table) => table.status === 'available')?.id ?? ''); setIsWalkInOpen(true); }}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold text-xs hover:bg-surface-tint transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Walk-in</span>
          </button>
        </div>
      </div>

      {/* Legend / Status Indicators */}
      <div id="floor-legend" className="flex flex-wrap gap-4 mb-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
        <button 
          onClick={() => setStatusFilter('available')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusFilter === 'available' ? 'bg-white border-primary/40 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
        >
          <div className="w-4 h-4 rounded-full bg-[#E7F2D8] border border-outline-variant"></div>
          <span className="text-xs font-semibold text-on-surface-variant">Available</span>
        </button>
        <button 
          onClick={() => setStatusFilter('occupied')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusFilter === 'occupied' ? 'bg-white border-primary/40 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
        >
          <div className="w-4 h-4 rounded-full bg-primary-container border border-primary"></div>
          <span className="text-xs font-semibold text-on-surface-variant">Occupied</span>
        </button>
        <button 
          onClick={() => setStatusFilter('reserved')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusFilter === 'reserved' ? 'bg-white border-primary/40 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
        >
          <div className="w-4 h-4 rounded-full bg-secondary-container border border-secondary"></div>
          <span className="text-xs font-semibold text-on-surface-variant">Reserved</span>
        </button>
        <button 
          onClick={() => setStatusFilter('cleaning')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${statusFilter === 'cleaning' ? 'bg-white border-primary/40 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
        >
          <div className="w-4 h-4 rounded-full bg-error-container border border-error"></div>
          <span className="text-xs font-semibold text-on-surface-variant">Needs Cleaning</span>
        </button>
        {statusFilter !== 'all' && (
          <button 
            onClick={() => setStatusFilter('all')}
            className="ml-auto text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Table Grid */}
      <div id="table-grid" className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTables.map((table) => {
          const isHighlighted = highlightedTableId === table.id;

          // Kitchen order status for this table
          const tableUnpaid = orders.filter((o) => o.tableId === table.id && o.status !== 'paid');
          const readyOrders = tableUnpaid.filter((o) => o.status === 'ready');
          const cookingOrders = tableUnpaid.filter((o) => o.status === 'cooking');
          const pendingOrders = tableUnpaid.filter((o) => o.status === 'pending');
          const hasReady = readyOrders.length > 0;
          const hasCooking = cookingOrders.length > 0;
          const hasPending = pendingOrders.length > 0;

          // Determine styling based on state
          let cardBg = 'bg-[#E7F2D8] hover:bg-[#dbe7ca]';
          let borderStyle = 'border-transparent';
          let textColor = 'text-on-surface';
          let subTextColor = 'text-tertiary';
          let badgeColor = 'bg-white/40 text-on-surface';
          let statusIcon = 'chair';

          if (table.status === 'occupied') {
            cardBg = hasReady 
              ? 'bg-[#EAF5D8] hover:bg-[#dff0c6]' 
              : 'bg-primary-container hover:bg-[#639c32]';
            borderStyle = hasReady ? 'border-green-600 ring-2 ring-green-600/40' : 'border-primary';
            textColor = hasReady ? 'text-on-surface' : 'text-on-primary';
            subTextColor = hasReady ? 'text-on-surface-variant' : 'text-on-primary/90';
            badgeColor = hasReady ? 'bg-green-100 text-green-900 border border-green-300' : 'bg-white/30 text-on-primary';
            statusIcon = hasReady ? 'room_service' : 'groups';
          } else if (table.status === 'reserved') {
            cardBg = 'bg-secondary-container hover:bg-[#dfd5bc]';
            borderStyle = 'border-secondary';
            textColor = 'text-on-secondary-container';
            subTextColor = 'text-on-secondary-container/95';
            badgeColor = 'bg-white/40 text-on-secondary-container';
            statusIcon = 'event_seat';
          } else if (table.status === 'cleaning') {
            cardBg = 'bg-error-container hover:bg-[#ffcfcb]';
            borderStyle = 'border-error';
            textColor = 'text-on-error-container';
            subTextColor = 'text-on-error-container/90';
            badgeColor = 'bg-white/40 text-on-error-container';
            statusIcon = 'cleaning_services';
          }

          if (isHighlighted) {
            borderStyle += ' ring-4 ring-primary ring-offset-2';
          }

          return (
            <div
              key={table.id}
              ref={(el) => { tableCardRefs.current[table.id] = el; }}
              onClick={() => handleCardClick(table)}
              className={`rounded-[24px] p-5 flex flex-col justify-between aspect-square cursor-pointer border transition-all duration-200 shadow-sm relative group hover:-translate-y-0.5 active:scale-95 select-none ${cardBg} ${borderStyle}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 max-w-[calc(100%-2.25rem)]">
                  <span className="block text-base sm:text-lg font-display font-bold leading-tight break-words line-clamp-2">{table.name}</span>
                  <span className="block text-[10px] opacity-70 mt-1">ID {table.id}</span>
                </div>
                <span className="material-symbols-outlined text-[26px] shrink-0">{statusIcon}</span>
              </div>

              <div className="mt-auto">
                {table.status === 'occupied' && (
                  <>
                    {/* Live Kitchen Status Indicators */}
                    {hasReady ? (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-green-700 text-white shadow-sm animate-pulse">
                          <span className="material-symbols-outlined text-xs">notifications_active</span>
                          <span>Food Ready! ({readyOrders.length})</span>
                        </span>
                      </div>
                    ) : hasCooking ? (
                      <div className="mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="material-symbols-outlined text-xs">skillet</span>
                          <span>Kitchen Cooking</span>
                        </span>
                      </div>
                    ) : hasPending ? (
                      <div className="mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <span className="material-symbols-outlined text-xs">hourglass_top</span>
                          <span>Order Sent</span>
                        </span>
                      </div>
                    ) : null}

                    <div className={`text-sm font-bold ${textColor}`}>Occupied</div>
                    <div className={`text-xs ${subTextColor}`}>{table.seatedTime}</div>
                    
                    {table.orderTotal ? (
                      <div className={`mt-2 text-xs font-semibold inline-block px-2.5 py-1 rounded-md ${badgeColor}`}>
                        Rs. {table.orderTotal.toFixed(2)}
                      </div>
                    ) : (
                      <div className={`mt-2 text-xs font-semibold inline-block px-2.5 py-1 rounded-md ${badgeColor}`}>
                        Seated
                      </div>
                    )}

                    {/* Quick 1-Click Deliver & Serve Button for Waiter */}
                    {hasReady && onUpdateOrders && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickServeTable(table.id, e)}
                        className="mt-2.5 w-full py-1.5 bg-green-700 hover:bg-green-800 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                        title="Deliver ready food and mark served"
                      >
                        <span className="material-symbols-outlined text-sm">room_service</span>
                        <span>Deliver & Mark Served</span>
                      </button>
                    )}

                    {/* Dedicated Unseat Table button when table has 0 active unpaid orders */}
                    {!hasReady && tableUnpaid.length === 0 && (
                      <button
                        type="button"
                        id={`unseat-table-${table.id}-btn`}
                        onClick={(e) => handleUnseatTable(table.id, e)}
                        className="mt-2.5 w-full py-1.5 bg-white/90 hover:bg-white text-stone-800 hover:text-red-700 font-bold text-xs rounded-xl shadow-xs border border-border-light cursor-pointer transition-all flex items-center justify-center gap-1 active:scale-95"
                        title="Accidental click? Reset table back to Available"
                      >
                        <span className="material-symbols-outlined text-xs">event_seat</span>
                        <span>Unseat Table</span>
                      </button>
                    )}
                  </>
                )}

                {table.status === 'available' && (
                  <>
                    <div className={`text-sm font-bold ${textColor}`}>{table.seats} Seats</div>
                    <div className={`text-xs ${subTextColor}`}>Available</div>
                  </>
                )}

                {table.status === 'reserved' && (
                  <>
                    <div className={`text-sm font-bold truncate ${textColor}`}>{table.reservationInfo}</div>
                    <div className={`text-xs ${subTextColor}`}>{table.seatedTime}</div>
                  </>
                )}

                {table.status === 'cleaning' && (
                  <>
                    <div className={`text-sm font-bold ${textColor}`}>{table.seats} Seats</div>
                    <div className={`text-xs ${subTextColor}`}>Needs Cleaning</div>
                    <button
                      type="button"
                      onClick={(e) => handleMarkClean(table.id, e)}
                      className="mt-2.5 w-full py-1.5 bg-white/50 text-on-error-container font-semibold text-xs rounded-lg hover:bg-white/70 transition-colors shadow-sm cursor-pointer"
                    >
                      Mark Clean
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WALK-IN MODAL */}
      {isWalkInOpen && (
        <div id="walkin-modal" className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-border-light relative animate-scale-up">
            <h3 className="font-display text-xl font-bold text-on-surface mb-2">Choose a table</h3>
            <p className="text-xs text-on-surface-variant mb-4">Select an available table to start taking its order.</p>

            <div className="flex flex-col gap-3 mb-6">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase">Table</label>
              <RoundedSelect value={walkInTableId} onChange={setWalkInTableId} ariaLabel="Walk-in table" options={tables.filter((table) => table.status === 'available').map((table) => ({ value: table.id, label: `${table.name} · ${table.seats} seats` }))} />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface font-semibold text-sm rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickWalkIn}
                className="flex-1 py-3 bg-primary text-on-primary font-semibold text-sm rounded-xl hover:bg-surface-tint transition-all shadow-sm cursor-pointer"
              >
                Start Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
