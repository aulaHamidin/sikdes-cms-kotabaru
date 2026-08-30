# Product Requirements Document — SIKDES Kota Baru

| Metadata | Nilai |
| --- | --- |
| Produk | SIKDES Kota Baru |
| Versi dokumen | 1.0.0 |
| Tanggal | 31 Agustus 2026 |
| Status | **Sumber kebenaran aktif untuk kebutuhan produk** |
| Target rilis | Rilis awal |
| Platform | CodeIgniter 4.7.4, PHP 8.3, MariaDB 11.4, Hostinger |

Dokumen ini menjadi acuan utama pengembangan SIKDES Kota Baru. Jika terdapat perbedaan dengan PRD atau catatan kebutuhan yang dibuat sebelumnya, ketentuan dalam dokumen ini yang berlaku.

Urutan otoritas dokumen adalah:

1. PRD ini.
2. Rekomendasi teknologi pada **Rekomendasi-Library-CI4-PHP-8.3.md**.
3. UI/UX Specification.
4. Implementation Plan.
5. Source code dan test.

Library atau detail implementasi dapat diganti karena alasan kompatibilitas atau keamanan, tetapi tidak boleh mengubah aturan bisnis dalam PRD ini tanpa keputusan produk baru.

## 1. Ringkasan Produk

SIKDES Kota Baru adalah aplikasi kependudukan dan portal informasi untuk satu desa dengan skala sekitar 10.000 penduduk. Aplikasi digunakan secara daring melalui komputer maupun ponsel.

Aplikasi mencakup:

- Pengelolaan penduduk dan status kependudukan.
- Pengelolaan kartu keluarga dan riwayat keanggotaan.
- Impor data baru dari Excel.
- Statistik dan laporan terkini maupun historis.
- Berita, pengumuman, agenda, dan Profil Desa publik.
- Pengaturan identitas desa, logo, dan Kepala Desa.
- Audit, notifikasi, background job, dan pencadangan database.

### 1.1 Sasaran

- Menjadi sumber data kependudukan desa yang konsisten dan dapat diaudit.
- Mencegah NIK, nomor KK, keanggotaan aktif, dan kepala keluarga aktif ganda.
- Mempertahankan histori sehingga laporan kondisi periode lalu dapat direkonstruksi.
- Menyediakan informasi publik tanpa mengekspos data pribadi.
- Memungkinkan identitas desa, logo, Kepala Desa, dan Profil Desa diubah tanpa perubahan kode.
- Tetap dapat menjalankan pekerjaan panjang pada shared hosting tanpa bergantung pada browser pengguna.

### 1.2 Prinsip produk

- Satu desa dan satu instalasi.
- Hanya dua jenis akun internal.
- Tidak ada hard delete data kependudukan.
- Data publik dan data internal dipisahkan tegas.
- Koreksi, kejadian bisnis, dan waktu pencatatan dibedakan.
- Semua kewenangan ditegakkan di server, bukan hanya melalui tampilan.
- UI/UX Specification diselesaikan sebelum view modul dan menjadi kontrak tampilan.

## 2. Aktor dan Kewenangan

| Aktor | Kewenangan |
| --- | --- |
| **Admin Desa** | Mengelola penduduk, KK, impor, laporan, CMS, pengguna internal, audit, backup/job, dan Pengaturan Aplikasi. Dapat melihat serta mengunduh PII dan dokumen privat sesuai kebutuhan tugas. |
| **Kepala Desa** | Read-only terhadap dashboard, penduduk, KK, histori bisnis, audit yang relevan, PII, dokumen, dan laporan. Dapat meminta pembuatan serta mengunduh laporan, tetapi tidak dapat mengubah data sumber, template, CMS, pengguna, backup, atau Pengaturan Aplikasi. |
| **Warga/pengunjung** | Tanpa akun. Hanya melihat beranda, berita, pengumuman, agenda, Profil Desa, dan statistik publik yang ditetapkan. |

Ketentuan akses:

