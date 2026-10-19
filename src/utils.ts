import type { Row, Data } from "./core";
export const TZ = "Asia/Tehran";
export function dayKey(value: Date | string | number = new Date(), zone = TZ) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"]
    .map((t) => p.find((x) => x.type === t)?.value)
    .join("-");
}
export function addDays(key: string, n: number) {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export function weekStart(key = dayKey()) {
  return addDays(key, -((new Date(key + "T12:00:00Z").getUTCDay() + 6) % 7));
}
export function dateLabel(
  key: string | null,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) {
  return key
    ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...options }).format(
        new Date(key.slice(0, 10) + "T12:00:00+03:30"),
      )
    : "No due date";
}
export function timeLabel(value: Date | string | number, zone = TZ) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
export function dueLabel(key: string | null) {
  if (!key) return "No due date";
  const d = daysBetween(dayKey(), key);
  return d === 0
    ? "Today"
    : d === 1
      ? "Tomorrow"
      : d === -1
        ? "Yesterday"
        : d > 1 && d < 7
          ? dateLabel(key, { weekday: "short" })
          : dateLabel(key);
}
export function relative(value: string) {
  const m = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000));
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} min ago`
      : m < 1440
        ? `${Math.floor(m / 60)} h ago`
        : `${Math.floor(m / 1440)} d ago`;
}
export const tehranISO = (date: string, time: string) =>
  new Date(date + "T" + time + ":00+03:30").toISOString();
export function clock(n: number) {
  n = Math.max(0, Math.floor(n));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function duration(n: number) {
  return n < 3600
    ? `${Math.floor(n / 60)}m`
    : `${(n / 3600).toFixed(1).replace(".0", "")}h`;
}
export function elapsed(s: Row, now = Date.now()) {
  return Math.max(
    0,
    Math.min(
      s.planned_seconds,
      Number(s.elapsed_seconds) +
        (s.status === "running" && s.resumed_at
          ? Math.max(0, (now - Date.parse(s.resumed_at)) / 1000)
          : 0),
    ),
  );
}
export function progress(tasks: Row[], pid?: string) {
  const rows = tasks.filter(
    (t) => !t.deleted_at && (!pid || t.project_id === pid),
  );
  return rows.length
    ? Math.round(
        (rows.filter((t) => t.status === "Done").length / rows.length) * 100,
      )
    : 0;
}
export const overdue = (t: Row, today = dayKey()) =>
  t.status !== "Done" && !t.deleted_at && t.due_date && t.due_date < today;
export const doneIn = (tasks: Row[], from: string, to = dayKey()) =>
  tasks.filter(
    (t) =>
      !t.deleted_at &&
      t.status === "Done" &&
      t.completed_at &&
      dayKey(t.completed_at) >= from &&
      dayKey(t.completed_at) <= to,
  );
export function focusIn(sessions: Row[], from: string, to = dayKey()) {
  return (
    sessions
      .filter((s) => dayKey(s.started_at) >= from && dayKey(s.started_at) <= to)
      .reduce((n, s) => n + elapsed(s), 0) / 3600
  );
}
export const workload = (tasks: Row[], uid: string) =>
  tasks
    .filter(
      (t) => !t.deleted_at && t.status !== "Done" && t.assignee_id === uid,
    )
    .reduce((n, t) => n + Number(t.estimate_hours), 0);
export function metrics(d: Data, days: number, offset = 0) {
  const to = addDays(dayKey(), -offset),
    from = addDays(to, 1 - days),
    done = doneIn(d.tasks, from, to),
    due = done.filter((t) => t.due_date),
    cycles = done.filter((t) => t.started_at);
  return {
    from,
    to,
    done,
    onTime: due.length
      ? (due.filter((t) => dayKey(t.completed_at) <= t.due_date).length /
          due.length) *
        100
      : null,
    cycle: cycles.length
      ? cycles.reduce(
          (n, t) =>
            n +
            (Date.parse(t.completed_at) - Date.parse(t.started_at)) / 86400000,
          0,
        ) / cycles.length
      : null,
    focus: focusIn(d.focus_sessions, from, to),
  };
}
export function series(d: Data, days: number) {
  const first = addDays(dayKey(), 1 - days),
    step = days === 90 ? 7 : 1;
  return Array.from({ length: Math.ceil(days / step) }, (_, i) => {
    const key = addDays(first, i * step),
      end = addDays(key, Math.min(step, days - i * step) - 1);
    return {
      key,
      value: doneIn(d.tasks, key, end).length,
      previous: doneIn(d.tasks, addDays(key, -days), addDays(end, -days))
        .length,
      focus: focusIn(d.focus_sessions, key, end),
    };
  });
}
export function burnup(p: Row, tasks: Row[]) {
  const span = Math.max(0, daysBetween(p.start_date, dayKey())),
    count = Math.min(15, span + 1);
  return Array.from({ length: count }, (_, i) => {
    const key = addDays(
        p.start_date,
        Math.round((span * i) / Math.max(1, count - 1)),
      ),
      rows = tasks.filter((t) => t.project_id === p.id);
    return {
      key,
      value: rows.filter(
        (t) =>
          t.status === "Done" &&
          t.completed_at &&
          dayKey(t.completed_at) <= key,
      ).length,
      previous: rows.filter((t) => dayKey(t.created_at) <= key).length,
    };
  });
}
export function presence(p: Row, d: Data) {
  const now = Date.now();
  return d.focus_sessions.some(
    (s) =>
      s.user_id === p.id &&
      s.status === "running" &&
      elapsed(s) < s.planned_seconds,
  )
    ? { label: "In focus", cls: "focus", order: 0 }
    : d.calendar_events.some(
          (e) =>
            e.attendee_ids.includes(p.id) &&
            e.type !== "Focus block" &&
            Date.parse(e.starts_at) <= now &&
            Date.parse(e.ends_at) > now,
        )
      ? { label: "In a meeting", cls: "meeting", order: 1 }
      : p.last_seen_at && now - Date.parse(p.last_seen_at) < 120000
        ? { label: "Online", cls: "online", order: 2 }
        : { label: "Away", cls: "away", order: 3 };
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^\s*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export const csvText = (headers: string[], rows: unknown[][]) =>
  "\uFEFF" +
  [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
export function exportCSV(file: string, headers: string[], rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob([csvText(headers, rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function onTrack(p: Row, tasks: Row[]) {
  return (
    p.status === "Shipped" ||
    !p.due_date ||
    (p.due_date >= dayKey() &&
      progress(tasks, p.id) >=
        Math.max(
          0,
          (daysBetween(p.start_date, dayKey()) /
            Math.max(1, daysBetween(p.start_date, p.due_date))) *
            100 -
            15,
        ))
  );
}
