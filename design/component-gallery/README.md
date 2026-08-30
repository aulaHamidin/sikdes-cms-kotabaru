# Component Gallery Tahap 1

Gallery ini adalah prototipe statis untuk memvalidasi `doc/UI_UX_SPEC.md` sebelum bootstrap CodeIgniter 4. Tidak ada data produksi, dependency eksternal, CDN, atau request jaringan.

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan static server lokal dari root proyek:

```powershell
php -S 127.0.0.1:8765 -t .
```

Lalu buka `http://127.0.0.1:8765/design/component-gallery/`.

## Batas penggunaan

- Artefak ini bukan view production dan tidak memuat aturan bisnis.
- Setelah bootstrap CI4, markup dipindahkan ke layout, partial, dan Controlled View Cells aktual.
- Route gallery CI4 hanya boleh aktif pada environment development.
- Seluruh contoh identitas bersifat generik dan tidak memakai NIK, nomor KK, credential, atau PII nyata.
