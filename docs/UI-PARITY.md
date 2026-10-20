# Pane interface alignment

Reference reviewed: https://demo.codeandchill.store/pane/#/home

This change uses the existing application's Supabase data and authentication. No reference JavaScript, seed records or paid template source is included. Measurements below came from the rendered reference in the available browser, at 1363 × 936. Data-dependent content and user identity intentionally come from the application database.

## Measured baseline

| Element           | Reference measurement                                   | Implementation                                                     |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Sidebar           | 252 px wide, 14 px viewport inset, 32 px radius         | Matching desktop dimensions and inset                              |
| Main content      | Left 291.08 px at 1363 px viewport                      | Width-relative offset with 252 px sidebar                          |
| Toolbar           | Floating capsule, 60 px high, 14 px top inset           | Fixed chrome, matching icon order and search pill                  |
| Page title        | 43.99 px / 44.87 px, weight 700                         | Responsive display font size and line height                       |
| Header stats      | 65.42 px high, 18 px radius, 10 px gaps                 | Matching stat geometry and stronger values                         |
| Home upper row    | Today → Up next → Focus, 421.48 px high                 | Same order and desktop row height                                  |
| Home second row   | My tasks 5 columns / This week 7, 563.41 px high        | Same grid proportions and minimum height                           |
| Home final row    | Projects 7 columns / Right now 5, 433.5 px high         | Same proportions and minimum height                                |
| Project portfolio | Three columns, approximately 304 px cards               | Restored dimensions, milestone panel and task-count footer         |
| Board             | Glass columns, inset dark task cards, 18 px card radius | Same hierarchy with horizontal scroll on narrow screens            |
| Calendar          | Month panel + 390 px daily agenda at baseline width     | Restored two-column composition, responsive stacked version        |
| New task dialog   | 580 px wide, 32 px radius, header submit action         | External native form submit, busy handling and retained validation |

## Restored behavior represented by the layout

- Three independent activity rings (tasks, focus against a two-hour goal, elapsed attended meetings).
- Weekly completed-task chart and comparison against the same elapsed days of the previous week, using stored completion timestamps.
- Today's own/attended next meetings, not every visible project meeting.
- Due/overdue personal tasks with priority chips.
- Team/activity switch in Right now, with heartbeat-derived presence.
- Focus duration presets sent to the existing server RPC.
- Project icon selection, next milestone title/date and actual completion counts.
- Day selection, month milestones, daily agenda and due tasks in Calendar. Week columns cover the hours needed for real records and allow event creation at a chosen hour.
- Matching capsule surfaces, layered edge lighting, subtle pointer highlights and visible keyboard controls. Mobile navigation includes Settings.

## Validation boundary

Unit/UI tests and production compilation validate data flow and component behavior, not rendered pixels. The managed execution environment has no supported local browser QA path. The reference was inspected in a browser; the modified application has **not** had a matched-viewport screenshot comparison. No claim of completed pixel-perfect certification is made.

Before merge/release, compare the branch's actual Vercel preview with the reference using the same viewport, zoom, theme, wallpaper and browser. Review populated and empty states separately. Validate desktop at 1363 × 936 and mobile at 390 × 844, then check modals, horizontal board scrolling, light mode and keyboard focus. Staff initials and real project data will differ from the reference's seeded photographs/text.

The update also restores the Team card hierarchy, report project distribution/table mode, and the Settings side navigation with simultaneous profile/notification/appearance panels.

No SQL migration or authentication changes are required for this interface update.
