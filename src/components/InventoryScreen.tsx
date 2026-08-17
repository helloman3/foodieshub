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
  const [amountToAdd, setAmountToAdd] = useState<string>('10');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  
  // States for adding a brand-new item
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Pantry');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemThreshold, setNewItemThreshold] = useState('10');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemCost, setNewItemCost] = useState('0');
  const [newItemIcon, setNewItemIcon] = useState('inventory');

  // States for editing an item
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStock, setEditStock] = useState('0');
  const [editThreshold, setEditThreshold] = useState('0');
  const [editUnit, setEditUnit] = useState('');
  const [editCost, setEditCost] = useState('0');

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
    setAmountToAdd(item.unit === 'pcs' ? '50' : '10');
    setIsRestockOpen(true);
  };

  const handleConfirmRestock = () => {
    if (!selectedItem) return;
    const addVal = Math.max(0.01, Number(amountToAdd) || 0);
    const updated = inventory.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          currentStock: Number((item.currentStock + addVal).toFixed(2)),
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
    setEditStock(String(item.currentStock));
    setEditThreshold(String(item.threshold));
    setEditUnit(item.unit);
    setEditCost(String(item.unitCost ?? 0));
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
          currentStock: Number(editStock) || 0,
          threshold: Number(editThreshold) || 0,
          unit: editUnit,
          unitCost: Number(editCost) || 0,
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
      name: newItemName.trim(),
      category: newItemCategory,
      currentStock: Math.max(0, Number(newItemStock) || 0),
      threshold: Math.max(0, Number(newItemThreshold) || 0),
      unit: newItemUnit,
      unitCost: Math.max(0, Number(newItemCost) || 0),
      icon: newItemIcon,
    };

    onUpdateInventory([...inventory, newItem]);
    setIsNewItemOpen(false);
    // Reset form
    setNewItemName('');
    setNewItemStock('0');
    setNewItemThreshold('10');
    setNewItemUnit('kg');
    setNewItemCost('0');
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
          onClick={() => {
            setNewItemName('');
            setNewItemStock('0');
            setNewItemThreshold('10');
            setNewItemCost('0');
            setIsNewItemOpen(true);
          }}
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
              <p className="text-[11px] text-red-700 mt-0.5">
                Check depleted ingredients below and restock before the next service rush.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setActiveCategory('Low Stock')}
            className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Review Critical Items
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container-low p-4 rounded-2xl border border-border-light flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">category</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-semibold">Tracked Categories</p>
            <p className="text-2xl font-bold font-display text-on-surface mt-0.5">{totalCategories}</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-4 rounded-2xl border border-border-light flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-semibold">Low Stock Warnings</p>
            <p className="text-2xl font-bold font-display text-red-600 mt-0.5">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-4 rounded-2xl border border-border-light flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#E7F2D8] text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-semibold">Optimal Health Items</p>
            <p className="text-2xl font-bold font-display text-primary mt-0.5">{healthyStockCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-border-light shadow-2xs mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input 
            type="text" 
            placeholder="Search stock ingredient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-border-light rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:border-primary transition-all font-medium"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
          <button 
            type="button"
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === 'All' 
                ? 'bg-primary text-on-primary font-bold shadow-xs' 
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            All Items ({inventory.length})
          </button>
          
          {lowStockCount > 0 && (
            <button 
              type="button"
              onClick={() => setActiveCategory('Low Stock')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'Low Stock' 
                  ? 'bg-red-600 text-white font-bold shadow-xs' 
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span className="material-symbols-outlined text-xs">warning</span>
              <span>Low Stock ({lowStockCount})</span>
            </button>
          )}

          {categoriesList.map(cat => (
            <button 
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat 
                  ? 'bg-primary text-on-primary font-bold shadow-xs' 
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stock Table Grid */}
      <div className="bg-surface-container-lowest rounded-2xl border border-border-light shadow-sm overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inventory</span>
            <p className="text-sm font-semibold">No stock items match your filter criteria.</p>
            <p className="text-xs mt-1">Try clearing your search query or add new ingredients.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="border-b border-border-light bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Ingredient Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Current Stock</th>
                  <th className="py-3.5 px-4">Min. Threshold</th>
                  <th className="py-3.5 px-4">Stock Health</th>
                  <th className="py-3.5 px-4">Est. Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light text-on-surface">
                {filteredInventory.map((item) => {
                  const status = getItemStatus(item);
                  const stockPercent = Math.min(100, Math.round((item.currentStock / (item.threshold * 2 || 1)) * 100));

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low/60 transition-colors">
                      {/* Name & Icon */}
                      <td className="py-3 px-4 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-base">{item.icon || 'inventory'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-on-surface">{item.name}</span>
                            <span className="text-[10px] text-on-surface-variant block font-normal">ID: {item.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-surface-container text-[11px] font-semibold text-on-surface-variant">
                          {item.category}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-extrabold text-on-surface">{item.currentStock}</span>
                          <span className="text-[10px] text-on-surface-variant font-semibold">{item.unit}</span>
                        </div>
                      </td>

                      {/* Threshold */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-on-surface-variant font-medium">
                          {item.threshold} {item.unit}
                        </span>
                      </td>

                      {/* Status Bar */}
                      <td className="py-3 px-4">
                        <div className="w-32">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border ${status.style}`}>
                              {status.label}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-bold">{stockPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${status.barColor} transition-all duration-300`} 
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3 px-4 font-semibold text-on-surface">
                        {item.unitCost !== undefined && item.unitCost > 0 ? `Rs. ${item.unitCost.toFixed(2)}` : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRestock(item)}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-on-primary px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Quick Add Stock"
                          >
                            <span className="material-symbols-outlined text-sm">add_box</span>
                            <span>Restock</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="Edit Stock Properties"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESTOCK MODAL */}
      {isRestockOpen && selectedItem && (
        <div id="restock-modal" className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => { setIsRestockOpen(false); setSelectedItem(null); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border-light relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{selectedItem.icon || 'inventory'}</span>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface leading-tight">Restock {selectedItem.name}</h3>
                <p className="text-xs text-on-surface-variant">{selectedItem.category}</p>
              </div>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-border-light mb-4 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-outline uppercase font-semibold">Current Stock</p>
                <p className="text-sm font-bold text-on-surface">{selectedItem.currentStock} {selectedItem.unit}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-outline uppercase font-semibold">Incoming Stock</p>
                <p className="text-sm font-extrabold text-primary">+{amountToAdd || '0'} {selectedItem.unit}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Restock Quantity ({selectedItem.unit})</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={amountToAdd}
                  onFocus={(e) => { if (e.target.value === '0' || e.target.value === '10') setAmountToAdd(''); }}
                  onBlur={(e) => { if (!e.target.value.trim()) setAmountToAdd('10'); }}
                  onChange={(e) => setAmountToAdd(e.target.value)}
                  className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  placeholder="Quantity"
                />
                <div className="flex gap-1 shrink-0">
                  {['5', '10', '50'].map(val => (
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
                    min="0"
                    step="any"
                    value={editStock}
                    onFocus={(e) => { if (e.target.value === '0') setEditStock(''); }}
                    onBlur={(e) => { if (!e.target.value.trim()) setEditStock('0'); }}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editThreshold}
                    onFocus={(e) => { if (e.target.value === '0') setEditThreshold(''); }}
                    onBlur={(e) => { if (!e.target.value.trim()) setEditThreshold('0'); }}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Cost (Rs.)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="any" 
                  value={editCost} 
                  onFocus={(e) => { if (e.target.value === '0') setEditCost(''); }}
                  onBlur={(e) => { if (!e.target.value.trim()) setEditCost('0'); }}
                  onChange={(e) => setEditCost(e.target.value)} 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" 
                  placeholder="0"
                />
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
                    min="0"
                    step="any"
                    value={newItemStock}
                    onFocus={(e) => { if (e.target.value === '0') setNewItemStock(''); }}
                    onBlur={(e) => { if (!e.target.value.trim()) setNewItemStock('0'); }}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    placeholder="0"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newItemThreshold}
                    onFocus={(e) => { if (e.target.value === '0') setNewItemThreshold(''); }}
                    onBlur={(e) => { if (!e.target.value.trim()) setNewItemThreshold('0'); }}
                    onChange={(e) => setNewItemThreshold(e.target.value)}
                    placeholder="0"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Unit Cost (Rs.)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="any" 
                  value={newItemCost} 
                  onFocus={(e) => { if (e.target.value === '0') setNewItemCost(''); }}
                  onBlur={(e) => { if (!e.target.value.trim()) setNewItemCost('0'); }}
                  onChange={(e) => setNewItemCost(e.target.value)} 
                  placeholder="Cost per kg, piece, litre..." 
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary" 
                />
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

      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <ConfirmModal
          dialog={confirmDialog}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
