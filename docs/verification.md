# Current verification — supervisor and monitor access (2026-10-30)

Production build, TypeScript and ESLint passed. All 24 unit tests passed. The existing email authentication, tenancy and workspace browser scenarios passed together. The new monitor scenario passed separately against the production build after correcting its fixture helper to retain the submitted fields (the create-entity API returns only its ID).

The monitor scenario uses two invited supervisors and independent browser contexts. It verifies code-only login without an email or new user record, unique codes across owners, server-resolved shared ownership, ignored ownership/role spoofing, no cross-workspace reads, every entity's create/edit/archive/restore/delete denial, settings/backup/invitation/code-management denial, report details/topics, Excel export, old-year empty states, archived records (including reports inherited from archived classes), hidden mutation controls, and safe handling of direct settings URLs. It also checks Persian RTL, English LTR, theme switching, reduced motion, 375px/768px/landscape layouts with no page overflow, code replacement invalidating multiple sessions, revocation, monitor logout, two concurrent code creations leaving exactly one valid code, no inherited administrator privileges and loss of monitor access when the issuing account is disabled.

All database changes and email messages in these scenarios are confined to guarded disposable `report_desk_test_*` databases and a loopback SMTP mailbox. Teardown drops the test databases and stops the app/mailbox servers. Production accounts, data, SMTP credentials and Vercel settings were not changed by these tests.

Live monitor browser captures and DOM snapshots are in ignored `.taste-skill/email-qa/monitor-*`. The Taste `achromatic-ledger` direction, seed 1500409820, retains the existing fonts/tokens and Astra icons. After the functional tests, a CSS-only phone-density adjustment was built successfully and verified by rendering the captured DOM with the final source stylesheet. Final Persian 390px dark inspection passed with zero failures/warnings. English desktop/tablet/phone inspection and images are under `.taste-skill/monitor/`. The 11–12px secondary labels and table metadata are deliberate; primary values/data are 13–30px. The inspector's desktop no-data-hue warning is a false chart detection on an overview with no chart; the coverage figure uses the brand accent and navigation stays neutral.

The earlier notes below describe previous releases and are retained as history.

---

# Invitation-only email login (2026-10-28)

The production build and TypeScript validation passed. ESLint passed; the changed backup route and final test helper also passed a focused lint check. All 22 unit tests passed. All three browser scenarios passed against the production build: the OTP/invitation scenario and the existing workspace scenario passed together, then the tenancy scenario passed after correcting a legacy admin-only check on workspace backup export.

The OTP scenario exercises the actual HTTP routes, MongoDB transactions, bcrypt comparisons, session cookies and Nodemailer SMTP delivery through a loopback SMTP sink. It verifies email-bound invitations, no account before verification, incorrect codes, five-attempt exhaustion, expiry, resend invalidation, concurrent consumption with one successful response, replay rejection, invite revocation after OTP delivery, denied access to administrator APIs, email delivery failure cleanup, existing-account login without a new invitation, fresh administrator ownership and unchanged legacy accounts/data. Legacy password sessions, password login and public password registration are rejected.

The tenancy scenario verifies initially empty workspaces in English and Persian, all entity mutations and references, ownership spoofing, scoped settings, duplicate class/book names across owners, archives, scoped backup export, portable restore and cross-tab logout/account switching. Ordinary invited members can export their own workspace backup. The existing workspace scenario verifies the reporting calendar, forms, curriculum topics, archive, themes, mobile layout and logout.

All browser tests use guarded disposable databases named `report_desk_test_*`; they are dropped by teardown. The interrupted initial run's disposable database was separately identified and removed. The real workspace database was not migrated or populated, and no email was sent to a real mailbox. The administrator account is created only after a real OTP verification and receives a fresh workspace; previous account ownership is preserved.

The existing Taste framed-sheet direction and fonts were retained. Live browser captures and static DOM snapshots of invitations, sign-up and OTP screens are in ignored `.taste-skill/email-qa/`. Desktop, tablet and phone layouts were checked, including Persian RTL and dark mode. Inspector checks pass with a narrowly scoped `placeholder-data` allowance for the deliberate `example.com` test fixtures. Retained warnings concern the existing compact metadata/label scale and honest whitespace in a one-invitation list. Actual browser screenshots and inspector renders were reviewed. No production sample records were added.

