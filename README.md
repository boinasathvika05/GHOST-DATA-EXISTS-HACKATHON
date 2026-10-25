# GhostTrace AI — Enterprise Data Deletion Intelligence Platform
> **“Deleted should mean gone.”**  
> *Evidence-driven deletion assurance across every system, identity, and data flow.*

GhostTrace AI is an enterprise data deletion intelligence platform built for the **HackerRank Orchestrate October 2026** challenge, **“Ghost Data Still Exists”**.

The platform determines whether personal data has truly been deleted, detects residual PII across secondary databases, resolves current and historical identities, discovers active synchronization jobs and backup restore hazards, and produces mathematically ordered remediation and verification plans.

---

## 1. Product Capabilities

- **Evidence-Backed Verification:** Grounded in 94 multimodal evidence records: point-in-time SQL snapshot replicas, JSON state bundles, structured server traces, text shift handovers, and UI console screenshots.
- **Identity Graph Resolution:** Correlates stable internal `user_id`s with current and historical email aliases, phone changes, name shifts, and cryptographic email hashes via `user_audit_log.csv`.
- **Temporal State Reconstruction:** Reconstructs resource state strictly at each case's `audit_at` cutoff date. Avoids post-audit leakage and rejects unverifiable workflow claims.
- **Strict 15-Rule Policy Enforcement:** Evaluates `deletion_rules.csv` across databases, search indices, caches, support messages, attachments, analytics cohorts, and backup archives. Correctly supports permitted account tombstones while redacting direct personal identifiers.
- **Deterministic Remediation Planning:** Sorts findings, remediation actions, and verification checks strictly in accordance with challenge operation specifications and topological dependencies.
- **Evaluation Laboratory:** Real-time scoring against `sample_output.csv` with case-level accuracy, step-level precision/recall/F1, field accuracy, and three synthetic adversarial test cases.
- **Token Usage & Cost Reporting:** Real-time instrumentation of Gemini API calls, token counts, and cost metrics, generating `evaluation/usage_report.md`.
- **Complete Deliverable Packaging:** Direct in-app downloads of `output.csv` (exact 518 rows), `evaluation_report.md`, `usage_report.md`, and full runnable `code.zip`.

---

## 2. Architecture & File Structure

```text
ghosttrace-ai/
├── dataset/                        # Participant-facing challenge files
│   ├── deletion_requests.csv       # 518 official cases
│   ├── sample_deletion_requests.csv# 32 sample cases
│   ├── sample_output.csv           # Ground truth sample answers
│   ├── user_identities.csv         # Current user snapshots
│   ├── user_audit_log.csv          # Historical identity modifications
│   ├── system_activity.csv         # Global system activity stream
│   ├── deletion_rules.csv          # 15 data category deletion rules
│   ├── evidence_files.csv          # 94-file evidence manifest
│   └── evidence/                   # Databases, logs, records, images, docs
├── src/
│   ├── audit_engine/
│   │   ├── core_engine.ts          # Core audit and correlation engine
│   │   ├── evidence_indexer.ts     # Multi-format evidence parser and indexer
│   │   ├── identity_resolver.ts    # Graph-based multi-alias identity resolution
│   │   ├── policy_rules.ts         # Rule criteria, allowed ops & sorting
│   │   └── evaluator.ts            # Benchmarking and report generator
│   ├── components/                 # Dark-first React UI components
│   │   ├── Sidebar.tsx             # Collapsible enterprise navigation
│   │   ├── Header.tsx              # Workspace status and quick export
│   │   ├── LandingHero.tsx         # Digital particle field & visual hero
│   │   ├── OverviewDashboard.tsx   # Live dataset metrics & KPI cards
│   │   ├── CasesTable.tsx          # 518-case explorer with filters
│   │   ├── CaseDetailDrawer.tsx    # Evidence trace & remediation timeline
│   │   ├── EvidenceExplorer.tsx    # 94-file multimodal evidence viewer
│   │   ├── IdentityGraphView.tsx   # Interactive SVG/canvas relationship graph
│   │   ├── DataFlowsView.tsx       # Sync connectors & backup restore hazards
│   │   ├── RemediationCenter.tsx   # Step breakdown & script generators
│   │   ├── EvaluationLab.tsx       # Benchmarks & 3 synthetic edge test runs
│   │   └── UsageCostView.tsx       # Gemini token analytics & cost reports
│   ├── types/index.ts              # Strict TypeScript definitions
│   ├── App.tsx                     # Main application layout & router
│   ├── main.tsx                    # React DOM entry point
│   └── index.css                   # Tailwind v4 styles & design tokens
├── code/
│   ├── main.py                     # Standalone Python CLI audit runner
│   └── evaluation/main.py          # Standalone Python evaluation runner
├── scripts/
│   └── run_audit.ts                # TypeScript CLI runner
├── evaluation/
│   ├── evaluation_report.md        # Measured accuracy & test report
│   └── usage_report.md             # Token consumption & cost analysis
├── output.csv                      # Exact 518-row submission file
├── server.ts                       # Express + Vite full-stack server
├── package.json
└── README.md
```

