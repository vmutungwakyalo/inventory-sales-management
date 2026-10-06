<!-- markdownlint-disable MD060 -->

# Inventory Sales Project File Guide

This document explains the purpose and importance of the files in the `projects` workspace as of 2026-09-22.

## Workspace Root

| File or folder | Importance |
| --- | --- |
| `README.md` | Workspace-level notes and project orientation. Read this first when returning to the project. |
| `.gitignore` | Defines files Git should ignore, such as dependencies, secrets, local configuration, and generated output. |
| `inventory_sales.backup` | Current PostgreSQL custom-format backup. Use this backup when restoring the latest database state, including payment-related schema and data. Keep it protected because it contains application data. |
| `inventory-sales-management/` | Main full-stack web application containing the React frontend, Express backend, Prisma schema, tests, and documentation. |
| `inventory-sales-desktop/` | Electron desktop shell that packages the web application and backend into a Windows executable and installer. |

## `inventory-sales-management`

| File or folder | Importance |
|---|---|
| `package.json` | Root scripts for installing dependencies, running the frontend/backend together, building, testing, generating Prisma Client, and database setup. |
| `package-lock.json` | Locks root dependency versions for repeatable npm installs. Do not edit manually. |
| `README.md` | Main application documentation, setup instructions, payment configuration, commands, and report calculations. |
| `.gitignore` | Prevents local secrets, dependencies, builds, and temporary files from being committed. |
| `backend/` | Express API, authentication, database access, business rules, payment integration, and automated tests. |
| `frontend/` | React/Vite user interface for login, administration, sales, inventory, reports, and receipts. |
| `frontend/dist/` | Generated production frontend output. It is rebuilt by `npm run build`; source changes should be made in `frontend/src/`, not here. |

## Backend

### Backend configuration and package files

| File | Importance |
|---|---|
| `backend/package.json` | Backend scripts and runtime dependencies, including Express, Prisma, JWT, bcrypt, ExcelJS, and PDFKit. |
| `backend/package-lock.json` | Locks backend dependency versions. Do not edit manually. |
| `backend/.env.example` | Safe configuration template showing database, JWT, payment-method, and M-Pesa variables. Copy to `.env` and replace placeholders locally. Never commit real secrets. |
| `backend/.env` | Local secret configuration when present. It contains database credentials and must remain private. |
| `backend/prisma/schema.prisma` | Authoritative database model. Defines users, products, price history, sales, inventory movements, stock receipts, payment methods, and pending M-Pesa payments. |
| `backend/prisma/seed.js` | Optional database seed entry point. It intentionally does not create default users or products. |

### Backend application entry points and infrastructure

| File | Importance |
|---|---|
| `backend/src/server.js` | Loads environment variables and starts the Express server on the configured port. |
| `backend/src/app.js` | Builds the Express application, configures CORS/JSON/logging, registers API routes, exposes health and payment-method configuration endpoints, and handles errors. |
| `backend/src/config/prisma.js` | Creates the shared Prisma database client. |
| `backend/src/config/payments.js` | Defines supported payment methods and reads the enabled list from `PAYMENT_METHODS`. |
| `backend/src/middleware/auth.js` | Verifies JWT authentication and restricts routes by user role. |
| `backend/src/utils/inventory.js` | Pure sale-calculation logic for expected totals, variance, cost of goods sold, and gross profit. |
| `backend/src/services/mpesa.js` | Daraja OAuth/STK Push client. Supports sandbox/production, PayBill/Till transaction types, phone normalization, and callback configuration. |

### Backend controllers

| File | Importance |
|---|---|
| `backend/src/controllers/authController.js` | Registers users and authenticates login with username or email. Hashes passwords and issues JWTs. |
| `backend/src/controllers/productController.js` | Lists, creates, edits, deletes, and audits products and price changes. |
| `backend/src/controllers/inventoryController.js` | Calculates inventory views, records stock-in movements, and safely removes stock receipts. |
| `backend/src/controllers/saleController.js` | Records manual sales, starts M-Pesa STK payments, handles Daraja callbacks, finalizes confirmed payments, updates stock, stores receipt numbers, lists sales, and safely deletes sales. |
| `backend/src/controllers/dashboardController.js` | Provides admin metrics, inventory valuation, stock status, revenue, profit, and variance summaries. |
| `backend/src/controllers/reportController.js` | Produces sales/profit reports, stock alerts, CSV/Excel/PDF exports, and report filters. |

### Backend routes

| File | Importance |
|---|---|
| `backend/src/routes/authRoutes.js` | Maps registration and login endpoints. |
| `backend/src/routes/productRoutes.js` | Maps product and price-history endpoints. |
| `backend/src/routes/inventoryRoutes.js` | Maps inventory movement and stock-in endpoints. |
| `backend/src/routes/saleRoutes.js` | Maps manual sales, M-Pesa STK Push, payment status, callback, sales listing, and sale deletion endpoints. |
| `backend/src/routes/dashboardRoutes.js` | Maps admin dashboard summary endpoints. |
| `backend/src/routes/reportRoutes.js` | Maps reports, stock alerts, and export endpoints. |

### Backend tests

