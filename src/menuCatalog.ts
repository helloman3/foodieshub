import { MenuCategory, MenuItem } from './types';
import startersImage from './assets/menu/starters.jpg';
import pizzaRiceSekuwaImage from './assets/menu/pizza-rice-sekuwa.jpg';
import combosNoodlesImage from './assets/menu/combos-noodles.jpg';
import wingsMomoImage from './assets/menu/wings-momo.jpg';
import pakaundaBurgerImage from './assets/menu/pakaunda-burger.jpg';

type CatalogEntry = [name: string, price: number];

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categoryPhotos: Record<string, string[]> = {
  starters: [
    'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=85&w=900',
  ],
  veg: [
    'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/161440/salad-plate-vegetables-healthy-161440.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&q=85&w=900',
  ],
  pizza: [
    'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=85&w=900',
  ],
  rice: [
    'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=900',
  ],
  meat: [
    'https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/323682/pexels-photo-323682.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=85&w=900',
  ],
  momo: [
    'https://images.pexels.com/photos/955137/pexels-photo-955137.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/5409010/pexels-photo-5409010.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=85&w=900',
  ],
  burger: [
    'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/1566112/pexels-photo-1566112.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=85&w=900',
  ],
  noodles: [
    'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=900',
    'https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg?auto=compress&cs=tinysrgb&w=900',
  ],
};

const photosForCategory = (category: string) => {
  if (category === 'Pizza') return categoryPhotos.pizza;
  if (category === 'Fried Rice') return categoryPhotos.rice;
  if (category === 'Momo') return categoryPhotos.momo;
  if (category === 'Noodles') return categoryPhotos.noodles;
  if (category === 'Burger & Hotdogs' || category === 'Sandwich') return categoryPhotos.burger;
  if (category === 'Veg Starters' || category === 'Pakaunda') return categoryPhotos.veg;
  if (category === 'Wings' || category === 'Sekuwa' || category === 'Popcorn') return categoryPhotos.meat;
  return categoryPhotos.starters;
};

