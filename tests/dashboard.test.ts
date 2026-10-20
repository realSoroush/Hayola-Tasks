import { describe, it, expect } from "vitest";
import { dashboard } from "../src/dashboard";
import { emptyData } from "../src/core";
const now = Date.parse("2026-10-20T09:00:00Z");
describe("Dashboard real-data semantics", () => {
  it("includes overdue work and today completions, excludes old completions and unscheduled work", () => {
    const data = emptyData();
    data.tasks = [
      { id: "due", assignee_id: "me", status: "To do", due_date: "2026-10-20" },
      {
        id: "late",
        assignee_id: "me",
        status: "In progress",
        due_date: "2026-10-19",
      },
      {
        id: "done",
        assignee_id: "me",
        status: "Done",
        completed_at: "2026-10-20T08:00:00Z",
      },
      {
        id: "old",
        assignee_id: "me",
        status: "Done",
        due_date: "2026-10-20",
        completed_at: "2026-10-19T08:00:00Z",
      },
      { id: "unscheduled", assignee_id: "me", status: "To do" },
      {
        id: "other",
        assignee_id: "other",
        status: "To do",
        due_date: "2026-10-20",
      },
    ];
    const h = dashboard(data, "me", now);
    expect(h.due.map((t) => t.id)).toEqual(["due", "late", "done"]);
    expect(h.completed).toBe(1);
    expect(h.overdue).toBe(1);
  });
  it("counts only personal or attended events and separates completed meetings", () => {
    const data = emptyData();
    data.calendar_events = [
      {
        id: "past",
        created_by: "me",
        attendee_ids: ["me"],
        starts_at: "2026-10-20T06:00:00Z",
        ends_at: "2026-10-20T07:00:00Z",
      },
      {
        id: "next",
        created_by: "other",
        attendee_ids: ["me"],
        starts_at: "2026-10-20T10:00:00Z",
        ends_at: "2026-10-20T11:00:00Z",
      },
      {
        id: "team",
        created_by: "other",
        attendee_ids: ["other"],
        starts_at: "2026-10-20T10:00:00Z",
        ends_at: "2026-10-20T11:00:00Z",
      },
    ];
    const h = dashboard(data, "me", now);
    expect(h.events.map((e) => e.id)).toEqual(["past", "next"]);
    expect(h.upcoming[0].id).toBe("next");
    expect(h.meetingsDone).toBe(1);
  });
  it("uses Tehran midnight for completed counts", () => {
    const data = emptyData();
    data.tasks = [
      {
        id: "done",
        assignee_id: "me",
        status: "Done",
        completed_at: "2026-10-19T21:00:00Z",
      },
    ];
    const h = dashboard(data, "me", now);
    expect(h.completed).toBe(1);
    expect(h.daily.find((p) => p.key === "2026-10-20")?.value).toBe(1);
  });
  it("empty data stays empty with no invented comparison percentage", () => {
    const h = dashboard(emptyData(), "me", now);
    expect(h.finished).toBe(0);
    expect(h.previous).toBe(0);
    expect(h.hours).toBe(0);
    expect(h.daily.map((d) => d.value)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
