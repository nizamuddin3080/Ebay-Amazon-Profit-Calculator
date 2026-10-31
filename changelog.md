# Changelog: eBay to Amazon Profit Calculator

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-11-01

### Added
- **Complete Phase 1 Architecture & Engineering Documentation Suite:**
  - `README.md`: Comprehensive project overview, planned folder tree, technology stack, and installation runbook.
  - `plan.md`: Formal product development plan, user stories, functional/non-functional requirements, milestones, and Definition of Done.
  - `architecture.md`: Detailed Manifest V3 system design, Mermaid data-flow and extraction diagrams, Shadow DOM design, and Architectural Decision Records (ADRs).
  - `design.md`: Complete UI/UX design specification, design tokens, responsive layout wireframes, state transition tables, and copy feedback specifications.
  - `tasks.md`: Exhaustive 45-task development breakdown organized across 8 sequential phases with dependencies and acceptance criteria.
  - `rules.md`: Strict coding standards, security constraints, calculation invariants, and Manifest V3 CSP rules.
  - `testing.md`: Mathematical validation suite, Test Cases 1, 2, and 3, boundary edge-case matrix, and manual QA runbook.
  - `memory.md`: Project memory, architectural decision log, configuration registry, and phase tracker.
  - `changelog.md`: Semantic changelog structure initialized.
  - `planning-audit.md`: Formal cross-document consistency audit and readiness verification report.
- Initialized local Git repository with remote tracking against `https://github.com/nizamuddin3080/Ebay-Amazon-Profit-Calculator.git` on branch `main`.
- Added `AGENTS.md` specifying mandatory automatic Git synchronization guidelines.

### Changed
- None (Initial project initialization).

### Deprecated
- None.

### Removed
- None.

### Fixed
- Reconciled mathematical discrepancy in Test Case 3 between literal $30 / $5 parameters and target $59.21 output, documenting both derivations in `testing.md` and `planning-audit.md`.

### Security
- Mandated zero external network dependencies and restricted Chrome extension permissions strictly to `storage` and targeted eBay listing URLs.
