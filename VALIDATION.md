# Validation record

Date: 2026-10-20 (UTC)

## Completed on the delivered source

| Check                                         | Result                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TypeScript strict type check                  | Passed                                                                                                        |
| Vitest utility and UI interaction tests       | 41 passed, 3 files                                                                                            |
| PostgreSQL/PGlite migration and access checks | 45 passed                                                                                                     |
| Vite production build                         | Passed with non-secret build-only Supabase placeholders so the complete authenticated application is included |

Database checks execute the migration with separate authenticated identities and an anonymous role. They cover signup profile initialization, private data visibility, owner-only membership controls, pending and accepted invitations, task assignment, server dates, optimistic revisions, mentions, reminder deduplication, private/shared calendar rules, removed event creator access, direct messages, timezone validation, focus commands, archival and restoration.

UI tests cover real request payloads with test-only Supabase substitutes, login and signup failures/confirmation, task creation, keyboard-accessible board movement, exact-email member lookup, project invitation request arguments, owner-only controls, optional profile fields, empty pages and dialog cancellation. Production data access has no mock adapter.

Interface reference measurements and remaining visual checks are recorded in `docs/UI-PARITY.md`.

## Not yet validated

- Live Supabase Auth, email delivery, PostgREST and Realtime behavior.
- GitHub repository creation/push or Vercel deployment.
- Browser screenshot comparisons or a claim of pixel-perfect parity.
- Device-level visual/accessibility behavior, cross-browser testing, deployed security headers and production end-to-end sessions.

See README.md for deployment and live acceptance steps. No live service credentials were available or embedded in this delivery.