- Endpoint mutasi harus menolak Kepala Desa meskipun dipanggil langsung.
- Kepala Desa tidak melihat credential, session, atau metadata keamanan pengguna lain.
- Pengunjung tidak dapat mengakses NIK, nomor KK, rincian penduduk/keluarga, histori pribadi, dokumen, atau laporan internal.
- Menu yang tidak berhak digunakan tidak ditampilkan, tetapi penyembunyian menu bukan pengganti otorisasi server.

## 3. Ruang Lingkup

### 3.1 Termasuk dalam rilis awal

- Autentikasi dan pengguna internal.
- Dashboard internal dan portal publik.
- Penduduk dan lifecycle pindah/meninggal/restore.
- Kartu keluarga, keanggotaan, kepala keluarga, dan pindah/pecah KK.
- Impor Excel untuk data baru.
- Laporan PDF dan XLSX.
- CMS berita, pengumuman, dan agenda.
- Pengaturan identitas desa, branding, Kepala Desa, dan Profil Desa.
- Audit, notifikasi, job queue, backup, dan file privat.

### 3.2 Tidak termasuk

- Akun, registrasi, login, atau halaman pribadi warga.
- Pemulihan password melalui email, MFA, social login, atau JWT publik.
- Layanan surat, QR verifikasi, dan tanda tangan digital.
- Akun RT/RW, pengelolaan banyak desa, atau persetujuan bertingkat.
- Modul mutasi terpisah atau klasifikasi kelahiran/pendatang saat menambah penduduk.
- Penghapusan permanen penduduk, KK, histori, atau audit.
- Transparansi anggaran, komentar warga, dan penggunaan offline.
- Restore database melalui antarmuka web.
- Statistik historis kompleks pada beranda publik.

## 4. Konsep Data dan Waktu

### 4.1 Waktu

- Timezone aplikasi, PHP, database, job, laporan, dan cron adalah **Asia/Jakarta**.
- Timestamp aplikasi disimpan sebagai waktu WIB menggunakan DATETIME(6), tanpa normalisasi UTC.
- Tanggal efektif kejadian bisnis dibedakan dari waktu admin mencatat kejadian.
- Koreksi atribut berlaku ketika koreksi disimpan.
- Pindah, meninggal, kembali menetap, dan perpindahan membership berlaku menurut tanggal efektif.

### 4.2 Histori

- Data yang dapat berubah mempunyai versi atau event yang dapat ditelusuri.
- Versi lama tidak ditimpa sehingga kondisi as-of dapat direkonstruksi.
- Audit menyimpan waktu sistem, pelaku, aksi, target, serta before/after yang relevan.
- Event bisnis yang salah input dapat di-void untuk perhitungan bisnis, tetapi record dan auditnya tidak dihapus.

### 4.3 Perlindungan identitas

- NIK dan nomor KK harus tepat 16 digit dan selalu diperlakukan sebagai teks.
- NIK dan nomor KK disimpan terenkripsi dengan nonce acak.
- Exact lookup dan uniqueness menggunakan keyed HMAC blind index dengan kunci terpisah.
- NIK dan nomor KK ditampilkan utuh kepada Admin dan Kepala Desa setelah autentikasi.
- NIK, nomor KK, dan PII lain tidak pernah ditampilkan kepada publik.

## 5. Autentikasi dan Pengguna Internal

### 5.1 Jenis akun

Hanya tersedia:

- ADMIN_DESA.
- KEPALA_DESA.

### 5.2 Identitas login

- Username wajib.
- Email opsional.
- Username dan email dinormalisasi sebelum dibandingkan.
- Username dan email harus unik lintas namespace login; nilai email sebuah akun tidak boleh sama dengan username akun lain, dan sebaliknya.
- Login menerima username atau email beserta password.
- Tidak ada akun demo atau credential default dalam repository.

### 5.3 Password dan session

- Password disimpan menggunakan API password_hash dan diverifikasi dengan password_verify.
- Admin atau CLI dapat membuat akun dan mereset password menjadi temporary password.
- Temporary password wajib diganti pada login berikutnya.
- Session disimpan di database dan diregenerasi setelah login atau perubahan privilege.
- Login diberi throttling untuk membatasi percobaan berulang.
- Keberhasilan login, kegagalan penting, logout, pembuatan akun, reset password, dan perubahan role diaudit.
- Admin pertama dibuat melalui perintah CLI siak:user:create.