| File | Importance |
|---|---|
| `backend/test/inventory.test.js` | Tests sale calculations, variance, profit, and invalid quantities. |
| `backend/test/requirements.test.js` | Regression checks for schema fields, price history, movement tracking, authorization, reporting, exports, and frontend feature text. |

## Frontend

| File | Importance |
|---|---|
| `frontend/package.json` | Frontend scripts and React/Vite dependencies. |
| `frontend/package-lock.json` | Locks frontend dependency versions. |
| `frontend/index.html` | Vite HTML entry document. |
| `frontend/vite.config.js` | Vite development/build configuration, including the frontend port. |
| `frontend/public/inventory-icon.svg` | Public frontend icon asset. |
| `frontend/src/main.jsx` | React application entry point. |
| `frontend/src/App.jsx` | Login flow and admin dashboard: products, stock receiving, sales history, reports, exports, price history, and admin actions. |
| `frontend/src/UserDashboard.jsx` | Active sales-user workflow. Handles product selection, configurable payment methods, M-Pesa status polling, sale-form reset, success messages, and printable receipts. |
| `frontend/src/styles.css` | Global application layout and visual styling. |
| `frontend/src/services/api.js` | Axios API client and JWT Authorization header injection. |
| `frontend/src/services/auth.js` | Saves, reads, and clears the local login session. |

## `inventory-sales-desktop`

| File or folder | Importance |
|---|---|
| `package.json` | Electron development, web build, icon generation, portable build, and NSIS installer scripts. |
| `package-lock.json` | Locks Electron, electron-builder, icon, and image-processing dependencies. |
| `main.cjs` | Electron main process. Starts the packaged backend, creates the application window, manages local production configuration, and stops child processes. |
| `build.cjs` | Cross-platform wrapper around electron-builder for Windows NSIS or portable packaging. |
| `electron-builder.yml` | Packaging rules, application identity, icon, bundled frontend/backend resources, output directory, and installer behavior. |
| `config/production.env.example` | Template copied into the installed app's user-data folder. Contains database, JWT, payment-method, and M-Pesa production configuration placeholders. |
| `assets/inventory-icon.svg` | Source vector icon. |
| `assets/inventory-icon.ico` | Windows icon generated from the source asset and used by the executable/installer. |
| `scripts/create-icon.cjs` | Generates the Windows ICO file from the source icon. |
| `README.md` | Desktop development, production-style local run, configuration, and packaging instructions. |
| `INSTALL-NEW-COMPUTER.md` | Step-by-step Windows installation, PostgreSQL restore, configuration, and troubleshooting guide. |

## Generated Desktop Output

| File or folder | Importance |
|---|---|
| `desktop-dist/win-unpacked/` | Unpacked Windows application used for portable testing and inspection. It is generated by electron-builder. |
| `desktop-dist/win-unpacked/Inventory Sales Management.exe` | Standalone unpacked executable for testing or portable use. |
| `desktop-dist/Inventory Sales Management Setup 1.0.0.exe` | Windows NSIS installer intended for distribution. |
| `desktop-dist/Inventory Sales Management Setup 1.0.0.exe.blockmap` | Differential-update metadata generated by electron-builder. It is not a database backup. |
| `desktop-dist/inventory-sales-desktop-1.0.0-x64.nsis.7z` | Compressed installer payload generated by NSIS packaging. |
| `desktop-dist/*builder*.yml` | Effective/debug packaging configuration generated by electron-builder. Useful for diagnosing packaging, not for application logic. |

## Generated and Dependency Content

| File or folder | Importance |
|---|---|
| `node_modules/` | Installed third-party dependencies. Recreated with npm install; do not edit or distribute as source. |
| `frontend/node_modules/` | Frontend dependencies. Recreated from `frontend/package-lock.json`. |
| `backend/node_modules/` | Backend dependencies and generated Prisma Client. Recreated from `backend/package-lock.json`. |
| `frontend/dist/` | Compiled frontend assets consumed by the desktop packaging process. Recreated by the frontend build. |
| `desktop-dist/` | Compiled desktop artifacts. Recreated by `npm run dist` or `npm run dist:portable`. |

## Current Operational Status

- Offline inventory and manual payment workflows are implemented.
- The sales form clears product, search, quantity, payment fields, and variance reason after a successful sale.
- Printable receipts are implemented.
- Cash, Card, M-Pesa, Airtel Money, Bank Transfer, Cheque, Credit, and Other are supported as configured payment methods.
- M-Pesa STK Push is implemented, but live use requires production Daraja credentials and a stable public HTTPS callback URL.
- The local database schema is synchronized and the current backup is `inventory_sales.backup`.
- Automated backend tests and frontend builds pass.
- The Windows executable and NSIS installer are generated under `inventory-sales-desktop/desktop-dist/`.

## Safe Editing Rules

- Edit source files under `backend/src/`, `backend/prisma/`, and `frontend/src/`.
- Edit configuration templates, not real `.env` files, when documenting setup.
- Do not commit passwords, JWT secrets, Daraja keys, passkeys, or production database URLs.
- Do not edit `node_modules/`, `frontend/dist/`, or `desktop-dist/` manually.
- After source changes, run backend tests, the frontend build, and the desktop packaging command when the change affects the packaged app.
- Treat `inventory_sales.backup` as sensitive application data and keep a second secure copy outside the workspace for disaster recovery.
