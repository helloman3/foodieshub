# FoodieHub POS

FoodieHub is a responsive restaurant point-of-sale prototype for managing floor seating, orders, kitchen tickets, billing, and inventory.

## Run Locally

**Prerequisites:** Node.js 18+


1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open `http://localhost:3000`

## Local network mode

For shared restaurant data, run the FoodieHub LAN server on one always-on Windows computer connected to the restaurant Wi-Fi. That computer stores the shared state in `data/foodiehub-state.json`; phones and other computers use the browser only.

On the host computer:

1. Install Node.js 18 or newer.
2. Copy the project folder to the host computer.
3. Open PowerShell in the project folder and run `npm install`.
4. Run `npm run build` once.
5. Start the shared server with `npm run start`.
6. Find the host computer's local IPv4 address with `ipconfig`.

On each client phone or Windows computer connected to the same Wi-Fi, open `http://HOST-IP:3000`, replacing `HOST-IP` with the host address, for example `http://192.168.1.50:3000`. The PWA can then be installed from the browser. Client devices do not need Node.js or the source code.

Use the URLs as follows: `http://localhost:3000` is only for the computer running the server; `http://192.168.0.101:3000` is for devices on the same local Wi-Fi; and `http://100.123.69.24:3000` is for devices that can reach the host through its Tailscale network. Do not open `localhost` on a phone expecting it to reach the host computer. All clients must point to the same host computer and one running `npm start` process so they share `data/foodiehub-state.json`.

The browser keeps a local cache and queues state while the Wi-Fi/server is unavailable. When the connection returns, it uploads the local state automatically. The LAN server is the shared source of truth when connected. Allow Node.js through the host computer's private-network firewall when Windows asks.

Shared state writes are version-checked. If two devices edit the same data at once, the stale write is rejected instead of overwriting the newer server value; the device keeps its local pending value and shows a sync-conflict warning. The server also keeps rotating recovery copies in `data/backups/` before replacing the main state file.

When a conflict appears, choose `Keep server` to discard the local pending version or `Retry local` to attempt the local version against the newest server version. If the other device changes the same key again, the conflict is shown again rather than silently overwritten.

This is a local-network prototype. It does not yet provide production authentication, encrypted transport, audit history, or multi-user conflict resolution; do not expose port 3000 to the public internet.

## Initial administrator setup

Copy `.env.example` to `.env.local` and set `VITE_INITIAL_ADMIN_TOKEN` and `VITE_INITIAL_ADMIN_PIN` before the first login. The first account must be an Admin; that administrator can then create the rest of the staff accounts from Administration.

The current client persists data in browser storage so the workflow can be developed end-to-end. Move authentication, staff PIN verification, and restaurant data to a server API before production deployment.

## Quality checks

- `npm run lint` — TypeScript check
- `npm run build` — production build