## 6. Dashboard dan Statistik

### 6.1 Dashboard internal

Admin dan Kepala Desa dapat melihat:

- Penduduk aktif.
- KK aktif.
- Laki-laki aktif.
- Perempuan aktif.
- Rincian usia, pendidikan, pekerjaan, agama, dan RT/RW.
- Penambahan data, pindah, meninggal, dan restore bulan berjalan sebagai metrik terpisah.
- Status job dan notifikasi yang relevan.
- Kartu Kepala Desa aktif beserta foto atau fallback silhouette.

Ketentuan:

- Tidak ada metrik kelahiran atau pendatang karena sumber penambahan tidak dibedakan.
- Data yang ditambahkan melalui form atau impor bukan otomatis pertumbuhan penduduk.
- Restore tidak dihitung sebagai penduduk baru.
- Event salah input yang sudah di-void tidak masuk rekap bisnis.

### 6.2 Statistik publik

Statistik publik dibatasi tepat pada:

- Penduduk aktif.
- KK aktif.
- Laki-laki aktif.
- Perempuan aktif.

Tidak tersedia drill-down atau endpoint publik menuju data penduduk.

## 7. Penduduk

### 7.1 Data penduduk

Data wajib:

- NIK.
- Nama lengkap.
- Jenis kelamin.
- Tempat lahir.
- Tanggal lahir.
- Alamat.
- RT.
- RW.
- Agama.
- Status perkawinan.
- Kewarganegaraan.

Data opsional:

- Nama ayah.
- Nama ibu.
- Hubungan dalam keluarga.
- Pendidikan.
- Pekerjaan.
- Pendapatan.
- Golongan darah.
- Email.
- Nomor HP.

Email dan nomor HP penduduk tidak harus unik.

### 7.2 Tambah, daftar, dan koreksi

- Data awal, bayi baru lahir, pendatang, dan penduduk belum tercatat menggunakan satu flow **Tambah Penduduk**.
- NIK harus unik terhadap seluruh penduduk aktif maupun nonaktif.
- Jika NIK sudah ada pada penduduk nonaktif, Admin harus menggunakan flow Restore.
- Penduduk baru disimpan sebagai aktif.
- Penduduk aktif boleh belum mempunyai membership KK.
- Daftar default hanya menampilkan penduduk aktif.
- Filter menyediakan status pindah, meninggal, dan **Belum Masuk KK**.
- Pencarian internal mendukung NIK lengkap, nomor KK lengkap, nama, RT/RW, dan status.
- Klik baris membuka detail; Edit merupakan aksi eksplisit.
- Koreksi normal berlaku saat disimpan dan tidak mewajibkan alasan.
- Setiap koreksi membuat versi baru dan audit before/after.
- Tidak tersedia hard delete.

### 7.3 Nonaktif karena pindah atau meninggal

Admin memilih penduduk aktif, memilih Pindah atau Meninggal, lalu mengisi:

- Tanggal efektif.
- Alasan atau keterangan.
- Dokumen pendukung opsional.

Dokumen pendukung menerima PDF, JPEG, atau PNG maksimal 5 MiB, diperiksa berdasarkan signature isi, dan disimpan privat.

Hasil transaksi:

- Status penduduk berubah sesuai kejadian.
- Penduduk tidak lagi dihitung aktif.
- Membership KK aktif berakhir pada transaksi yang sama.
- Histori membership tetap tersedia.
- Jika penduduk merupakan kepala keluarga, operasi tetap berlangsung.
- Jika KK asal masih mempunyai anggota, KK tetap aktif tanpa kepala dan notifikasi KK_WITHOUT_HEAD dibuat.
- Jika tidak ada anggota tersisa, KK otomatis menjadi nonaktif.

### 7.4 Restore penduduk

| Status sebelumnya | Alasan yang diizinkan |
| --- | --- |
| Pindah | SALAH_INPUT atau KEMBALI_MENETAP |
| Meninggal | SALAH_INPUT |

Aturan:

