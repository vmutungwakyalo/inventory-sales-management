# Install Inventory & Sales Management on a New Computer

This guide installs the packaged Windows desktop app and restores the existing PostgreSQL database.

## What you need

- The installer:
  `Inventory Sales Management Setup 1.0.0.exe`
- The database backup file:
  `inventory_sales.backup`
- The PostgreSQL password for the new computer
- A Windows account with permission to install applications

The new computer does not need Node.js, npm, or the original project folders.

## 1. Install PostgreSQL

Install PostgreSQL on the new computer and remember the password assigned to the `postgres` user.

During installation, keep the default PostgreSQL port:

```text
5432
```

Make sure the PostgreSQL service is running before opening the desktop application.

## 2. Install the desktop application

Copy `Inventory Sales Management Setup 1.0.0.exe` to the new computer and double-click it.

Complete the installer. It creates the application and desktop/Start Menu shortcuts.

## 3. Copy the database backup

Copy `inventory_sales.backup` to a simple folder on the new computer, for example:

```text
C:\Users\Public\Documents\inventory_sales.backup
```

## 4. Create the empty database

Open PowerShell and run:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -h localhost -U postgres inventory_sales
```

Enter the PostgreSQL password when prompted.

If PostgreSQL is installed in another version folder, replace `18` with that version.

## 5. Restore the database

Run:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_restore.exe" -h localhost -U postgres -d inventory_sales --no-owner "C:\Users\Public\Documents\inventory_sales.backup"
```

Enter the PostgreSQL password when prompted.

The restore brings back users, products, inventory, sales, reports, price history, and stock movements.

## 6. Configure the desktop app

Open the production configuration file:

```powershell
notepad "$env:APPDATA\Inventory Sales Management\production.env"
```

Set the PostgreSQL password used on the new computer:

```env
DATABASE_URL="postgresql://postgres:NEW_PASSWORD@localhost:5432/inventory_sales?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
FRONTEND_URL="http://localhost:5174"
PAYMENT_METHODS="CASH,CARD,MPESA,AIRTEL_MONEY,BANK_TRANSFER,CHEQUE,CREDIT,OTHER"
```

Replace `NEW_PASSWORD` with the new computer's PostgreSQL password. Keep the URL-encoded form for special characters. For example, `$` is `%24` and `!` is `%21`.

Use a long random value for `JWT_SECRET`. It can be different from the old computer's secret. Restart the application after saving the file.

## 7. Launch the app

Open **Inventory & Sales Management** from the Desktop shortcut or Start Menu.

The existing accounts and records should now be available. The app uses the local PostgreSQL database on the new computer.

## Fresh database option

If you do not want to restore the backup, create the empty database in step 4 and launch the app after configuration. The packaged app does not include Prisma migration tools, so a fresh database requires a separate schema-initialization process. Restoring the backup is the recommended installation method.

## Troubleshooting

### App says production configuration is missing

Verify this exact file exists:

```text
%APPDATA%\Inventory Sales Management\production.env
```

Confirm it contains both `DATABASE_URL` and `JWT_SECRET` with real values, not `YOUR_PASSWORD` or `replace-with-a-long-random-secret`.

### App cannot connect to PostgreSQL

Check that:

- PostgreSQL is running.
- The database is named `inventory_sales`.
- The PostgreSQL password in `production.env` is correct.
- PostgreSQL is listening on port `5432`.

### `pg_dump`, `pg_restore`, or `createdb` is not recognized

Use the full PostgreSQL 18 paths shown in this guide. PostgreSQL tools are normally installed under:

```text
C:\Program Files\PostgreSQL\18\bin
```

### Restore reports that the database already contains objects

Use a new empty database, or drop and recreate the local database before restoring. This removes only the local database and should not be done if it contains data you need.
