# Inventory & Sales Management System

Inventory and sales management application with separate admin and sales-user dashboards.

## Included

* Full product editing with controlled fields. Stock cannot be changed through product editing; stock changes remain auditable inventory movements.
* Wholesale and retail price updates with immutable price-history records.
* Historical price protection: every sale stores the wholesale/retail prices that existed at the exact sale time, so later price changes never rewrite past transaction economics.
* Price-history UI showing old/new prices, change type, administrator, timestamp and note.
* Inventory movement history UI with stock-before/after, quantity, movement type, product, user and captured prices.
* Detailed sales/revenue interface.
* Out-of-stock and low-stock alerts.
* Sales variance reporting and profit reporting by product.
* Filters for date, product, user and variance type/reason.
* CSV, Excel and PDF exports.
* Complete sales transaction export including historical unit prices, expected total, actual payment, variance, reason, COGS and gross profit.
* Server-side report calculations.
* Admin-only product, sale and stock-receipt deletion with inventory safeguards.
* Account registration for sales users and login with username or email.
* Cash, card, M-Pesa, Airtel Money, bank transfer, cheque, credit, and other payment records with printable receipts.

## Requirements

* Node.js and npm
* PostgreSQL running on `localhost:5432`
* A PostgreSQL database named `inventory_sales`

The backend database connection is configured in `backend/.env`. Create it from `backend/.env.example` and set `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `FRONTEND_URL`. Do not commit `.env` or share its credentials.

To enable M-Pesa, create a Daraja app and set `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_TRANSACTION_TYPE`, `MPESA_PARTY_B`, and `MPESA_CALLBACK_URL`. Use `CustomerPayBillOnline` for a PayBill and `CustomerBuyGoodsOnline` for a Till. For live production, the callback URL must be a stable publicly reachable HTTPS endpoint hosted with the backend. M-Pesa sends the customer an STK prompt and the sale is completed after callback confirmation. Other methods are recorded manually and do not trigger a phone prompt.

## Install and setup

From the project root:

```powershell
npm run setup
```

After changing the Prisma schema on an existing installation, run `npm --prefix backend run prisma:migrate -- --name payments` before starting the application.

This installs root, backend, and frontend dependencies, generates Prisma Client, applies migrations, and runs the project seed step. The seed script intentionally creates no default products or user accounts.

## Run the application

From the project root:

```powershell
npm run dev
```

The command starts both services:

* Frontend: [http://localhost:5174/](http://localhost:5174/)
* Backend API: [http://localhost:5000/](http://localhost:5000/)

Vite is configured to use port `5174` and will fail if that port is already occupied. Stop the process using it before starting the application.

## Accounts and roles

Use **Create one** on the login screen to register a sales-user account. Login accepts either the account username or email address. Public registration always creates a `USER` account.

To promote an account to admin during development, open Prisma Studio, select `User`, and change its `role` from `USER` to `ADMIN`. Sign out and sign in again after changing the role.

## View the database

From the project root, start Prisma Studio in a separate terminal:

```powershell
Set-Location backend
npx prisma studio
OR simply
npm --prefix backend run studio on target folder
```

Open [http://localhost:5555/](http://localhost:5555/) to browse `User`, `Product`, `Sale`, `StockIn`, `InventoryMovement`, and `PriceHistory` records. PostgreSQL itself listens on port `5432`; it is a database service, not a browser page.

## Other commands

```powershell
npm test       # Run backend tests
npm run build  # Build the frontend
```

## Report calculations

* Expected sales = quantity × historical retail unit price captured at sale time.
* Sales variance = actual revenue − budgeted/expected revenue.
* Cost of Goods Sold(COGS) = quantity × historical wholesale unit price captured at sale time.
* Gross profit = actual revenue − COGS.
* Gross margin % = (gross profit ÷ actual revenue) × 100.
* Current inventory valuation uses current stock and current product prices.

<!-- End of README -->
