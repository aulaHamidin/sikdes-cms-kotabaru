# Implementation Plan — SIKDES Kota Baru

| Metadata | Nilai |
| --- | --- |
| Versi | 1.0.0 |
| Tanggal | 31 Agustus 2026 |
| Status | Aktif untuk implementasi |
| Branch integrasi | `develop` |
| Branch release | `main` |
| Kontrak produk | `PRD-SIKDES-Kota-Baru-CI4.md` |
| Kontrak UI | `UI_UX_SPEC.md` v1.1.1 |
| Kontrak teknologi | `Rekomendasi-Library-CI4-PHP-8.3.md` |

Dokumen ini mengatur urutan implementasi, ownership schema/service, dependency, vertical slice, dan traceability pengujian. Aturan bisnis tidak diduplikasi; nomor bagian PRD dan Screen ID UI/UX menjadi referensi kanonis.

## 1. Kondisi awal dan keputusan yang berlaku

- Baseline awal hanya berisi dokumen perencanaan dan logo. Tidak ada runtime CI3 atau database proyek yang perlu dimigrasikan.
- Bootstrap memakai CodeIgniter AppStarter 4.7.4 pada PHP 8.3.
- MariaDB 11.4, InnoDB, strict mode, `utf8mb4`, dan `DATETIME(6)` adalah kontrak; schema-invariant test tidak memakai SQLite.
- Seluruh waktu aplikasi ditafsirkan sebagai `Asia/Jakarta` dan disimpan sebagai waktu WIB tanpa normalisasi UTC.
- Editor CMS adalah Trix 2.1.16; Quill tidak dipakai.
- Queue memakai `codeigniter4/queue`, nama queue `siak`, dan worker `php spark queue:work siak -max-time 50 -tries 3 --stop-when-empty`.
- Authentication berbasis session custom dengan role `ADMIN_DESA` dan `KEPALA_DESA`; tidak ada akun warga.
- NIK dan nomor KK terenkripsi dengan nonce acak. Exact lookup dan uniqueness memakai HMAC-SHA-256 blind index dengan kunci terpisah.
- Tidak ada hard delete untuk penduduk, KK, histori, audit, template/snapshot laporan, atau data penting lain.
- Component gallery statis Tahap 1 berada di `design/component-gallery/`. Pada Tahap 2, komponen dipindahkan ke layout/partial/Controlled View Cells aktual.

## 2. Target arsitektur

```text
app/
  Core/
  Cells/
  Views/
    layouts/
    components/
    errors/
  Modules/
    Authentication/
    Settings/
    Residents/
    FamilyCards/
    Cms/
    Operations/
    Imports/
    Reports/
    Dashboard/
    PublicPortal/
tests/
public/
writable/
storage/
  private/
```

Setiap modul mengikuti struktur yang diperlukan:

```text
app/Modules/{Module}/
  Config/
  Controllers/
  Database/Migrations/
  DTOs/
  Entities/
  Repositories/
  Services/
  Validation/
  Views/
  Tests/
```

Aturan dependency:

1. Controller bergantung pada Service dan DTO, bukan pada query builder bisnis.
2. Service memiliki transaksi, authorization operation sensitif, invariant, audit, dan idempotency.
3. Repository menangani persistence/query dan tidak melakukan commit sendiri.
4. Modul boleh bergantung pada kontrak `Core`; dependency lintas domain hanya melalui service/interface yang ditetapkan.
5. View tidak melakukan query bisnis.
6. Route registrar modul didaftarkan melalui registry global dan memakai HTTP verb eksplisit, nama unik, auth/role filter, serta legacy auto-routing off.

## 3. Ownership modul

