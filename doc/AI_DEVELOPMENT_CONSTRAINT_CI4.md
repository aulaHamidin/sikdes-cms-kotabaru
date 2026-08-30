# Rencana Eksekusi SIKDES Kota Baru

## 1. Sasaran dan fondasi yang dikunci

Aplikasi dibangun ulang dari scaffold saat ini menjadi modular monolith berbasis:

- CodeIgniter 4.7.4, PHP 8.3, MariaDB 11.4, InnoDB, `utf8mb4`, strict mode.
- Zona waktu aplikasi, database, job, laporan, dan cron: `Asia/Jakarta`; data waktu disimpan sebagai waktu WIB `DATETIME(6)`, tanpa normalisasi UTC.
- Bootstrap ulang CI4, bukan upgrade in-place dari CI3. Scaffold CI3 saat ini belum berisi modul bisnis dan akan dipertahankan melalui baseline Git sebelum diganti. Pendekatan ini mengikuti panduan resmi migrasi [CI3 ke CI4](https://codeigniter.com/user_guide/installation/upgrade_4xx.html).
- Server-rendered CI4 dengan Bootstrap, DataTables server-side, Chart.js, Tom Select, Quill, DOMPDF, PhpSpreadsheet, HTMLPurifier, serta fallback `ifsnop/mysqldump-php`.
- Versi dependency PHP/JavaScript dikunci melalui `composer.lock` dan `package-lock.json`; hanya versi stabil yang kompatibel dengan PHP 8.3 dan lolos audit.
- Single tenant untuk satu desa, sekitar 10.000 penduduk.
- Bahasa utama Indonesia dan format lokal Indonesia.

Hasil akhir dianggap selesai jika:

- `UI_UX_SPEC v1.1.1` menjadi sumber tunggal desain, komponen, Screen ID, role, dan state.
- `IMPLEMENTATION_PLAN` mempunyai traceability PRD → domain → database/service → Screen ID → pengujian.
- Seluruh modul bisnis, laporan, impor, CMS, pengaturan desa, audit, backup, dan queue berfungsi.
- Tidak ada PII publik, tidak ada mutasi yang dapat dilakukan Kepala Desa, dan tidak ada data penting yang bisa dihapus permanen.
- Seluruh test dan deployment rehearsal Hostinger lulus.
- Release stabil berada di `main`, sedangkan pengerjaan terintegrasi berada di `develop`.

## 2. UI/UX specification sebagai kontrak pertama

### Sistem visual

`doc/UI_UX_SPEC.md` dibuat terlebih dahulu dan dibekukan sebagai versi `1.1.1` sebelum view modul dikerjakan.

- Font: Inter lokal dengan fallback system sans-serif.
- Warna tetap berasal dari logo awal:
  - Primary royal blue: `#0504FF`
  - Accent yellow: `#FFF000`
  - Success green: `#339967`
  - Danger red: `#FE0000`
  - Canvas: `#F8FAFC`
  - Surface: `#FFFFFF`
  - Text: `#0F172A`
  - Muted text: `#475569`
  - Border: `#CBD5E1`
- Kuning hanya untuk aksen/status, bukan teks panjang atau CTA utama.
- Tidak menggunakan gradient.
- Grid 8 px, radius konsisten, bayangan ringan, dan target sentuh minimum 44×44 px.
- Perubahan logo di masa depan tidak mengubah token warna aplikasi.
- Internal panel bersifat desktop-first dan responsif; portal publik mobile-first.
- Breakpoint utama: mobile `<768`, tablet `768–1023`, desktop `≥1024`.
- Desktop memakai sidebar tetap; tablet/mobile memakai drawer.
- Semua halaman mempunyai `data-screen-id`.
- Seluruh state wajib tersedia: loading, empty, filtered-empty, validation error, system error, forbidden, success, dan processing.
- WCAG 2.2 AA: navigasi keyboard, focus ring terlihat, semantic landmarks, label form, error summary, serta tabel alternatif untuk chart.
- Komponen global tidak boleh dibuat ulang secara lokal oleh modul.

### Struktur pengguna dan navigasi

| Pengguna | Hak dan navigasi |
|---|---|
| Admin Desa | Dashboard, Penduduk, KK, Import, Laporan, Konten, Audit, Backup/Job, Pengguna, Pengaturan Aplikasi |
| Kepala Desa | Dashboard, Penduduk, KK, Laporan, histori dan audit yang relevan; seluruhnya read-only, tetapi dapat melihat PII dan dokumen |
| Warga/pengunjung | Beranda, Berita, Pengumuman, Agenda, Profil Desa; tanpa login dan tanpa PII |

Dashboard Admin dan Kepala Desa menampilkan kartu Kepala Desa aktif beserta foto atau fallback silhouette. Foto tidak ditampilkan di beranda publik, tetapi dapat tampil pada bagian Kepala Desa di halaman Profil Desa.

### Screen registry dan URL kanonis

| Grup | Screen ID utama | URL |
|---|---|---|
| Publik | `PUB-HOME`, `PUB-NEWS`, `PUB-NEWS-DETAIL`, `PUB-ANNOUNCEMENT`, `PUB-AGENDA`, `PUB-PROFILE` | `/`, `/berita`, `/pengumuman`, `/agenda`, `/profil-desa` |
| Autentikasi | `AUTH-LOGIN`, `AUTH-CHANGE-PASSWORD` | `/masuk`, `/ganti-password` |
| Dashboard | `INT-DASHBOARD` | `/panel` |
| Penduduk | `RES-INDEX`, `RES-SHOW`, `RES-CREATE`, `RES-EDIT`, `RES-STATUS`, `RES-HISTORY` | `/panel/penduduk/*` |
| KK | `KK-INDEX`, `KK-SHOW`, `KK-CREATE`, `KK-EDIT`, `KK-MOVE`, `KK-RESTORE` | `/panel/kartu-keluarga/*` |
| Import | `IMP-INDEX`, `IMP-CREATE`, `IMP-VALIDATION`, `IMP-SHOW` | `/panel/import/*` |
| Laporan | `RPT-INDEX`, `RPT-CREATE`, `RPT-SHOW`, `RPT-TEMPLATE` | `/panel/laporan/*` |
| CMS | `CMS-INDEX`, `CMS-EDITOR`, `CMS-SHOW` | `/panel/konten/*` |
| Audit | `AUD-INDEX`, `AUD-SHOW` | `/panel/audit/*` |
| Backup/job | `BAK-INDEX`, `BAK-SHOW`, `JOB-INDEX`, `JOB-SHOW` | `/panel/backup/*`, `/panel/job/*` |
| Pengguna | `USR-INDEX`, `USR-FORM`, `USR-SHOW` | `/panel/pengguna/*` |
| Pengaturan | `SET-IDENTITY`, `SET-BRAND`, `SET-HEAD`, `SET-PROFILE`, `SET-HISTORY`, `SET-PREVIEW` | `/panel/pengaturan/*` |

### Kontrak komponen dan interaksi

- Tabel menggunakan DataTables server-side. Klik baris membuka halaman detail; Edit selalu tombol eksplisit.
- Filter desktop berupa panel/filter bar; mobile berupa drawer dengan ringkasan filter aktif.
- Pencarian relasi memakai Tom Select lazy-load, debounce, maksimal 20 hasil per permintaan.
- Form memakai label permanen, penanda wajib, helper, error per field, error summary, dan peringatan perubahan yang belum disimpan.
- NIK dan nomor KK ditampilkan utuh hanya kepada pengguna internal yang berhak.
- Operasi status, restore, pemindahan KK, publikasi, dan reset password memakai confirmation dialog yang menjelaskan dampak.
- Job panjang menampilkan status persisted `queued`, `running`, `succeeded`, atau `failed`; halaman dapat ditutup tanpa menghentikan proses.
- Grafik dashboard selalu mempunyai tabel data alternatif.
- Notification center menampilkan sekurangnya `KK_WITHOUT_HEAD`, `ACTIVE_EMPTY_KK`, job gagal, serta konfigurasi laporan belum lengkap.
- Dibuat component gallery khusus development untuk menguji layout, form, tabel, modal, alert, upload, job status, empty state, dan responsive state sebelum view modul dibuat.

### Pengaturan aplikasi dan profil desa

Menu Pengaturan hanya terlihat dan dapat diubah Admin:

- `SET-IDENTITY`: nama/kode desa, kecamatan, kabupaten, provinsi, alamat kantor, RT/RW, kode pos, telepon, email, website, jam pelayanan, serta timezone WIB read-only.
- `SET-BRAND`: preview dan upload logo desa.
- `SET-HEAD`: nama Kepala Desa, NIP opsional, jabatan default “Kepala Desa”, awal/akhir masa jabatan, foto, dan sambutan maksimal 1.000 karakter.
- `SET-PROFILE`: ringkasan, sejarah, visi, misi, geografi, dan potensi desa.
- `SET-HISTORY`: riwayat versi identitas, logo, Kepala Desa, dan profil.
- `SET-PREVIEW`: preview dashboard internal, portal Profil Desa, dan kop laporan.

Logo:

- PNG/JPEG, maksimum 2 MiB, dimensi 256–4096 px.
- Direkode menjadi PNG maksimum 1024 px dengan alpha dipertahankan.
- SVG dan GIF ditolak.
- Logo bawaan `assets/images/logo-desa.png` tetap menjadi fallback dan seed awal.

Foto Kepala Desa:

- PNG/JPEG, maksimum 5 MiB, dimensi 400–6000 px.
- Direkode menjadi JPEG maksimum 1200×1600, metadata EXIF dihapus.
- Derivative 480×600 dan 160×200.
- Menggunakan fallback silhouette jika belum tersedia.

Profil publik mempunyai status draft, published, dan archived. Ringkasan wajib sebelum publikasi; bagian kosong disembunyikan. Kontak berasal dari identitas desa, sedangkan bagian Kepala Desa berasal dari versi Kepala Desa aktif.

## 3. Arsitektur, kontrak data, dan aturan bisnis

### Struktur aplikasi

- Struktur standar CI4: `app`, `public`, `tests`, `writable`, `spark`.
- Modul berada di `app/Modules/{Module}` dan memiliki Controller, Service, Repository, DTO, Validation, View, route registrar, migration, serta test.
- Shared layout berada di `app/Views`; komponen berlogika menggunakan Controlled View Cells.
- Tiga layout utama: `auth`, `public`, dan `internal`.
- Semua route memakai HTTP verb eksplisit, nama route unik, dan filter auth/role.
- Legacy auto-routing dinonaktifkan.
- Controller hanya mengatur HTTP; transaksi dan aturan bisnis berada di Service; Repository tidak boleh melakukan commit sendiri.
- Custom authentication berbasis session CI4 digunakan karena hanya ada dua role dan tidak memerlukan registrasi publik.
- `public/` hanya berisi front controller dan aset browser. Dokumen, backup, file impor, ekspor, dan master media privat berada di luar public root.

### Kontrak endpoint internal

- DataTables: `draw`, `recordsTotal`, `recordsFiltered`, `data`, dan error terstruktur.
- Tom Select: `{items: [{id, text, meta}], nextCursor}`.
- Job: `{id, type, status, progress, message, resultUrl}`; URL hasil hanya diberikan setelah otorisasi ulang.
- JSON validation menggunakan HTTP 422 dengan kode field stabil; server-rendered form menggunakan pola error yang sama.
- Semua mutation memakai CSRF, filter role, audit, dan idempotency key untuk operasi job.
- Tidak ada API publik untuk data kependudukan.

### Model data utama

- Authentication: pengguna, session database, temporary-password state, dan login attempt.
- Penduduk: identitas stabil, versi atribut, lifecycle event, dokumen privat.
- KK: kartu keluarga, versi alamat, membership temporal, dan event perpindahan.
- Pengaturan: `village_configuration`, `village_identity_versions`, `village_leaders`, `village_profile_versions`, `branding_media`.
- Operasional: imports, import errors, jobs, attempts, backups, report requests/files/templates/snapshots, notifications, dan audit logs.
- CMS: berita, pengumuman, serta agenda dengan status draft/published/withdrawn.

NIK dan nomor KK:

- Tepat 16 digit.
- Disimpan terenkripsi dengan nonce acak.
- Exact lookup dan uniqueness menggunakan keyed HMAC blind index terpisah.
- Kunci enkripsi dan blind-index hanya berada pada environment server dan escrow terpisah.
- Tetap unik meskipun record sudah tidak aktif.

Histori menggunakan valid window dan event:

- Koreksi atribut berlaku ketika disimpan dan menghasilkan versi baru serta before/after audit.
- Pindah, meninggal, membership, dan restore mempunyai tanggal efektif terpisah dari waktu pencatatan.
- Laporan `as-of` menggabungkan versi atribut dan business event yang belum di-void.
- Event “salah input” di-void untuk rekap bisnis, tetapi jejak audit tidak dihapus.

### Kontrak modul

**Pengguna dan autentikasi**

- Hanya role `ADMIN_DESA` dan `KEPALA_DESA`.
- Username wajib, email opsional tetapi unik; keduanya tidak boleh saling berbenturan dalam namespace login.
- Login dapat memakai username atau email.
- Tidak ada registrasi warga, MFA, atau reset melalui email.
- Admin/CLI dapat membuat temporary password; pengguna wajib menggantinya setelah login.
- Session diregenerasi saat login dan privilege change; login mempunyai throttling.
- CLI awal: `php spark siak:user:create`.

**Penduduk**

- Wajib: NIK, nama, jenis kelamin, tempat/tanggal lahir, alamat, RT/RW, agama, status perkawinan, kewarganegaraan.
- Orang tua, kontak, pendidikan, pekerjaan, pendapatan, golongan darah, dan hubungan KK bersifat opsional.
- Tidak ada hard delete.
- Status pindah/meninggal wajib tanggal efektif, alasan/catatan, serta dokumen jika tersedia.
- Restore pindah mendukung salah input atau kembali; restore meninggal hanya salah input.
- Restore tidak otomatis mengembalikan membership KK lama.

**Kartu keluarga**

- Nomor KK tepat 16 digit dan unik termasuk KK nonaktif.
- Satu penduduk maksimal memiliki satu membership aktif.
- Satu KK maksimal memiliki satu kepala aktif; aturan dijaga oleh constraint/generated key MariaDB dan row locking.
- Penduduk aktif boleh belum mempunyai KK.
- “Tambah anggota” hanya memilih penduduk aktif tanpa membership; perpindahan menggunakan flow Pindah KK.
- Kepala keluarga boleh keluar. KK dengan anggota tersisa menjadi headless dan menghasilkan notifikasi.
- Anggota terakhir keluar membuat KK otomatis nonaktif.
- KK dengan anggota aktif tidak dapat dinonaktifkan.
- Restore KK hanya untuk salah input, wajib alasan/catatan, dan tidak memulihkan membership.
- KK aktif kosong tetap dihitung dalam Total KK dan menghasilkan notifikasi.

**Import**

- Hanya untuk penduduk baru.
- Template mempunyai sheet `PENDUDUK_BARU` dan `KK_BARU`.
- Mode KK: `EXISTING`, `NEW`, atau `NONE`.
- KK existing hanya direferensikan dan tidak ditimpa.
- KK baru wajib nomor, alamat, RT, RW; tanggal terbit opsional dan minimal mempunyai satu penduduk baru.
- KK existing/nonaktif dalam sheet atau mode `NEW` menjadi error.
- File ditempatkan sementara dalam quarantine. Job wajib membuat dan memverifikasi backup DB sebelum membaca file.
- Kegagalan backup menghentikan proses dan menghapus file quarantine.
- Semua baris divalidasi; satu error membatalkan seluruh batch.
- Error menyebut sheet, baris, kolom, nama/NIK terkait, dan instruksi perbaikan dalam bahasa Indonesia.
- Setelah validasi, seluruh invariant dicek ulang di dalam satu transaksi.

**Queue dan backup**

- Satu queue database dan satu cron setiap menit.
- Worker: `php spark jobs:work --stop-when-empty --max-runtime=50`.
- Job menggunakan lease, advisory lock, idempotency, dan maksimal tiga retry untuk kegagalan transient.
- Backup database mencoba `mariadb-dump/mysqldump`, lalu fallback PHP.
- Retensi: empat backup terjadwal sukses terbaru, pre-import 30 hari, manual 90 hari.
- Restore hanya melalui CLI dan runbook.
- Dokumen/media filesystem dilindungi oleh backup Hostinger terpisah.
- Master logo/foto berukuran kecil disimpan sebagai BLOB database; derivative cache dapat dibangun ulang.

**Laporan**

- Jenis awal: penduduk, KK, dan perubahan kependudukan.
- Mendukung periode dan kondisi historis `as-of`.
- Template berversi mengatur kop/logo, kolom/urutan, orientasi, periode, serta penandatangan.
- Saat job dibuat, identitas desa, logo, Kepala Desa, template, dan parameter disnapshot sehingga hasil lama tidak berubah setelah pengaturan diedit.
- PDF memakai view khusus cetak; XLSX menulis NIK/KK sebagai teks eksplisit.
- File hasil disimpan privat selama 30 hari dan setiap download diaudit.
- Laporan resmi diblokir dengan pesan konfigurasi jika identitas wajib atau Kepala Desa aktif belum tersedia.

**CMS dan portal publik**

- Berita, pengumuman, dan agenda mempunyai status draft/published/withdrawn.
- Quill hanya mengizinkan format terbatas; HTML selalu disanitasi kembali dengan HTMLPurifier.
- Statistik publik hanya: penduduk aktif, KK aktif, laki-laki aktif, dan perempuan aktif.
- Tidak ada drill-down ke data pribadi.
- Profil desa adalah data terstruktur dari Pengaturan, bukan artikel CMS bebas.

## 4. Tahapan pengerjaan dan paralelisasi

### Tahap 0 — Safeguard, Git, dan remote

1. Periksa ulang bahwa database existing tidak berisi data produksi. Jika berisi data, bootstrap dihentikan dan dibuat rencana migrasi data khusus.
2. Buat `.gitignore` untuk `.env`, secret, `vendor`, `node_modules`, cache/log/session, upload privat, impor/ekspor, backup SQL, dan file IDE.
3. Jalankan `git init -b main`.
4. Buat baseline commit scaffold CI3, PRD, rekomendasi library, dan logo; beri tag recovery `baseline-ci3-20260831`.
5. Tambahkan `origin` ke `https://github.com/aulaHamidin/sikdes-cms-kotabaru.git`.
6. Verifikasi remote tetap kosong sebelum push dan jangan pernah force-push.
7. Autentikasi GitHub melalui browser memakai `gh auth login -h github.com -w`, lalu verifikasi akun.
8. Push `main`, buat dan push `develop`; `main` menjadi default branch.
9. Feature branch masuk ke `develop`; release PR dari `develop` ke `main`; hotfix dibuat dari `main` dan disinkronkan kembali ke `develop`.
10. Terapkan ruleset: larang force-push/delete, wajib PR, status checks, dan conversation resolution.
11. Hostinger belum dihubungkan pada tahap ini.

### Tahap 1 — UI/UX dan implementation contract

- Susun `UI_UX_SPEC v1.1.1`, screen registry, role/action matrix, responsive rules, content wording, form/state matrix, serta contoh desktop/mobile.
- Bangun component gallery development.
- Susun `IMPLEMENTATION_PLAN` yang hanya mereferensikan Screen ID dan komponen dari UI spec; tidak menduplikasi aturan visual.
- Buat traceability matrix PRD → modul → migration/service → Screen ID → test.
- Setelah kontrak dibekukan, perubahan global hanya boleh melalui pembaruan versi UI spec.

### Tahap 2 — Bootstrap CI4 dan shared foundation

- Hapus runtime CI3 setelah aman di baseline Git, lalu buat aplikasi CI4 baru.
- Pertahankan dokumen sumber dan logo; logo dipakai sebagai source asset/seed.
- Bangun environment config, database connection, migrations, error handling, logging, auth filter, role policy, CSRF, security headers, private-file delivery, audit service, encryption/blind index, route registry, layout, asset pipeline, dan CI.
- Tambahkan `php spark siak:doctor` untuk memeriksa PHP, extension, DB, timezone, path writable, key, cron freshness, dan kemampuan backup.
- Buat admin pertama melalui CLI, tanpa akun/password demo.

### Tahap 3 — Gelombang paralel pertama

Setelah shared foundation stabil, tiga jalur berjalan paralel:

- Jalur A: Pengaturan Aplikasi, branding, Kepala Desa, profil publik.
- Jalur B: Auth, pengguna internal, audit, dan session management.
- Jalur C: Queue database, job monitor, backup, private storage.

Pengaturan dikerjakan lebih awal karena menjadi dependency dashboard, portal, dan snapshot laporan.

### Tahap 4 — Gelombang domain paralel

- Jalur A: Penduduk dan lifecycle.
- Jalur B: KK, membership, pindah KK, headless/empty notification.
- Jalur C: CMS dan portal publik.

Schema shared hanya boleh diubah pemilik foundation. Setiap modul mempunyai route prefix, namespace, migration ownership, test fixture, dan Screen ID yang sudah dialokasikan.

### Tahap 5 — Modul dependency tinggi

- Import dimulai setelah Penduduk, KK, queue, dan backup stabil.
- Laporan dimulai setelah Penduduk, KK, Pengaturan, audit, dan queue stabil.
- Dashboard dan notification center diselesaikan setelah agregasi domain tersedia.
- Hardening, accessibility, performance, dan deployment rehearsal dilakukan setelah seluruh vertical slice terintegrasi.

Urutan wajib di dalam setiap modul:

1. Kontrak domain dan migration.
2. Service/Repository serta unit dan integration test.
3. Controller, route, authorization, dan JSON contract.
4. Baca kembali bagian Screen ID terkait di UI spec.
5. Implementasikan view hanya dengan layout/komponen global.
6. Jalankan feature, E2E, accessibility, responsive, dan permission test.
7. Integrasikan ke `develop`.

## 5. Quality gate, release, dan Hostinger

### Pengujian wajib

- Unit test untuk lifecycle, restore, membership, template, sanitasi, dan policy.
- Integration test memakai MariaDB 11.4, bukan SQLite.
- Migration dari database kosong, rollback pada database disposable, serta forward migration.
- Concurrency test untuk uniqueness NIK/KK, membership aktif, dan kepala aktif.
- Feature test semua named route, filter, CSRF, role, upload, download, dan validation.
- E2E Playwright untuk alur Admin, Kepala Desa, serta portal publik.
- Axe accessibility scan dan keyboard walkthrough.
- Visual screenshot desktop/mobile untuk seluruh layout dan komponen utama.
- Import test: backup gagal, sheet salah, referensi KK salah, duplikasi, seluruh batch rollback, serta retry job.
- Report test: `as-of`, snapshot konfigurasi, NIK/KK teks di XLSX, dan file retention.
- Security test: tidak ada PII publik, source/private file tidak dapat diakses URL, HTML CMS tersanitasi, session fixation dicegah, dan secret tidak masuk Git.
- Uji data 10.000 penduduk; endpoint tabel/pencarian harus tetap responsif dan tidak memuat seluruh data ke browser.
- Quality command mencakup Composer validation/audit/platform check, PHPUnit, static analysis, coding-style check, npm build/audit, dan E2E.

### CI/CD GitHub

- CI memakai PHP 8.3 dan service MariaDB 11.4.
- Build frontend direproduksi melalui `npm ci`; artefak browser yang diperlukan Hostinger disertakan pada release sehingga server tidak membutuhkan Node.
- `main` hanya menerima release yang lulus seluruh checks.
- Release pertama diberi tag `v1.0.0`; setiap deployment mencatat tag dan commit SHA.
- GitHub branch protection mengikuti kemampuan repository, dengan alur protected branch resmi [GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches).

### Deployment Hostinger

1. Hubungkan hPanel Git hanya ke branch `main` setelah release candidate deployable. Integrasi Git Hostinger mendukung pemilihan repository dan branch [melalui hPanel](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/).
2. Preflight membuktikan PHP web dan PHP CLI/cron sama-sama 8.3, extension wajib aktif, dan `SELECT VERSION()` menghasilkan MariaDB 11.4.x. Hostinger menyediakan pemilihan PHP 8.3 pada konfigurasi saat ini [melalui hPanel](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/).
3. Gunakan layout dua direktori resmi CI4:
   - source, `app`, `vendor`, `writable`, `.env`, dokumen, backup, dan ekspor berada di direktori privat di luar `public_html`;
   - hanya isi `public/`, front controller, dan aset browser berada di `public_html`.
4. Karena root website Hostinger tidak dapat diarahkan bebas seperti VPS, deployment mengikuti pola shared-hosting CI4 [dua direktori](https://codeigniter.com/user_guide/installation/deployment.html). Source tidak boleh ditempatkan terbuka di `public_html`.
5. Jika hPanel Git dapat menarik repository ke direktori privat, gunakan target tersebut dan jalankan deployment wrapper untuk sinkronisasi `public/`. Jika tidak, clone/pull melalui SSH ke direktori privat; auto-deploy hPanel tetap dinonaktifkan. Tidak ada fallback yang mengekspos `.env`, `app`, atau `vendor`.
6. Deployment wrapper menjalankan:
   - checkout tag dari `main`;
   - `composer install --no-dev --prefer-dist --optimize-autoloader`;
   - `php spark siak:doctor`;
   - backup dan verifikasi;
   - `php spark migrate`;
   - sinkronisasi aset publik;
   - cache warm-up;
   - smoke test.
7. `.env`, key encryption/blind-index, credential DB, serta writable/private storage bersifat persistent dan tidak ditimpa deployment.
8. Cron memakai absolute path PHP 8.3 dan menjalankan worker sekali per menit.
9. Automatic deployment baru boleh diaktifkan setelah dua rehearsal staging berturut-turut berhasil; jika wrapper tidak dapat dipanggil dengan aman oleh mekanisme Hostinger, deployment tetap manual dari tag `main`.
10. Go-live memerlukan smoke test portal, kedua role, denial mutation Kades, upload privat, import atomik, laporan async, cron, backup/restore, HTTPS, rewrite, dan case-sensitive filename.

### Asumsi dan batas yang dikunci

- Remote GitHub telah terverifikasi dapat dijangkau dan belum mempunyai ref; kondisi ini diperiksa ulang sebelum push pertama.
- Belum ada database produksi yang harus dimigrasikan. Jika asumsi ini salah, bootstrap tidak diteruskan.
- MariaDB 11.4 adalah kontrak. Hostinger yang tidak menyediakan versi kompatibel memblokir deployment sampai keputusan database direvisi.
- Tema warna tetap mengikuti logo awal; logo upload hanya mengganti identitas visual/logo.
- Tidak ada akun atau registrasi warga.
- Backup aplikasi mencakup database; dokumen/media filesystem memakai backup Hostinger terpisah.
- Tidak pernah menjalankan `migrate:fresh` di production.
- Hostinger hanya mengikuti `main`; `develop` tidak pernah dideploy ke production.
