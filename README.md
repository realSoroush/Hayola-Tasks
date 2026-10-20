# Hayola Tasks

An independent, English-language project workspace inspired by the Pane reference interface, with the supplied Hayola logo. Real Supabase authentication and PostgreSQL data; no demo accounts, sample projects, seeded users or production mock fallback.

## Interface update

The interface alignment changes are documented in [docs/UI-PARITY.md](docs/UI-PARITY.md), including measured reference dimensions, restored widgets, validation results and the remaining browser screenshot verification boundary.

## Delivery status

The source builds locally and includes database authorization and UI interaction tests. It has **not been connected to a live Supabase project or deployed to GitHub/Vercel**. The reference informed layout, typography, glass surfaces and responsive behavior; exact screenshot parity has **not** been verified in a browser. Treat visual acceptance and a live end-to-end smoke test as outstanding release checks.

## Requirements

- Node.js 22 LTS and npm.
- A new Supabase project with email/password Auth enabled.
- A private GitHub repository and a Vercel project connected to that repository.

## 1. Create the database

Open your new Supabase project's SQL Editor and run **either** `supabase/setup.sql` **or** `supabase/migrations/202610190001_hayola.sql`, once. These are the same migration. Do not run both. The migration is intentionally transactional and designed for a fresh project. It creates tables, triggers, policies, indexes and restricted RPCs, without any seed rows.

Existing Supabase Auth users created before this migration do not automatically get a profile. Prefer running this migration before the first signup; for an existing project, have its administrator explicitly migrate existing users before using this app.

In Authentication settings:

1. Enable email/password signup. Keep email confirmation enabled for production.
2. Set Site URL to your final `https://YOUR-APP.vercel.app` domain (or custom domain).
3. Add `https://YOUR-APP.vercel.app/**` to allowed redirect URLs. Add `http://localhost:5173/**` for local development only. Use the exact production/preview domains you control, rather than broad wildcard hosts.
4. Configure your Auth email provider/SMTP if needed for production confirmation and password reset delivery. Supabase's own email delivery limits and settings apply; project invitations themselves are in-app.

Register each teammate with name, email and password. A project's owner can look up an already registered account by exact email and add it immediately or send an in-app invitation. An unaccepted invitation does not grant project data access.

## 2. Configure and run

Copy `.env.example` to `.env.local` and provide:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

The legacy public anon key is also accepted through `VITE_SUPABASE_ANON_KEY`. Use **only** a publishable/anon client key. Never put a Supabase secret key or service-role key into any `VITE_` variable, client file, repository or browser environment.

```sh
npm ci
npm run dev
```

Open the Vite URL printed by the command. Missing configuration shows a setup screen; database or authentication errors are surfaced rather than replaced with demo data.

```sh
npm run check
npm run build
```

`check` type-checks, runs Vitest/jsdom interaction and date/metric tests, then executes the actual migration and authorization cases in an isolated PGlite PostgreSQL instance. Test fixtures exist only inside tests. PGlite does not exercise Supabase Auth email delivery, PostgREST, Realtime transport or a deployed browser session.

## 3. Push to a private GitHub repository

Create a private empty repository in your GitHub account, then use the repository URL GitHub supplies:

```sh
git init
git add .
git commit -m "Build Hayola Tasks private team workspace"
git branch -M main
git remote add origin YOUR_PRIVATE_REPOSITORY_URL
git push -u origin main
```

`.env.local`, dependencies and build outputs are ignored. Commit the lockfile. The included GitHub Actions workflow runs checks and a production build on pushes and pull requests.

## 4. Deploy through Vercel

1. Import that private GitHub repository into Vercel; set its root to this project directory.
2. Framework preset: **Vite**. Install: `npm ci`. Build: `npm run build`. Output: `dist`.
3. Add the two public Supabase environment variables to the appropriate Production/Preview environments.
4. Deploy. Changes to Vite environment variables require rebuilding/redeploying.
5. Update Supabase Site URL and redirect allowlist to match the final deployment.
6. Run the live acceptance checks below using two separately registered test accounts. Delete test content through the UI when done.

`vercel.json` includes SPA routing and basic security headers. Authorization is enforced by Supabase RLS, independently of the browser. No server/service credentials are required by this client application.

## Features

