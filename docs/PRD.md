# PRD — POS Toko Kelontong (Local-First, Single Terminal)

## 1. Problem Statement
Banyak toko kelontong masih mencatat transaksi dan stok secara manual sehingga rawan selisih stok, kesalahan harga, dan laporan harian lambat.

## 2. Objective
Membangun POS sederhana untuk 1 toko/1 terminal yang mampu:
- mencatat transaksi,
- mengelola stok secara real-time,
- menyediakan laporan harian cepat.

## 3. Target Users
- Pemilik toko
- Kasir/admin toko kelontong

## 4. Scope
### In Scope (v1)
- Master produk (SKU/barcode, harga, stok)
- Checkout POS + metode bayar dasar
- Pengurangan stok otomatis saat transaksi
- Stock adjustment manual + alasan
- Laporan harian + export CSV
- Backup & restore lokal

### Out of Scope (v1)
- Multi-cabang
- Integrasi akuntansi
- Sinkronisasi cloud real-time
- Loyalty/promo advanced

## 5. Success Metrics
- 100% transaksi tercatat via sistem
- Selisih stok turun >= 70% dalam 1 bulan
- Laporan harian tersedia < 30 detik
- Checkout umum < 20 detik per transaksi

## 6. Prioritization (MoSCoW)
### Must
- Master produk
- POS checkout
- Stok otomatis
- Laporan harian
- Backup/restore
### Should
- Riwayat mutasi stok lengkap
- Export CSV
### Could
- Scan barcode kamera
### Wont (v1)
- Multi-terminal sync

## 7. Risks & Dependencies
- Risiko adopsi user rendah → mitigasi UI sederhana dan flow kasir cepat.
- Risiko salah input stok awal → mitigasi audit adjustment + import terarah.
- Ketergantungan device lokal → mitigasi backup rutin + restore mudah.

## 8. Milestones
- M1: Auth + Master Produk
- M2: POS Checkout + Stok otomatis
- M3: Reporting + Adjustment + Audit trail
- M4: Backup/Restore + QA gate + Pilot

## 9. Technology Baseline (Approved)
- Nuxt 3 + TypeScript
- Nuxt UI + Tailwind CSS
- Pinia (state)
- SQLite + Prisma (local data)
- Zod (validation)
- CSV local export

Reference: `docs/TDR-001-tech-stack.md`