- Alasan dan keterangan wajib.
- KEMBALI_MENETAP juga mewajibkan tanggal kembali.
- Hasil restore adalah penduduk aktif tanpa membership KK aktif.
- Tidak ada pilihan KK pada flow restore.
- Membership dan kedudukan kepala keluarga lama tidak dipulihkan.
- SALAH_INPUT me-void event bisnis yang salah untuk rekap, tetapi mempertahankan audit.
- KEMBALI_MENETAP mempertahankan kejadian pindah lama sebagai histori sah.
- Restore tidak dihitung sebagai penambahan penduduk baru.

## 8. Kartu Keluarga dan Membership

### 8.1 Data dan daftar KK

- Nomor KK harus tepat 16 digit dan unik termasuk terhadap KK nonaktif.
- Data minimal KK adalah nomor KK, alamat, RT, dan RW.
- Tanggal terbit bersifat opsional.
- Daftar default hanya menampilkan KK aktif; tersedia filter nonaktif.
- Penduduk aktif dapat sementara tidak terikat pada KK.
- Total KK menghitung seluruh KK aktif, termasuk KK aktif tanpa anggota.

### 8.2 Invariant

- Satu penduduk maksimal mempunyai satu membership aktif.
- Satu KK maksimal mempunyai satu kepala keluarga aktif.
- Invariant dijaga oleh constraint database dan locking, bukan hanya validasi UI.
- Request paralel tidak boleh menghasilkan membership atau kepala aktif ganda.

### 8.3 Tambah anggota

- Kandidat hanya penduduk aktif tanpa membership KK aktif.
- Admin menentukan hubungan keluarga dan apakah penduduk menjadi kepala keluarga.
- Penduduk yang sudah mempunyai membership tidak dapat dipilih.
- Penduduk yang sudah terikat KK harus menggunakan flow Pindah/Pecah KK.

### 8.4 Pindah atau pecah KK

- Admin memilih satu atau lebih anggota dari KK asal.
- Tujuan dapat berupa KK aktif yang sudah ada atau KK baru.
- Membership asal diakhiri dan membership tujuan dibuat dalam satu transaksi.
- Riwayat KK asal tidak dihapus.
- Alamat penduduk tidak wajib sama dengan alamat KK.
- Kepala keluarga boleh dipindahkan tanpa memblokir transaksi.
- Jika anggota masih tersisa, KK asal menjadi headless dan menghasilkan notifikasi KK_WITHOUT_HEAD.
- Jika anggota terakhir keluar, KK asal otomatis nonaktif.

### 8.5 Nonaktif dan restore KK

- KK yang masih mempunyai anggota aktif tidak dapat dinonaktifkan.
- KK kosong dapat dinonaktifkan dengan alasan dan audit.
- Restore KK hanya tersedia untuk SALAH_INPUT.
- Restore mewajibkan alasan dan keterangan.
- Restore tidak mengembalikan membership lama.
- KK hasil restore menjadi aktif tetapi boleh kosong.
- KK aktif kosong menghasilkan notifikasi ACTIVE_EMPTY_KK.

## 9. Impor Excel

### 9.1 Batas impor

- Impor hanya membuat penduduk baru.
- Impor tidak mengoreksi atau me-restore penduduk.
- Format yang diterima hanya XLSX.
- File maksimal 10 MiB dan maksimal 10.000 baris penduduk per batch.
- File ditempatkan sementara dalam quarantine privat.

### 9.2 Template

Template resmi mempunyai tepat dua sheet:

- PENDUDUK_BARU.
- KK_BARU.

Setiap baris penduduk memakai salah satu mode:

| Mode | Arti |
| --- | --- |
| EXISTING | Menghubungkan penduduk baru ke KK aktif yang sudah ada tanpa mengubah data KK. |
| NEW | Menghubungkan penduduk baru ke KK yang dibuat melalui sheet KK_BARU. |
| NONE | Menyimpan penduduk baru tanpa membership KK. |

Aturan KK baru:

- Nomor KK, alamat, RT, dan RW wajib.
- Tanggal terbit opsional.
- Minimal satu penduduk baru harus mereferensikan setiap KK baru.
- Nomor KK yang sudah ada, baik aktif maupun nonaktif, tidak boleh digunakan sebagai KK baru.
- KK nonaktif tidak boleh digunakan pada mode EXISTING.