Mail configuration from the reference project was inspected but not copied because its sender differs from the requested Gmail account. The user chose to configure `elyasqati527@gmail.com` and its App Password themselves. `npm run check:mail` subsequently passed with the user-configured Gmail credentials: SMTP connectivity and authentication were verified without sending a message. Delivery to a real inbox and Vercel deployment are still not claimed as verified. `.env` remains ignored and a scan of all changed/new source files found no matches for configured private credentials.

The notes below record earlier versions and verification runs; password-registration descriptions are historical and are superseded by the current email flow.

---

# Verification

- Production build and strict TypeScript checks passed.
- ESLint passed.
- All 19 unit tests passed: Persian/Gregorian calendar boundaries, Kabul deadlines, Friday weeks, weighted attendance, enrollment versus attendance opportunities, supervisor scoring, historical assignments, validation, SQL data parsing, formatted XLSX exports and registration validation.
- Live MongoDB integration checks passed in a disposable test database: weekly uniqueness, reference validation, immutable submission timestamps, curriculum identity, archive/restore, inherited report deletion and transactional class deletion.
- Browser end-to-end test passed after the final functional changes: login, bilingual navigation and direction, curriculum topics, class editing, 12-hour times, repeated-week rejection, invalid attendance rejection, origin validation, dark/light themes, mobile overflow, archive retrieval/restoration, backup and logout.
- Original PHP/React files were not changed. The local environment and QA artifacts are ignored by Git.

## Visual review

The Taste app direction is **framed-sheet**, seed **124820595**, with no redraws. IRANSansX supplies the product's face, and the Friday-to-Thursday reporting strip is its signature element. The main workspace contains no fabricated business records. Fictional browser-test records are defined in `tests/e2e/workspace.spec.ts`, isolated in a disposable database and removed after the test.

The production interface was captured at 1440, 768 and 390 pixels in both themes. Authenticated DOM snapshots were rendered with the Taste inspector at their matching capture width; scripts were removed for static inspection, while actual selected controls, CSS, fonts and rendered data were retained. Live interactions were tested separately in Playwright. The saved captures and inspection reports live in the ignored `.taste-skill/qa/` directory.

The seven app-screen critique checks:

1. The overview exposes reporting coverage and the action to record a report. Zero eligible classes show a neutral state.
2. The frame closes on both content edges. Related panels share their grid; sparse data are not padded with fictional rows.
3. One data hue and neutral chrome are used; no gradients or decorative KPI icons. Both themes keep semantic contrast.
4. Counts derive from records. Class enrollments and repeated attendance opportunities are explicitly distinguished.
5. Zero remains zero; unknown attendance and insufficient ranking history remain a dash.
6. Chart ticks retain a readable size on mobile through a ResizeObserver-based viewBox. Missing weeks produce gaps rather than invented zero attendance.
7. Navigation folds on mobile, recent reports become two-line rows and longer tables scroll within their own frame. Mobile navigation has focus handling and an Escape close action.

Inspector warnings retained after visual review: compact metadata at 11–12 px and no chart hue when the real workspace has no report data. The latter is intentional: no nonzero bar or fabricated sample data is inserted into the main database. The inspector reports no failing checks.

## Independent user workspaces

Self-service registration is available on the bilingual login screen. Usernames are unique without case sensitivity; passwords are bcrypt hashes, and authentication continues to use opaque HttpOnly session cookies. Registration creates only an account and its own default settings.

All business collection reads, counts, writes and deletions go through `workspaceCollections` with the authenticated user ID. This includes referenced staff/curricula, inherited archives, historical reporting, settings and backup/restore. Client-provided ownership is discarded. Even an account with the `admin` role has no cross-workspace data access. Unique class numbers and curriculum names are now scoped to the owner. Backup restoration regenerates document IDs and reference IDs before stamping the receiving account's ownership; another account's records cannot be overwritten.

