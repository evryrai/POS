# FRD — POS Toko Kelontong v1

Linked PRD: docs/PRD.md

## 1) Functional Requirements

| FR-ID | Requirement | Priority | PRD Ref |
|---|---|---|---|
| FR-001 | Sistem login role Owner/Kasir | Must | Scope |
| FR-002 | CRUD produk (nama, SKU, kategori, harga beli/jual, stok) | Must | Scope |
| FR-003 | SKU harus unik | Must | Scope |
| FR-004 | POS cart (tambah/ubah qty/hapus item) | Must | Scope |
| FR-005 | Checkout menghitung subtotal, diskon, total, kembalian | Must | Scope |
| FR-006 | Checkout gagal jika stok tidak cukup | Must | Scope |
| FR-007 | Transaksi sukses mengurangi stok otomatis | Must | Scope |
| FR-008 | Stock adjustment manual wajib alasan | Should | Scope |
| FR-009 | Laporan harian (omzet, jumlah trx, top item, low stock) | Must | Scope |
| FR-010 | Export CSV laporan | Should | Scope |
| FR-011 | Backup lokal manual+harian | Must | Scope |
| FR-012 | Restore data dari backup | Must | Scope |

## 2) Main Flow
1. Kasir login
2. Pilih/tambah item ke cart
3. Checkout dan simpan transaksi
4. Stok otomatis terpotong
5. Owner lihat laporan harian

## 3) Error Flows
- E1: SKU duplikat pada create/update produk → reject.
- E2: Qty melebihi stok saat checkout → reject.
- E3: File restore invalid/corrupt → reject + pesan jelas.

## 4) Integration & Data
- Local DB embedded: **SQLite**
- ORM/Data access: **Prisma**
- App framework: **Nuxt 3 + TypeScript**
- State management: **Pinia**
- Validation: **Zod**
- No external API required for v1 core

## 5) Non-Functional
- App tetap berjalan offline
- Query laporan harian < 30 detik
- Audit trail untuk stock adjustment dan void transaksi

## 6) QA Minimum
- Happy path checkout
- Edge case: stok 0 / stok pas
- Failure: restore file corrupt
- Regression: stok sebelum/sesudah transaksi
- Security: validasi input, role access

## 7) DoD
- Semua FR Must selesai
- Test minimum pass
- Sherlock gate PASS/PASS_WITH_CONDITIONS