### 9.3 Urutan proses dan atomicity

1. File diterima ke quarantine privat.
2. Job membuat backup database khusus impor.
3. Backup harus diverifikasi sebelum file dibaca atau diparsing.
4. Jika backup gagal, parsing, validasi domain, dan penulisan data tidak dijalankan.
5. Seluruh sheet dan baris divalidasi.
6. Satu error membatalkan seluruh batch.
7. Setelah validasi, semua invariant diperiksa ulang di dalam satu transaksi.
8. Commit hanya dilakukan jika seluruh data tetap valid.

Pesan error harus berbahasa Indonesia dan menyebut:

- Nama sheet.
- Baris.
- Kolom.
- Nama atau NIK terkait bila tersedia.
- Penyebab.
- Cara memperbaiki.

Browser boleh ditutup selama proses; status dan hasil tersimpan sebagai job. File quarantine berhasil dihapus setelah job selesai. File gagal dipertahankan maksimal tujuh hari untuk diagnosis Admin, kemudian dihapus otomatis.

## 10. Laporan

### 10.1 Jenis laporan awal

- Penduduk.
- Kartu keluarga.
- Perubahan kependudukan.

### 10.2 Periode dan histori

- Laporan mendukung kondisi terkini dan kondisi as-of.
- Versi atribut dipilih berdasarkan waktu koreksi disimpan.
- Kejadian bisnis dipilih berdasarkan tanggal efektif dan status void.
- Pemulihan tidak dihitung sebagai penduduk baru.
- Periode lalu tidak boleh dihitung hanya dari kondisi data hari ini.

### 10.3 Template dan snapshot

Template laporan berversi mengatur:

- Kop dan logo.
- Kolom dan urutannya.
- Orientasi.
- Periode.
- Penandatangan.

Saat laporan dimasukkan ke queue, sistem menyimpan snapshot:

- Identitas desa.
- Logo.
- Kepala Desa.
- Template.
- Filter dan parameter.

Perubahan konfigurasi setelah enqueue tidak boleh mengubah hasil laporan lama.

### 10.4 Output

- Format PDF dan XLSX.
- PDF menggunakan view cetak tersendiri.
- NIK dan nomor KK ditulis sebagai teks eksplisit pada XLSX.
- File hasil disimpan privat.
- Hanya pengguna berhak yang dapat mengunduh.
- Setiap download diaudit.
- Retensi file hasil adalah 30 hari.
- Laporan resmi diblokir jika nama desa, kecamatan, kabupaten, provinsi, alamat kantor, atau Kepala Desa aktif belum tersedia.

## 11. CMS dan Portal Publik

### 11.1 Konten

Jenis konten:

- Berita.
- Pengumuman.
- Agenda.

Status konten:

- draft.
- published.
- withdrawn.

Ketentuan:

- Draft dan withdrawn tidak tampil publik.
- Konten hanya dapat dikelola Admin.
- Tidak tersedia komentar warga.
- Editor hanya menyediakan format terbatas.
- HTML selalu disanitasi kembali di server sebelum disimpan atau ditampilkan.
- Attachment editor dinonaktifkan pada rilis awal.
- Profil Desa bukan artikel CMS dan tidak diedit melalui rich-text editor bebas.

### 11.2 Portal publik

- Mobile-first dan dapat digunakan tanpa akun.
- Menampilkan logo serta identitas desa aktif.
- Menampilkan konten published dan empat statistik publik.
- Tidak mengekspos route, file, atau data internal.
- Foto Kepala Desa tidak ditampilkan pada beranda, tetapi dapat tampil pada bagian Kepala Desa di halaman Profil Desa.

## 12. Pengaturan Aplikasi dan Profil Desa

Hanya Admin dapat melihat menu dan melakukan perubahan Pengaturan Aplikasi. Kepala Desa dapat melihat hasil aktif pada dashboard, laporan, dan portal sesuai konteks, tetapi tidak mempunyai akses mutasi.

### 12.1 Identitas desa

Field:

- Nama desa.
- Kode desa.
- Kecamatan.
- Kabupaten.
- Provinsi.
- Alamat kantor.
- RT.
- RW.
- Kode pos.
- Telepon.
- Email.
- Website.
- Jam pelayanan.
- Timezone WIB yang bersifat read-only.

Untuk laporan resmi, nama desa, kecamatan, kabupaten, provinsi, dan alamat kantor wajib lengkap.

### 12.2 Branding dan logo

- Logo awal berasal dari assets/images/logo-desa.png.
- File tersebut menjadi seed dan fallback, serta tidak ditimpa oleh upload.
- Logo baru menerima PNG atau JPEG maksimal 2 MiB.
- Dimensi minimal 256 px dan maksimal 4096 px.
- Server harus mendekode lalu merekode menjadi PNG maksimal 1024 px.
- Transparansi dipertahankan bila tersedia.
- SVG dan GIF ditolak.
- Master disimpan berversi.
- Penggantian logo mengubah identitas aplikasi, portal, dan laporan setelah aktivasi.
- Penggantian logo tidak mengubah token warna tema.

### 12.3 Kepala Desa

Field:

- Nama, wajib.
- NIP, opsional.
- Jabatan, default Kepala Desa.
- Awal masa jabatan, wajib.
- Akhir masa jabatan, opsional.
- Foto, opsional.
- Sambutan, opsional, maksimal 1.000 karakter.

Aturan:

- Hanya satu versi Kepala Desa aktif.
- Mengaktifkan versi baru mengarsipkan versi aktif sebelumnya dalam transaksi yang sama.
- Foto menerima PNG atau JPEG maksimal 5 MiB.
- Dimensi minimal 400 px dan maksimal 6000 px.
- Foto direkode menjadi JPEG maksimal 1200×1600.
- Metadata EXIF dihapus.
- Derivative 480×600 dan 160×200 dibuat.
- Jika foto tidak tersedia, gunakan fallback silhouette.

### 12.4 Profil Desa terstruktur

Bagian:

- Ringkasan.
- Sejarah.
- Visi.
- Misi.
- Geografi.
- Potensi.

Aturan:

- Status profil adalah draft, published, atau archived.
- Ringkasan wajib sebelum publish.
- Bagian lain opsional dan bagian kosong disembunyikan.
- Kontak diturunkan dari identitas desa aktif.
- Sambutan dan foto diturunkan dari Kepala Desa aktif.
- Profil aktif dapat dipreview sebelum publish.

### 12.5 Versioning dan media

- Identitas, Kepala Desa, Profil Desa, dan branding menggunakan skema typed/versioned, bukan generic key-value.
- Master logo dan foto berukuran kecil disimpan sebagai BLOB database agar tercakup backup database.
- Derivative disimpan sebagai cache filesystem yang dapat dibangun ulang.
- Seed idempotent hanya mengisi fakta yang diketahui: Desa Kota Baru, Kabupaten Ogan Komering Ulu Timur, dan logo bawaan.
- Kecamatan, provinsi, alamat, kode desa, dan identitas Kepala Desa tidak boleh ditebak.

### 12.6 Screen Pengaturan

- SET-IDENTITY.
- SET-BRAND.
- SET-HEAD.
- SET-PROFILE.
- SET-HISTORY.
- SET-PREVIEW.

## 13. Audit, Notifikasi, Job, dan Backup

### 13.1 Audit

Audit bersifat append-only dan mencakup:

- Login dan logout.
- Perubahan pengguna internal.
- Tambah/koreksi/nonaktif/restore penduduk.
- Pembuatan, perubahan, membership, perpindahan, nonaktif, dan restore KK.
- Impor dan hasil validasi.
- Pembuatan serta download laporan.
- CMS dan Pengaturan Aplikasi.
- Backup dan job.

Audit menyimpan pelaku, role, waktu, aksi, target, before/after yang relevan, tanggal efektif bila ada, alasan, dan metadata request yang aman. Password, secret, dan isi kunci tidak boleh dicatat.

### 13.2 Notifikasi minimum

- KK_WITHOUT_HEAD.
- ACTIVE_EMPTY_KK.
- Job gagal.
- Konfigurasi laporan belum lengkap.