| Modul | Tanggung jawab | Dependency langsung | Screen ID |
| --- | --- | --- | --- |
| `Core` | Config, timezone, DB contract, error/logging, security headers, CSRF, policy, encryption/blind index, private file, audit contract, route registry, design system | Framework | Seluruh screen melalui layout/komponen |
| `Authentication` | Login, logout, temporary password, session, throttling, pengguna internal | Core, Operations audit | `AUTH-*`, `USR-*` |
| `Settings` | Identitas desa, branding, Kepala Desa, Profil Desa, versioning/media | Core, Operations audit | `SET-*` |
| `Residents` | Penduduk, versi atribut, lifecycle, restore, dokumen privat | Core, Operations audit/notification | `RES-*` |
| `FamilyCards` | KK, versi alamat, membership temporal, pindah/pecah, restore, invariant kepala | Core, Residents, Operations | `KK-*` |
| `Cms` | Berita, pengumuman, agenda, sanitasi, publish/withdraw | Core, Operations audit | `CMS-*`, data ke `PUB-*` |
| `Operations` | Audit append-only, notifikasi, queue projection, job attempt, backup, private storage | Core | `AUD-*`, `BAK-*`, `JOB-*` |
| `Imports` | Template XLSX, quarantine, backup-before-parse, validasi seluruh batch, atomic commit | Residents, FamilyCards, Operations | `IMP-*` |
| `Reports` | Template/snapshot, query as-of, PDF/XLSX, file privat/retensi | Residents, FamilyCards, Settings, Operations | `RPT-*` |
| `Dashboard` | Agregasi internal, perubahan bulan berjalan, tabel alternatif | Residents, FamilyCards, Settings, Operations | `INT-DASHBOARD` |
| `PublicPortal` | Empat statistik publik, konten published, Profil Desa published | Dashboard projection, Cms, Settings | `PUB-*` |

`Operations` menyediakan interface audit, job, notification, backup, dan private-file metadata. Domain tidak boleh menulis langsung ke tabel operasional tanpa service contract.

## 4. Rencana schema dan invariant

Nama tabel berikut adalah kontrak perencanaan awal. Perubahan nama sebelum migration pertama diperbolehkan bila traceability tetap dipertahankan; setelah migration masuk `develop`, perubahan mengikuti forward migration.

| Ownership | Tabel utama | Invariant/kebijakan |
| --- | --- | --- |
| Authentication | `users`, `user_login_identifiers`, `login_attempts`, `ci_sessions` | Username/email lintas namespace unik; password hash; role hanya dua nilai; temporary-password state |
| Settings | `village_configuration`, `village_identity_versions`, `village_leaders`, `village_profile_versions`, `branding_media` | Satu konfigurasi desa; satu Kepala Desa aktif; profile typed/versioned; master media BLOB |
| Residents | `residents`, `resident_versions`, `resident_lifecycle_events`, `resident_documents` | Blind index NIK unik termasuk nonaktif; version window tidak overlap; lifecycle event dapat void tanpa delete |
| FamilyCards | `family_cards`, `family_card_versions`, `family_memberships`, `family_membership_events` | Blind index KK unik; satu membership aktif per penduduk; satu kepala aktif per KK; row locking; histori tidak dihapus |
| Cms | `cms_contents`, `cms_content_versions` | Jenis/status terbatas; slug published unik per jenis; HTML sanitized |
| Operations | `audit_logs`, `notifications`, `jobs`, `job_attempts`, `backups`, tabel queue resmi | Audit append-only; idempotency key unik per scope; lease/attempt; error aman |
| Imports | `imports`, `import_errors` | File quarantine privat; satu error membatalkan batch; backup verified sebelum parse |
| Reports | `report_templates`, `report_requests`, `report_snapshots`, `report_files` | Snapshot immutable; file privat; retensi 30 hari; format PDF/XLSX |

Strategi invariant concurrency:

- Blind index disimpan sebagai binary/fixed-length yang diindeks unik.
- Membership aktif mempunyai generated key nullable yang unik per penduduk ketika `ended_at IS NULL`.
- Kepala keluarga aktif mempunyai generated key nullable yang unik per KK ketika membership aktif dan role kepala.
- Service perpindahan mengunci KK asal, KK tujuan, penduduk, dan membership aktif dengan urutan lock deterministik.
- Pergantian Kepala Desa aktif mengunci baris konfigurasi/version aktif dan mengarsipkan versi lama dalam transaksi yang sama.
- Idempotency key dibuat sebelum enqueue dan diperiksa ulang oleh handler.
- Seluruh waktu domain menggunakan presisi mikrodetik dan koneksi DB menetapkan `+07:00`/kontrak WIB.

## 5. Shared foundation Tahap 2

Urutan bootstrap:

