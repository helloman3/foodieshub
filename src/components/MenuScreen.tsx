import React, { useRef, useState, useEffect } from 'react';
import { Table, MenuItem, CartItem, User, TableStatus, MenuSection } from '../types';
import { calculateOrderTotals, TAX_RATE, SERVICE_CHARGE_RATE } from '../constants';

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = row[rightIndex];
      row[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? diagonal
        : Math.min(diagonal + 1, above + 1, row[rightIndex - 1] + 1);
      diagonal = above;
    }
  }
  return row[right.length];
};

const matchesSearchQuery = (item: MenuItem, query: string) => {
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const searchable = normalizeSearchText(`${item.name} ${item.category} ${item.description}`);
  const words = searchable.split(' ');
  return tokens.every((token) => {
    const singular = token.endsWith('s') ? token.slice(0, -1) : token;
    return searchable.includes(token) || searchable.includes(singular) || words.some((word) => word.length > 3 && editDistance(token, word) <= 1);
  });
};

interface MenuScreenProps {
  currentUser: User;
  tables: Table[];
  menuItems: MenuItem[];
  menuCategories: string[];
  activeTableId: string | null;
  cart: CartItem[];
  onUpdateCart: (updatedCart: CartItem[]) => void;
  onSendToKitchen: (printMode?: 'KOT' | 'BOT' | 'ALL' | boolean) => void;
  onSelectTable: (tableId: string) => void;
  onUnseatTable?: (tableId: string) => void;
}