### 13.3 Background job

- Queue disimpan di database.
- Status aplikasi adalah queued, running, succeeded, atau failed.
- Record menyimpan tipe, initiator, progress, attempt, hasil, error aman, serta timestamp.
- Worker dijalankan oleh satu cron setiap menit.
- Job tidak bergantung pada browser atau session yang masih aktif.
- Gunakan lock/lease, idempotency, dan maksimal tiga retry untuk error transient.
- Retry tidak boleh menggandakan perubahan atau file hasil.

### 13.4 Backup

- Backup aplikasi pada rilis awal mencakup database.
- Metode utama adalah mariadb-dump atau mysqldump.
- Fallback PHP digunakan jika binary tidak tersedia.
- Backup terjadwal jatuh tempo setiap Minggu pukul 00.00 WIB.
- Simpan empat backup terjadwal berhasil terbaru.
- Backup pre-import disimpan 30 hari.
- Backup manual disimpan 90 hari.
- Admin dapat membuat, memeriksa hasil verifikasi, dan mengunduh backup.
- Backup manual wajib sebelum pemeliharaan atau deployment yang memerlukan migration.
- Restore hanya melalui CLI dan runbook.
- Dokumen serta media filesystem dilindungi oleh fasilitas backup file Hostinger yang terpisah.

## 14. UI/UX Requirements

- UI/UX Specification dibuat setelah PRD ini dan sebelum view modul.
- Internal panel desktop-first dan responsif.
- Portal publik mobile-first.
- Font Inter disediakan lokal.
- Tidak menggunakan gradient.
- Warna tema statis berasal dari logo awal:
  - primary #0504FF;
  - accent #FFF000;
  - success #339967;
  - danger #FE0000.
- Upload logo baru tidak mengubah warna tema.
- Target sentuh minimum 44×44 px.
- Memenuhi WCAG 2.2 AA.
- Navigasi keyboard, focus indicator, label form, error summary, dan semantic landmark wajib.
- Semua chart mempunyai tabel data alternatif.
- Daftar besar menggunakan server-side pagination, filter, dan search.
- Data sekitar 10.000 penduduk tidak dimuat seluruhnya ke browser.
- Klik baris tabel membuka detail; Edit tetap merupakan aksi eksplisit.
- Pencarian relasi bersifat lazy, memakai debounce, dan maksimal 20 hasil per permintaan.
- Semua halaman mempunyai Screen ID dan atribut data-screen-id.
- Loading, empty, filtered-empty, validation error, system error, forbidden, processing, dan success state wajib didefinisikan.
- Shared component dan component gallery diselesaikan sebelum view modul.

Urutan implementasi setiap modul:

1. Schema dan kontrak domain.
2. Service/repository dan test backend.
3. Controller, route, authorization, dan kontrak data.
4. Membaca kembali Screen ID terkait pada UI/UX Specification.
5. Membuat view menggunakan komponen global.
6. Menjalankan integration, E2E, responsive, dan accessibility test.

## 15. Persyaratan Teknis dan Deployment

- Framework adalah CodeIgniter 4.7.4 pada PHP 8.3.
- Database adalah MariaDB 11.4, InnoDB, strict mode, dan utf8mb4.
- Aplikasi dibangun sebagai modular monolith.
- Controller menangani HTTP, Service memiliki transaksi dan aturan bisnis, Repository tidak melakukan commit sendiri.
- Route memakai HTTP verb eksplisit dan nama unik.
- Legacy auto-routing dinonaktifkan.
- Filter CI4 menangani auth, role, CSRF, dan security headers.
- Environment loader, validation, migration, session, CLI/Spark, layout, dan image service menggunakan fasilitas native CI4.
- Dokumen, laporan, file impor, backup, environment, vendor, dan writable berada di luar public webroot.
- Hostinger memakai layout dua direktori: aplikasi privat dan hanya isi public/ di public_html.
- Build frontend dibuat pada development/CI dan tersedia dalam artefak release; Hostinger tidak membutuhkan Node.
- Deployment menggunakan composer install berdasarkan composer.lock, bukan composer update.
- Migration production selalu forward-only dan tidak boleh menggunakan migrate:fresh.
- Repository production mengikuti branch main; integrasi development berada pada develop.
- Koneksi Hostinger ke GitHub dilakukan setelah branch main berisi release yang deployable.