- Home: real task counts, today's task progress, personal focus time, upcoming calendar events, weekly agenda, project summaries and activity.
- Tasks: Board/List, project and assignee filters, search, due/priority/manual sorting, drag between status columns, keyboard/touch accessible status selector, optimistic revision checks, detail drawer, subtasks, comments, mentions, task links, soft delete and immediate undo.
- Projects: portfolio, pinning, descriptions, lead, status, color, target dates, progress, task scope burnup, milestones, team membership, activity, archive and immediate undo.
- Calendar: month and week date grids, Tehran times, personal or shared project events, attendees, event types, links and event editing. Week view is a date-column agenda, not a 24-hour drag-to-reschedule grid.
- Team: shared-project profiles, real presence heartbeat, workload, member details and persisted direct messages.
- Insights: 7/30/90-day periods, comparisons, completion counts, on-time rate, cycle time, focus hours, current task distribution, workload, overdue tasks and CSV export with formula injection protection.
- Settings: light/dark/system, six accents, ten independently authored wallpaper gradients, glass style, reduced transparency, profile and capacity, focus defaults, in-app notification preferences, password reset and sign out.
- Focus: server-clock start/pause/resume/extend/end/complete, one active session per user, completion monitor while app is open, floating timer and a local break countdown. A break countdown is intentionally transient and resets on reload; recorded focus sessions persist in PostgreSQL.

## Data and access

Main tables: `profiles`, `projects`, `project_members`, `project_pins`, `tasks`, `task_status_events`, `subtasks`, `comments`, `milestones`, `calendar_events`, `focus_sessions`, `user_settings`, `notifications`, `activity_log`, `direct_messages`.

- Every table has RLS. Anonymous clients cannot read application data.
- Project owners manage projects and membership. Accepted members share project tasks and events. Milestones are editable only by the owner.
- Profile visibility is limited to yourself and people who currently share an accepted project. Owner-only exact-email lookup supports invitation without exposing the full directory.
- Project invitations are in-app and require acceptance unless the owner chooses direct add. Removed members lose project access and assigned tasks become unassigned.
- Direct messages are visible only to participants; new messages require a shared project. Existing message history and recipient notification history remain available to their recipients after membership removal.
- Personal events are private. Project events require current project access, including for their creator.
- Focus and task history dates are set on the server. Client task writes use a revision condition to prevent silent overwrites.
- Projects and tasks are soft deleted. Owners can restore a project through immediate Undo. Permanent purge/backup retention is an administrator operation, not exposed in the UI.
- No upload/file attachments, external email invitations, push delivery, background jobs, third-party calendar sync or workspace-wide admin role are included.

## Time and reporting semantics

Dates use the Gregorian calendar. Event inputs and app day boundaries use IANA `Asia/Tehran`; stored timestamps use `timestamptz`/UTC. Team profile clocks can use other valid IANA zones. Current Iran offset is +03:30; event input conversion is explicit and should be revisited if Iran changes its time rules.

Completed metrics include tasks currently Done and their latest server completion timestamp. Reopening a task removes it from completed totals. Cycle time starts at the first In progress transition and ends at the latest completion. The burnup chart displays currently completed tasks by their completion dates and current task scope by creation dates; it does not reconstruct deleted/reopened historical snapshots. Workload compares **all open estimates** with weekly capacity, rather than claiming weekly scheduled allocation.

Reminders run on app open/focus and every 60 seconds while the page is visible, with persisted deduplication. Meeting reminders cover the next five minutes, due reminders today's assigned tasks, and optional daily digest after 09:00 Tehran. They are in-app reminders, not an always-on scheduler. Presence is an approximate two-minute heartbeat, focus/meeting state is derived from visible records.

## Live acceptance checklist

- Confirm signup email, login, logout and reset password on the real deployment.
- Create a project, search an already registered second account, invite it, verify no access before acceptance, then accept in a second session.
- Create/assign/edit/move/complete/reopen/delete/undo a task, add subtasks and mention a teammate. Check both sessions for updated data.
- Verify a third unrelated account cannot read or edit either project's data.
- Remove a member and confirm access disappears and assigned tasks are unassigned.
- Check personal versus project event visibility, Tehran midnight/date rollover and HTTPS meeting links.
- Check focus across refresh, pause/resume, simultaneous-start rejection, completion and break behavior.
- Compare target screenshots against Pane at matched desktop/mobile viewport sizes; review typography, overflow, contrast, dialogs and touch/keyboard controls. Browser screenshot parity remains pending.

## Source layout

`src/core.tsx`: data/session store and Supabase access. `src/App.tsx`: shell, routes and global overlays. `src/pages.tsx`: application views. `src/forms.tsx`: authentication, editors and details. `src/ui.tsx`: reusable controls. `src/utils.ts`: date/report/export calculations. `src/styles.css`: original responsive styling. `supabase/`: database setup. `tests/`: automated verification.

The logo in `public/hayola-logo.png` is the supplied image, displayed with CSS cropping. No paid Pane source, demo data, avatar photography or reference app backend is included.
