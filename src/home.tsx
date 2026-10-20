import { useState } from "react";
import { Plus, ArrowUpRight, Video } from "lucide-react";
import { useStore, useUI, errorText } from "./core";
import {
  Header,
  Card,
  Button,
  IconButton,
  Empty,
  Avatar,
  AvatarStack,
  Priority,
  Due,
  Checkmark,
  Segments,
  ActivityFeed,
  Bars,
} from "./ui";
import { Focus } from "./focus";
import { dashboard, projectPeople } from "./dashboard";
import {
  dateLabel,
  timeLabel,
  dayKey,
  progress,
  duration,
  presence,
} from "./utils";
function TodayRings({
  values,
}: {
  values: {
    label: string;
    value: number;
    goal: number;
    display: string;
    target: string;
    className: string;
  }[];
}) {
  return (
    <div className="today-progress">
      <svg
        className="progress-rings"
        viewBox="0 0 136 136"
        role="img"
        aria-label="Today’s progress rings"
      >
        {values.map((v, i) => {
          const r = 56 - i * 15,
            c = 2 * Math.PI * r;
          return (
            <g key={v.label} className={"progress-ring " + v.className}>
              <circle cx="68" cy="68" r={r} className="progress-ring-track" />
              <circle
                cx="68"
                cy="68"
                r={r}
                className="progress-ring-arc"
                strokeDasharray={c}
                strokeDashoffset={
                  c *
                  (1 - Math.min(1, Math.max(0, v.goal ? v.value / v.goal : 0)))
                }
                transform="rotate(-90 68 68)"
              />
            </g>
          );
        })}
      </svg>
      <dl className="progress-legend">
        {values.map((v) => (
          <div className={v.className} key={v.label}>
            <dt>{v.label}</dt>
            <dd>
              <b>{v.display}</b>
              <small>/ {v.target}</small>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
export function Home() {
  const { data: d, session, me, taskChange, notify } = useStore(),
    { show, go } = useUI(),
    [rightTab, setRightTab] = useState("Team");
  const h = dashboard(d, session.user.id),
    next = h.upcoming[0],
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Tehran",
        hour: "numeric",
        hour12: false,
      }).format(new Date()),
    ),
    greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const team = [...d.profiles]
    .sort((a, b) => presence(a, d).order - presence(b, d).order)
    .slice(0, 6);
  return (
    <div className="home-page">
      <Header
        title={`Good ${greeting}, ${me?.full_name?.split(" ")[0] || "there"}`}
        subtitle={`${dateLabel(h.today, { weekday: "long", month: "long", day: "numeric" })} · ${h.events.length} ${h.events.length === 1 ? "meeting" : "meetings"} and ${h.due.length - h.completed} tasks left today`}
        stats={[
          {
            label: "Done today",
            value: (
              <>
                {h.completed}
                <small> / {h.due.length}</small>
              </>
            ),
          },
          { label: "Focus today", value: duration(h.hours * 3600) },
          { label: "Overdue", value: h.overdue },
        ]}
        actions={
          <>
            <Button onClick={() => show({ kind: "taskForm" })}>
              <Plus size={16} />
              New task
            </Button>
            {next && (
              <Button
                primary
                onClick={() => show({ kind: "event", id: next.id })}
              >
                <Video size={16} />
                Next: {timeLabel(next.starts_at)}
              </Button>
            )}
          </>
        }
      />
      <div className="home-grid">
        <Card title="Today" subtitle="Close your rings" className="today-card">
          <TodayRings
            values={[
              {
                label: "Tasks",
                value: h.completed,
                goal: h.due.length,
                display: String(h.completed),
                target: String(h.due.length),
                className: "ring-tasks",
              },
              {
                label: "Focus",
                value: h.hours,
                goal: 2,
                display: duration(h.hours * 3600),
                target: "2h",
                className: "ring-focus",
              },
              {
                label: "Meetings",
                value: h.meetingsDone,
                goal: h.events.length,
                display: String(h.meetingsDone),
                target: String(h.events.length),
                className: "ring-meetings",
              },
            ]}
          />
        </Card>
        <Card
          title="Up next"
          className="next-card"
          action={
            <button className="text-link" onClick={() => go("/calendar")}>
              Calendar
            </button>
          }
        >
          {next ? (
            <>
              <div className="next-meeting">
                <p className="next-countdown">
                  {Date.parse(next.starts_at) <= Date.now() ? (
                    "Happening now"
                  ) : (
                    <>
                      in{" "}
                      <strong>
                        {Math.max(
                          1,
                          Math.ceil(
                            (Date.parse(next.starts_at) - Date.now()) / 60000,
                          ),
                        )}{" "}
                        min
                      </strong>
                    </>
                  )}
                </p>
                <button
                  className="next-title"
                  onClick={() => show({ kind: "event", id: next.id })}
                >
                  {next.title}
                </button>
                <p className="next-meta">
                  {timeLabel(next.starts_at)} – {timeLabel(next.ends_at)} ·{" "}
                  {next.location || next.type}
                </p>
                <footer>
                  <AvatarStack
                    people={d.profiles.filter((p) =>
                      next.attendee_ids.includes(p.id),
                    )}
                  />
                  {next.meeting_url ? (
                    <a
                      className="button primary small"
                      href={next.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video size={14} />
                      Join
                    </a>
                  ) : (
                    <Button
                      primary
                      small
                      onClick={() => show({ kind: "event", id: next.id })}
                    >
                      View
                    </Button>
                  )}
                </footer>
              </div>
              <ul className="next-later">
                {h.upcoming.slice(1, 4).map((e) => (
                  <li key={e.id}>
                    <button onClick={() => show({ kind: "event", id: e.id })}>
                      <i
                        className={
                          "event-marker type-" +
                          e.type.toLowerCase().replaceAll(" ", "-")
                        }
                      />
                      <span>{e.title}</span>
                      <time>{timeLabel(e.starts_at)}</time>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty
              compact
              title="Room to breathe"
              description="Nothing else on your calendar today."
              action={
                <Button small onClick={() => show({ kind: "eventForm" })}>
                  Add event
                </Button>
              }
            />
          )}
        </Card>
        <Card
          title="Focus"
          subtitle="The island keeps the time"
          className="focus-card"
        >
          <Focus />
        </Card>
        <Card
          title="My tasks"
          subtitle="Due today and late"
          className="my-tasks-card"
          action={
            <button className="text-link" onClick={() => go("/tasks")}>
              All tasks
            </button>
          }
        >
          {h.due.length ? (
            <ul className="dashboard-task-list">
              {[...h.due]
                .sort(
                  (a, b) =>
                    Number(a.status === "Done") - Number(b.status === "Done") ||
                    (a.due_date || "9999").localeCompare(b.due_date || "9999"),
                )
                .slice(0, 7)
                .map((t) => (
                  <li key={t.id}>
                    <Checkmark
                      checked={t.status === "Done"}
                      label={"Done: " + t.title}
                      onChange={() =>
                        void taskChange(t, {
                          status: t.status === "Done" ? "To do" : "Done",
                        }).catch((e) => notify(errorText(e)))
                      }
                    />
                    <button
                      className={t.status === "Done" ? "strike" : ""}
                      onClick={() => show({ kind: "task", id: t.id })}
                    >
                      <strong>{t.title}</strong>
                      <small>
                        {d.projects.find((p) => p.id === t.project_id)?.name}
                        <i>·</i>
                        <Due date={t.due_date} done={t.status === "Done"} />
                      </small>
                    </button>
                    {["High", "Urgent"].includes(t.priority) && (
                      <Priority value={t.priority} />
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <Empty
              compact
              title="A clean slate"
              description="No tasks due today or overdue."
              action={
                <Button small onClick={() => show({ kind: "taskForm" })}>
                  <Plus size={14} />
                  Add task
                </Button>
              }
            />
          )}
        </Card>
        <Card
          title="This week"
          subtitle="Tasks the team finished"
          className="week-card"
          action={
            <IconButton
              icon={ArrowUpRight}
              label="Expand weekly progress"
              onClick={() => go("/insights")}
            />
          }
        >
          <p className="week-total">
            <strong>{h.finished}</strong> finished so far{" "}
            {h.previous > 0 && (
              <span className={h.finished >= h.previous ? "positive" : "muted"}>
                {h.finished >= h.previous ? "+" : ""}
                {Math.round(((h.finished - h.previous) / h.previous) * 100)}% vs
                last week
              </span>
            )}
          </p>
          <Bars label="Tasks finished each day this week" values={h.daily} />
        </Card>
        <Card
          title="Projects"
          className="home-projects"
          action={
            <button className="text-link" onClick={() => go("/projects")}>
              See all
            </button>
          }
        >
          {d.projects.length ? (
            <ul className="dashboard-projects">
              {d.projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button onClick={() => go("/projects/" + p.id)}>
                    <i className={"project-square hue-" + p.color} />
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.status} · due {dateLabel(p.due_date)}
                      </small>
                    </span>
                    <meter
                      aria-label={p.name + " progress"}
                      min={0}
                      max={100}
                      value={progress(d.tasks, p.id)}
                    />
                    <b>{progress(d.tasks, p.id)}%</b>
                    <AvatarStack people={projectPeople(d, p.id)} limit={3} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              compact
              title="Your next chapter"
              description="Create a project and bring your team together."
              action={
                <Button onClick={() => show({ kind: "projectForm" })}>
                  Create project
                </Button>
              }
            />
          )}
        </Card>
        <Card
          title="Right now"
          className="right-now"
          action={
            <Segments
              label="Show"
              options={["Team", "Activity"]}
              value={rightTab}
              onChange={setRightTab}
            />
          }
        >
          {rightTab === "Activity" ? (
            <ActivityFeed onTask={(id) => show({ kind: "task", id })} />
          ) : (
            <ul className="dashboard-people">
              {team.map((p) => {
                const state = presence(p, d);
                return (
                  <li key={p.id}>
                    <button onClick={() => show({ kind: "member", id: p.id })}>
                      <Avatar person={p} size={36} online />
                      <span>
                        <strong>{p.full_name}</strong>
                        <small>
                          <i className={"presence-dot " + state.cls} />
                          {state.label}
                          {p.job_title ? " · " + p.job_title : ""}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
