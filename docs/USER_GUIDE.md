# POS Toko Kelontong - User Guide

Selamat datang di aplikasi **POS Toko Kelontong** (Point of Sales). Aplikasi ini dirancang khusus untuk berjalan cepat, ringan, dan mandiri secara lokal (Local-First) untuk kebutuhan satu toko atau satu kasir.

Dokumen ini berisi panduan cara instalasi, menjalankan aplikasi, hingga cara penggunaan fitur sehari-hari.

---

## 🚀 1. Instalasi & Menjalankan Aplikasi

Karena aplikasi ini berjalan secara lokal, ikuti langkah berikut untuk menyalakannya di komputer toko:

### Prasyarat
- **Node.js** (Minimal versi 18)
- **Terminal/Command Prompt**

### Langkah Menjalankan:
1. Buka Terminal dan arahkan ke folder aplikasi `app`:
   ```bash
   cd app
   ```
2. Instal semua dependensi (hanya perlu dilakukan sekali di awal):
   ```bash
   npm install
   ```
3. Siapkan database lokal (SQLite):
   ```bash
   npx prisma db push
   ```
4. Jalankan aplikasi:
   ```bash
   npm run dev
   ```
5. Buka browser (Chrome/Edge/Safari) dan akses alamat:
   **`http://localhost:3000`**

---

## 📖 2. Halaman Kasir (Checkout) - `/`
Ini adalah halaman utama saat Anda membuka aplikasi. Digunakan untuk melayani pelanggan.

### Cara Melakukan Transaksi:
1. **Pilih Produk:** Klik produk di panel *Product Catalog* sebelah kiri.
2. **Atur Kuantitas:** Di panel *Cart* (Kanan), gunakan tombol `-` atau `+` untuk menambah/mengurangi jumlah barang.
3. **Pencarian Cepat:** Tekan tombol `/` di keyboard untuk langsung mengetik nama barang.
4. **Pembayaran:**
   - Masukkan nominal diskon (jika ada).
   - Pilih metode pembayaran (Cash, QRIS, E-Wallet).
   - Masukkan nominal uang yang dibayarkan oleh pelanggan (`Paid`).
   - Masukkan catatan transaksi (opsional).
5. **Selesaikan Transaksi:** Klik tombol **"Complete Checkout"** atau tekan `Ctrl + Enter` di keyboard.
6. **Struk:** Setelah sukses, ringkasan kembalian dan *Receipt Preview* akan muncul di bawah. Riwayat transaksi terbaru akan muncul di panel *Recent Transactions*.

---

## 📦 3. Manajemen Produk - `/products`
Halaman ini digunakan untuk menambah, mengubah, atau menghapus data barang di toko.

**Akses:** Buka `http://localhost:3000/products`

### Fitur:
- **Tambah Barang Baru:** Klik tombol biru **"+ New Product"**. Isi SKU (kode unik), Nama, Harga Beli, Harga Jual, dan Stok awal.
- **Ubah Barang:** Klik tombol **"Edit"** di sebelah kanan produk untuk mengubah harga atau nama barang.
- **Hapus Barang:** Klik tombol **"Del"** untuk menonaktifkan barang dari daftar jualan.

---

## 🔄 4. Penyesuaian Stok (Audit Trail) - `/inventory`
Gunakan halaman ini jika ada selisih stok (barang rusak, hilang, atau opname manual) tanpa melalui kasir jualan.

**Akses:** Buka `http://localhost:3000/inventory`

### Cara Menyesuaikan Stok:
1. Pilih produk dari *dropdown*.
2. Pilih aksi:
   - **Add (+):** Menambah stok (misal: barang masuk dari supplier).
   - **Subtract (-):** Mengurangi stok (misal: barang expired/rusak).
   - **Set (=):** Mengatur stok ke angka pasti hasil opname manual.
3. Masukkan jumlah pada kolom *Value / Qty*.
4. **Wajib:** Isi alasan (*Reason*) pada kolom yang disediakan.
5. Klik **"Confirm Adjustment"**.

Riwayat semua perubahan stok (baik dari kasir maupun penyesuaian manual) akan terekam jelas di tabel *Audit Trail* sebelah kanan.

---

## 📊 5. Laporan Harian - `/reports`
Halaman ini digunakan oleh Pemilik (Owner) untuk melihat omzet dan pergerakan toko hari ini atau hari-hari sebelumnya.

**Akses:** Buka `http://localhost:3000/reports`

### Fitur:
- **Pilih Tanggal:** Pilih tanggal spesifik untuk melihat total pendapatan, jumlah transaksi, dan diskon.
- **Top 10 Products:** Menampilkan daftar 10 barang paling laku pada hari tersebut.
- **Low Stock Alerts:** Pemberitahuan otomatis untuk barang-barang yang stoknya sudah menipis dan perlu di-*restock*.
- **Export CSV:** Klik tombol **"Export CSV"** untuk mengunduh laporan ke format Excel/Spreadsheet.

---

## 💾 6. Backup & Restore - `/system`
Data aplikasi Anda disimpan sepenuhnya di komputer lokal. Sangat disarankan untuk melakukan **Backup** secara rutin agar data tidak hilang jika komputer rusak.

**Akses:** Buka `http://localhost:3000/system`

### Cara Melakukan Backup:
1. Klik tombol biru **"Download .db File"**.
2. File database akan terunduh. Simpan file ini di Flashdisk, Google Drive, atau tempat aman lainnya. Lakukan ini setidaknya 1 minggu sekali.

### Cara Melakukan Restore (Mengembalikan Data):
1. Siapkan file `.db` hasil backup sebelumnya.
2. Klik tombol upload (pilih file) pada bagian *Restore Database*.
3. Klik **"Upload & Restore"**.
4. **Peringatan:** Melakukan *Restore* akan menghapus dan menimpa semua data jualan saat ini dengan data dari file backup. Aplikasi akan otomatis memuat ulang setelah selesai.
