import React, { useState, useRef } from 'react';
import { MenuItem, InventoryItem, Recipe, InventoryOptions } from '../types';
import {
  generateSampleMenuCSV,
  generateSampleInventoryCSV,
  generateSampleRecipesCSV,
  parseMenuCSV,
  parseInventoryCSV,
  parseRecipesCSV,
  exportMenuToCSV,
  exportInventoryToCSV,
  exportRecipesToCSV,
  downloadCSV,
} from '../utils/csvHelper';

type CsvDataType = 'menu' | 'inventory' | 'recipes';
type ImportMode = 'append' | 'replace';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: CsvDataType;
  menuItems: MenuItem[];
  onUpdateMenu: (items: MenuItem[]) => void;
  menuCategories: string[];
  onUpdateMenuCategories: (categories: string[]) => void;
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  inventoryOptions: InventoryOptions;
  onUpdateInventoryOptions: (options: InventoryOptions) => void;
  recipes: Recipe[];
  onUpdateRecipes: (recipes: Recipe[]) => void;
  onShowNotification?: (title: string, message: string) => void;
}

export default function CsvImportModal({
  isOpen,
  onClose,
  defaultType = 'menu',
  menuItems,
  onUpdateMenu,
  menuCategories,
  onUpdateMenuCategories,
  inventory,
  onUpdateInventory,
  inventoryOptions,
  onUpdateInventoryOptions,
  recipes,
  onUpdateRecipes,
  onShowNotification,
}: CsvImportModalProps) {
  const [selectedType, setSelectedType] = useState<CsvDataType>(defaultType);
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<{
    count: number;
    errors: string[];
    sampleRows: Array<Record<string, string | number>>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTypeChange = (type: CsvDataType) => {
    setSelectedType(type);
    setCsvText('');
    setFileName('');
    setParsedPreview(null);
  };

  const handleDownloadSample = () => {
    if (selectedType === 'menu') {
      downloadCSV('foodiehub_sample_menu.csv', generateSampleMenuCSV());
    } else if (selectedType === 'inventory') {
      downloadCSV('foodiehub_sample_inventory.csv', generateSampleInventoryCSV());
    } else if (selectedType === 'recipes') {
      downloadCSV('foodiehub_sample_recipes.csv', generateSampleRecipesCSV());
    }
  };

  const handleExportCurrent = () => {
    if (selectedType === 'menu') {
      downloadCSV(`foodiehub_menu_export_${new Date().toISOString().slice(0, 10)}.csv`, exportMenuToCSV(menuItems));
    } else if (selectedType === 'inventory') {
      downloadCSV(`foodiehub_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`, exportInventoryToCSV(inventory));
    } else if (selectedType === 'recipes') {
      downloadCSV(`foodiehub_recipes_export_${new Date().toISOString().slice(0, 10)}.csv`, exportRecipesToCSV(recipes, inventory));
    }
  };

  const processFileContent = (content: string, name: string) => {
    setCsvText(content);
    setFileName(name);

    if (selectedType === 'menu') {
      const result = parseMenuCSV(content, menuItems, importMode);
      setParsedPreview({
        count: result.importedCount,
        errors: result.errors,
        sampleRows: result.items.slice(-Math.min(5, result.importedCount)).map((it) => ({
          Name: it.name,
          Price: `Rs. ${it.price.toFixed(2)}`,
          Category: it.category,
          Section: it.section || 'Kitchen',
        })),
      });
    } else if (selectedType === 'inventory') {
      const result = parseInventoryCSV(content, inventory, importMode);
      setParsedPreview({
        count: result.importedCount,
        errors: result.errors,
        sampleRows: result.items.slice(-Math.min(5, result.importedCount)).map((it) => ({
          Name: it.name,
          Category: it.category,
          Stock: `${it.currentStock} ${it.unit}`,
          UnitCost: `Rs. ${(it.unitCost || 0).toFixed(2)}`,
        })),
      });
    } else if (selectedType === 'recipes') {
      const result = parseRecipesCSV(content, recipes, inventory, undefined, importMode);
      setParsedPreview({
        count: result.importedCount,
        errors: result.errors,
        sampleRows: result.recipes.slice(-Math.min(5, result.importedCount)).map((r) => ({
          Dish: r.name,
          Section: r.section,
          Ingredients: `${r.ingredients.length} items`,
        })),
      });
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processFileContent(reader.result, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      handleFileUpload(file);
    }
  };

  const handleCommitImport = () => {
    if (!csvText) return;

    if (selectedType === 'menu') {
      const result = parseMenuCSV(csvText, menuItems, importMode);
      if (result.importedCount > 0) {
        onUpdateMenu(result.items);
        if (result.categories.length > 0) {
          const merged = Array.from(new Set([...menuCategories, ...result.categories]));
          onUpdateMenuCategories(merged);
        }
        if (onShowNotification) {
          onShowNotification('Menu CSV Imported', `Successfully imported ${result.importedCount} menu & bar items!`);
        }
      }
    } else if (selectedType === 'inventory') {
      const result = parseInventoryCSV(csvText, inventory, importMode);
      if (result.importedCount > 0) {
        onUpdateInventory(result.items);
        const mergedCategories = Array.from(new Set([...inventoryOptions.categories, ...result.categories]));
        const mergedUnits = Array.from(new Set([...inventoryOptions.units, ...result.units]));
        onUpdateInventoryOptions({ categories: mergedCategories, units: mergedUnits });
        if (onShowNotification) {
          onShowNotification('Inventory CSV Imported', `Successfully imported ${result.importedCount} inventory items!`);
        }
      }
    } else if (selectedType === 'recipes') {
      let createdInv: InventoryItem[] = [];
      const result = parseRecipesCSV(
        csvText,
        recipes,
        inventory,
        (newInv) => {
          createdInv = newInv;
          onUpdateInventory([...inventory, ...newInv]);
        },
        importMode
      );
      if (result.importedCount > 0) {
        onUpdateRecipes(result.recipes);
        if (onShowNotification) {
          onShowNotification(
            'Recipes CSV Imported',
            `Successfully imported ${result.importedCount} recipes${createdInv.length > 0 ? ` (auto-registered ${createdInv.length} ingredients)` : ''}!`
          );
        }
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-border-light flex flex-col gap-5 max-h-[92vh] overflow-y-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-border-light pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-2xl">upload_file</span>
              <h2 className="text-xl font-bold font-display text-on-surface">Bulk CSV Import & Export</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Upload spreadsheets to automatically populate items, stock levels, and recipes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Data Type Tabs: Menu vs Inventory vs Recipes */}
        <div className="grid grid-cols-3 gap-2 bg-surface-container p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTypeChange('menu')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedType === 'menu' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">restaurant_menu</span>
            <span>Menu & Bar</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('inventory')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedType === 'inventory' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            <span>Inventory Stock</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('recipes')}
            className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedType === 'recipes' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">menu_book</span>
            <span>Recipes</span>
          </button>
        </div>

        {/* Quick Actions: Template & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-border-light text-xs">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
            <span className="material-symbols-outlined text-base text-primary">info</span>
            <span>Need the format template?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-3 py-1.5 bg-white hover:bg-surface-container border border-border-light rounded-xl font-bold text-on-surface text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-primary">download</span>
              <span>Sample Template (.csv)</span>
            </button>
            <button
              type="button"
              onClick={handleExportCurrent}
              className="px-3 py-1.5 bg-white hover:bg-surface-container border border-border-light rounded-xl font-bold text-on-surface text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-sm">file_download</span>
              <span>Export Current (.csv)</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-primary bg-primary/5 scale-101'
              : 'border-outline-variant/60 hover:border-primary/60 bg-surface-container-lowest'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
          />
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>
          <p className="text-sm font-bold text-on-surface">
            {fileName ? fileName : 'Click to select or drag & drop a .CSV file here'}
          </p>
          <p className="text-xs text-on-surface-variant font-medium">
            Supports UTF-8 comma separated (.csv) files
          </p>
        </div>

        {/* Import Mode: Append vs Replace */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-border-light text-xs">
          <div>
            <span className="font-bold text-on-surface block">Import Destination Strategy</span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Choose whether to add to existing data or replace everything.
            </span>
          </div>
          <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-border-light font-bold">
            <button
              type="button"
              onClick={() => {
                setImportMode('append');
                if (csvText) processFileContent(csvText, fileName);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                importMode === 'append' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
              }`}
            >
              Append (Add to list)
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode('replace');
                if (csvText) processFileContent(csvText, fileName);
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                importMode === 'replace' ? 'bg-error text-white shadow-xs' : 'text-on-surface-variant'
              }`}
            >
              Replace (Overwrite)
            </button>
          </div>
        </div>

        {/* Preview Section */}
        {parsedPreview && (
          <div className="bg-surface-container-lowest border border-border-light rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">preview</span>
                <span>Ready to Import ({parsedPreview.count} items detected)</span>
              </span>
              <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Valid Format
              </span>
            </div>

            {parsedPreview.errors.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col gap-1 max-h-24 overflow-y-auto">
                <strong className="text-[11px]">Validation Notices:</strong>
                {parsedPreview.errors.slice(0, 3).map((err, idx) => (
                  <span key={idx} className="text-[10px]">• {err}</span>
                ))}
              </div>
            )}

            {/* Sample Table */}
            {parsedPreview.sampleRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-light text-on-surface-variant text-[10px] font-bold">
                      {Object.keys(parsedPreview.sampleRows[0]).map((key) => (
                        <th key={key} className="pb-1.5 pr-2">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light/50">
                    {parsedPreview.sampleRows.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="py-1.5 pr-2 font-medium truncate max-w-[140px]">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex gap-3 pt-2 border-t border-border-light">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsedPreview || parsedPreview.count === 0}
            onClick={handleCommitImport}
            className="flex-1 py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-surface-tint shadow-md cursor-pointer active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>Confirm & Import {parsedPreview ? `${parsedPreview.count} Items` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