The live upgrade assigned the six existing business records to the original account (one class, two people, two curricula and one report). Before/after comparisons confirmed unchanged business fields and IDs, preserved settings and an idempotent second migration pass. No test accounts were created in the main database.

The isolated MongoDB integration test passed cross-owner mutations/references, ownership spoofing, independent uniqueness, scoped cascade deletion and legacy migration. The existing workspace browser test passed against the production build. A second real browser test passed registration in English and Persian, password mismatch feedback, initially empty workspaces, direct API isolation for all four entities and archive actions, separate settings, case-insensitive username uniqueness/login, origin protection, filtered backups, portable restore, and cross-tab logout/account switching. These tests used a disposable database that was removed afterward.

Clean registration screens were captured at 1440, 768 and 390 pixels in both languages, covering both themes, with no horizontal overflow. The saved captures and static DOM inspection reports are in the ignored `.taste-skill/registration-qa/` folder.

Four Taste inspections passed with zero failing checks. The retained warning concerns compact helper copy and labels at the existing 11–12 px form scale; form controls retain their 44 px minimum height. Both the live captures and inspector images were reviewed. No new decorative content or sample business data was added to the real workspace.

## Legacy data

No legacy SQL data were imported. The previously supplied `E:/gozaresh_db.sql` was unavailable during implementation. The migration command performs a preview by default and imports only with `--apply` into an empty workspace. Missing dates, start dates, submission times and incomplete schedule values remain explicitly unknown rather than guessed.

## Excel export update

The report export now produces a genuine XLSX workbook through a library loaded only when the export button is used. It preserves numeric counts, native dates, literal user text and the selected report rows. The workbook includes an organization/title block, period and filter context, bordered and banded rows, frozen headers, an Excel auto-filter, formula-based absence counts and totals, and A4 landscape print settings. Persian uses the Excel Persian calendar number format and an RTL worksheet view; English uses Gregorian dates and LTR.

The production build, ESLint and 16 unit tests passed. A focused browser check intercepted API responses with fictional fixtures and performed real downloads without writing to MongoDB: all 14 Persian records were exported across screen pagination, and the English export contained exactly the selected class. Serialized workbooks were reopened to verify counts, totals, styles, direction and date formats. Both saved workbooks were rendered for visual review. The static renderer does not honor Excel's Persian-calendar display or RTL column order; their saved workbook settings were checked directly. A separate attempt to inspect through native Excel automation was rejected by the local application, and its QA-only process was closed. Native Excel rendering is therefore not claimed as verified.

## Excel backups (2026-10-30)

Settings now downloads a localized XLSX backup, with nine visible sheets for the summary, classes, teachers, supervisors, curricula, topics, reports, assignment history and settings. All workspace periods and archived records are included. Tables have explicit borders, banded rows, filters, frozen headers, typed dates/counts and 12-hour times. Accounts, sessions, invitations and monitor credentials remain excluded.

A versioned snapshot is stored in a very-hidden worksheet, chunked below Excel's cell-size limit without splitting Unicode surrogate pairs, with a SHA-256 checksum for corruption detection. Restoration reads this snapshot, rather than display-table edits, and applies the existing schema, relationship checks, ID remapping, workspace isolation and transaction. Original Excel backups and older JSON backups can be restored into empty workspaces. Both the settings hint and the summary sheet explain that display edits do not change the restore snapshot.

All 29 unit tests, TypeScript, ESLint, formatting and the production build passed. The two production-build browser scenarios passed against a disposable database: the real settings link downloaded a Persian Excel file, the real file picker restored an Excel backup into another empty account with remapped IDs, unrelated accounts remained isolated, a second restore returned 409, and the legacy JSON restore path remained accepted through parsing/validation. Existing bilingual forms, archives and authentication checks also passed. Nine generated sheets were rendered and visually reviewed with the bundled spreadsheet renderer; its previously noted Persian-calendar and RTL limitations remain, so native Excel rendering is not claimed. Test data were removed afterward.