const catalog: Array<{
  category: Exclude<MenuCategory, 'All' | 'Bar'>;
  image: string;
  entries: CatalogEntry[];
}> = [
  {
    category: 'Chicken Starters', image: startersImage, entries: [
      ['Chicken Nuggets', 190], ['Chicken Cheese Ball', 160], ['Chicken Chilly (Bone)', 250], ['Chicken Chilly (Boneless)', 320],
      ['Chicken Stairs Fry', 180], ['Chicken Fingers', 320], ['Crispy Chicken', 280], ['Chicken Lollipop', 320], ['Chicken Drumsticks', 300],
      ['Chicken/Buff Choila', 280], ['Chicken/Buff Sadeko', 270],
    ],
  },
  {
    category: 'Veg Starters', image: startersImage, entries: [
      ['Mushrooms Chilly', 220], ['French Fries', 120], ['Peri Peri Fries', 140], ['Mustang Aalu', 250], ['Masala Dar Aalu', 170],
      ['Peanut Sadeko', 120], ['Wai Wai Sadeko', 100], ['Chips Chilly', 180], ['Paneer Chilly', 350], ['Crispy Paneer', 310],
    ],
  },
  {
    category: 'Pizza', image: pizzaRiceSekuwaImage, entries: [
      ['Veg Pizza', 280], ['Margarita Pizza', 320], ['Veg Smokey Pizza', 350], ['Salami Pizza', 340], ['Chicken Pizza', 400], ['Sausage Pizza', 310], ['Chick Smokey Pizza', 380],
    ],
  },
  {
    category: 'Fried Rice', image: pizzaRiceSekuwaImage, entries: [['Veg Fried Rice', 150], ['Chicken Fried Rice', 200], ['Buff Fried Rice', 180]],
  },
  {
    category: 'Sekuwa', image: pizzaRiceSekuwaImage, entries: [['Buff Sekuwa (Per Plate)', 290], ['Pork Sekuwa (Per Plate)', 320]],
  },
  {
    category: 'Khaja Sets', image: pizzaRiceSekuwaImage, entries: [['Chicken Khaja Set', 350], ['Veg Khaja Set', 220], ['Buff Khaja Set', 300]],
  },
  {
    category: 'Combos', image: combosNoodlesImage, entries: [['Foodies Hub Special Chicken Combo', 1199], ['Foodies Hub Special Veg Combo', 899]],
  },
  {
    category: 'Nachos & Tacos', image: combosNoodlesImage, entries: [
      ['Cheesy Salad Nachos', 200], ['Chicken Loaded Nachos', 280], ['Sweet Spicy Chicken Nachos', 300], ['Loaded Chicken Tacos', 300], ['Regular Tacos', 200],
    ],
  },
  {
    category: 'Noodles', image: combosNoodlesImage, entries: [
      ['Veg Hakka Noodles', 150], ['Chicken Noodles', 200], ['Egg Noodles', 170], ['Chicken Keema Noodles', 210], ['Buff Keema Noodles', 190],
    ],
  },
  {
    category: 'Wings', image: wingsMomoImage, entries: [['Buffalo Wings', 320], ['Garlic Hot Wings', 360], ['Chitchat Wings', 340], ['Special Spicy Hot Wings', 400]],
  },
  {
    category: 'Momo', image: wingsMomoImage, entries: [
      ['Chicken Steam Momo', 180], ['Chicken Kothey Momo', 200], ['Chicken Jhol Momo', 220], ['Chicken Sadeko Momo', 230], ['Chicken C. Momo', 250],
      ['Veg Steam Momo', 140], ['Veg Kothey Momo', 160], ['Veg Sadeko Momo', 170], ['Veg Jhol Momo', 190], ['Veg C. Momo', 200],
      ['Buff Steam Momo', 150], ['Buff Kothey Momo', 170], ['Buff Jhol Momo', 180], ['Buff Sadeko Momo', 190], ['Buff C. Momo', 210],
      ['Pork Steam Momo', 190], ['Pork Jhol Momo', 210],
    ],
  },
  {
    category: 'Pakaunda', image: pakaundaBurgerImage, entries: [['Aalu Chop', 140], ['Onion Pakaunda', 120], ['Paneer Pakaunda', 290], ['Chicken Pakaunda', 220]],
  },
  {
    category: 'Popcorn', image: pakaundaBurgerImage, entries: [['Sweet Popcorn', 130], ['Chicken Popcorn', 280], ['Hot and Spicy Popcorn', 300]],
  },
  {
    category: 'Burger & Hotdogs', image: pakaundaBurgerImage, entries: [['Regular Chicken Burger', 180], ['Crunchy Chicken Burger', 250], ['Spicy Chicken Burger', 280], ['Chicken Hotdog', 150], ['Spicy Loaded Hotdog', 200]],
  },
  {
    category: 'Sandwich', image: pakaundaBurgerImage, entries: [['Chicken Sandwich', 200], ['Club Sandwich', 270], ['Egg Sandwich', 170], ['Cucumber Sandwich', 130], ['Tomato Sandwich', 120]],
  },
  {
    category: 'Cold Drinks & Beverages', image: startersImage, entries: [
      ['Mountain Dew Can', 80], ['Pepsi Black Can', 80], ['Mirinda Can', 80], ['Coca Cola 500ml', 100], ['Sprite 500ml', 100], ['Red Bull Energy', 220], ['Mineral Water 1L', 40],
    ],
  },
  {
    category: 'Bar Shakes & Mocktails', image: startersImage, entries: [
      ['Coconut French Vanilla Tub', 180], ['Butter Scotch Milkshake', 200], ['Virgin Mojito', 220], ['Blue Lagoon Mocktail', 240], ['Iced Lemon Tea', 140],
    ],
  },
  {
    category: 'Beers & Spirits', image: startersImage, entries: [
      ['Tuborg Beer 650ml', 420], ['Gorkha Strong 650ml', 390], ['Carlsberg 650ml', 450], ['Barcardi Rum Shot', 250], ['Old Monk Rum Shot', 200], ['Signature Whiskey Peg', 320],
    ],
  },
];

const BAR_CATEGORIES = new Set(['Cold Drinks & Beverages', 'Bar Shakes & Mocktails', 'Beers & Spirits', 'Bar', 'Drinks']);

export const MENU_CATALOG: MenuItem[] = catalog.flatMap(({ category, image, entries }) =>
  entries.map(([name, price], index) => {
    const isBar = BAR_CATEGORIES.has(category);
    return {
      id: `menu-${slugify(name)}`,
      name,
      price,
      category,
      section: (isBar ? 'Bar' : 'Kitchen') as 'Kitchen' | 'Bar',
      description: `${name} served fresh at FoodieHub ${isBar ? 'Bar' : 'Kitchen'}.`,
      image: photosForCategory(category)[index % (photosForCategory(category).length || 1)] || image,
      fallbackImage: image,
    };
  })
);
