# Inventory Sales Desktop

A separate Electron desktop shell for the existing Inventory & Sales Management application.

For transferring the installed app and database to another Windows computer, see [INSTALL-NEW-COMPUTER.md](INSTALL-NEW-COMPUTER.md).

## Prerequisites

- Node.js and npm
- PostgreSQL running locally
- The sibling project at `../inventory-sales-management`
- Backend and frontend dependencies installed in the sibling project
- `backend/.env` configured in the sibling project

## Install

From this folder:

```powershell
npm install
```

## Development

```powershell
npm run dev
```

This opens a desktop window, starts the sibling backend on port `5000`, and starts the sibling Vite frontend on port `5174`.

## Production-style local run

```powershell
npm start
```

This builds the sibling frontend and opens the built frontend in the desktop window.

The desktop shell uses the existing web app and database. It does not create a second database.

## Production configuration

The installer does not bundle database credentials or JWT secrets. On the target computer, configure:

```text
%APPDATA%\Inventory Sales Management\production.env
```

Then set `DATABASE_URL` and a strong `JWT_SECRET`. PostgreSQL must be installed and running on that computer. The app displays a startup error until this configuration exists.

## Build a Windows installer

From this folder:

```powershell
npm run dist
```

The installer is written to `desktop-dist/`. The packaged app bundles the frontend and backend runtime files, but PostgreSQL must still be installed and running on the target computer. Database credentials and JWT secrets are configured outside the installer.

To create a single portable executable instead:

```powershell
npm run dist:portable
```