1. Buat AppStarter 4.7.4 di `ci4-bootstrap`, verifikasi paket, lalu integrasikan file framework ke root tanpa menimpa `doc`, `design`, atau `assets/images/logo-desa.png`.
2. Kunci PHP `~8.3.0`, Composer platform 8.3.0, dependency runtime/dev, dan lockfile.
3. Pasang frontend exact versions, Vite, lint, Playwright, Axe, dan lockfile; tidak memakai CDN.
4. Buat `.env.example` tanpa secret dan konfigurasi `Asia/Jakarta` untuk app serta koneksi.
5. Buat migration/session database, route registry, auth/role filter, CSRF, security headers, production error page, correlation ID, dan structured logging aman.
6. Implementasikan `EncryptionService`, `BlindIndexService`, key validation, private storage, authorized file response, dan audit service.
7. Migrasikan `LAYOUT-AUTH`, `LAYOUT-PUBLIC`, `LAYOUT-INTERNAL`, serta registry komponen dari gallery ke CI4.
8. Buat route `DEV-COMPONENT-GALLERY` yang hanya terdaftar pada development.
9. Implementasikan `php spark siak:doctor` untuk versi/extension, DB/version/timezone, writable/private path, key, backup capability, dan cron freshness.
10. Tambahkan CI PHP 8.3 + MariaDB 11.4, frontend build, static analysis, style, unit/integration, E2E, dan accessibility scan.

Vertical slice foundation dianggap stabil bila login dummy melalui fixture test dapat merender layout internal, role filter menolak mutation Kepala Desa, audit tercatat, private-file endpoint tidak mengekspos path, dan component gallery aktual lulus keyboard/responsive check.

## 6. Gelombang implementasi

### 6.1 Gelombang pertama

Tiga jalur boleh berjalan setelah foundation stabil:

- **A — Settings:** identity → branding → Kepala Desa → profil/versioning → preview.
- **B — Authentication:** user schema → CLI `siak:user:create` → login/session/throttling → temporary password → user administration.
- **C — Operations:** queue projection → job worker integration → audit viewer → notification → backup/verification → private download.

Schema `Core` hanya diubah oleh pekerjaan foundation. Jalur lain mengajukan perubahan melalui contract review.

### 6.2 Gelombang domain

- **Residents:** contract/migration → encryption/versioning → create/edit → lifecycle/restore → history/documents → index server-side.
- **FamilyCards:** contract/migration/invariant → create/edit → add unassigned member → pindah/pecah → headless/empty notifications → deactivate/restore/history.
- **Cms/Public:** content schema/sanitizer → editor/publish/withdraw → public listing/detail → public Profile Desa/statistics projection.

### 6.3 Dependency tinggi

- Imports dimulai setelah Residents, FamilyCards, queue, private storage, dan backup verified stabil.
- Reports dimulai setelah Residents, FamilyCards, Settings, audit, queue, dan histori as-of stabil.
- Dashboard final dan notification center dimulai setelah agregasi domain tersedia.
- Hardening, data-volume test, accessibility, restore rehearsal, dan Hostinger deployment rehearsal dilakukan setelah vertical slice terintegrasi.

## 7. Urutan wajib per modul

1. Kaitkan user story dengan bagian PRD, Screen ID, dan test ID.
2. Tulis kontrak DTO, status, error code, authorization, dan migration.
3. Tulis test invariant/service sebelum atau bersama implementasi Service/Repository.
4. Implementasikan transaksi, locking, audit, notification, dan idempotency yang relevan.
5. Implementasikan Controller, named route, filter, 422 JSON/server form error contract.
6. Baca kembali Screen ID di `UI_UX_SPEC.md`; gunakan komponen global tanpa varian lokal.
7. Uji success dan failure path, kedua role, CSRF, responsive, keyboard, Axe, dan screenshot.
8. Jalankan quality gate terfokus lalu quality gate penuh sebelum integrasi ke `develop`.

## 8. Traceability matrix

