# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SBS Cronograma** — a PWA "second brain" for the three partners (Nelson, Estela, Fátima) of Firma Legal S.B.S, a notarial law firm in San Miguel, El Salvador. Tracks tasks, calendar/agenda, partner meetings (minutes + agreements), habits, goals, personal notes, internal chat, and notifications — shared across the three partners with per-item visibility control.

## Commands

```bash
npm run dev       # vite dev server (default port 5180, falls back if busy)
npm run build     # tsc -b && vite build
npm run preview   # preview the production build
```

There is no test suite and no lint script configured. Type-check with:

```bash
npx tsc --noEmit -p .
```

## Architecture

### Data flow: Supabase is the single source of truth

All app state lives in `AppData` (`src/data/types.ts`) and is held in React state inside `StoreProvider` (`src/store/store.tsx`), accessed everywhere via `useStore()`. There is **no local persistence** beyond what Supabase Realtime syncs in:

1. On login, `StoreProvider` loads every table (tasks, events, meetings, notes, habits, goals, messages, notifications) in parallel and converts each row with `rowToX()` mappers.
2. A single Supabase Realtime channel (`sbs-realtime`) subscribes to `postgres_changes` on every table and patches `data` in place on INSERT/UPDATE/DELETE.
3. Every mutation (`addTask`, `updateNote`, `toggleHabitToday`, etc.) writes directly to Supabase; the UI only sees the change once it round-trips back through Realtime (it does **not** update local state optimistically). Mutations that need the created row's id (e.g. converting a note into a task) get it from the insert's `.select().single()` response — `addTask`/`addHabit`/`addGoal`/`addNote`/`addEvent`/`addMeeting` all return the created entity (or `null`).

Because of this round-trip, **never bind a text input directly to a remote-synced field on every keystroke** — fast typing races the network and characters get dropped. Use a local buffer + debounced save (see `useDebouncedSave` in `src/pages/Notas.tsx`) for any free-text field on an existing record.

### snake_case ↔ camelCase boundary

The DB schema (`supabase/schema.sql`) uses snake_case columns and uuid foreign keys; the app types (`src/data/types.ts`) use camelCase and `UserId` slugs (`"nelson" | "estela" | "fatima"`). **All translation happens in `src/lib/mappers.ts`** (`rowToTask`/`taskToRow`, `rowToHabit`/`habitToRow`, etc.) — no component or store mutation should read/write raw Supabase rows directly.

uuid ↔ slug conversion specifically goes through `ProfileMap` (`src/lib/profiles.ts`), loaded once per session and passed into every mapper call.

### Visibility model

Most entities carry `visibleTo: UserId[]` (a list of partner slugs who can see the item). `useStore().visible(items)` filters any array down to what `currentUser` can see — always filter through this helper rather than re-implementing the check. Row Level Security policies in `supabase/schema.sql` enforce the same rule server-side (`is_visible(visible_to)`).

Habits are the one entity that's always private to its owner (no `visibleTo` column on `habits` — RLS is `owner = auth.uid()` only). There is currently no UI to make a habit shared between partners; if that's added, decide up front whether completion is tracked per-person or as one shared checkbox before touching the schema.

### Schema migrations

`supabase/schema.sql` is hand-maintained, not a migration tool. New columns are added two ways in the same file: inline in the `create table if not exists` block (for fresh installs) **and** as a separate `alter table ... add column if not exists` block right after (for the already-deployed database). When you add a column, you must run the `alter table` statements yourself in the Supabase SQL editor — editing `schema.sql` alone does not touch the live database. Forward-referencing FKs across tables should be avoided (table creation order in the file is not guaranteed to satisfy them); prefer a plain `uuid` column without a `references` clause if the order is inconvenient.

### Routing & layout

`src/App.tsx` defines all routes under a single `<Protected>` wrapper (redirects to `/login` if no Supabase session/profile) and a shared `<Layout>` (sidebar nav + topbar). Each top-level route maps to one file in `src/pages/`. Cross-cutting UI primitives (`Card`, `Chip`, `SectionTitle`, `VisibilityBadge`, `PriorityBadge`, `Avatar`) live in `src/components/ui.tsx` — reuse these instead of rebuilding equivalent markup per page.

### Derived/calculated logic lives in `src/lib/`, not in components

Streaks, risk evaluation, the "Disciplina SBS" composite score, and monthly knowledge stats are pure functions in `src/lib/habits.ts` and `src/lib/notes.ts`, taking arrays from `data` and returning numbers/labels. Keep this pattern — page components should call these helpers rather than recompute aggregates inline. Note: all date-bucketing in these helpers must use local time (`format(d, "yyyy-MM-dd")` from `date-fns`), **not** `Date.toISOString()`, which is UTC and silently breaks streak math in El Salvador's UTC-6 timezone.

### PWA / deployment

Built with `vite-plugin-pwa` (`injectManifest` strategy, service worker source at `src/sw.ts`) so it installs as a home-screen app. Deployed on Vercel, connected to `origin/main` on GitHub (`sbsfirmalegal/sbs-brain`) for auto-deploy on push — there is no separate staging environment or CI gate before production.

## Brand colors

- Azul marino (navy): `#13284E`
- Dorado (gold): `#C9A84C`
- Crema (cream): `#F7F6F2`
