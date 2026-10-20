import type { Data, Row } from "./core";
import { dayKey, addDays, weekStart, doneIn, focusIn, overdue } from "./utils";
/** All dashboard numbers derive from visible Supabase records, in Tehran days. */
export function dashboard(data: Data, userId: string, now = Date.now()) {
  const today = dayKey(now),
    week = weekStart(today),
    mine = data.tasks.filter((t) => t.assignee_id === userId && !t.deleted_at);
  const due = mine.filter((t) =>
    t.status === "Done"
      ? t.completed_at && dayKey(t.completed_at) === today
      : Boolean(t.due_date && t.due_date <= today),
  );
  const completed = due.filter((t) => t.status === "Done").length;
  const events = data.calendar_events
    .filter(
      (e) =>
        dayKey(e.starts_at) === today &&
        (e.created_by === userId || e.attendee_ids.includes(userId)),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = events.filter((e) => Date.parse(e.ends_at) > now);
  const sessions = data.focus_sessions.filter(
    (s) => s.user_id === userId && dayKey(s.started_at) === today,
  );
  const hours = focusIn(sessions, today, today);
  const daily = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(week, i);
    return { key, value: doneIn(data.tasks, key, key).length };
  });
  const finished = doneIn(data.tasks, week, today).length,
    previous = doneIn(data.tasks, addDays(week, -7), addDays(today, -7)).length;
  return {
    today,
    week,
    mine,
    due,
    completed,
    events,
    upcoming,
    sessions,
    hours,
    daily,
    finished,
    previous,
    overdue: mine.filter((t) => overdue(t, today)).length,
    meetingsDone: events.filter((e) => Date.parse(e.ends_at) <= now).length,
  };
}
export function projectPeople(data: Data, projectId: string): Row[] {
  return data.profiles.filter((p) =>
    data.project_members.some(
      (m) =>
        m.project_id === projectId &&
        m.user_id === p.id &&
        m.status === "accepted",
    ),
  );
}
