import { MenuItem, InventoryItem, Recipe, MenuSection } from '../types';

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Robust CSV parser that handles commas inside quotes, escaped quotes (""), and newline variations (\r\n, \n).
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        // End of quoted field
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // handle CRLF
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Downloads a string as a CSV file to user's computer.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* =======================================================================
   1. MENU & BAR CSV IMPORT / EXPORT
   ======================================================================= */

export function generateSampleMenuCSV(): string {
  return [
    'Name,Price,Category,Section,Description,Image',
    '"Chicken Steam Momo",220,"Momo","Kitchen","Fresh steamed dumplings served with spicy tomato chutney","https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80"',
    '"Crispy Chicken Burger",320,"Burger & Hotdogs","Kitchen","Crispy fried chicken patty with lettuce and spicy mayo","https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80"',
    '"Paneer Chilli",280,"Veg Starters","Kitchen","Wok tossed cottage cheese with bell peppers and onion","https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=400&q=80"',
    '"Virgin Mojito",180,"Bar Shakes & Mocktails","Bar","Fresh mint leaves, lime wedges, simple syrup and soda","https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80"',
    '"Tuborg Beer 650ml",450,"Beers & Spirits","Bar","Chilled premium lager beer","https://images.unsplash.com/photo-1608270199186-b4859ca0c401?auto=format&fit=crop&w=400&q=80"',
  ].join('\n');
}

export function parseMenuCSV(
  csvText: string,
  existingItems: MenuItem[],
  mode: 'append' | 'replace' = 'append'
): { items: MenuItem[]; categories: string[]; importedCount: number; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  if (rows.length === 0) {
    return { items: existingItems, categories: [], importedCount: 0, errors: ['CSV file is empty.'] };
  }

  // Header detection
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const nameIdx = header.findIndex((h) => h.includes('name') || h === 'item');
  const priceIdx = header.findIndex((h) => h.includes('price') || h.includes('rate') || h.includes('cost'));
  const categoryIdx = header.findIndex((h) => h.includes('category') || h.includes('cat'));
  const sectionIdx = header.findIndex((h) => h.includes('section') || h.includes('type'));
  const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('detail'));
  const imageIdx = header.findIndex((h) => h.includes('image') || h.includes('photo') || h.includes('url'));

  if (nameIdx === -1 || priceIdx === -1) {
    return {
      items: existingItems,
      categories: [],
      importedCount: 0,
      errors: ['Invalid CSV header. Expected at least "Name" and "Price" columns.'],
    };
  }

  const parsedItems: MenuItem[] = [];
  const newCategories = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const name = row[nameIdx]?.trim();
    const rawPrice = row[priceIdx]?.replace(/[^0-9.]/g, '');
    const price = parseFloat(rawPrice);

    if (!name) {
      errors.push(`Row ${i + 1}: Item name is missing.`);
      continue;
    }
    if (isNaN(price) || price < 0) {
      errors.push(`Row ${i + 1} (${name}): Invalid price value "${row[priceIdx]}".`);
      continue;
    }

    const category = (categoryIdx !== -1 && row[categoryIdx]?.trim()) || 'Mains';
    const rawSection = sectionIdx !== -1 ? row[sectionIdx]?.trim().toLowerCase() : '';
    const section: MenuSection = rawSection === 'bar' || category.toLowerCase().includes('bar') || category.toLowerCase().includes('drink') || category.toLowerCase().includes('beer')
      ? 'Bar'
      : 'Kitchen';
    const description = (descIdx !== -1 && row[descIdx]?.trim()) || '';
    const image = (imageIdx !== -1 && row[imageIdx]?.trim()) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

    newCategories.add(category);

    parsedItems.push({
      id: makeId('menu'),
      name,
      price,
      category,
      section,
      description,
      image,
    });
  }

  const finalItems = mode === 'replace' ? parsedItems : [...existingItems, ...parsedItems];
  return {
    items: finalItems,
    categories: Array.from(newCategories),
    importedCount: parsedItems.length,
    errors,
  };
}

