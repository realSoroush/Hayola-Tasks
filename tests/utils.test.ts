import { describe, it, expect } from "vitest";
import {
  dayKey,
  tehranISO,
  weekStart,
  addDays,
  elapsed,
  csvCell,
  metrics,
  progress,
  burnup,
} from "../src/utils";
import { emptyData } from "../src/core";
describe("Gregorian Tehran dates", () => {
  it("uses Tehran day at UTC boundary", () => {
    expect(dayKey("2026-10-19T21:00:00Z")).toBe("2026-10-20");
  });
  it("converts Tehran wall clock to UTC", () => {
    expect(tehranISO("2026-10-20", "00:30")).toBe("2026-10-19T21:00:00.000Z");
  });
  it("handles leap year and Monday weeks", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
  });
});
describe("real metrics", () => {
  it("empty data has no fabricated metrics", () => {
    const m = metrics(emptyData(), 30);
    expect(m.onTime).toBeNull();
    expect(m.cycle).toBeNull();
    expect(m.focus).toBe(0);
    expect(m.done).toEqual([]);
    expect(progress([])).toBe(0);
  });
  it("paused sessions do not accrue time", () => {
    expect(
      elapsed(
        {
          id: "s",
          status: "paused",
          elapsed_seconds: 90,
          planned_seconds: 1500,
          resumed_at: "2000-01-01",
        },
        Date.now(),
      ),
    ).toBe(90);
  });
  it("running sessions cap at planned duration", () => {
    expect(
      elapsed(
        {
          id: "s",
          status: "running",
          elapsed_seconds: 50,
          planned_seconds: 100,
          resumed_at: "2000-01-01",
        },
        Date.now(),
      ),
    ).toBe(100);
  });
  it("reports actual completion and excludes reopened work", () => {
    const d = emptyData();
    d.tasks = [
      {
        id: "a",
        status: "Done",
        completed_at: new Date().toISOString(),
        due_date: addDays(dayKey(), 1),
        started_at: new Date(Date.now() - 86400000).toISOString(),
      },
      { id: "b", status: "To do", completed_at: null },
    ];
    expect(metrics(d, 7).done).toHaveLength(1);
    expect(metrics(d, 7).onTime).toBe(100);
    expect(metrics(d, 7).cycle).toBeCloseTo(1);
  });
});
describe("CSV export", () => {
  it.each(["=1+1", " +SUM(A1)", "@cmd", "-2", '\t=HYPERLINK("x")'])(
    "neutralizes formula %s",
    (v) => {
      expect(csvCell(v).startsWith("\"'")).toBe(true);
    },
  );
  it("escapes quotes and preserves unicode", () => {
    expect(csvCell('Hayola "team" — تیم')).toBe('"Hayola ""team"" — تیم"');
  });
});
