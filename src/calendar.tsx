import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MapPin, Video } from "lucide-react";
import { useStore, useUI } from "./core";
import {
  Header,
  Card,
  Button,
  IconButton,
  Segments,
  Empty,
  AvatarStack,
  Due,
} from "./ui";
import { TaskRows } from "./task-rows";
import { dayKey, dateLabel, timeLabel, addDays, weekStart, TZ } from "./utils";
export function Calendar() {
  const { data: d } = useStore(),
    { show } = useUI();
  const [date, setDate] = useState(dayKey()),
    [selected, setSelected] = useState(dayKey()),
    [view, setView] = useState("Month");
  const first = date.slice(0, 7) + "-01",
    start = view === "Week" ? weekStart(date) : weekStart(first),
    events = d.calendar_events,
    selectedEvents = events
      .filter((e) => dayKey(e.starts_at) === selected)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    due = d.tasks.filter((t) => t.due_date === selected && t.status !== "Done");
  const clockMinutes = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(value));
    return (
      Number(parts.find((p) => p.type === "hour")?.value) * 60 +
      Number(parts.find((p) => p.type === "minute")?.value)
    );
  };
  const weekEvents = events.filter(
    (e) =>
      dayKey(e.starts_at) >= start && dayKey(e.starts_at) <= addDays(start, 6),
  );
  const startHour = Math.max(
      0,
      Math.min(
        7,
        ...weekEvents.map((e) => Math.floor(clockMinutes(e.starts_at) / 60)),
      ),
    ),
    endHour = Math.min(
      24,
      Math.max(
        20,
        ...weekEvents.map((e) =>
          dayKey(e.ends_at) > dayKey(e.starts_at)
            ? 24
            : Math.ceil(clockMinutes(e.ends_at) / 60),
        ),
      ),
    );
  function shift(n: number) {
    const key =
      view === "Week"
        ? addDays(date, n * 7)
        : new Date(
            Date.UTC(
              Number(date.slice(0, 4)),
              Number(date.slice(5, 7)) - 1 + n,
              15,
            ),
          )
            .toISOString()
            .slice(0, 10);
    setDate(key);
    setSelected(key);
  }
  return (
    <div className="calendar-page">
      <Header
        title={dateLabel(date, { month: "long", year: "numeric" })}
        subtitle={`${events.filter((e) => dayKey(e.starts_at) >= weekStart(date) && dayKey(e.starts_at) <= addDays(weekStart(date), 6)).length} events this week`}
        actions={
          <>
            <div className="calendar-period-nav">
              <IconButton
                icon={ChevronLeft}
                label="Previous period"
                onClick={() => shift(-1)}
              />
              <Button
                small
                onClick={() => {
                  setDate(dayKey());
                  setSelected(dayKey());
                }}
              >
                Today
              </Button>
              <IconButton
                icon={ChevronRight}
                label="Next period"
                onClick={() => shift(1)}
              />
            </div>
            <Segments
              label="Calendar view"
              options={["Month", "Week"]}
              value={view}
              onChange={setView}
            />
            <Button
              primary
              onClick={() => show({ kind: "eventForm", date: selected })}
            >
              <Plus size={16} />
              New event
            </Button>
          </>
        }
      />
      <div className="calendar-layout">
        <section
          className={
            "calendar glass " +
            (view === "Week" ? "calendar-week" : "calendar-month")
          }
          aria-label={view}
        >
          <div className="calendar-labels">
            {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map(
              (key) => (
                <span key={key}>
                  {dateLabel(key, { weekday: "short" })}
                  {view === "Week" && (
                    <button
                      className={key === selected ? "selected" : ""}
                      onClick={() => setSelected(key)}
                    >
                      {Number(key.slice(-2))}
                    </button>
                  )}
                </span>
              ),
            )}
          </div>
          {view === "Month" ? (
            <div className="calendar-days">
              {Array.from({ length: 42 }, (_, i) => addDays(start, i)).map(
                (key) => {
                  const rows = events
                      .filter((e) => dayKey(e.starts_at) === key)
                      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
                    milestones = d.milestones.filter((m) => m.due_date === key);
                  return (
                    <div
                      key={key}
                      className={`calendar-day ${key === dayKey() ? "is-today" : ""} ${key === selected ? "is-selected" : ""} ${key.slice(0, 7) !== date.slice(0, 7) ? "outside" : ""}`}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setSelected(key);
                      }}
                    >
                      <div className="calendar-date-row">
                        <button
                          className="date-button"
                          aria-label={dateLabel(key, { dateStyle: "full" })}
                          aria-pressed={key === selected}
                          onClick={() => setSelected(key)}
                        >
                          {Number(key.slice(-2))}
                        </button>
                        {rows.length > 3 && (
                          <small>+{rows.length - 3} more</small>
                        )}
                        {milestones.length > 0 && (
                          <span
                            className="milestone-flag"
                            title={milestones.map((m) => m.title).join(", ")}
                          >
                            ⚑
                          </span>
                        )}
                      </div>
                      {rows.slice(0, 3).map((e) => (
                        <button
                          className={
                            "calendar-event type-" +
                            e.type.toLowerCase().replaceAll(" ", "-")
                          }
                          key={e.id}
                          onClick={() => {
                            setSelected(key);
                            show({ kind: "event", id: e.id });
                          }}
                        >
                          <strong>{e.title}</strong>
                        </button>
                      ))}
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="calendar-week-scroll">
              <div
                className="calendar-week-grid"
                style={{ minHeight: (endHour - startHour) * 55 }}
              >
                {Array.from({ length: 7 }, (_, i) => addDays(start, i)).map(
                  (key, i) => (
                    <div className="calendar-week-column" key={key}>
                      {Array.from({ length: endHour - startHour }, (_, h) => (
                        <button
                          className="calendar-hour"
                          key={h}
                          aria-label={`Add event ${key} ${String(h + startHour).padStart(2, "0")}:00`}
                          onClick={() =>
                            show({
                              kind: "eventForm",
                              date: key,
                              time: `${String(h + startHour).padStart(2, "0")}:00`,
                            })
                          }
                        >
                          {i === 0 && <time>{h + startHour}:00</time>}
                        </button>
                      ))}
                      {events
                        .filter((e) => dayKey(e.starts_at) === key)
                        .map((e) => {
                          const p = new Intl.DateTimeFormat("en-GB", {
                              timeZone: TZ,
                              hour: "numeric",
                              minute: "numeric",
                              hour12: false,
                            }).formatToParts(new Date(e.starts_at)),
                            hour = Number(
                              p.find((p) => p.type === "hour")?.value,
                            ),
                            minute = Number(
                              p.find((p) => p.type === "minute")?.value,
                            ),
                            top = Math.max(
                              0,
                              (hour + minute / 60 - startHour) * 55,
                            ),
                            height = Math.max(
                              30,
                              ((Date.parse(e.ends_at) -
                                Date.parse(e.starts_at)) /
                                3600000) *
                                55,
                            );
                          return (
                            <button
                              className={
                                "calendar-week-event type-" +
                                e.type.toLowerCase().replaceAll(" ", "-")
                              }
                              key={e.id}
                              style={{ top, height }}
                              onClick={() => {
                                setSelected(key);
                                show({ kind: "event", id: e.id });
                              }}
                            >
                              <strong>{e.title}</strong>
                              <small>{timeLabel(e.starts_at)}</small>
                            </button>
                          );
                        })}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </section>
        <Card
          title={
            selected === dayKey()
              ? "Today"
              : dateLabel(selected, { weekday: "long" })
          }
          subtitle={`${dateLabel(selected)} · ${selectedEvents.length} events`}
          className="calendar-agenda"
          action={
            <Button
              small
              onClick={() => show({ kind: "eventForm", date: selected })}
            >
              <Plus size={15} />
              Add event
            </Button>
          }
        >
          <ul className="calendar-agenda-events">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <time>
                  {timeLabel(e.starts_at)}
                  <small>
                    {(Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60000}{" "}
                    min
                  </small>
                </time>
                <button
                  className={
                    "agenda-event-info type-" +
                    e.type.toLowerCase().replaceAll(" ", "-")
                  }
                  onClick={() => show({ kind: "event", id: e.id })}
                >
                  <strong>{e.title}</strong>
                  <small>
                    {e.meeting_url ? <Video size={12} /> : <MapPin size={12} />}{" "}
                    {e.location || e.type}
                  </small>
                  <footer>
                    <AvatarStack
                      people={d.profiles.filter((p) =>
                        e.attendee_ids.includes(p.id),
                      )}
                      limit={3}
                    />
                    <span className="quiet-chip">{e.type}</span>
                  </footer>
                </button>
              </li>
            ))}
          </ul>
          {!selectedEvents.length && (
            <Empty
              compact
              title="A little breathing room"
              description="Nothing scheduled for this day."
            />
          )}
          {due.length > 0 && (
            <div className="calendar-due">
              <h3>
                Due {selected === dayKey() ? "today" : dateLabel(selected)}{" "}
                <small>{due.length}</small>
              </h3>
              <TaskRows tasks={due} />
            </div>
          )}
        </Card>
      </div>
      <p className="form-hint">
        All times use Asia/Tehran · Gregorian calendar.
      </p>
    </div>
  );
}
