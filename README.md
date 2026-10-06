# Inventory & Sales Management

A full-stack inventory and sales platform for managing products, sales, payments, inventory movement, pricing history, and reporting.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Desktop app: Electron + Windows installer packaging
- Reporting: Server-side calculations with export support

## Project structure

- `inventory-sales-management/`: web app with the admin dashboard, sales flows, and API
- `inventory-sales-desktop/`: Electron wrapper for Windows desktop distribution

## Local development

### Web app

```powershell
cd inventory-sales-management
npm run setup
npm run dev
```

Open `http://localhost:5174/`.

### Desktop app

```powershell
cd inventory-sales-desktop
npm install
npm run dev
```

### Build installer

```powershell
cd inventory-sales-desktop
npm run dist
```

The packaged Windows installer is created under `inventory-sales-desktop/desktop-dist/`.

## Database and environment

PostgreSQL is required locally. Keep database credentials, JWT secrets, production settings, and backups outside GitHub.

The desktop app reads production settings from:

```text
%APPDATA%\inventory-sales-desktop\production.env
```

See [inventory-sales-desktop/INSTALL-NEW-COMPUTER.md](inventory-sales-desktop/INSTALL-NEW-COMPUTER.md) for setup and restore instructions.

## Highlights

- Product and stock management
- Historical price tracking
- Inventory movement tracking
- Sales variance and profit reporting
- Exportable reports for CSV, Excel, and PDF
- Multi-payment support including M-Pesa and card payments
- Separate admin and sales-user workflows