export default function MenuScreen({
  currentUser,
  tables,
  menuItems,
  menuCategories,
  activeTableId,
  cart,
  onUpdateCart,
  onSendToKitchen,
  onSelectTable,
  onUnseatTable,
}: MenuScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSection, setSelectedSection] = useState<MenuSection>('Kitchen');
  const [editingItemNotesId, setEditingItemNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false);
  const [inlineAlert, setInlineAlert] = useState<string | null>(null);
  const categoryScrollerRef = useRef<HTMLDivElement>(null);

  const showNotificationAlert = (msg: string) => {
    setInlineAlert(msg);
    setTimeout(() => setInlineAlert(null), 3500);
  };

  const activeTable = activeTableId
    ? tables.find((table) => table.id === activeTableId) ?? null
    : null;

  const totalCartQuantity = cart.reduce((acc, it) => acc + it.quantity, 0);

  const handleSendAndPrintKot = () => {
    if (!activeTable || cart.length === 0) return;
    onSendToKitchen(true);
    setIsMobileCartOpen(false);
  };

  // Filter menu items
  const filteredMenuItems = menuItems.filter((item) => {
    const hasSearch = normalizeSearchText(searchQuery).length > 0;
    const matchesSearch = matchesSearchQuery(item, searchQuery);
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSection = (item.section ?? 'Kitchen') === selectedSection;
    // A search is global so a valid item cannot be hidden by the current tab/category.
    return matchesSearch && (hasSearch || (matchesCategory && matchesSection));
  });

  const availableCategories: string[] = [
    'All',
    ...Array.from(new Set([
      ...menuCategories,
      ...menuItems
        .filter((item) => (item.section ?? 'Kitchen') === selectedSection)
        .map((item) => item.category),
    ])),
  ];

  const canTakeOrders = (status: TableStatus) =>
    status === 'available' || status === 'occupied' || status === 'reserved';

  const handleAddToCart = (itemId: string) => {
    if (!activeTableId || !activeTable) {
      showNotificationAlert('Please select a dining table from the top selector before adding items.');
      return;
    }
    if (!canTakeOrders(activeTable.status)) {
      showNotificationAlert(`Cannot add orders to a table that is "${activeTable.status}".`);
      return;
    }
    const existing = cart.find((c) => c.menuItemId === itemId);
    if (existing) {
      onUpdateCart(
        cart.map((c) => (c.menuItemId === itemId ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      onUpdateCart([...cart, { menuItemId: itemId, quantity: 1, notes: '' }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    onUpdateCart(
      cart
        .map((c) => {
          if (c.menuItemId === itemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter((c): c is CartItem => c !== null)
    );
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdateCart(cart.filter((c) => c.menuItemId !== itemId));
  };

  const handleStartNotesEdit = (item: CartItem) => {
    setEditingItemNotesId(item.menuItemId);
    setTempNotes(item.notes);
  };

  const handleSaveNotes = (itemId: string) => {
    onUpdateCart(
      cart.map((c) => (c.menuItemId === itemId ? { ...c, notes: tempNotes } : c))
    );
    setEditingItemNotesId(null);
  };

  // Calculations for Current Order
  const getCartItemDetails = (c: CartItem) => {
    const item = menuItems.find((m) => m.id === c.menuItemId);
    return {
      item,
      totalPrice: item ? item.price * c.quantity : 0,
    };
  };

  const subtotal = cart.reduce((acc, c) => {
    const { totalPrice } = getCartItemDetails(c);
    return acc + totalPrice;
  }, 0);

  const { tax, serviceCharge, total } = calculateOrderTotals(subtotal);

  return (
    <div id="menu-screen" className="flex-1 flex overflow-hidden w-full relative font-sans h-full min-h-0">
      {/* Inline Notification Alert Banner */}
      {inlineAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 text-white px-5 py-3 rounded-2xl shadow-xl backdrop-blur-xs text-xs font-bold flex items-center gap-2.5 animate-slide-down border border-amber-500/40">
          <span className="material-symbols-outlined text-base text-amber-300">warning</span>
          <span>{inlineAlert}</span>
          <button type="button" onClick={() => setInlineAlert(null)} className="ml-2 text-white/70 hover:text-white">
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      )}

      {/* Menu Area */}
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6 lg:p-8 flex flex-col gap-6 pb-28 md:pb-8 min-w-0">
        
        {/* Table Selector & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-on-surface">Order Intake Menu</h2>
            <p className="text-xs text-on-surface-variant mt-1">Taking orders for restaurant tables</p>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <span className="text-xs font-semibold text-on-surface-variant">Active Table:</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-secondary-container/80 transition-all cursor-pointer shadow-2xs border border-secondary/20"
              >
                <span className="material-symbols-outlined text-sm text-primary">table_restaurant</span>
                <span>{activeTable ? `${activeTable.name} (${activeTable.status.toUpperCase()})` : 'Select Table'}</span>
                <span className={`material-symbols-outlined text-xs transition-transform duration-200 ${isTableDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isTableDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsTableDropdownOpen(false)}></div>
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(14rem,calc(100vw-2rem))] bg-white border border-border-light rounded-2xl shadow-xl z-30 py-2 overflow-hidden animate-fade-in font-sans max-h-64 overflow-y-auto">
                    {tables.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onSelectTable(t.id);
                          setIsTableDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-primary-container/60 transition-colors cursor-pointer ${
                          activeTableId === t.id ? 'bg-primary-container text-on-primary-container font-bold' : 'text-on-surface'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            t.status === 'available' ? 'bg-primary' : t.status === 'occupied' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          {t.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-outline">
                          {t.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {activeTable?.status === 'occupied' && onUnseatTable && (
              <button
                type="button"
                id="menu-unseat-table-btn"
                onClick={() => onUnseatTable(activeTable.id)}
                className="bg-white hover:bg-red-50 text-red-700 border border-red-200 px-3.5 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 shrink-0"
                title="Accidental click? Reset this table to Available and return to Floor Plan"
              >
                <span className="material-symbols-outlined text-sm">event_seat</span>
                <span>Unseat Table</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Categories Row */}
        <div className="flex flex-col gap-4 sticky top-0 bg-background/95 backdrop-blur-xs z-10 py-1">
          <div className="flex gap-2">
            {(['Kitchen', 'Bar'] as MenuSection[]).map((section) => (
              <button key={section} type="button" onClick={() => { setSelectedSection(section); setSelectedCategory('All'); }} className={`px-4 py-2 rounded-full text-xs font-bold ${selectedSection === section ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-sm align-middle mr-1">{section === 'Bar' ? 'local_bar' : 'restaurant'}</span>
                {section}
              </button>
            ))}
            <span className="ml-auto shrink-0 bg-primary-container text-on-primary-container rounded-full px-3 py-2 text-[11px] font-bold"><span className="material-symbols-outlined text-sm align-middle mr-1">format_list_bulleted</span>Quick order</span>
          </div>
          {/* Search Input */}
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, ingredients, starters..."
              className="w-full bg-surface-container-lowest border border-border-light text-on-surface focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-10 pr-4 text-sm transition-all outline-none"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" aria-label="Scroll categories left" onClick={() => categoryScrollerRef.current?.scrollBy({ left: -260, behavior: 'smooth' })} className="shrink-0 w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center"><span className="material-symbols-outlined text-base">chevron_left</span></button>
            <div ref={categoryScrollerRef} className="flex min-w-0 flex-1 gap-2.5 overflow-x-scroll overscroll-x-contain pb-1 scrollbar-hide snap-x cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-x' }}>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`snap-start shrink-0 px-5 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-secondary-container text-on-secondary-container border-transparent shadow-xs font-bold'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border-border-light'
                  }`}
                >
                  {cat === 'All' ? 'All Items' : cat}
                </button>
              ))}
            </div>
            <button type="button" aria-label="Scroll categories right" onClick={() => categoryScrollerRef.current?.scrollBy({ left: 260, behavior: 'smooth' })} className="shrink-0 w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center"><span className="material-symbols-outlined text-base">chevron_right</span></button>
          </div>
        </div>

        {/* Quick order list */}
        <div className="flex flex-col gap-2">
            {filteredMenuItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-surface-container-lowest border border-border-light rounded-xl px-4 py-3 hover:border-primary/40 transition-colors">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-on-surface truncate">{item.name}</p><p className="text-[11px] text-on-surface-variant mt-0.5">{item.category}</p></div>
                <span className="text-xs font-bold text-primary bg-secondary-container px-2.5 py-1 rounded-md shrink-0">Rs. {item.price.toFixed(2)}</span>
                <button type="button" aria-label={`Add ${item.name} to order`} onClick={() => handleAddToCart(item.id)} className="bg-primary text-on-primary p-2 rounded-full flex items-center justify-center cursor-pointer hover:bg-surface-tint active:scale-95"><span className="material-symbols-outlined text-lg">add</span></button>
              </div>
            ))}
        </div>

          {filteredMenuItems.length === 0 && (
            <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-border-light">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
              <p className="text-sm font-medium">No menu items match your search.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} 
                className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
      </main>

      {/* Order Sidebar (Desktop view) */}
      <aside className="w-[360px] hidden lg:flex flex-col bg-surface border-l border-outline-variant z-20 shadow-xs h-full min-h-0 overflow-hidden shrink-0">
        {/* Order Header */}
        <div className="p-4 border-b border-border-light bg-surface-container-lowest flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-bold text-on-surface mb-0.5">Current Order</h2>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">table_restaurant</span>
              Seating Table {activeTable?.name ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => onUpdateCart([])}
                className="text-[11px] font-bold text-error hover:bg-error-container/20 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-error/20"
                title="Clear all items from current order"
              >
                <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                <span>Clear</span>
              </button>
            )}
            <span className="text-[10px] text-outline font-semibold bg-surface-container px-2 py-1 rounded-md">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Order Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
          {cart.map((cartItem) => {
            const { item, totalPrice } = getCartItemDetails(cartItem);
            if (!item) return null;

            return (
              <div 
                key={cartItem.menuItemId} 
                className="flex flex-col gap-2.5 p-3.5 bg-surface-container-lowest border border-border-light rounded-xl shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-on-surface line-clamp-1">{item.name}</span>
                  <span className="text-xs font-bold text-on-surface">Rs. {totalPrice.toFixed(2)}</span>
                </div>

                {/* Special Notes Section */}
                {editingItemNotesId === cartItem.menuItemId ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      placeholder="e.g. no onions, sauce on side"
                      className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-primary"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(cartItem.menuItemId)}
                      className="bg-primary text-on-primary text-xs px-2.5 rounded-md font-bold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center group">
                    <span className="text-xs text-on-surface-variant italic truncate max-w-[200px]">
                      {cartItem.notes || 'Add notes (extra sauce, no salt)...'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartNotesEdit(cartItem)}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      Edit
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3 bg-surface-container-low rounded-full px-2 py-1 border border-border-light scale-90 -ml-2 origin-left">
                    <button 
                      type="button"
                      onClick={() => handleUpdateQuantity(cartItem.menuItemId, -1)}
                      className="text-on-surface-variant hover:text-primary cursor-pointer w-5 h-5 flex items-center justify-center rounded-full hover:bg-white"
                      title="Decrease quantity"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{cartItem.quantity}</span>
                    <button 
                      type="button"
                      onClick={() => handleUpdateQuantity(cartItem.menuItemId, 1)}
                      className="text-on-surface-variant hover:text-primary cursor-pointer w-5 h-5 flex items-center justify-center rounded-full hover:bg-white"
                      title="Increase quantity"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteItem(cartItem.menuItemId)}
                    className="text-error hover:bg-error-container/20 p-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                    title="Delete item from order"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {cart.length === 0 && (
            <div className="my-auto text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-30">restaurant</span>
              <p className="text-xs font-semibold">No items added yet</p>
              <p className="text-[10px] opacity-75 mt-1">Click the + buttons on menu dishes to populate order.</p>
            </div>
          )}
        </div>

        {/* Checkout Footer panel */}
        <div className="p-5 bg-surface-container-lowest border-t border-border-light flex flex-col gap-4 shrink-0 mt-auto shadow-sm">
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-on-surface pt-2 border-t border-dashed border-border-light">
              <span>Estimated Total</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => onSendToKitchen('KOT')}
                className="bg-primary-container hover:bg-secondary-container text-on-primary-container py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border border-primary/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send & Print Kitchen Order Ticket (KOT)"
              >
                <span className="material-symbols-outlined text-sm">skillet</span>
                <span>Print KOT</span>
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => onSendToKitchen('BOT')}
                className="bg-amber-100 hover:bg-amber-200 text-amber-950 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all border border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send & Print Bar Order Ticket (BOT)"
              >
                <span className="material-symbols-outlined text-sm">local_bar</span>
                <span>Print BOT</span>
              </button>
            </div>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => onSendToKitchen()}
              className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-xs font-bold hover:bg-surface-tint transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Send to Kitchen & Bar (Digital)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile FAB for Order (Shows when Right Sidebar is hidden) */}
      <button 
        id="mobile-cart-fab"
        type="button"
        onClick={() => setIsMobileCartOpen(true)}
        className="fixed bottom-24 right-4 lg:hidden bg-primary text-on-primary p-4 rounded-full shadow-lg z-40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
      >
        <div className="relative">
          <span className="material-symbols-outlined text-2xl fill">receipt_long</span>
          {totalCartQuantity > 0 && (
            <span className="absolute -top-2.5 -right-2.5 bg-error text-on-error font-bold text-[9px] h-5.5 w-5.5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
              {totalCartQuantity}
            </span>
          )}
        </div>
      </button>

      {/* Mobile Cart Sliding Sheet */}
      {isMobileCartOpen && (
        <div id="mobile-cart-backdrop" className="lg:hidden fixed inset-0 bg-black/45 backdrop-blur-xs z-[60] flex items-end justify-center animate-fade-in" onClick={() => setIsMobileCartOpen(false)}>
          <div 
            className="bg-white w-full max-h-[calc(100dvh-1rem)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border-light flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="font-display font-bold text-sm text-on-surface">Table {activeTable?.name ?? '—'} — Cart</h3>
                <p className="text-[10px] text-on-surface-variant font-medium">Configure items before kitchen submission</p>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateCart([])}
                    className="text-[11px] font-bold text-error hover:bg-error-container/20 px-2 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-error/20"
                    title="Clear order"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                    <span>Clear</span>
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsMobileCartOpen(false)}
                  className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-background">
              {cart.map((cartItem) => {
                const { item, totalPrice } = getCartItemDetails(cartItem);
                if (!item) return null;

                return (
                  <div key={cartItem.menuItemId} className="flex flex-col gap-2 p-3 bg-white border border-border-light rounded-xl">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-on-surface truncate">{item.name}</span>
                      <span className="text-xs font-bold text-on-surface">Rs. {totalPrice.toFixed(2)}</span>
                    </div>

                    {/* Note row */}
                    {editingItemNotesId === cartItem.menuItemId ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="e.g. extra cheese"
                          className="flex-1 text-xs border border-outline-variant rounded-md px-2 py-1 outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(cartItem.menuItemId)}
                          className="bg-primary text-on-primary text-xs px-2.5 rounded-md font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-on-surface-variant italic truncate max-w-[240px]">
                          {cartItem.notes || 'Add notes...'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartNotesEdit(cartItem)}
                          className="text-[10px] text-primary hover:underline font-bold"
                        >
                          Edit
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-border-light/40">
                      <div className="flex items-center gap-3 bg-surface-container-low rounded-full px-2 py-1">
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(cartItem.menuItemId, -1)}
                          className="text-on-surface-variant hover:text-primary w-5 h-5 flex items-center justify-center rounded-full"
                          title="Decrease quantity"
                        >
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => handleUpdateQuantity(cartItem.menuItemId, 1)}
                          className="text-on-surface-variant hover:text-primary w-5 h-5 flex items-center justify-center rounded-full"
                          title="Increase quantity"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleDeleteItem(cartItem.menuItemId)}
                        className="text-error hover:bg-error-container/20 p-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                        title="Delete item from order"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {cart.length === 0 && (
                <div className="my-auto text-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">restaurant_menu</span>
                  <p className="text-sm font-semibold">Your cart is empty</p>
                  <p className="text-xs opacity-75 mt-1">Add items to configure current table order.</p>
                </div>
              )}
            </div>

            {/* Subtotal & send buttons */}
            <div className="shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-border-light">
              <div className="flex flex-col gap-1.5 text-xs mb-3">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-on-surface pt-1.5 border-t border-dashed border-border-light">
                  <span>Estimated Total</span>
                  <span>Rs. {subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => {
                      onSendToKitchen('KOT');
                      setIsMobileCartOpen(false);
                    }}
                    className="bg-primary-container hover:bg-secondary-container text-on-primary-container py-2.5 px-2 rounded-xl text-xs font-bold transition-all border border-primary/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">skillet</span>
                    <span>Print KOT</span>
                  </button>
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => {
                      onSendToKitchen('BOT');
                      setIsMobileCartOpen(false);
                    }}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-950 py-2.5 px-2 rounded-xl text-xs font-bold transition-all border border-amber-300 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-sm">local_bar</span>
                    <span>Print BOT</span>
                  </button>
                </div>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => {
                    onSendToKitchen();
                    setIsMobileCartOpen(false);
                  }}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl text-xs font-bold hover:bg-surface-tint transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Send to Kitchen & Bar (Digital)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
