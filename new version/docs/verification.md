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
