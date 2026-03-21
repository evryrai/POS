# 🚀 POS Toko Kelontong

A fast, local-first Point of Sale (POS) application built for a single-terminal grocery store setup. Designed for speed, reliability, and ease of use without requiring a constant internet connection.

## ✨ Key Features
- **Local-First:** Uses an embedded SQLite database. No internet needed to run the core POS.
- **Fast Checkout:** Keyboard shortcuts and minimal clicks for rapid cashier workflow.
- **Auto Stock Management:** Real-time stock deduction upon successful transactions.
- **Audit Trails:** Comprehensive history for manual stock adjustments (Add/Subtract/Set).
- **Daily Reports:** Dashboard for revenue, top products, low stock alerts, and CSV export.
- **Secure System:** Role-based access control (`OWNER` vs `CASHIER`).
- **Data Safety:** Built-in backup and restore `.db` utilities.

## 🛠️ Technology Stack
- **Framework:** Nuxt 3 (Vue 3)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite
- **ORM:** Prisma
- **Validation:** Zod

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+) installed on your machine.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/evryrai/POS.git
cd POS/app
npm install
```

### 3. Setup Database
Initialize the SQLite database schema:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

## 📖 Documentation
- [User Guide (Panduan Pengguna)](docs/USER_GUIDE.md) - Detailed instructions on how to use the app daily.
- [Project Requirements (PRD)](docs/PRD.md)
- [Functional Requirements (FRD)](docs/FRD.md)

## 👤 Roles & Default Navigation
- **`/`** : Cashier Workspace (Checkout)
- **`/products`** : Product Master Management (Owner only)
- **`/inventory`** : Stock Adjustment & Audit Trail (Owner only)
- **`/reports`** : Daily Revenue & Export (Owner only)
- **`/system`** : DB Backup & Restore (Owner only)

## ⚙️ Building for Production
To build the application for a production environment:
```bash
cd app
npm run build
node .output/server/index.mjs
```

---
*Developed by the OpenClaw AI Team (Indra, Chief, Sherlock, Joker, Rahma, Baghdad).*