| PRD | Domain/requirement | Migration/data + service utama | Screen ID | Test ID minimum |
| --- | --- | --- | --- | --- |
| §2 | Dua role dan kewenangan server | `users`; `AuthorizationService`, role filter | Seluruh `AUTH-*`, `INT-*`, `RES-*`, `KK-*`, `RPT-*` | `AUTH-POL-001..006`, `SEC-AUTHZ-001` |
| §4.1 | Waktu WIB dan tanggal efektif | Seluruh `DATETIME(6)`; `Clock`, connection timezone guard | Seluruh screen bertanggal | `CORE-TIME-001..004` |
| §4.2 | Versi, event, audit, void | Version/event tables; `TemporalVersionService`, `AuditService` | `RES-HISTORY`, `KK-SHOW`, `AUD-*`, `RPT-*` | `HIST-001..006`, `AUD-001..004` |
| §4.3 | Enkripsi NIK/KK dan blind index | Kolom cipher/nonce/blind index; `EncryptionService`, `BlindIndexService` | `RES-*`, `KK-*`; tidak ada pada `PUB-*` | `SEC-CRYPT-001..005`, `SEC-PUB-001` |
| §5 | Login, session, temporary password | Authentication migrations; `AuthenticationService`, `UserService` | `AUTH-*`, `USR-*` | `AUTH-001..012` |
| §6.1 | Dashboard internal | Read projection/query; `DashboardQueryService` | `INT-DASHBOARD` | `DASH-001..008` |
| §6.2 | Tepat empat statistik publik | Public aggregate projection; `PublicStatisticService` | `PUB-HOME` | `PUB-STAT-001..004`, `SEC-PUB-002` |
| §7.1–7.2 | Data, tambah, daftar, koreksi penduduk | `residents`, `resident_versions`; `ResidentService`, `ResidentQueryService` | `RES-INDEX`, `RES-SHOW`, `RES-CREATE`, `RES-EDIT` | `RES-001..014` |
| §7.3 | Pindah/meninggal dan dokumen | `resident_lifecycle_events`, `resident_documents`; `ResidentLifecycleService` | `RES-STATUS`, `RES-HISTORY` | `RES-LIFE-001..012`, `FILE-001..005` |
| §7.4 | Restore sesuai alasan | Lifecycle event/void; `ResidentRestoreService` | `RES-STATUS`, `RES-HISTORY` | `RES-REST-001..010` |
| §8.1–8.2 | KK dan invariant concurrency | `family_cards`, versions/memberships/generated keys; `FamilyCardService` | `KK-INDEX`, `KK-SHOW`, `KK-CREATE`, `KK-EDIT` | `KK-001..012`, `KK-CONC-001..004` |
| §8.3 | Tambah anggota tanpa membership | `family_memberships`; `FamilyMembershipService::add` | `KK-SHOW` | `KK-MEM-001..007` |
| §8.4 | Pindah/pecah atomik | Membership/event tables; `FamilyMoveService` | `KK-MOVE`, `KK-SHOW` | `KK-MOVE-001..012` |
| §8.5 | Nonaktif/restore KK | KK status/event; `FamilyCardLifecycleService` | `KK-SHOW`, `KK-RESTORE` | `KK-REST-001..009` |

| §9 | Import XLSX atomik dan backup-before-parse | `imports`, `import_errors`; `ImportService`, `ImportJob` | `IMP-*`, `JOB-SHOW`, `BAK-SHOW` | `IMP-001..020` |
| §10 | Laporan as-of dan snapshot | Report tables; `ReportService`, `AsOfQueryService`, `ReportJob` | `RPT-*`, `JOB-SHOW` | `RPT-001..018` |
| §11.1 | CMS sanitized dan status | CMS tables; `ContentService`, `ContentSanitizer` | `CMS-*` | `CMS-001..012`, `SEC-XSS-001..004` |
| §11.2 | Portal publik tanpa PII | Published queries; `PublicContentService` | `PUB-*` | `PUB-001..012`, `SEC-PUB-001..006` |
| §12.1 | Identitas desa typed/versioned | Settings tables; `VillageIdentityService` | `SET-IDENTITY`, `SET-HISTORY`, `SET-PREVIEW` | `SET-ID-001..009` |
| §12.2 | Logo re-encode/version/fallback | `branding_media`; `BrandingService`, image service | `SET-BRAND`, `SET-PREVIEW` | `SET-BRAND-001..010`, `FILE-IMG-001..006` |
| §12.3 | Satu Kepala Desa aktif/foto | `village_leaders`; `VillageLeaderService` | `SET-HEAD`, `SET-HISTORY`, `INT-DASHBOARD`, `PUB-PROFILE` | `SET-HEAD-001..012` |
| §12.4–12.5 | Profil structured/publish/media | `village_profile_versions`; `VillageProfileService` | `SET-PROFILE`, `SET-PREVIEW`, `PUB-PROFILE` | `SET-PROF-001..012` |
| §13.1 | Audit append-only dan aman | `audit_logs`; `AuditService`, `AuditQueryService` | `AUD-*` | `AUD-001..010`, `SEC-LOG-001..004` |
| §13.2 | Notifikasi minimum | `notifications`; `NotificationService` | `INT-DASHBOARD`, `KK-SHOW`, `JOB-*` | `NOTIF-001..008` |
| §13.3 | Queue, lease, retry, idempotency | Queue tables + `jobs`, `job_attempts`; handler contracts | `JOB-*`, seluruh proses async | `JOB-001..014` |
| §13.4 | Backup, verifikasi, retensi, CLI restore | `backups`; `BackupService`, `backup:run`, `backup:restore` | `BAK-*`; restore tanpa screen web | `BAK-001..015` |
| §14 | UI/UX, state, responsive, WCAG | Layout/cells/assets; seluruh controller/view | Seluruh Screen ID + `DEV-COMPONENT-GALLERY` | `UI-001..012`, `A11Y-001..010`, `E2E-*` |
| §15 | Modular CI4 dan Hostinger | Config/build/deploy scripts; `siak:doctor` | N/A | `ARCH-001..006`, `DEP-001..012` |
| §16 | Kapasitas, keamanan, pemulihan | Index/query plan, filters, backup/restore | Seluruh screen | `PERF-001..005`, `SEC-*`, `REC-001..006` |
| §18 | Seeder fakta diketahui saja | Idempotent production seeder | `SET-*`, portal setelah konfigurasi | `SEED-001..006` |

