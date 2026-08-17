import React, { useState } from 'react';
import { InventoryItem, InventoryOptions, User } from '../types';
import RoundedSelect from './RoundedSelect';
import ConfirmModal, { ConfirmDialogState } from './ConfirmModal';

interface InventoryScreenProps {
  currentUser: User;
  inventory: InventoryItem[];
  inventoryOptions: InventoryOptions;
  onUpdateInventory: (updated: InventoryItem[]) => void;
}

export default function InventoryScreen({
  currentUser,
  inventory,
  inventoryOptions,
  onUpdateInventory,
}: InventoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [amountToAdd, setAmountToAdd] = useState<number>(10);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  
  // States for adding a brand-new item
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Pantry');
  const [newItemStock, setNewItemStock] = useState(20);
  const [newItemThreshold, setNewItemThreshold] = useState(10);
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemCost, setNewItemCost] = useState(0);
  const [newItemIcon, setNewItemIcon] = useState('inventory');

  // States for editing an item
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editThreshold, setEditThreshold] = useState(0);
  const [editUnit, setEditUnit] = useState('');
  const [editCost, setEditCost] = useState(0);

  // Helper to determine status
  const getItemStatus = (item: InventoryItem) => {
    if (item.currentStock <= item.threshold) {
      return { 
        label: 'Below Min Stock', 
        style: 'bg-red-100 text-red-800 border-red-300 font-bold', 
        barColor: 'bg-red-600', 
        type: 'low' 
      };
    }
    if (item.currentStock <= item.threshold * 1.5) {
      return { 
        label: 'Order Soon', 
        style: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold', 
        barColor: 'bg-amber-500', 
        type: 'warning' 
      };
    }
    return { 
      label: 'Optimal', 
      style: 'bg-[#E7F2D8] text-primary border-transparent font-semibold', 
      barColor: 'bg-primary', 
      type: 'optimal' 
    };
  };

  // Metrics calculations
  const lowStockCount = inventory.filter(i => i.currentStock <= i.threshold).length;
  const categoriesList = Array.from(new Set(inventory.map(i => i.category)));
  const totalCategories = categoriesList.length;
  const healthyStockCount = inventory.filter(i => i.currentStock > i.threshold * 1.5).length;

  // Filter list
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    if (activeCategory === 'Low Stock') {
      return matchesSearch && item.currentStock <= item.threshold;
    }
    return matchesSearch && item.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleOpenRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setAmountToAdd(item.unit === 'pcs' ? 50 : 10);
    setIsRestockOpen(true);
  };

  const handleConfirmRestock = () => {
    if (!selectedItem) return;
    const updated = inventory.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          currentStock: Number((item.currentStock + amountToAdd).toFixed(2)),
        };
      }
      return item;
    });
    onUpdateInventory(updated);
    setIsRestockOpen(false);
    setSelectedItem(null);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditStock(item.currentStock);
    setEditThreshold(item.threshold);
    setEditUnit(item.unit);
    setEditCost(item.unitCost ?? 0);
    setIsEditOpen(true);
  };

  const handleConfirmEdit = () => {
    if (!selectedItem) return;
    const updated = inventory.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          name: editName,
          category: editCategory,
          currentStock: Number(editStock),
          threshold: Number(editThreshold),
          unit: editUnit,
          unitCost: Number(editCost),
        };
      }
      return item;
    });
    onUpdateInventory(updated);
    setIsEditOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteStock = (itemId: string) => {
    const updated = inventory.filter((item) => item.id !== itemId);
    onUpdateInventory(updated);
    setIsEditOpen(false);
    setSelectedItem(null);
  };

  const requestDeleteStock = (item: InventoryItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Stock Record?',
      message: `Are you sure you want to permanently delete "${item.name}" from inventory? This action cannot be undone.`,
      confirmLabel: 'Delete Stock',
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: () => {
        handleDeleteStock(item.id);
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newItemName,
      category: newItemCategory,
      currentStock: Number(newItemStock),
      threshold: Number(newItemThreshold),
      unit: newItemUnit,
      unitCost: Number(newItemCost),
      icon: newItemIcon,
    };

    onUpdateInventory([...inventory, newItem]);
    setIsNewItemOpen(false);
    // Reset
    setNewItemName('');
    setNewItemStock(20);
    setNewItemThreshold(10);
    setNewItemUnit('kg');
    setNewItemCost(0);
    setNewItemIcon('inventory');
  };

  return (
    <div id="inventory-screen" className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans pb-28 md:pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-outline-variant/30 pb-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-on-surface">Inventory & Stock</h1>
          <p className="text-xs text-on-surface-variant mt-1">Manage ingredients, audit stores, and monitor thresholds.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewItemOpen(true)}
          className="bg-primary text-on-primary font-semibold text-xs px-6 py-3 rounded-full flex items-center gap-2 hover:opacity-90 transition-all shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Restock Item</span>
        </button>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 rounded-r-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl animate-pulse">warning</span>
            </div>
            <div>
              <p className="text-xs font-bold text-red-900">
                {lowStockCount} {lowStockCount === 1 ? 'item is' : 'items are'} below the minimum stock threshold!
              </p>
              <p className="text-[11px] text-red-700">Immediate restock recommended to prevent menu items from going out of stock.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveCategory('Low Stock')}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            <span>View Below Min Stock ({lowStockCount})</span>
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div id="inventory-metrics" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Low Stock card */}
        <div 
          onClick={() => setActiveCategory('Low Stock')}
          className="bg-surface-light border border-border-light rounded-2xl p-5 flex items-center gap-4 shadow-xs hover:-translate-y-0.5 cursor-pointer transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">warning</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Low Stock Items</p>
            <p className="text-2xl font-bold text-on-surface font-display mt-0.5">{lowStockCount}</p>
          </div>
        </div>

        {/* Total Categories card */}
        <div className="bg-surface-light border border-border-light rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg">category</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Total Categories</p>
            <p className="text-2xl font-bold text-on-surface font-display mt-0.5">{totalCategories}</p>
          </div>
        </div>

        {/* Healthy Stock card */}
        <div className="bg-surface-light border border-border-light rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E7F2D8] text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg fill">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Healthy Stock</p>
            <p className="text-2xl font-bold text-on-surface font-display mt-0.5">{healthyStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div id="inventory-filters" className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients, category..."
            className="w-full bg-surface-container border border-transparent focus:border-primary rounded-full py-3 pl-12 pr-4 text-xs text-on-surface placeholder:text-on-surface-variant outline-none transition-colors"
          />
        </div>
        
        {/* Category filtering chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide shrink-0 snap-x">
          {['All', ...inventoryOptions.categories, 'Low Stock'].map((cat) => {
            const isSelected = activeCategory === cat;
            let btnClass = 'bg-surface-container border-transparent text-on-surface-variant hover:bg-surface-container-high';
            
            if (isSelected) {
              btnClass = 'bg-[#E7F2D8] text-primary border-primary';
            } else if (cat === 'Low Stock') {
              btnClass = 'bg-error-container text-on-error-container hover:bg-[#ffdfdb]';
            }

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`snap-start shrink-0 border px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 cursor-pointer transition-all ${btnClass}`}
              >
                {cat === 'Low Stock' && <span className="material-symbols-outlined text-[14px]">warning</span>}
                <span>{cat === 'All' ? 'All Items' : cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Grid (Bento Style) */}
      <div id="inventory-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInventory.map((item) => {
          const status = getItemStatus(item);
          const percent = Math.min(100, Math.round((item.currentStock / (item.threshold * 2)) * 100));

          return (
            <div 
              key={item.id}
              className={`bg-surface-light border rounded-2xl p-5 relative overflow-hidden group hover:shadow-md transition-all duration-200 cursor-pointer ${
                status.type === 'low' ? 'border-red-400 bg-red-50/20 ring-1 ring-red-400/30' : 'border-border-light'
              }`}
            >
              {status.type === 'low' && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600"></div>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-3xl -mr-8 -mt-8 flex items-end justify-start p-2.5 transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-red-700 text-[18px]">warning</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-start mb-4 pt-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-2xs ${
                  status.type === 'low' ? 'bg-red-100 border-red-200' : 'bg-surface-container border-border-light'
                }`}>
                  <span className={`material-symbols-outlined text-xl ${status.type === 'low' ? 'text-red-700' : 'text-tertiary'}`}>{item.icon}</span>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${status.style}`}>
                  {status.type === 'low' && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0"></span>}
                  {status.label}
                </span>
              </div>

              <h3 className="text-sm font-bold text-on-surface mb-0.5 truncate">{item.name}</h3>
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-3">{item.category}</p>
              <p className="text-[11px] font-semibold text-on-surface-variant mb-3">Unit cost: Rs. {(item.unitCost ?? 0).toFixed(2)}</p>

              <div className={`rounded-xl p-3 flex flex-col gap-2 mb-4 border text-xs font-sans ${
                status.type === 'low' ? 'bg-red-50/60 border-red-200' : 'bg-surface-container-low border-border-light'
              }`}>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-outline uppercase tracking-wider mb-0.5 font-semibold">Current Stock</p>
                    <p className={`text-base font-extrabold flex items-baseline gap-0.5 ${status.type === 'low' ? 'text-red-700 font-black' : 'text-on-surface'}`}>
                      {item.currentStock} <span className="text-[10px] font-semibold text-on-surface-variant">{item.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-outline uppercase tracking-wider mb-0.5 font-semibold">Min Threshold</p>
                    <p className="text-xs font-bold text-on-surface">{item.threshold} {item.unit}</p>
                  </div>
                </div>

                {status.type === 'low' && (
                  <div className="pt-2 border-t border-red-200/80 flex items-center justify-between text-[11px] font-bold text-red-800">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-red-600 text-sm">priority_high</span>
                      Below Min Threshold
                    </span>
                    <span className="text-red-900 font-extrabold">
                      -{Number((item.threshold - item.currentStock).toFixed(2))} {item.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Stepper Row */}
              <div className="flex items-center justify-between gap-1 mb-3 bg-surface-container/60 p-1.5 rounded-xl border border-border-light text-[11px] font-bold">
                <span className="text-[10px] text-on-surface-variant px-1 font-semibold">Quick Count:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateInventory(inventory.map((inv) => inv.id === item.id ? { ...inv, currentStock: Math.max(0, Number((inv.currentStock - 1).toFixed(2))) } : inv));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-border-light hover:bg-surface-container-high flex items-center justify-center text-on-surface cursor-pointer active:scale-95"
                    title="-1"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateInventory(inventory.map((inv) => inv.id === item.id ? { ...inv, currentStock: Number((inv.currentStock + 1).toFixed(2)) } : inv));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-border-light hover:bg-surface-container-high flex items-center justify-center text-primary cursor-pointer active:scale-95"
                    title="+1"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateInventory(inventory.map((inv) => inv.id === item.id ? { ...inv, currentStock: Number((inv.currentStock + 5).toFixed(2)) } : inv));
                    }}
                    className="px-2 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary cursor-pointer active:scale-95 text-[10px]"
                    title="+5"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateInventory(inventory.map((inv) => inv.id === item.id ? { ...inv, currentStock: Number((inv.currentStock + 10).toFixed(2)) } : inv));
                    }}
                    className="px-2 h-7 rounded-lg bg-primary text-white hover:bg-surface-tint flex items-center justify-center cursor-pointer active:scale-95 text-[10px]"
                    title="+10"
                  >
                    +10
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="flex-1 bg-surface-container text-on-surface font-semibold text-xs py-2 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer active:scale-98"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenRestock(item)}
                  className={`flex-1 font-semibold text-xs py-2 rounded-lg transition-all cursor-pointer active:scale-98 text-center ${
                    status.type === 'low' 
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-xs' 
                      : 'bg-surface-container text-primary hover:bg-secondary-container'
                  }`}
                >
                  Restock
                </button>
              </div>
            </div>
          );
        })}

        {filteredInventory.length === 0 && (
          <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-container-low/50 rounded-2xl border border-dashed border-border-light">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inventory_2</span>
            <p className="text-sm font-medium">No ingredients in this filter category.</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }} 
              className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* RESTOCK MODAL */}
      {isRestockOpen && selectedItem && (
        <div id="restock-modal" className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setIsRestockOpen(false); setSelectedItem(null); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-xl border border-border-light relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-on-surface mb-1">Restock Item</h3>
            <p className="text-xs text-on-surface-variant mb-4">Adding stock for: <strong>{selectedItem.name}</strong></p>

            <div className="bg-surface-container-low p-4 rounded-xl border border-border-light mb-6 flex justify-between items-center text-xs">
              <div>
                <p className="text-[9px] text-outline uppercase font-semibold">In Store</p>
                <p className="text-sm font-bold text-on-surface">{selectedItem.currentStock} {selectedItem.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-outline uppercase font-semibold">Incoming Stock</p>
                <p className="text-sm font-extrabold text-primary">+{amountToAdd} {selectedItem.unit}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Restock Quantity ({selectedItem.unit})</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amountToAdd}
                  onChange={(e) => setAmountToAdd(Math.max(0.1, Number(e.target.value)))}
                  className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  step={selectedItem.unit === 'pcs' ? '1' : '0.1'}
                />
                <div className="flex gap-1 shrink-0">
                  {[5, 10, 50].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountToAdd(val)}
                      className="px-3 bg-surface-container hover:bg-secondary-container text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setIsRestockOpen(false); setSelectedItem(null); }}
                className="flex-1 py-3 bg-surface-container text-on-surface font-semibold text-xs rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="flex-1 py-3 bg-primary text-on-primary font-semibold text-xs rounded-xl hover:bg-surface-tint shadow-sm cursor-pointer active:scale-95"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INGREDIENT MODAL */}
      {isEditOpen && selectedItem && (
        <div id="edit-modal" className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setIsEditOpen(false); setSelectedItem(null); }}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-xl border border-border-light relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-on-surface mb-4">Edit Stock Record</h3>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ingredient Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Current Stock Amount</label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Cost (Rs.)</label>
                <input type="number" min="0" step="0.01" value={editCost} onChange={(e) => setEditCost(Number(e.target.value))} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border-light">
              <button
                type="button"
                onClick={() => requestDeleteStock(selectedItem)}
                className="w-full sm:w-auto py-2.5 px-3.5 text-error hover:bg-error-container/20 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-error/30 active:scale-95"
                title="Permanently remove this stock item from inventory"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete Stock</span>
              </button>

              <div className="flex w-full sm:w-auto gap-2.5">
                <button
                  type="button"
                  onClick={() => { setIsEditOpen(false); setSelectedItem(null); }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-surface-container text-on-surface font-semibold text-xs rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEdit}
                  className="flex-1 sm:flex-initial py-2.5 px-5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-surface-tint shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW ITEM / RESTOCK SPECIAL ITEM MODAL */}
      {isNewItemOpen && (
        <div id="newitem-modal" className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setIsNewItemOpen(false)}>
          <form 
            onSubmit={handleAddNewItem}
            className="bg-white rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-xl border border-border-light relative animate-scale-up" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-on-surface mb-4">Add Inventory Ingredient</h3>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Ingredient Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Avocadoes, Parmesan"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Category</label>
                  <RoundedSelect value={newItemCategory} onChange={setNewItemCategory} ariaLabel="Inventory category" options={inventoryOptions.categories.map((value) => ({ value, label: value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Type</label>
                  <RoundedSelect value={newItemUnit} onChange={setNewItemUnit} ariaLabel="Inventory unit" options={inventoryOptions.units.map((value) => ({ value, label: value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Starting Stock</label>
                  <input
                    type="number"
                    required
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    required
                    value={newItemThreshold}
                    onChange={(e) => setNewItemThreshold(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Cost (Rs.)</label>
                <input type="number" required min="0" step="0.01" value={newItemCost} onChange={(e) => setNewItemCost(Number(e.target.value))} placeholder="Cost per kg, piece, litre..." className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Styling Icon</label>
                <RoundedSelect value={newItemIcon} onChange={setNewItemIcon} ariaLabel="Inventory icon" options={[{ value: 'inventory', label: 'Default Box (inventory)' }, { value: 'set_meal', label: 'Fish / Meat (set_meal)' }, { value: 'bakery_dining', label: 'Bread (bakery_dining)' }, { value: 'oil_barrel', label: 'Liquid Oil (oil_barrel)' }, { value: 'eco', label: 'Organic Leaf (eco)' }, { value: 'layers', label: 'Cheese / Stack (layers)' }, { value: 'wine_bar', label: 'Wine / Liquid (wine_bar)' }]} />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsNewItemOpen(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface font-semibold text-xs rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-on-primary font-semibold text-xs rounded-xl hover:bg-surface-tint shadow-sm cursor-pointer active:scale-95"
              >
                Add Ingredient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog for Safe Deletion */}
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}