---

## 3. Quickstart & Runnable Commands

### Option A: Run Full-Stack Web Application (Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite on Port 3000)
npm run dev

# 3. Build for production
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Run Standalone Python Engine (CLI)

```bash
# Execute full 518-case audit and generate output.csv
python3 code/main.py

# Run evaluation benchmark
python3 code/evaluation/main.py
```

### Option C: Run Automated QA & Adversarial Test Suites

```bash
# Run master test suite (all phases)
npm test

# Run individual validation suites:
npm run test:security     # Phase 2: Prompt Injection Suite (PI-01 - PI-10)
npm run test:policy       # Phase 3: Deletion Policy & Edge Cases (E01 - E20)
npm run test:output       # Phase 4: Exact output.csv Contract (14 rules)
```

---

## 4. Adversarial QA & Security Scorecard

| Test Suite / Phase | Test Count | Pass Rate | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1: Production Build & Lint** | 2 builds | 100% | **PASS** (Zero errors) |
| **Phase 2: Prompt Injection Suite (PI-01 to PI-10)** | 10 tests | 100% (10/10) | **PASS** |
| **Phase 3: Deletion Policy & Edge Cases (E01 to E20)** | 20 tests | 100% (20/20) | **PASS** |
| **Phase 4: Exact Output Contract Validation** | 14 rules | 100% (14/14) | **PASS** (518 rows, sorted) |
| **Phase 5: Sample Dataset Evaluation** | 32 cases | 53.1% Status | **MEASURED** (17/32 matches) |
| **Phase 6: Full Dataset Reproducibility** | 2 runs | 100% | **PASS** (0-byte drift) |
| **Phase 7: Model Usage & Credential Scan** | 125 files | 100% | **PASS** (0 secrets in source) |
| **Phase 8: UI Regression & Endpoints** | 12 routes | 100% (12/12) | **PASS** |

---

## 5. Challenge Rules & Submission URL

- **Challenge URL:** [https://wwww.hackerrank.com/contests/hackerrank-orchestrate-october26/challenges/ghost-data-still-exists](https://wwww.hackerrank.com/contests/hackerrank-orchestrate-october26/challenges/ghost-data-still-exists)
- **Submission Output:** `output.csv` with exactly 518 data rows and header `case_id,deletion_status,steps_json`.
- **Trace Log:** `log.txt` kept updated at repository root.
- **Archive:** `code.zip` downloadable from the application UI.

---

## 6. Security & Privacy Guarantees

- **Non-Destructive Operations:** All emitted remediation steps represent verifiable plans, never unvetted live mutations.
- **Zero Hallucinated Identifiers:** Every resource citation is strictly grounded in evidence observed prior to the audit cutoff.
- **Secure Secrets:** API keys and credentials are read exclusively from environment variables (`process.env.GEMINI_API_KEY`).
- **Prompt Injection Immunity:** Evidence files are strictly treated as inert data and cannot alter audit schemas or policy rules.
