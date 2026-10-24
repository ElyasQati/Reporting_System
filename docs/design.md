# Report Desk design decisions

Applied skills: `taste-skill` and `ui-ux-pro-max`, installed in the user's Codex skills directory. They are available in subsequent turns; their files were read and applied in this build.

The Taste app-screen draw chose **framed-sheet**, seed **124820595**, with no redraws. The quiet blue-green academic frame supports a white work sheet; the dark theme uses neutral charcoal surfaces. IRANSansX was explicitly retained from the user's supplied files. The weekly reporting strip is the product's signature element: Friday-to-Thursday deadlines, received reports and missing class reports, derived from actual records.

UI/UX Pro Max searches returned applicable dashboard density, accessibility, visible focus, loading/error feedback and responsive-layout guidance. Its generic landing-page pattern was not used for this administrative app. The explicit Next.js API requirement takes precedence over the skill's optional Server Actions suggestion. The user's requested Astra Icons take precedence over either skill's suggested icon libraries. Only the 24 needed original SVGs are vendored with their MIT license and converted to typed React components, avoiding the full 100 MB icon distribution.

Primary questions:

- Overview: which classes still need to report this week?
- Classes: who teaches/supervises each class and how many enrollments does it have?
- Reports: what attendance was actually recorded in the selected calendar month and year?
- Curriculum: what lesson titles and page ranges belong to each book?
- Teachers: what is each teacher's current teaching load?
- Supervisors: who consistently submits on time and maintains attendance over completed weeks?
- Analytics: how does weighted attendance differ across classes and staff?
- Archive: which records can be recovered?
- Settings: which deadline and scoring policy is currently applied?
- Registration: how can a new supervisor create a private, empty workspace?

No invented metrics or sample records are included in the main workspace. End-to-end tests use an isolated disposable database with clearly marked fictional records.