Acuan teknis rinci berada pada **Rekomendasi-Library-CI4-PHP-8.3.md**.

## 16. Persyaratan Nonfungsional

### 16.1 Integritas dan kapasitas

- Mendukung minimal 10.000 penduduk.
- Invariant tetap benar pada request paralel.
- Operasi panjang diproses asynchronous.
- Pencarian dan pagination dilakukan server-side.

### 16.2 Keamanan

- Otorisasi server pada seluruh route dan file privat.
- CSRF, output escaping, sanitasi rich text, upload re-encoding, session hardening, dan login throttling.
- Secret dan kunci tidak masuk repository.
- Error production tidak menampilkan stack trace atau secret.
- Log menggunakan correlation/job ID dan tidak menyimpan password atau PII secara berlebihan.

### 16.3 Kompatibilitas dan aksesibilitas

- Mendukung versi stabil terbaru dan satu versi sebelumnya dari Chrome, Edge, Firefox, dan Safari.
- Tampilan internal dan publik dapat digunakan pada desktop, tablet, dan ponsel.
- WCAG 2.2 AA.
- Pesan pengguna menggunakan bahasa Indonesia.

### 16.4 Pemulihan

- Backup harus diverifikasi, bukan hanya dinilai dari keberadaan file.
- Restore rehearsal didokumentasikan.
- Kunci enkripsi dan blind-index disimpan di escrow terpisah agar pemulihan database tetap memungkinkan.

## 17. Acceptance Criteria

Rilis awal diterima bila seluruh kondisi berikut terpenuhi:

- Admin dapat menjalankan seluruh flow yang diizinkan.
- Kepala Desa mendapat 403 pada mutation walaupun memanggil endpoint langsung.
- Publik tidak dapat mengakses PII atau file privat.
- Username/email lintas namespace dan NIK/KK duplikat ditolak.
- NIK/KK milik record nonaktif tetap tidak dapat dipakai ulang.
- Dua request paralel tidak dapat membuat membership atau kepala aktif ganda.
- Koreksi membuat versi dan audit tanpa mengubah histori sebelumnya.
- Nonaktif dan restore menghasilkan status, membership, rekap, serta audit sesuai aturan.
- Kepala keluarga keluar tidak membatalkan operasi; KK headless tetap aktif dan menghasilkan notifikasi.
- Anggota terakhir keluar membuat KK nonaktif.
- Restore KK menghasilkan KK aktif kosong tanpa membership dan menghasilkan notifikasi.
- Impor dengan backup gagal tidak membaca file atau menulis data domain.
- Satu error Excel menghasilkan nol perubahan database dan seluruh error ditampilkan.
- Laporan as-of menggunakan histori yang benar.
- Laporan lama tidak berubah setelah logo, identitas, Kepala Desa, atau template diubah.
- XLSX mempertahankan 16 digit NIK dan nomor KK.
- Logo/foto invalid ditolak; file valid direkode dan derivative dibuat.
- Penggantian logo tidak mengubah token warna.
- Profil draft tidak tampil publik; profil published hanya menampilkan bagian terisi.
- Job tetap berjalan setelah browser ditutup dan retry tidak menggandakan hasil.
- Retensi laporan dan backup berjalan sesuai kebijakan.
- Aplikasi, migration, test, worker, cron, serta pemisahan private/public lulus pada staging Hostinger.

## 18. Data Awal

Seeder production harus idempotent dan tidak memuat data demo atau password default.

Fakta yang boleh diisi otomatis:

- Nama: Desa Kota Baru.
- Kabupaten: Ogan Komering Ulu Timur.
- Logo: assets/images/logo-desa.png.

Data berikut harus dibiarkan kosong sampai Admin mengisinya:

- Kecamatan.
- Provinsi.
- Alamat kantor.
- Kode desa.
- Identitas Kepala Desa.
- Kontak dan jam pelayanan.
