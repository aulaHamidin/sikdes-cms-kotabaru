# Rekomendasi Library — SIKDES Kota Baru

| Metadata | Nilai |
| --- | --- |
| Versi dokumen | 1.0.0 |
| Tanggal | 31 Agustus 2026 |
| Status | **Sumber kebenaran aktif untuk teknologi dan dependensi** |
| Acuan produk | PRD-SIKDES-Kota-Baru-CI4.md |
| Framework | CodeIgniter 4.7.4 |
| Runtime | PHP 8.3 |
| Database | MariaDB 11.4 |
| Deployment | Hostinger Web/Cloud Hosting |

Dokumen ini menjadi acuan teknologi untuk implementasi SIKDES Kota Baru. Jika terdapat perbedaan dengan rekomendasi library atau catatan teknologi yang dibuat sebelumnya, dokumen ini yang berlaku.

PRD tetap memiliki otoritas lebih tinggi. Library dapat diganti karena incompatibility, security advisory, lisensi, atau keterbatasan hosting, tetapi penggantian harus:

1. Tidak mengubah aturan bisnis PRD.
2. Dicatat melalui perubahan dokumen dan dependency lockfile.
3. Lulus pemeriksaan kompatibilitas, keamanan, lisensi, dan integration test.
4. Tidak dilakukan langsung di production.

## 1. Baseline Teknologi

| Komponen | Versi/constraint | Keputusan |
| --- | --- | --- |
| PHP | ~8.3.0 | Gunakan patch PHP 8.3 terbaru yang tersedia dan sudah diuji. PHP 8.3 mendapat security support sampai 31 Desember 2027. |
| CodeIgniter AppStarter | 4.7.4 | Bootstrap aplikasi baru, bukan upgrade runtime CI3 in-place. |
| CodeIgniter Framework | ~4.7.4 | Versi awal dikunci 4.7.4 melalui composer.lock. |
| MariaDB | 11.4.x | InnoDB, strict mode, utf8mb4, dan DATETIME(6). |
| Composer | 2.x | Selalu menggunakan composer.lock. |
| Node.js | 24 LTS | Hanya untuk development dan CI frontend. |
| npm | Versi bawaan Node 24 yang diuji | Selalu menggunakan package-lock.json dan npm ci pada CI. |

Sumber:

- [CodeIgniter 4 framework](https://packagist.org/packages/codeigniter4/framework)
- [CodeIgniter 4 AppStarter](https://packagist.org/packages/codeigniter4/appstarter)
- [PHP supported versions](https://www.php.net/supported-versions.php)

### 1.1 Extension PHP wajib

Extension berikut harus tersedia pada PHP web, PHP CLI, dan cron:

~~~text
ctype
curl
dom
exif
fileinfo
filter
gd
iconv
intl
json
libxml
mbstring
mysqli
mysqlnd
openssl
pdo
pdo_mysql
simplexml
sodium
xml
xmlreader
xmlwriter
zip
zlib
~~~

OPcache diaktifkan pada production. Imagick tidak diwajibkan karena pipeline gambar menggunakan GD.

Perintah siak:doctor harus memeriksa versi PHP, extension, timezone, koneksi dan versi database, ketersediaan direktori writable, kunci aplikasi, kemampuan backup, serta freshness cron.

## 2. Paket PHP Runtime

| Kebutuhan | Paket | Constraint | Versi acuan | Lisensi | Pemakaian |
| --- | --- | --- | --- | --- | --- |
| Framework | codeigniter4/framework | ~4.7.4 | 4.7.4 | MIT | Routing, controller, database, validation, session, filters, CLI, migration, views, dan service framework. |
| Queue database | codeigniter4/queue | ^1.0.1 | 1.0.1 | MIT | Queue resmi CI4 untuk report, import, backup, retry, failed job, locking, dan worker. |
| Language pack | codeigniter4/translations | 4.7.4 | 4.7.4 | MIT | Pesan framework berbahasa Indonesia; pesan domain tetap dibuat sendiri agar konsisten. |
| Excel | phpoffice/phpspreadsheet | ^5.9 | 5.9.0 | MIT | Template, validasi import XLSX, dan laporan XLSX. |
| PDF | dompdf/dompdf | ^3.1 | 3.1.6 | LGPL-2.1 | Laporan PDF dengan view cetak khusus. |
| Sanitasi HTML | ezyang/htmlpurifier | ^4.19 | 4.19.0 | LGPL-2.1-or-later | Whitelist HTML CMS di server. |
| Fallback database dump | ifsnop/mysqldump-php | ^2.13 | 2.13 | GPL-3.0-or-later | Fallback bila mariadb-dump atau mysqldump tidak dapat dipanggil. |

Sumber paket:

- [CodeIgniter Queue](https://packagist.org/packages/codeigniter4/queue)
- [PhpSpreadsheet](https://packagist.org/packages/phpoffice/phpspreadsheet)
- [Dompdf](https://packagist.org/packages/dompdf/dompdf)
- [HTML Purifier](https://packagist.org/packages/ezyang/htmlpurifier)
- [mysqldump-php](https://packagist.org/packages/ifsnop/mysqldump-php)

### 2.1 Ketentuan penggunaan

**CodeIgniter Queue**

- Gunakan database handler dan satu nama queue aplikasi: siak.
- Queue framework menangani delivery, reserve, retry, failed job, dan worker concurrency.
- Aplikasi tetap mempunyai projection tabel job sendiri untuk initiator, progress, hasil, status UI, error aman, dan idempotency.
- Status UI dipetakan menjadi queued, running, succeeded, atau failed.
- Job handler harus idempotent karena delivery ulang dapat terjadi.
- Worker Hostinger:

~~~bash
php spark queue:work siak -max-time 50 -tries 3 --stop-when-empty
~~~

Cron menjalankan worker setiap menit. Jadwal bisnis seperti backup Minggu 00.00 WIB tetap dihitung aplikasi menggunakan Asia/Jakarta.

**PhpSpreadsheet**

- Baca hanya XLSX.
- Gunakan readDataOnly, read filter, dan batas ukuran/baris untuk melindungi memory shared hosting.
- NIK dan nomor KK dibaca serta ditulis sebagai teks eksplisit.
- Formula, external link, macro, dan object yang tidak diperlukan tidak dieksekusi.
- File diproses dari quarantine privat.

**Dompdf**

- Gunakan view laporan tersendiri dengan CSS sederhana yang kompatibel CSS 2.1.
- Jangan memakai layout Bootstrap sebagai template cetak.
- Remote asset dinonaktifkan.
- Chroot dibatasi pada direktori aset laporan yang telah disiapkan.
- Logo dan font diambil dari snapshot/aset lokal, bukan URL eksternal.

**HTML Purifier**

- Terapkan whitelist tag dan atribut yang sempit.
- Cache purifier berada di writable.
- Sanitasi dilakukan saat input dan output tetap di-escape sesuai konteks.
- Jangan menganggap editor browser sebagai lapisan keamanan.

**mysqldump-php**

- Hanya digunakan setelah deteksi mariadb-dump dan mysqldump gagal.
- Lisensi GPL-3.0-or-later wajib dicatat dalam inventaris lisensi.
- Konsekuensi distribusi harus ditinjau kembali jika aplikasi didistribusikan kepada pihak lain.
- Hasil dump tetap harus diverifikasi dan diuji restore.

### 2.2 Fasilitas CI4 yang digunakan langsung

Tidak perlu memasang library tambahan untuk:

- Environment loader: gunakan .env native CI4.
- Validation dan localized error: gunakan CI4 Validation serta language file aplikasi.
- Database migration dan seeder: gunakan CI4 Migration.
- Session: gunakan database session handler CI4.
- CSRF dan security headers: gunakan Filters.
- Password: gunakan password_hash, password_verify, dan password_needs_rehash.
- Image resize/re-encode: gunakan CI4 Image Service dengan GD.
- Encryption: gunakan CI4 Encryption dengan SodiumHandler.
- CLI: gunakan Spark.
- Layout: gunakan view layout, section, include, dan Controlled View Cells.

vlucas/phpdotenv tidak dipasang karena CI4 sudah membaca .env secara native.

## 3. Paket yang Sengaja Tidak Digunakan

| Paket/pendekatan | Alasan |
| --- | --- |
| codeigniter4/shield | Kontrak autentikasi hanya dua role, tanpa registrasi warga, dan membutuhkan schema serta temporary-password flow khusus. |
| codeigniter4/settings | Pengaturan desa harus typed dan versioned, bukan generic key/value. |
| codeigniter4/tasks | Satu cron dapat langsung menjalankan queue worker; jadwal bisnis disimpan dan dihitung aplikasi. |
| vlucas/phpdotenv | Environment loader sudah tersedia di CI4. |
| jQuery | Bootstrap 5 dan DataTables 3 tidak memerlukannya. |
| SweetAlert2 | Dialog, alert, dan toast dapat menggunakan komponen Bootstrap yang distandardisasi UI/UX. |
| JWT | Aplikasi memakai session internal, bukan API publik atau SPA terpisah. |
| Library upload tambahan | Validation, UploadedFile, finfo, dan Image Service CI4 mencukupi. |
| Library email | Rilis awal tidak mempunyai reset password email atau notifikasi email. |
| HMVC pihak ketiga | Modular monolith dibangun memakai namespace PSR-4 dan route registrar internal. |

## 4. Paket Frontend

Seluruh asset production dibundle secara lokal. CDN tidak digunakan agar deployment reproducible, CSP lebih sederhana, dan aplikasi tidak bergantung pada koneksi pihak ketiga.

| Kebutuhan | Paket | Versi acuan | Lisensi | Penggunaan |
| --- | --- | --- | --- | --- |
| Layout/UI | bootstrap | 5.3.8 | MIT | Grid, form, modal, offcanvas, alert, toast, dan komponen responsif. |
| Ikon | bootstrap-icons | 1.13.1 | MIT | Ikon SVG lokal. |
| Font | @fontsource/inter | 5.3.0 | OFL-1.1 | Inter self-hosted. |
| Tabel | datatables.net-bs5 | 3.0.2 | MIT | Server-side table dengan integrasi Bootstrap 5. |
| Tabel responsif | datatables.net-responsive-bs5 | 4.0.2 | MIT | Tampilan tabel tablet/mobile. |
| Grafik | chart.js | 4.5.1 | MIT | Grafik dashboard dengan tabel alternatif. |
| Searchable select | tom-select | 2.6.2 | Apache-2.0 | Lazy search relasi dengan debounce dan maksimal 20 hasil. |
| Editor CMS | trix | 2.1.16 | MIT | Rich-text terbatas untuk berita, pengumuman, dan agenda. |
| Build | vite | 8.2.2 | MIT | Bundling, manifest, cache-busting, dan development server. |

Sumber:

- [Bootstrap](https://github.com/twbs/bootstrap)
- [DataTables 3](https://datatables.net/blog/2026/datatables-3)
- [Chart.js](https://github.com/chartjs/Chart.js)
- [Tom Select](https://github.com/orchidjs/tom-select/releases)
- [Trix](https://github.com/basecamp/trix/releases)
- [Vite](https://github.com/vitejs/vite)

### 4.1 Keputusan editor CMS

Trix 2.1.16 dipilih sebagai editor CMS. Quill 2.0.3 tidak dipakai karena versi tersebut terdampak advisory XSS pada fitur HTML export dan belum mempunyai patched version per 31 Agustus 2026. Lihat [GitHub Advisory GHSA-v3m3-f69x-jf25](https://github.com/advisories/GHSA-v3m3-f69x-jf25).

Ketentuan editor:

- Hanya untuk berita, pengumuman, dan agenda.
- Profil Desa menggunakan form terstruktur, bukan editor.
- Toolbar dibatasi pada paragraf, heading, bold, italic, daftar, kutipan, dan tautan.
- Attachment editor dinonaktifkan pada rilis awal.
- HTML keluaran tetap disanitasi dengan HTML Purifier di server.
- Konten yang dimuat kembali ke editor harus sudah disanitasi.

### 4.2 Ketentuan tabel dan chart

- DataTables selalu menggunakan server-side processing.
- Klik baris membuka detail; tombol Edit eksplisit.
- Jangan memakai export client-side DataTables untuk laporan resmi.
- Jangan memasang SearchPanes atau StateRestore pada rilis awal.
- Chart tidak menjadi satu-satunya penyampai informasi; data tabel alternatif wajib tersedia.
- Tom Select tidak memuat seluruh penduduk, menggunakan debounce, dan membatasi 20 hasil.

### 4.3 Build frontend

- Node hanya diperlukan pada development/CI.
- package.json menggunakan exact version untuk paket runtime.
- package-lock.json wajib masuk repository.
- CI menjalankan npm ci, lint, test, audit, dan build.
- Hasil build production disertakan dalam release agar Hostinger tidak memerlukan Node.
- Asset manifest digunakan oleh layout CI4.

Contoh pemasangan awal:

~~~bash
npm install --save-exact bootstrap@5.3.8
npm install --save-exact bootstrap-icons@1.13.1
npm install --save-exact @fontsource/inter@5.3.0
npm install --save-exact datatables.net-bs5@3.0.2
npm install --save-exact datatables.net-responsive-bs5@4.0.2
npm install --save-exact chart.js@4.5.1
npm install --save-exact tom-select@2.6.2
npm install --save-exact trix@2.1.16
npm install --save-dev --save-exact vite@8.2.2
~~~

## 5. Development dan Testing

### 5.1 Paket PHP development

| Kebutuhan | Paket | Constraint | Versi acuan |
| --- | --- | --- | --- |
| Unit/integration test | phpunit/phpunit | ^11.5 | 11.5.x |
| Fixture | fakerphp/faker | ^1.24 | 1.24.x |
| Static analysis | phpstan/phpstan | ^2.2 | 2.2.x |
| Coding standard | codeigniter/coding-standard | ^1.9 | 1.9.x |

CI4 4.7 mendukung PHPUnit 11.x. PHPUnit 12/13 tidak digunakan sampai kombinasi tersebut dinyatakan didukung oleh CI4 yang dipakai.

Jangan memasang codeigniter/phpstan-codeigniter pada tahap awal jika plugin tersebut membuat database SQLite untuk inference. Schema dan integration test aplikasi harus menggunakan MariaDB 11.4 agar invariant database tetap representatif.

### 5.2 Paket JavaScript development

| Kebutuhan | Paket | Constraint |
| --- | --- | --- |
| E2E browser | @playwright/test | 1.62.1 |
| Accessibility automation | @axe-core/playwright | 4.13.0 |
| JavaScript lint | eslint | 10.9.1 |

Versi hasil resolusi dikunci dalam package-lock.json. Update dilakukan melalui pull request terpisah setelah audit dan regression test.

### 5.3 Jenis pengujian

- Unit test aturan domain.
- Feature test route, filter, CSRF, role, validation, dan private download.
- Integration test pada MariaDB 11.4.
- Concurrency test untuk blind index, membership aktif, dan kepala aktif.
- Queue/job test untuk retry, idempotency, failure, dan progress projection.
- E2E Playwright untuk Admin, Kepala Desa, dan publik.
- Axe scan dan keyboard walkthrough.
- Visual screenshot desktop/mobile.
- Import atomicity dan backup-before-parse.
- Report as-of, snapshot, PDF, dan XLSX text identity.
- Backup serta restore rehearsal.

SQLite tidak digunakan sebagai pengganti MariaDB pada schema-invariant test.

## 6. Arsitektur CodeIgniter 4

### 6.1 Struktur

Gunakan struktur CI4 standar:

~~~text
app/
public/
tests/
writable/
spark
~~~

Modul aplikasi:

~~~text
app/Modules/{Module}/
  Config/
  Controllers/
  Database/
  DTOs/
  Entities/
  Repositories/
  Services/
  Validation/
  Views/
  Tests/
~~~

Shared foundation berada pada app/Core, app/Views, dan app/Cells.

### 6.2 Aturan layer

- Controller tipis dan hanya menangani HTTP.
- Service memegang transaksi dan aturan bisnis.
- Repository menangani query dan tidak melakukan commit sendiri.
- DTO memisahkan input HTTP dari model persistence.
- Validation rule domain dapat digunakan kembali oleh form dan import.
- Audit dipanggil melalui service yang sama dengan mutation.
- Tidak ada query bisnis langsung dari view.

### 6.3 Routing dan view

- Semua route memakai HTTP verb eksplisit.
- Route mempunyai nama unik.
- Legacy auto-routing dinonaktifkan.
- Route internal dikelompokkan di /panel dengan filter auth dan role.
- Setiap modul mempunyai route registrar, sedangkan registry global dimiliki foundation.
- Gunakan tiga layout: auth, public, internal.
- Partial stateless menggunakan include.
- Komponen berlogika memakai Controlled View Cells dengan property contract.
- Setiap view mengirim data-screen-id dari Screen Registry.

### 6.4 Authentication dan authorization

- Custom session authentication digunakan untuk dua role internal.
- Session memakai database handler.
- Gunakan password_hash, password_verify, dan password_needs_rehash.
- Implementasikan temporary-password state dan force change.
- Gunakan CI4 Throttler untuk percobaan login.
- Filter role hanya merupakan gerbang awal; Service tetap memeriksa authorization pada operation sensitif.

### 6.5 Data dan encryption

- MariaDB menggunakan InnoDB, strict mode, utf8mb4, dan DATETIME(6).
- Seluruh waktu disimpan dan ditafsirkan sebagai Asia/Jakarta tanpa UTC normalization.
- NIK/KK dienkripsi melalui SodiumHandler dengan nonce acak.
- Blind index menggunakan HMAC-SHA-256 dan kunci terpisah.
- Kunci berada pada environment server dan escrow, tidak dalam database atau Git.
- Constraint database dan locking melindungi invariant pada request paralel.

## 7. Perintah Pemasangan

Jalankan bootstrap CI4 di direktori sementara karena root saat ini berisi baseline dokumen sumber, component gallery, dan aset logo yang harus dipertahankan.

~~~bash
composer create-project codeigniter4/appstarter:4.7.4 ci4-bootstrap
cd ci4-bootstrap

composer config platform.php 8.3.0

composer require codeigniter4/queue:^1.0.1
composer require codeigniter4/translations:4.7.4
composer require phpoffice/phpspreadsheet:^5.9
composer require dompdf/dompdf:^3.1
composer require ezyang/htmlpurifier:^4.19
composer require ifsnop/mysqldump-php:^2.13

composer require --dev phpunit/phpunit:^11.5
composer require --dev fakerphp/faker:^1.24
composer require --dev phpstan/phpstan:^2.2
composer require --dev codeigniter/coding-standard:^1.9

composer validate --strict
composer check-platform-reqs
composer audit --locked
~~~

Root composer.json menetapkan:

~~~json
{
  "require": {
    "php": "~8.3.0"
  },
  "config": {
    "platform": {
      "php": "8.3.0"
    },
    "optimize-autoloader": true,
    "preferred-install": "dist",
    "sort-packages": true
  }
}
~~~

platform.php membatasi dependency resolution dan tidak mengganti executable PHP yang sedang berjalan. composer check-platform-reqs tetap wajib dijalankan pada development, CI, dan production.

composer.lock harus masuk repository. Production tidak menjalankan composer update.

## 8. Command Aplikasi

Command minimum:

| Command | Fungsi |
| --- | --- |
| php spark siak:user:create | Membuat pengguna internal pertama atau pengguna baru melalui CLI. |
| php spark siak:doctor | Memeriksa kesiapan environment dan deployment. |
| php spark queue:work siak -max-time 50 -tries 3 --stop-when-empty | Menjalankan queue worker satu siklus cron. |
| php spark backup:run | Membuat dan memverifikasi backup manual/terjadwal. |
| php spark backup:restore | Restore terkontrol melalui CLI/runbook, tidak tersedia melalui web. |
| php spark migrate | Menjalankan forward migration. |

Production tidak boleh menjalankan migrate:fresh.

## 9. Deployment Hostinger

### 9.1 Preflight

Sebelum mengaktifkan deployment:

- PHP web dan CLI/cron harus sama-sama memakai PHP 8.3.
- Seluruh extension wajib aktif.
- SELECT VERSION() harus membuktikan MariaDB 11.4.x.
- Asia/Jakarta aktif pada aplikasi dan koneksi database.
- OPcache aktif.
- writable dan private storage dapat ditulis.
- mariadb-dump/mysqldump atau fallback PHP berhasil membuat backup.
- Queue worker dapat dijalankan melalui cron dengan absolute PHP path.

Hostinger mendukung pemilihan versi PHP dan extension melalui hPanel:

- [Versi PHP Hostinger](https://www.hostinger.com/support/1575755-how-to-change-the-php-version-of-your-hostinger-hosting-plan/)
- [Extension PHP Hostinger](https://www.hostinger.com/support/4667515-how-to-manage-php-extensions-and-options-in-hostinger/)

### 9.2 Layout dua direktori

Source aplikasi harus privat:

~~~text
/home/account/domains/domain/sikdes-app/
  app/
  vendor/
  writable/
  .env
  spark

/home/account/domains/domain/public_html/
  index.php
  .htaccess
  assets/
  build/
~~~

Hanya isi public/ yang ditempatkan pada public_html. app, vendor, writable, .env, backup, laporan, impor, ekspor, dan dokumen tidak boleh berada di webroot.

Acuan: [deployment shared hosting CodeIgniter 4](https://codeigniter.com/user_guide/installation/deployment.html).

### 9.3 Git dan release

- Repository GitHub: https://github.com/aulaHamidin/sikdes-cms-kotabaru.git
- Branch develop untuk integrasi.
- Branch main hanya untuk release production.
- Hostinger hanya mengikuti main.
- composer.lock, package-lock.json, migration, dokumen, dan production build asset dilacak.
- .env, secret, vendor, node_modules, writable runtime, backup, import, export, dan dokumen privat tidak dilacak.
- Git Hostinger dihubungkan setelah main mempunyai release deployable.
- Auto-deploy baru diaktifkan setelah dua deployment rehearsal berhasil.

Hostinger dapat memilih repository, branch, dan target directory melalui integrasi Git: [panduan Git Hostinger](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/).

Jika hPanel Git tidak dapat menarik source ke lokasi privat dan menyinkronkan public/, gunakan SSH atau deployment manual dari tag main. Source atau .env tidak boleh dipindahkan ke public_html sebagai jalan pintas.

### 9.4 Urutan deployment

1. Pilih tag/commit main yang akan dirilis.
2. Jalankan composer install --no-dev --prefer-dist --optimize-autoloader.
3. Pasang environment dan persistent writable dari server.
4. Jalankan php spark siak:doctor.
5. Buat serta verifikasi backup.
6. Jalankan php spark migrate.
7. Sinkronkan isi public/ dan build asset ke public_html.
8. Jalankan smoke test.
9. Catat tag dan commit SHA deployment.

Rollback kode menggunakan tag sebelumnya. Rollback data menggunakan runbook dan backup terverifikasi; migration production tidak dibalik secara spekulatif.

## 10. Quality Gate

Perubahan tidak boleh masuk main sebelum:

~~~bash
composer validate --strict
composer check-platform-reqs
composer audit --locked
php vendor/bin/phpunit
php vendor/bin/phpstan analyse

npm ci
npm audit
npm run lint
npm run build
npx playwright test
~~~

Quality gate tambahan:

- Migration diuji dari database kosong pada MariaDB 11.4.
- Rollback migration diuji hanya pada database disposable.
- Tidak ada secret atau file runtime dalam Git.
- Route dan filter audit memastikan tidak ada legacy auto-route.
- Semua mutation mempunyai authorization dan CSRF.
- UI memakai komponen dan Screen ID dari UI/UX Specification.
- Import, report, backup, dan queue lulus failure-path test.
- Private storage tidak dapat diakses melalui URL.
- Dependency update dilakukan dalam pull request terpisah dan memuat hasil audit/regression test.

## 11. Catatan Keamanan dan Lisensi

- Jangan menggunakan --ignore-platform-reqs.
- Jangan menonaktifkan audit hanya agar build lulus.
- Jangan mengambil asset runtime dari CDN.
- Jangan memasukkan credential, encryption key, blind-index key, atau backup key ke Git.
- Jangan membuka remote asset Dompdf.
- Sanitasi server tetap wajib meskipun editor melakukan sanitasi client-side.
- Review lisensi dilakukan saat menambah atau memperbarui paket.
- mysqldump-php adalah satu-satunya dependency runtime yang direkomendasikan dengan lisensi GPL; penggunaannya dibatasi sebagai fallback dan harus ditinjau bila metode distribusi aplikasi berubah.

## 12. Kebijakan Pembaruan

- Exact installed version ditentukan oleh composer.lock dan package-lock.json.
- Patch security dapat dinaikkan melalui pull request dengan test lengkap.
- Minor/major update memerlukan pembacaan changelog dan compatibility rehearsal.
- Perubahan major framework, database, editor, queue, report, atau spreadsheet harus memperbarui dokumen ini.
- Paket yang tidak lagi dipelihara, mempunyai advisory tanpa mitigasi memadai, atau tidak kompatibel dengan Hostinger harus diganti sebelum production.
