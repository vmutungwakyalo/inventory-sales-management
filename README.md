# Inventory & Sales Management

Local inventory and sales management system with:

- `inventory-sales-management/`: React/Vite frontend and Express/Prisma backend.
- `inventory-sales-desktop/`: Electron desktop shell and Windows installer configuration.

## Web development

```powershell
cd inventory-sales-management
npm run setup
npm run dev
```

Open `http://localhost:5174/`.

## Desktop development

Install the desktop dependencies, then start the Electron shell:

```powershell
cd inventory-sales-desktop
npm install
npm run dev
```

## Build the Windows installer

```powershell
cd inventory-sales-desktop
npm run dist
```

The installer is created under `inventory-sales-desktop/desktop-dist/`.

## Database and secrets

PostgreSQL is required locally. Keep database credentials, JWT secrets, production configuration, and database backups outside GitHub. The desktop app reads production configuration from:

```text
%APPDATA%\inventory-sales-desktop\production.env
```

See [inventory-sales-desktop/INSTALL-NEW-COMPUTER.md](inventory-sales-desktop/INSTALL-NEW-COMPUTER.md) for transfer and restore instructions.
