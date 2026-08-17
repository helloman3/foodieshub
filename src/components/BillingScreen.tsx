import React, { useEffect, useState, useMemo } from 'react';
import { Table, MenuItem, Order, User, PaymentMethod, PaymentQrCodes, PrinterPaperFormat, RestaurantInfo, ReceiptSnapshot } from '../types';
import {
  calculateOrderTotals,
  getUnpaidOrdersForTable,
  hasKitchenOrdersInProgress,
} from '../constants';

interface BillingScreenProps {
  currentUser: User;
  tables: Table[];
  menuItems: MenuItem[];
  activeTableId: string | null;
  orders: Order[];
  restaurantInfo: RestaurantInfo;
  paymentQrs: PaymentQrCodes;
  onCompletePayment: (
    tableId: string,
    paymentMethod: string,
    paymentDetails?: {
      discount?: number;
      discountReason?: string;
      tenderAmount?: number;
      changeAmount?: number;
      andPrint?: boolean;
    }
  ) => void;
  onSelectTable: (tableId: string) => void;
  onPrintReceipt: (receipt: ReceiptSnapshot) => void;
  onUpdateOrders?: (orders: Order[]) => void;
}

export default function BillingScreen({
  currentUser,
  tables,
  menuItems,
  activeTableId,
  orders,
  restaurantInfo,
  paymentQrs,
  onCompletePayment,
  onSelectTable,
  onPrintReceipt,
}: BillingScreenProps) {
  const [billingTab, setBillingTab] = useState<'active' | 'history'>('active');
  const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'QR'>('Cash');
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  // Discount feature
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Cash Tender feature
  const [tenderAmountInput, setTenderAmountInput] = useState<string>('');

  // Configurable printer format: auto, 58mm, 80mm, a4
  const [printerFormat, setPrinterFormat] = useState<PrinterPaperFormat>(() => {
    try {
      return (localStorage.getItem('foodiehub.v1.printer-format') as PrinterPaperFormat) || 'auto';
    } catch {
      return 'auto';
    }
  });

  const handleUpdatePrinterFormat = (format: PrinterPaperFormat) => {
    setPrinterFormat(format);
    try {
      localStorage.setItem('foodiehub.v1.printer-format', format);
    } catch {}
  };

  // History search & filter state
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<string>('all');
  const [viewingHistoryReceipt, setViewingHistoryReceipt] = useState<ReceiptSnapshot | null>(null);

  const activeTable = activeTableId
    ? tables.find((t) => t.id === activeTableId) ?? null
    : null;

  // Get ALL unpaid orders for the active table
  const unpaidOrders = activeTable
    ? getUnpaidOrdersForTable(activeTable.id, orders)
    : [];

  const kitchenInProgress = activeTable
    ? hasKitchenOrdersInProgress(activeTable.id, orders)
    : false;

  // Aggregate items from all active orders for this table
  const billItems = useMemo(() => {
    return unpaidOrders.flatMap((order) =>
      order.items.flatMap((cartItem) => {
        const item = menuItems.find((m) => m.id === cartItem.menuItemId);
        const fallbackItem = item || {
          id: cartItem.menuItemId,
          name: 'Custom Item',
          price: 0,
          category: 'Mains',
          description: '',
          image: '',
        };
        const count = Math.max(1, cartItem.quantity);
        return Array.from({ length: count }, () => ({
          orderId: order.id,
          orderStatus: order.status,
          item: fallbackItem,
          qty: 1,
          rate: fallbackItem.price,
          amount: fallbackItem.price,
          notes: cartItem.notes,
        }));
      })
    );
  }, [unpaidOrders, menuItems]);

  const rawSubtotal = billItems.reduce((acc, it) => acc + it.amount, 0);

  // Discount calculation
  const parsedDiscountInput = parseFloat(discountInput) || 0;
  const computedDiscount = useMemo(() => {
    if (parsedDiscountInput <= 0) return 0;
    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, parsedDiscountInput));
      return Math.round(rawSubtotal * (pct / 100) * 100) / 100;
    }
    return Math.min(rawSubtotal, Math.max(0, parsedDiscountInput));
  }, [rawSubtotal, discountType, parsedDiscountInput]);

  const grandTotal = Math.max(0, rawSubtotal - computedDiscount);

  // Cash change calculation
  const tenderAmount = parseFloat(tenderAmountInput) || 0;
  const changeAmount = selectedMethod === 'Cash' && tenderAmount > grandTotal ? tenderAmount - grandTotal : 0;

  const orderNumber =
    unpaidOrders.length === 1
      ? unpaidOrders[0].id
      : unpaidOrders.length > 1
        ? `${unpaidOrders.length} tickets (${unpaidOrders.map((o) => o.id.slice(-4)).join(', ')})`
        : '—';

  const kotNumber = unpaidOrders[0]?.kotNumber || 'KOT-01';
  const botNumber = unpaidOrders[0]?.botNumber;
  const orderIndex = orders.length + 1;
  const billNumber = unpaidOrders[0]?.billNumber || `${restaurantInfo.billPrefix || 'FH-'}${1000 + orderIndex}`;
  const serverName = unpaidOrders[0]?.serverName || activeTable?.serverName || currentUser.name;

  const canProcessPayment = currentUser.role === 'Accountant' || currentUser.role === 'Admin' || currentUser.role === 'Waiter';
  const canCompletePayment = canProcessPayment && unpaidOrders.length > 0;

  // Active QR image (from restaurantInfo or fallback paymentQrs)
  const qrImage = restaurantInfo.qrCodeImage || paymentQrs['QR'] || paymentQrs['eSewa'] || paymentQrs['Khalti'] || '';

  const createReceiptSnapshot = (isPaid: boolean, method: string): ReceiptSnapshot => {
    return {
      restaurantName: restaurantInfo.name || 'FoodieHub',
      restaurantAddress: restaurantInfo.address || 'Kathmandu, Nepal',
      restaurantPhone: restaurantInfo.phone || '+977 9800000000',
      restaurantPanNo: restaurantInfo.panNo || '',
      billGreeting: restaurantInfo.billGreeting || 'Thank you! Visit again.',
      printedAt: new Date().toLocaleString(),
      billNumber,
      orderNumber,
      kotNumber,
      botNumber,
      tableName: activeTable?.name || 'Table',
      cashierName: currentUser.name,
      serverName,
      paymentMethod: isPaid ? method : `${method} (Guest Check)`,
      tenderAmount: isPaid && method === 'Cash' && tenderAmount > 0 ? tenderAmount : undefined,
      changeAmount: isPaid && method === 'Cash' && tenderAmount > 0 ? changeAmount : undefined,
      items: billItems.map((b) => ({
        name: b.item.name,
        quantity: b.qty,
        rate: b.rate,
        amount: b.amount,
        notes: b.notes,
      })),
      subtotal: rawSubtotal,
      discount: computedDiscount,
      total: grandTotal,
      qrCode: method === 'QR' && qrImage ? qrImage : undefined,
    };
  };

  const handlePrintGuestBill = () => {
    if (!activeTable || unpaidOrders.length === 0) return;
    const snapshot = createReceiptSnapshot(false, selectedMethod);
    onPrintReceipt(snapshot);
  };

  const handleOpenSettleModal = () => {
    if (!canCompletePayment || !activeTable) return;
    setShowReceipt(true);
  };

  const confirmReceiptPayment = () => {
    if (!activeTable) return;
    const snapshot = createReceiptSnapshot(true, selectedMethod);
    setShowReceipt(false);
    onPrintReceipt(snapshot);
    onCompletePayment(activeTable.id, selectedMethod, {
      discount: computedDiscount,
      discountReason,
      tenderAmount: selectedMethod === 'Cash' && tenderAmount > 0 ? tenderAmount : undefined,
      changeAmount: selectedMethod === 'Cash' && tenderAmount > 0 ? changeAmount : undefined,
      andPrint: false, // already printed via onPrintReceipt
    });
  };

  // Paid orders calculation for history tab
  const paidOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'paid')
      .sort((a, b) => new Date(b.paidAt || b.timestamp).getTime() - new Date(a.paidAt || a.timestamp).getTime());
  }, [orders]);

  const filteredPaidOrders = useMemo(() => {
    return paidOrders.filter((order) => {
      const targetTable = tables.find((t) => t.id === order.tableId);
      const tableName = targetTable?.name || `Table ${order.tableId}`;
      const method = order.paymentMethod || 'Cash';
      const server = order.serverName || order.completedBy || '';

      const matchSearch =
        order.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (order.billNumber && order.billNumber.toLowerCase().includes(historySearch.toLowerCase())) ||
        tableName.toLowerCase().includes(historySearch.toLowerCase()) ||
        method.toLowerCase().includes(historySearch.toLowerCase()) ||
        server.toLowerCase().includes(historySearch.toLowerCase());

      const matchMethod = historyMethodFilter === 'all' || method.toLowerCase() === historyMethodFilter.toLowerCase();

      return matchSearch && matchMethod;
    });
  }, [paidOrders, tables, historySearch, historyMethodFilter]);

  const totalPaidRevenue = useMemo(() => {
    return paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [paidOrders]);

  const handleOpenPaidReceipt = (order: Order) => {
    const targetTable = tables.find((t) => t.id === order.tableId);
    const tableName = targetTable?.name || `Table ${order.tableId}`;
    const items = order.items.flatMap((cartItem) => {
      const m = menuItems.find((item) => item.id === cartItem.menuItemId);
      const name = m ? m.name : 'Dish';
      const unitPrice = m ? m.price : 0;
      const count = Math.max(1, cartItem.quantity);
      return Array.from({ length: count }, () => ({
        name,
        quantity: 1,
        rate: unitPrice,
        amount: unitPrice,
        notes: cartItem.notes,
      }));
    });

    const snapshot: ReceiptSnapshot = {
      restaurantName: restaurantInfo.name || 'FoodieHub',
      restaurantAddress: restaurantInfo.address || 'Kathmandu, Nepal',
      restaurantPhone: restaurantInfo.phone || '+977 9800000000',
      restaurantPanNo: restaurantInfo.panNo || '',
      billGreeting: restaurantInfo.billGreeting || 'Thank you! Visit again.',
      printedAt: order.paidAt ? new Date(order.paidAt).toLocaleString() : order.timestamp,
      billNumber: order.billNumber || `${restaurantInfo.billPrefix || 'FH-'}${order.id.slice(-4)}`,
      orderNumber: order.id,
      kotNumber: order.kotNumber,
      botNumber: order.botNumber,
      tableName,
      cashierName: order.completedBy || currentUser.name,
      serverName: order.serverName || 'Staff',
      paymentMethod: order.paymentMethod || 'Paid',
      items,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      total: order.total,
    };
    setViewingHistoryReceipt(snapshot);
  };

  const tablesWithUnpaidBills = tables.filter((t) =>
    orders.some((o) => o.tableId === t.id && o.status !== 'paid') || t.status === 'occupied'
  );

  return (
    <div id="billing-screen" className="flex-grow p-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full font-sans pb-28 md:pb-8">
      
      {/* Top Billing Tabs & Printer Paper Format Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-border-light pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBillingTab('active')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              billingTab === 'active'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">point_of_sale</span>
            <span>Active Table Bills</span>
            {tablesWithUnpaidBills.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                billingTab === 'active' ? 'bg-white text-primary' : 'bg-primary text-on-primary'
              }`}>
                {tablesWithUnpaidBills.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setBillingTab('history')}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              billingTab === 'history'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">receipt_long</span>
            <span>Settled Invoices & Receipts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              billingTab === 'history' ? 'bg-white text-primary' : 'bg-surface-variant text-on-surface-variant'
            }`}>
              {paidOrders.length}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {billingTab === 'history' && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-xl">
              <span className="font-medium">Total Settled:</span>
              <strong className="text-primary font-bold">Rs. {totalPaidRevenue.toFixed(2)}</strong>
            </div>
          )}

          {/* Printer Format Switcher */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-border-light text-[11px] font-bold">
            <span className="text-[10px] text-on-surface-variant pl-2 pr-1 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">print</span>
              <span>Paper:</span>
            </span>
            <button
              type="button"
              onClick={() => handleUpdatePrinterFormat('auto')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                printerFormat === 'auto'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
              title="Auto-fit printer aspect ratio"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => handleUpdatePrinterFormat('58mm')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                printerFormat === '58mm'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
              title="58mm (2-Inch Portable Bluetooth Printer)"
            >
              58mm
            </button>
            <button
              type="button"
              onClick={() => handleUpdatePrinterFormat('80mm')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                printerFormat === '80mm'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
              title="80mm (3-Inch Standard Desktop POS Printer)"
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => handleUpdatePrinterFormat('a4')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                printerFormat === 'a4'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
              title="A4 / Full Page Document / PDF"
            >
              A4
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ACTIVE DINING BILLS VIEW */}
      {/* ======================================================== */}
      {billingTab === 'active' && (
        <>
          {/* Quick Table Switcher Bar */}
          <div className="mb-6 bg-surface-container-low p-3 rounded-2xl border border-border-light flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">table_restaurant</span>
                <span>Active Dining Tables</span>
              </span>
              <span className="text-[11px] font-semibold text-on-surface-variant">
                {tablesWithUnpaidBills.length} active tables
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {tables.map((table) => {
                const tableUnpaid = getUnpaidOrdersForTable(table.id, orders);
                const tableSum = tableUnpaid.reduce((acc, o) => acc + o.total, 0);
                const isSelected = activeTableId === table.id;

                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onSelectTable(table.id)}
                    className={`shrink-0 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-start min-w-[110px] ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : tableSum > 0
                          ? 'bg-white hover:bg-secondary-container border-primary/40 text-on-surface'
                          : 'bg-surface-container hover:bg-surface-container-high border-transparent text-on-surface-variant'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span>{table.name}</span>
                      {tableSum > 0 && !isSelected && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-on-primary/90' : 'text-primary'}`}>
                      {tableSum > 0 ? `Rs. ${tableSum.toFixed(0)}` : table.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!activeTable ? (
            <div className="py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-border-light">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">table_restaurant</span>
              <p className="text-sm font-semibold mb-1">Select a table above to view billing & generate receipts.</p>
              <p className="text-xs opacity-75">Click on any table button to open its checkout portal.</p>
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-outline-variant/30 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface leading-tight">
                      {activeTable.name} — Billing
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-bold">
                      Bill No: {billNumber}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-1">
                    Server: <strong>{serverName}</strong> • {orderNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintGuestBill}
                    disabled={billItems.length === 0}
                    className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-border-light transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>Print Guest Check</span>
                  </button>
                </div>
              </div>

              {kitchenInProgress && (
                <div className="mb-6 bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-xs text-amber-950 shadow-2xs flex items-center gap-2.5 font-semibold">
                  <span className="material-symbols-outlined text-amber-700 text-lg">skillet</span>
                  <span>Kitchen in progress: Dishes are currently cooking in the kitchen. You can review or settle the bill when served.</span>
                </div>
              )}

              {billItems.length === 0 && (
                <div className="mb-6 bg-surface-container-low border border-dashed border-border-light p-8 rounded-2xl text-xs text-on-surface-variant text-center">
                  <span className="material-symbols-outlined text-3xl mb-2 opacity-50">receipt_long</span>
                  <p className="font-semibold text-sm">No unpaid orders for {activeTable.name}.</p>
                  <p className="text-[11px] opacity-75 mt-1">Orders taken by waiters will appear here automatically.</p>
                </div>
              )}

              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Itemized Order Summary */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="bg-surface-light border border-border-light rounded-2xl p-5 md:p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4 border-b border-surface-variant pb-3">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <span>Items List</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-surface-container rounded-md text-on-surface-variant">
                          {billItems.length} items
                        </span>
                      </h2>
                      <span className="text-xs font-semibold text-on-surface-variant">
                        Rate & Amounts in Rs.
                      </span>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-border-light text-on-surface-variant text-[11px] font-bold">
                            <th className="pb-2">Item Description</th>
                            <th className="pb-2 text-center">Qty</th>
                            <th className="pb-2 text-right">Rate</th>
                            <th className="pb-2 text-right">Amt (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light/60">
                          {billItems.map((b, idx) => (
                            <tr key={idx} className="hover:bg-surface-container-low/50">
                              <td className="py-2.5 pr-2 font-medium text-on-surface">
                                <div>{b.item.name}</div>
                                {b.notes && <span className="text-[10px] text-amber-800 italic">Note: {b.notes}</span>}
                              </td>
                              <td className="py-2.5 text-center font-bold text-primary">{b.qty}</td>
                              <td className="py-2.5 text-right text-on-surface-variant">{b.rate.toFixed(2)}</td>
                              <td className="py-2.5 text-right font-bold text-on-surface">{b.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotal */}
                    <div className="mt-4 pt-4 border-t border-dashed border-border-light flex justify-between items-center text-xs font-semibold">
                      <span className="text-on-surface-variant">Subtotal</span>
                      <span className="text-sm font-bold text-on-surface">Rs. {rawSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Discount & Payment Checkout */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  <div className="bg-surface-light border border-border-light rounded-2xl p-5 md:p-6 shadow-sm flex flex-col gap-4">
                    <h2 className="text-base font-bold text-on-surface flex items-center gap-2 border-b border-border-light pb-3">
                      <span className="material-symbols-outlined text-primary">payments</span>
                      <span>Payment & Settle</span>
                    </h2>

                    {/* Discount Control (Admin & Accountant) */}
                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-light flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-primary">local_offer</span>
                          <span>Apply Discount</span>
                        </span>
                        <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-border-light text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setDiscountType('amount')}
                            className={`px-2 py-0.5 rounded ${discountType === 'amount' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                          >
                            Rs. (Flat)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('percent')}
                            className={`px-2 py-0.5 rounded ${discountType === 'percent' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                          >
                            % (Percent)
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder={discountType === 'amount' ? 'e.g. 50' : 'e.g. 10'}
                          className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-outline-variant/60 focus:border-primary outline-none font-bold"
                        />
                        {discountInput && (
                          <button
                            type="button"
                            onClick={() => setDiscountInput('')}
                            className="text-xs text-error hover:underline px-1 font-semibold"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {computedDiscount > 0 && (
                        <div className="flex justify-between text-xs text-green-700 font-bold pt-1">
                          <span>Discount Applied:</span>
                          <span>- Rs. {computedDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Mode Selector: Cash vs QR Only */}
                    <div>
                      <label className="text-xs font-bold text-on-surface-variant block mb-2">
                        Select Payment Mode
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('Cash')}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            selectedMethod === 'Cash'
                              ? 'bg-primary text-on-primary border-primary shadow-sm scale-102'
                              : 'bg-surface-container hover:bg-surface-container-high border-border-light text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">attach_money</span>
                          <span>Cash</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedMethod('QR')}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            selectedMethod === 'QR'
                              ? 'bg-primary text-on-primary border-primary shadow-sm scale-102'
                              : 'bg-surface-container hover:bg-surface-container-high border-border-light text-on-surface'
                          }`}
                        >
                          <span className="material-symbols-outlined text-lg">qr_code_2</span>
                          <span>QR (Scan & Pay)</span>
                        </button>
                      </div>
                    </div>

                    {/* Cash Tender & Change calculation */}
                    {selectedMethod === 'Cash' && (
                      <div className="bg-[#FFFDF7] p-3.5 rounded-xl border border-amber-200/80 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-950">Cash Received (Tender)</span>
                          <span className="text-[10px] text-amber-800">Quick shortcuts below</span>
                        </div>
                        <input
                          type="number"
                          value={tenderAmountInput}
                          onChange={(e) => setTenderAmountInput(e.target.value)}
                          placeholder={`Enter amount (e.g. ${Math.ceil(grandTotal)})`}
                          className="w-full px-3 py-2 text-sm bg-white rounded-lg border border-amber-300 font-bold focus:border-primary outline-none"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {[grandTotal, 100, 500, 1000, 2000].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setTenderAmountInput(val.toString())}
                              className="px-2 py-1 bg-white hover:bg-amber-100 rounded-md border border-amber-300 text-[10px] font-bold text-amber-900 cursor-pointer"
                            >
                              Rs. {val}
                            </button>
                          ))}
                        </div>
                        {tenderAmount > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-xs font-bold">
                            <span className="text-on-surface-variant">Change / Balance to Return:</span>
                            <span className={changeAmount > 0 ? 'text-primary font-black text-sm' : 'text-on-surface'}>
                              Rs. {changeAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* QR Code Preview */}
                    {selectedMethod === 'QR' && (
                      <div className="bg-surface-container-low p-4 rounded-xl border border-border-light flex flex-col items-center gap-2 text-center">
                        <span className="text-xs font-bold text-on-surface">Scan & Pay with any Banking / Wallet App</span>
                        {qrImage ? (
                          <img src={qrImage} alt="Payment QR" className="w-36 h-36 object-contain rounded-lg border p-1 bg-white shadow-2xs" />
                        ) : (
                          <div className="w-32 h-32 bg-white border border-dashed border-border-light rounded-lg flex flex-col items-center justify-center text-on-surface-variant p-2">
                            <span className="material-symbols-outlined text-3xl opacity-40">qr_code</span>
                            <span className="text-[10px] mt-1">Set QR in Admin Panel</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grand Total Display */}
                    <div className="pt-3 border-t border-border-light flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs text-on-surface-variant">
                        <span>Subtotal:</span>
                        <span>Rs. {rawSubtotal.toFixed(2)}</span>
                      </div>
                      {computedDiscount > 0 && (
                        <div className="flex justify-between text-xs text-green-700 font-semibold">
                          <span>Discount:</span>
                          <span>- Rs. {computedDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-base font-black text-on-surface pt-1 border-t border-dashed border-border-light">
                        <span>Grand Total:</span>
                        <span className="text-xl text-primary">Rs. {grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Complete Payment & Print Action Button */}
                    <button
                      type="button"
                      disabled={!canCompletePayment || grandTotal <= 0}
                      onClick={handleOpenSettleModal}
                      className="w-full py-4 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-surface-tint transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-lg">print</span>
                      <span>Complete Payment & Print Bill</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* 2. SETTLED INVOICES & HISTORY VIEW */}
      {/* ======================================================== */}
      {billingTab === 'history' && (
        <div className="flex flex-col gap-5">
          {/* History Filters */}
          <div className="bg-surface-light border border-border-light rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">search</span>
              <input
                type="text"
                placeholder="Search invoice number, table, waiter, or method..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-container rounded-xl text-xs text-on-surface outline-none border border-transparent focus:border-primary transition-all font-medium"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'Cash', 'QR'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setHistoryMethodFilter(method)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyMethodFilter === method
                      ? 'bg-primary text-on-primary shadow-2xs'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {method === 'all' ? 'All Methods' : method}
                </button>
              ))}
            </div>
          </div>

          {/* History Invoices List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPaidOrders.map((order) => {
              const targetTable = tables.find((t) => t.id === order.tableId);
              const tableName = targetTable?.name || `Table ${order.tableId}`;
              const orderBillNumber = order.billNumber || `${restaurantInfo.billPrefix || 'FH-'}${order.id.slice(-4)}`;

              return (
                <div key={order.id} className="bg-surface-light border border-border-light rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-3 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-sm text-on-surface">{orderBillNumber}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                          {order.paymentMethod || 'Paid'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                        {tableName} • Server: {order.serverName || 'Staff'}
                      </p>
                      <p className="text-[10px] text-outline mt-0.5">
                        {order.paidAt ? new Date(order.paidAt).toLocaleString() : order.timestamp}
                      </p>
                    </div>
                    <span className="text-base font-black text-primary">Rs. {(order.total || 0).toFixed(2)}</span>
                  </div>

                  <div className="pt-3 border-t border-dashed border-border-light flex justify-between items-center">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {order.items.reduce((s, it) => s + it.quantity, 0)} items
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenPaidReceipt(order)}
                      className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      <span>Reprint Thermal Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredPaidOrders.length === 0 && (
              <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-border-light">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                <p className="text-sm font-semibold">No settled invoices found matching filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ACTIVE BILL CHECKOUT CONFIRM MODAL */}
      {/* ======================================================== */}
      {showReceipt && activeTable && (
        <div id="receipt-modal" className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowReceipt(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border-light text-center relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-primary/15 text-primary rounded-full flex items-center justify-center mx-auto mb-3 scale-110">
              <span className="material-symbols-outlined text-2xl fill">check_circle</span>
            </div>

            <h3 className="font-display text-xl font-bold text-on-surface">Payment Settle</h3>
            <p className="text-xs text-on-surface-variant mt-1 mb-4">Paid via {selectedMethod} • Clearing {activeTable.name}</p>

            {/* Bill Receipt Preview */}
            <div className="bg-[#FAF8F3] border-t border-b border-dashed border-outline-variant/60 p-4 font-mono text-[11px] text-left text-on-surface-variant/90 mb-4 flex flex-col gap-1.5 shadow-xs max-h-72 overflow-y-auto">
              <div className="text-center font-bold text-on-surface uppercase mb-1">
                {restaurantInfo.name || 'FOODIEHUB'}
              </div>
              <div className="text-center text-[9.5px] text-on-surface-variant">
                {restaurantInfo.address || 'Kathmandu, Nepal'}
              </div>
              {restaurantInfo.phone && (
                <div className="text-center text-[9.5px] text-on-surface-variant">
                  Phone: {restaurantInfo.phone}
                </div>
              )}
              <div className="border-t border-dashed border-outline-variant/50 my-1"></div>
              <div className="flex justify-between">
                <span>BILL NO:</span>
                <span>{billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>TABLE:</span>
                <span>{activeTable.name}</span>
              </div>
              <div className="flex justify-between">
                <span>SERVER:</span>
                <span>{serverName}</span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT:</span>
                <span>{selectedMethod}</span>
              </div>
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex flex-col gap-1">
                {billItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span>{item.qty}x {item.item.name}</span>
                    <span>Rs. {item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex justify-between text-[10px]">
                <span>Subtotal:</span>
                <span>Rs. {rawSubtotal.toFixed(2)}</span>
              </div>
              {computedDiscount > 0 && (
                <div className="flex justify-between text-[10px] text-green-700 font-bold">
                  <span>Discount:</span>
                  <span>- Rs. {computedDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex justify-between font-bold text-on-surface text-xs">
                <span>GRAND TOTAL:</span>
                <span>Rs. {grandTotal.toFixed(2)}</span>
              </div>
              {selectedMethod === 'Cash' && tenderAmount > 0 && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span>Tendered:</span>
                    <span>Rs. {tenderAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-primary">
                    <span>Change:</span>
                    <span>Rs. {changeAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Paper Size selector */}
            <div className="flex items-center justify-between mb-4 bg-surface-container-low p-1.5 rounded-xl text-xs border border-border-light">
              <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1 pl-1">
                <span className="material-symbols-outlined text-xs">print</span>
                <span>Paper:</span>
              </span>
              <div className="flex gap-1">
                {(['auto', '58mm', '80mm', 'a4'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleUpdatePrinterFormat(fmt)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                      printerFormat === fmt
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-white text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {fmt === 'auto' ? 'Auto' : fmt === '58mm' ? '58mm' : fmt === '80mm' ? '80mm' : 'A4'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="py-3.5 px-4 bg-surface-container text-on-surface font-semibold text-xs rounded-xl hover:bg-surface-container-high cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReceiptPayment}
                className="flex-1 py-3.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-surface-tint shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Print Bill & Clear Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* HISTORICAL RECEIPT REPRINT MODAL */}
      {/* ======================================================== */}
      {viewingHistoryReceipt && (
        <div id="history-receipt-modal" className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setViewingHistoryReceipt(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border-light text-center relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-primary/15 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">receipt_long</span>
            </div>

            <h3 className="font-display text-xl font-bold text-on-surface">Archived Invoice</h3>
            <p className="text-xs text-on-surface-variant mt-0.5 mb-4">{viewingHistoryReceipt.tableName} • Settled</p>

            <div className="bg-[#FAF8F3] border-t border-b border-dashed border-outline-variant/60 p-4 font-mono text-[11px] text-left text-on-surface-variant/90 mb-4 flex flex-col gap-1.5 shadow-xs max-h-72 overflow-y-auto">
              <div className="text-center font-bold text-on-surface uppercase mb-1">
                {viewingHistoryReceipt.restaurantName}
              </div>
              <div className="text-center text-[9.5px] text-on-surface-variant">
                {viewingHistoryReceipt.restaurantAddress}
              </div>
              <div className="border-t border-dashed border-outline-variant/60 my-1"></div>
              <div className="flex justify-between">
                <span>BILL NO:</span>
                <span>{viewingHistoryReceipt.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{viewingHistoryReceipt.printedAt}</span>
              </div>
              <div className="flex justify-between">
                <span>TABLE:</span>
                <span>{viewingHistoryReceipt.tableName}</span>
              </div>
              <div className="flex justify-between">
                <span>SERVER:</span>
                <span>{viewingHistoryReceipt.serverName}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>PAYMENT:</span>
                <span>{viewingHistoryReceipt.paymentMethod}</span>
              </div>
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex flex-col gap-1">
                {viewingHistoryReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span>{item.quantity}x {item.name}</span>
                    <span>Rs. {item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex justify-between text-[10px]">
                <span>Subtotal:</span>
                <span>Rs. {viewingHistoryReceipt.subtotal.toFixed(2)}</span>
              </div>
              {viewingHistoryReceipt.discount > 0 && (
                <div className="flex justify-between text-[10px] text-green-700 font-bold">
                  <span>Discount:</span>
                  <span>- Rs. {viewingHistoryReceipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-outline-variant/50 pt-1.5 flex justify-between font-bold text-on-surface text-xs">
                <span>TOTAL PAID:</span>
                <span>Rs. {viewingHistoryReceipt.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Paper Format Selector */}
            <div className="flex items-center justify-between mb-4 bg-surface-container-low p-1.5 rounded-xl text-xs border border-border-light">
              <span className="text-[10px] font-semibold text-on-surface-variant flex items-center gap-1 pl-1">
                <span className="material-symbols-outlined text-xs">print</span>
                <span>Paper:</span>
              </span>
              <div className="flex gap-1">
                {(['auto', '58mm', '80mm', 'a4'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleUpdatePrinterFormat(fmt)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                      printerFormat === fmt
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-white text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {fmt === 'auto' ? 'Auto' : fmt === '58mm' ? '58mm' : fmt === '80mm' ? '80mm' : 'A4'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewingHistoryReceipt(null)}
                className="py-3 px-4 bg-surface-container text-on-surface font-semibold text-xs rounded-xl hover:bg-surface-container-high cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onPrintReceipt(viewingHistoryReceipt);
                  setViewingHistoryReceipt(null);
                }}
                className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-surface-tint shadow-md cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Reprint Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