export function exportMenuToCSV(items: MenuItem[]): string {
  const header = ['Name', 'Price', 'Category', 'Section', 'Description', 'Image'];
  const rows = items.map((item) => [
    `"${item.name.replace(/"/g, '""')}"`,
    item.price.toFixed(2),
    `"${(item.category || 'Mains').replace(/"/g, '""')}"`,
    `"${(item.section || 'Kitchen').replace(/"/g, '""')}"`,
    `"${(item.description || '').replace(/"/g, '""')}"`,
    `"${(item.image || '').replace(/"/g, '""')}"`,
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/* =======================================================================
   2. INVENTORY ITEMS CSV IMPORT / EXPORT
   ======================================================================= */

export function generateSampleInventoryCSV(): string {
  return [
    'Name,Category,CurrentStock,Threshold,Unit,UnitCost',
    '"Boneless Chicken","Meats",15,5,"kg",450',
    '"Momo Dough Flour","Pantry",25,10,"kg",90',
    '"Cooking Oil","Pantry",20,5,"L",220',
    '"Fresh Onion","Produce",12,3,"kg",60',
    '"Fresh Tomatoes","Produce",10,3,"kg",50',
    '"Burger Buns","Bakery",50,15,"pcs",25',
    '"Tuborg Beer Bottles","Drinks",48,12,"pcs",280',
    '"Mint Leaves","Produce",2,0.5,"kg",120',
  ].join('\n');
}

export function parseInventoryCSV(
  csvText: string,
  existingItems: InventoryItem[],
  mode: 'append' | 'replace' = 'append'
): { items: InventoryItem[]; categories: string[]; units: string[]; importedCount: number; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  if (rows.length === 0) {
    return { items: existingItems, categories: [], units: [], importedCount: 0, errors: ['CSV file is empty.'] };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const nameIdx = header.findIndex((h) => h.includes('name') || h === 'item');
  const catIdx = header.findIndex((h) => h.includes('category') || h.includes('cat'));
  const stockIdx = header.findIndex((h) => h.includes('stock') || h.includes('quantity') || h.includes('qty'));
  const thresholdIdx = header.findIndex((h) => h.includes('threshold') || h.includes('reorder') || h.includes('min'));
  const unitIdx = header.findIndex((h) => h.includes('unit'));
  const costIdx = header.findIndex((h) => h.includes('cost') || h.includes('price') || h.includes('unitcost'));

  if (nameIdx === -1) {
    return {
      items: existingItems,
      categories: [],
      units: [],
      importedCount: 0,
      errors: ['Invalid CSV header. Expected "Name" column.'],
    };
  }

  const parsedItems: InventoryItem[] = [];
  const categories = new Set<string>();
  const units = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 1) continue;

    const name = row[nameIdx]?.trim();
    if (!name) continue;

    const category = (catIdx !== -1 && row[catIdx]?.trim()) || 'Pantry';
    const currentStock = stockIdx !== -1 ? parseFloat(row[stockIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;
    const threshold = thresholdIdx !== -1 ? parseFloat(row[thresholdIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;
    const unit = (unitIdx !== -1 && row[unitIdx]?.trim()) || 'pcs';
    const unitCost = costIdx !== -1 ? parseFloat(row[costIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;

    categories.add(category);
    units.add(unit);

    parsedItems.push({
      id: makeId('inv'),
      name,
      category,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      threshold: isNaN(threshold) ? 0 : threshold,
      unit,
      unitCost: isNaN(unitCost) ? 0 : unitCost,
      icon: 'inventory_2',
    });
  }

  const finalItems = mode === 'replace' ? parsedItems : [...existingItems, ...parsedItems];
  return {
    items: finalItems,
    categories: Array.from(categories),
    units: Array.from(units),
    importedCount: parsedItems.length,
    errors,
  };
}

export function exportInventoryToCSV(items: InventoryItem[]): string {
  const header = ['Name', 'Category', 'CurrentStock', 'Threshold', 'Unit', 'UnitCost'];
  const rows = items.map((item) => [
    `"${item.name.replace(/"/g, '""')}"`,
    `"${(item.category || 'Pantry').replace(/"/g, '""')}"`,
    item.currentStock,
    item.threshold,
    `"${(item.unit || 'pcs').replace(/"/g, '""')}"`,
    (item.unitCost || 0).toFixed(2),
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/* =======================================================================
   3. RECIPES CSV IMPORT / EXPORT
   ======================================================================= */

export function generateSampleRecipesCSV(): string {
  return [
    'DishName,Section,IngredientName,Quantity,Unit,Instructions',
    '"Chicken Steam Momo","Kitchen","Boneless Chicken",0.15,"kg","Finely mince chicken with onions and spices. Wrap in momo dough."',
    '"Chicken Steam Momo","Kitchen","Momo Dough Flour",0.08,"kg","Knead soft dough and roll into thin round wrappers."',
    '"Chicken Steam Momo","Kitchen","Fresh Onion",0.05,"kg","Finely chop and mix into minced meat."',
    '"Crispy Chicken Burger","Kitchen","Boneless Chicken",0.12,"kg","Marinate in buttermilk, coat in seasoned flour, and deep fry until crispy."',
    '"Crispy Chicken Burger","Kitchen","Burger Buns",1,"pcs","Toast buns lightly and assemble with burger patty."',
    '"Virgin Mojito","Bar","Mint Leaves",0.02,"kg","Muddle mint leaves with lime wedges and top with chilled soda."',
  ].join('\n');
}

export function parseRecipesCSV(
  csvText: string,
  existingRecipes: Recipe[],
  inventory: InventoryItem[],
  onAutoAddInventory?: (newInventoryItems: InventoryItem[]) => void,
  mode: 'append' | 'replace' = 'append'
): { recipes: Recipe[]; newInventory: InventoryItem[]; importedCount: number; errors: string[] } {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  if (rows.length === 0) {
    return { recipes: existingRecipes, newInventory: [], importedCount: 0, errors: ['CSV file is empty.'] };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const dishIdx = header.findIndex((h) => h.includes('dish') || h.includes('recipe') || h.includes('name'));
  const sectionIdx = header.findIndex((h) => h.includes('section') || h.includes('type'));
  const ingIdx = header.findIndex((h) => h.includes('ingredient') || h.includes('item'));
  const qtyIdx = header.findIndex((h) => h.includes('qty') || h.includes('quantity') || h.includes('amount'));
  const unitIdx = header.findIndex((h) => h.includes('unit'));
  const instructIdx = header.findIndex((h) => h.includes('instruct') || h.includes('note') || h.includes('prep'));

  if (dishIdx === -1 || ingIdx === -1) {
    return {
      recipes: existingRecipes,
      newInventory: [],
      importedCount: 0,
      errors: ['Invalid CSV header. Expected "DishName" and "IngredientName" columns.'],
    };
  }

  // Group ingredient lines by DishName
  const recipeMap: Record<
    string,
    {
      name: string;
      section: MenuSection;
      instructions: string;
      ingredients: Array<{ ingredientName: string; quantity: number; unit: string }>;
    }
  > = {};

  const createdInventoryMap: Record<string, InventoryItem> = {};
  const currentInventoryMap = new Map(inventory.map((inv) => [inv.name.toLowerCase().trim(), inv]));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;

    const dishName = row[dishIdx]?.trim();
    const ingredientName = row[ingIdx]?.trim();
    if (!dishName || !ingredientName) continue;

    const rawSection = sectionIdx !== -1 ? row[sectionIdx]?.trim().toLowerCase() : '';
    const section: MenuSection = rawSection === 'bar' ? 'Bar' : 'Kitchen';
    const quantity = qtyIdx !== -1 ? parseFloat(row[qtyIdx]?.replace(/[^0-9.]/g, '') || '1') : 1;
    const unit = (unitIdx !== -1 && row[unitIdx]?.trim()) || 'pcs';
    const instructions = (instructIdx !== -1 && row[instructIdx]?.trim()) || '';

    if (!recipeMap[dishName.toLowerCase()]) {
      recipeMap[dishName.toLowerCase()] = {
        name: dishName,
        section,
        instructions,
        ingredients: [],
      };
    }

    recipeMap[dishName.toLowerCase()].ingredients.push({
      ingredientName,
      quantity: isNaN(quantity) || quantity <= 0 ? 1 : quantity,
      unit,
    });

    // Check if ingredient exists in inventory, if not create automatically
    const normIng = ingredientName.toLowerCase().trim();
    if (!currentInventoryMap.has(normIng) && !createdInventoryMap[normIng]) {
      const newInvItem: InventoryItem = {
        id: makeId('inv-auto'),
        name: ingredientName,
        category: section === 'Bar' ? 'Drinks' : 'Pantry',
        currentStock: 0,
        threshold: 0,
        unit,
        unitCost: 0,
        icon: 'inventory_2',
      };
      createdInventoryMap[normIng] = newInvItem;
      currentInventoryMap.set(normIng, newInvItem);
    }
  }

  const parsedRecipes: Recipe[] = Object.values(recipeMap).map((r) => {
    return {
      id: makeId('recipe'),
      name: r.name,
      section: r.section,
      instructions: r.instructions,
      ingredients: r.ingredients.map((ing) => {
        const invItem = currentInventoryMap.get(ing.ingredientName.toLowerCase().trim());
        return {
          inventoryItemId: invItem?.id || makeId('inv-stub'),
          quantity: ing.quantity,
          unit: ing.unit,
        };
      }),
    };
  });

  const newInventoryList = Object.values(createdInventoryMap);
  if (newInventoryList.length > 0 && onAutoAddInventory) {
    onAutoAddInventory(newInventoryList);
  }

  const finalRecipes = mode === 'replace' ? parsedRecipes : [...existingRecipes, ...parsedRecipes];
  return {
    recipes: finalRecipes,
    newInventory: newInventoryList,
    importedCount: parsedRecipes.length,
    errors,
  };
}

export function exportRecipesToCSV(recipes: Recipe[], inventory: InventoryItem[]): string {
  const header = ['DishName', 'Section', 'IngredientName', 'Quantity', 'Unit', 'Instructions'];
  const invMap = new Map(inventory.map((inv) => [inv.id, inv]));
  const rows: string[][] = [];

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ing) => {
      const invItem = invMap.get(ing.inventoryItemId);
      rows.push([
        `"${recipe.name.replace(/"/g, '""')}"`,
        `"${recipe.section || 'Kitchen'}"`,
        `"${(invItem?.name || 'Ingredient').replace(/"/g, '""')}"`,
        ing.quantity.toString(),
        `"${ing.unit || invItem?.unit || 'pcs'}"`,
        `"${(recipe.instructions || '').replace(/"/g, '""')}"`,
      ]);
    });
  });

  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
