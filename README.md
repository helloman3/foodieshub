# 🍽️ FoodieHub — Modern Restaurant & Bar POS Web Application

**FoodieHub** is a high-performance, responsive Point-of-Sale (POS) Web Application and Progressive Web App (PWA) tailored for restaurants, cafes, and bars. Built with **React**, **TypeScript**, and **Tailwind CSS**, it features real-time local network synchronization, 1-page thermal KOT/BOT and bill printing, CSV bulk import/export, and complete role-based workflow isolation across mobile, tablet, and desktop web browsers.

---

## ✨ Key Features

- **🌐 Real-Time Multi-Device LAN Sync**:
  - Connect mobile phones, tablets, kitchen displays (KDS), and cashiers over your restaurant's Wi-Fi network.
  - Device-isolated login sessions: each device maintains its own logged-in user (Waiter, Chef, Accountant, or Admin) while sharing real-time floor plan tables, active carts, kitchen tickets, and stock counts.
  - Automatic atomic state backups stored locally in `data/foodiehub-state.json` and `data/backups/`.

- **🖨️ Precision 1-Page Thermal Printing**:
  - Centered thermal output strictly formatted on a single page for **58mm (2-inch)**, **80mm (3-inch)**, and standard desktop paper sizes.
  - Dedicated **KOT (Kitchen Order Ticket)** for culinary items and **BOT (Bar Order Ticket)** for drinks and spirits.
  - Final customer billing with customizable restaurant branding, address, phone, PAN number, custom bill prefixes (e.g., `FH-`), greetings, and payment QR codes.

- **📊 CSV Bulk Hub (Import & Export)**:
  - Quickly upload entire spreadsheet menus, inventory ingredient supplies, and dish preparation recipes.
  - Download built-in sample `.csv` templates.
  - Automatic category and section detection (`Kitchen` vs. `Bar`).

- **👥 Role-Based Access Control**:
  - **Admin**: Full control center, revenue analytics, staff account management, restaurant branding, inventory configuration, and billing reviews.
  - **Waiter**: Floor seating, table selection, dynamic menu ordering, item customizations/notes, and KOT/BOT submission.
  - **Chef**: Kitchen Display System (KDS) with live timers, order progression (`Pending` ➔ `Cooking` ➔ `Ready` ➔ `Served`), and sound notifications.
  - **Accountant**: Active dining table billing, discount application (fixed amount or percentage), cash tender/change computation, and receipt printing.

- **📱 Offline-Ready Progressive Web App (PWA)**:
  - Installable directly to Windows desktop, Android, iOS, or iPadOS home screen.
  - Network-first service worker caching with instant disaster recovery.

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js 18+](https://nodejs.org/) installed on the host computer.

---

### Option 1: 1-Click Startup (Windows)
Double-click the **`start-foodiehub.bat`** file located in the root directory. This will automatically install dependencies, build the production bundle, and launch the server.

---

### Option 2: Command Line Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/helloman3/foodieshub.git
   cd foodieshub
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Development Mode (Single Machine):**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production / Multi-Device Server Mode:**
   ```bash
   npm run build
   npm start
   ```

---

## 📱 Multi-Device Wi-Fi / LAN Setup

To connect phones, tablets, and other laptops in your restaurant:

1. **Run the Host Server**: Start the server on your primary restaurant PC using `npm start`.
2. **Find Host IP**: Open Command Prompt / PowerShell on the host PC and type:
   ```cmd
   ipconfig
   ```
   Look for the **IPv4 Address** (e.g., `192.168.1.50`).
3. **Connect Client Devices**: On any phone or tablet connected to the **same Wi-Fi network**, open your mobile browser and go to:
   ```text
   http://192.168.1.50:3000
   ```
4. **Install as App (Optional)**: Click **"Install App"** in the browser menu to add FoodieHub to your device's home screen.

> **Note**: Each device logs into its own account independently. The primary PC can be logged in as Admin/Accountant while waiters use their own phones on the floor.

---

## 🔑 Default Sign-In Accounts

The system starts with a pre-configured Administrator account:

| Role | Default Name | Default PIN | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `Admin` | **`1234`** | Full System Access, Staff Management, Revenue Reports, CSV Hub |

*Additional Waiter, Chef, Accountant, and Admin accounts can be created with custom 4-digit PINs directly from the **Administration ➔ Staff & Access** tab.*

---

## 📋 CSV Import Formats

You can import data from the **Administration ➔ CSV Bulk Hub** tab using standard `.csv` files:

### 1. Menu & Bar Catalog (`foodiehub_menu.csv`)
```csv
Name,Price,Category,Section,Description,Image
"Chicken Steam Momo",220,"Momo","Kitchen","Steamed dumplings with spicy chutney","https://..."
"Virgin Mojito",180,"Bar Mocktails","Bar","Fresh mint leaves, lime and soda","https://..."
```

### 2. Inventory & Supplies (`foodiehub_inventory.csv`)
```csv
Name,Category,CurrentStock,Threshold,Unit,UnitCost
"Boneless Chicken","Meats",15,5,"kg",450
"Cooking Oil","Pantry",20,5,"L",220
```

### 3. Dish Recipes (`foodiehub_recipes.csv`)
```csv
DishName,Section,IngredientName,Quantity,Unit,Instructions
"Chicken Steam Momo","Kitchen","Boneless Chicken",0.08,"kg","Mince and mix with spices"
"Chicken Steam Momo","Kitchen","Momo Dough Flour",0.05,"kg","Knead dough and wrap"
```

---

## 🛠️ Project Structure

```text
foodieshub/
├── data/                  # Auto-generated runtime database & backups (git-ignored)
├── public/                # Web manifest, icons, service worker & PWA assets
├── src/
│   ├── assets/            # High-resolution dish category photography
│   ├── components/        # Modals, screens (Admin, Billing, FloorPlan, Kitchen, Menu, Login)
│   ├── hooks/             # usePersistentState (LAN WebSocket / HTTP sync)
│   ├── utils/             # CSV parser, generator, and thermal print formatters
│   ├── App.tsx            # Main application root state & print snapshots
│   ├── constants.ts       # Floor plan defaults, taxes, and order computation
│   ├── menuCatalog.ts     # Default FoodieHub catalogue
│   └── types.ts           # TypeScript domain definitions
├── server.cjs             # Multi-device HTTP / API sync server
├── start-foodiehub.bat    # Windows 1-click startup script
├── package.json           # Project manifest & scripts
└── vite.config.ts         # Vite build configuration
```

---

## 📜 Available Scripts

- `npm run dev` — Starts the local development server with Hot Module Replacement.
- `npm run build` — Compiles and optimizes TypeScript / React assets into `dist/`.
- `npm run preview` — Locally preview the production build.
- `npm start` — Runs the production multi-device LAN synchronization server.

---

## 📄 License
MIT License. Free for commercial and private restaurant use.
