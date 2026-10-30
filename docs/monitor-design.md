# Monitor workspace

The screen answers: what has my supervisor reported, and which classes still need this week's report?

Data inventory: one server-resolved supervisor, classes with teachers and class supervisors, book topics and pages, dated weekly reports, submitted/present/absent counts, current Friday–Thursday coverage, period attendance, existing archived records, and rankings. Totals derive from these records; no demonstration data is shipped.

Taste direction: `achromatic-ledger`, seed 1500409820, open-plane shell. Chosen because a monitor reads records rather than manages them. Retain IRANSansX, current light/dark semantic tokens and Astra icons. Brand identity comes from the linked supervisor's name and Friday–Thursday reporting coverage. Chrome is neutral; status and charts carry meaning. The supervisor keeps the existing framed sheet.

UI/UX Pro Max: the initial broad query returned a marketing/glass direction and was rejected as unsuitable. The narrower product query `analytics dashboard data tables` matched Analytics Dashboard (products.csv); apply drill-down tables and readable dense data while keeping the project's typography and theme.

Login explicitly chooses supervisor or monitor. Monitor mode asks only for an access code. Supervisor code management includes one-time display, clipboard/manual copy, active status, local 12-hour timestamps, explicit confirmation before replacement/revocation, and inline failure states.

Monitor interactions are period selection (Solar Hijri in Persian/Gregorian in English), search, filters, detail views, pagination, report export, refresh, language/theme and logout. No mutation controls, backup restore, settings or invitation administration. Tables keep their contained scroll on narrow screens; navigation folds at the existing tablet breakpoint.

Taste source lint: the dash warning refers to date/time intervals and missing-data markers, rather than prose punctuation; both are intentional data notation.

Final critique: linked ownership and the reporting period are explicit above the data; current-week coverage is separate from the selected month's metrics; reports and class details are one click away. The desktop uses a 2:1 report/coverage split with the class ledger aligned below. The phone uses compact label/value metrics so the report section begins in the first viewport. No additive actions appear in monitor empty states. Zero counts and missing attendance remain honest. DOM snapshots with the final stylesheet passed Persian dark phone inspection with zero findings; English secondary-label warnings are retained because they refer to table headers, sublines and shell metadata. A chart-hue warning is a false positive for outline icons: this overview contains no chart, while its coverage count carries the data accent.
