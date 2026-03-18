# TDR-001 — Tech Stack Decision (POS Toko Kelontong v1)

## Status
Approved

## Context
Product scope is local-first POS for 1 store with 1 terminal. Primary goals are reliability offline, fast checkout flow, simple maintenance, and low operational overhead.

## Decision
Use the following stack for v1:
- Framework: **Nuxt 3 + TypeScript**
- UI: **Nuxt UI + Tailwind CSS**
- State management: **Pinia**
- Validation: **Zod**
- Database (local): **SQLite**
- Data access: **Prisma ORM**
- Reporting export: **CSV (local file export)**
- Auth: **Local role-based auth (Owner/Kasir)**

## Rationale
1. Nuxt ecosystem is mature and maintainable for long-term product growth.
2. SQLite + Prisma gives a stable local-first persistence layer with low complexity.
3. Pinia + Zod keeps state and validation predictable for cashier-critical flows.
4. Stack is scalable to future phases (cloud sync/multi-terminal) without rewriting core business modules.

## Consequences
### Positive
- Fast development and clear structure.
- Works offline with minimal infrastructure.
- Easier onboarding for future contributors.

### Trade-offs
- Multi-terminal sync is postponed to later phase.
- Local DB backup/restore must be treated as first-class feature.

## Deferred Decisions (Post-v1)
- Packaging to desktop runtime (e.g., Tauri)
- Real-time cloud sync
- Multi-branch support