Test ID adalah namespace stabil pada nama test, dataset, atau annotation dokumentasi. Penomoran detail dibuat saat test pertama modul ditulis dan tidak boleh dipakai ulang untuk perilaku berbeda.

## 9. Kontrak endpoint dan authorization

### 9.1 Kontrak respons

- DataTables: `draw`, `recordsTotal`, `recordsFiltered`, `data`, dan error terstruktur tanpa stack trace.
- Relation select: `{items: [{id, text, meta}], nextCursor}` dengan maksimum 20 item.
- Job: `{id, type, status, progress, message, resultUrl}`; `resultUrl` hanya setelah authorization.
- JSON validation: HTTP 422 dengan field code stabil. Form server-rendered memakai validation source yang sama.
- Forbidden mutation oleh Kepala Desa: HTTP 403, bukan redirect palsu atau control yang hanya disembunyikan.
- Mutation menerima CSRF; job creation juga menerima idempotency key.

### 9.2 Matriks permission test

Untuk setiap named route, dataset otomatis menjalankan:

1. guest → redirect login untuk internal atau 401/403 sesuai kontrak endpoint;
2. Admin → allow sesuai matriks;
3. Kepala Desa → allow read/report request yang sah;
4. Kepala Desa → 403 untuk mutation sumber/template/settings/CMS/user/backup;
5. wrong owner/scope → 403/404 aman untuk job/file/audit terbatas;
6. publik → tidak ada route atau payload PII;
7. CSRF hilang/salah → request mutation ditolak;
8. HTTP verb salah → 404/405 tanpa legacy auto-route fallback.

## 10. Strategi test

| Layer | Tujuan | Environment |
| --- | --- | --- |
| Unit | Value object, validation domain, status transition, sanitizer policy | PHP 8.3 tanpa DB bila memungkinkan |
| Service integration | Transaction, locking, version/event, audit, idempotency | MariaDB 11.4 disposable |
| Migration | Fresh DB, forward migration, rollback hanya disposable | MariaDB 11.4 strict |
| Concurrency | Blind index, membership aktif, kepala aktif, aktivasi leader | Beberapa koneksi MariaDB nyata |
| Feature | Named route, filter, role, CSRF, 422, upload/download | CI4 test + MariaDB |
| Queue/job | Lease, retry transient, terminal failure, duplicate delivery | Database queue nyata di test |
| E2E | Alur Admin, Kepala Desa, dan portal publik | Playwright pada build production-like |
| Accessibility | Axe, keyboard, focus, reflow, target sentuh | Browser desktop/mobile viewport |
| Visual | Screenshot layout/komponen/screen penting | Viewport 320, 768, 1024, 1440 px |
| Performance | 10.000 penduduk, server-side table/search/report | Dataset sintetis non-PII |
| Recovery | Backup verify dan restore rehearsal | Database disposable + runbook |

Fixture tidak boleh memakai credential production atau NIK/KK nyata. Generator NIK/KK test menggunakan namespace/dataset sintetis dan kunci test terpisah.

## 11. Quality gate

Gate wajib sebelum merge ke `develop`:

```bash
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
```

Gate tambahan:

- test terkait perubahan lulus pada MariaDB 11.4;
- migration dari database kosong lulus;
- tidak ada secret, runtime file, backup, import, report, atau private media dalam Git;
- named route dan filter audit tidak menemukan legacy auto-routing;
- tidak ada PII pada public HTML, endpoint, log, screenshot, atau source map;
- failure path import/report/backup/job diuji;
- `UI_UX_SPEC.md` dan traceability tetap sinkron;
- asset production build tersedia untuk release Hostinger.

## 12. Branch, commit, dan release

- `main` hanya memuat baseline/release stabil dan mengikuti Hostinger setelah release deployable.
- `develop` adalah branch integrasi.
- Feature branch dibuat dari `develop` dan kembali melalui PR.
- Release PR berasal dari `develop` ke `main`.
- Hotfix berasal dari `main` dan disinkronkan kembali ke `develop`.
- Force-push dan delete protected branch dilarang.
- Dependency update dipisahkan dari feature dan menyertakan audit/changelog/test.
- Release pertama yang memenuhi seluruh acceptance criteria diberi tag `v1.0.0`.

Commit per vertical slice dianjurkan memisahkan migration/domain, HTTP contract, UI, dan test hanya ketika setiap commit tetap dapat dipahami dan tidak meninggalkan migration production yang berbahaya.

## 13. Deployment dan rehearsal

Preflight staging membuktikan PHP web/CLI 8.3, extension, MariaDB 11.4, `Asia/Jakarta`, OPcache, writable/private storage, backup capability, cron absolute path, serta queue freshness.

Urutan release:

1. pilih tag/commit `main`;
2. `composer install --no-dev --prefer-dist --optimize-autoloader`;
3. pasang environment dan persistent storage;
4. jalankan `php spark siak:doctor`;
5. buat dan verifikasi backup;
6. jalankan forward migration;
7. sinkronkan hanya isi `public/` dan build asset ke `public_html`;
8. jalankan smoke test portal, dua role, denial mutation Kades, private file, queue, report, import, backup;
9. catat tag dan SHA.

Auto-deploy baru boleh aktif setelah dua rehearsal berturut-turut berhasil. Restore database tetap CLI/runbook dan tidak tersedia melalui web.

## 14. Risiko dan checkpoint

| Risiko | Checkpoint/mitigasi |
| --- | --- |
| PHP CLI timezone masih UTC | Tahap 2: `.env`/App config dan DB connection guard harus membuktikan WIB; `siak:doctor` memblokir mismatch |
| MariaDB 11.4 CLI/server belum tersedia di workstation | Wajib tersedia sebelum migration/integration test Tahap 2 dinyatakan lulus |
| Shared hosting tidak menyediakan binary dump | Uji `mariadb-dump`/`mysqldump`, lalu fallback PHP dan restore verification |
| Generated-key invariant tidak sesuai perilaku MariaDB | Prototype migration dan concurrency test sebelum modul KK dibangun |
| Snapshot/as-of kompleks | Bangun dataset temporal kecil dan test oracle sebelum report UI |
| Memory import 10.000 baris | Read filter, `readDataOnly`, batas baris/file, profiling pada limit shared hosting |
| Integrasi melewati branch protection | Ruleset `Protect Develop` dan `Protect Main` aktif; seluruh perubahan masuk melalui feature branch dan pull request |

Checkpoint yang membutuhkan keputusan produk baru hanya dibuat bila implementasi akan mengubah PRD. Kendala library/hosting boleh mengubah detail teknis setelah compatibility, security, license, dan regression review tanpa mengubah aturan bisnis.

## 15. Definition of done rilis awal

Rilis selesai hanya jika seluruh acceptance criteria PRD §17 mempunyai test/evidence, seluruh Screen ID production terimplementasi, dua role dan publik lulus permission matrix, migration/queue/backup/restore bekerja pada staging Hostinger, serta tidak ada known critical/high security issue tanpa keputusan risiko tertulis.

Metadata status dokumen telah diubah menjadi `Aktif untuk implementasi` tanpa mengubah versi 1.0.0 setelah pemeriksaan Tahap 1 lulus pada 31 Agustus 2026.
