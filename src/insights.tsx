import { useState } from "react";
import { Download, ArrowUpRight, List } from "lucide-react";
import { useStore, useUI, type Row } from "./core";
import {
  Header,
  Card,
  Button,
  IconButton,
  Segments,
  Avatar,
  Line,
  Bars,
  Modal,
  ProjectTag,
} from "./ui";
import { TaskRows } from "./task-rows";
import {
  metrics,
  series,
  dateLabel,
  duration,
  workload,
  overdue,
  exportCSV,
} from "./utils";
export function Insights() {
  const { data: d } = useStore(),
    { show, go } = useUI(),
    [period, setPeriod] = useState("30D"),
    [table, setTable] = useState(false),
    [expanded, setExpanded] = useState(false),
    days = parseInt(period),
    m = metrics(d, days),
    previous = metrics(d, days, days),
    points = series(d, days);
  const projects = d.projects
      .map<Row & { count: number }>((p) => ({
        ...p,
        count: m.done.filter((t) => t.project_id === p.id).length,
      }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count),
    people = [...d.profiles].sort(
      (a, b) => workload(d.tasks, b.id) - workload(d.tasks, a.id),
    ),
    capacity = Math.max(
      1,
      ...people.map((p) =>
        Math.max(p.weekly_capacity, workload(d.tasks, p.id)),
      ),
    ),
    overCapacity = people.filter(
      (p) => workload(d.tasks, p.id) > p.weekly_capacity,
    ).length;
  let offset = 0;
  const chart = (
    <Line
      points={points}
      label="Tasks finished per day, this period and the previous one"
    />
  );
  const change = (value: number, old: number) =>
    old
      ? `${value >= old ? "+" : ""}${Math.round(((value - old) / old) * 100)}% vs previous ${days} days`
      : undefined;
  return (
    <div className="insights-page">
      <Header
        title="Insights"
        subtitle={`How the team worked over the last ${days} days`}
        stats={[
          { label: "Completed", value: m.done.length },
          {
            label: "On-time rate",
            value: m.onTime === null ? "—" : Math.round(m.onTime) + "%",
          },
          {
            label: "Focus hours",
            value: (
              <>
                {Number(m.focus.toFixed(1))}
                <small> h</small>
              </>
            ),
          },
          {
            label: "Avg cycle time",
            value: m.cycle === null ? "—" : m.cycle.toFixed(1) + "d",
          },
        ]}
        actions={
          <>
            <Segments
              label="Reporting period"
              options={["7D", "30D", "90D"]}
              value={period}
              onChange={setPeriod}
            />
            <Button
              onClick={() =>
                exportCSV(
                  "hayola-completed-tasks.csv",
                  [
                    "Task",
                    "Project",
                    "Assignee",
                    "Completed",
                    "Due",
                    "Estimate hours",
                  ],
                  m.done.map((t) => [
                    t.title,
                    d.projects.find((p) => p.id === t.project_id)?.name,
                    d.profiles.find((p) => p.id === t.assignee_id)?.full_name,
                    t.completed_at,
                    t.due_date,
                    t.estimate_hours,
                  ]),
                )
              }
            >
              <Download size={16} />
              Export CSV
            </Button>
          </>
        }
      />
      <div className="insights-grid">
        <Card
          title="Throughput"
          subtitle={
            days === 90 ? "Tasks finished each week" : "Tasks finished each day"
          }
          className="throughput-card"
          action={
            <div className="chart-actions">
              <Button small onClick={() => setTable(!table)}>
                <List size={14} />
                {table ? "Chart" : "Table"}
              </Button>
              <IconButton
                icon={ArrowUpRight}
                label="Expand throughput"
                onClick={() => setExpanded(true)}
              />
            </div>
          }
        >
          <p className="insight-total">
            <strong>{m.done.length}</strong> finished{" "}
            <small
              className={
                m.done.length >= previous.done.length ? "positive" : "muted"
              }
            >
              {change(m.done.length, previous.done.length)}
            </small>
          </p>
          {table ? (
            <div className="report-table-wrap">
              <table className="report-table" aria-label="Task throughput">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Completed</th>
                    <th>Previous period</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.key}>
                      <th>{dateLabel(p.key)}</th>
                      <td>{p.value}</td>
                      <td>{p.previous}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            chart
          )}
          <div className="chart-legend">
            <span>● Last {days} days</span>
            <span>┄ Previous {days} days</span>
          </div>
        </Card>
        <Card
          title="By project"
          subtitle="Where the finished work went"
          className="project-distribution-card"
        >
          <div className="project-donut">
            <svg
              viewBox="0 0 160 160"
              role="img"
              aria-label="Finished tasks by project"
            >
              <circle
                cx="80"
                cy="80"
                r="59"
                fill="none"
                stroke="var(--fill)"
                strokeWidth="16"
              />
              {projects.map((p) => {
                const circumference = 2 * Math.PI * 59,
                  fraction = p.count / Math.max(1, m.done.length),
                  start = offset;
                offset += fraction;
                return (
                  <circle
                    className={"hue-" + p.color}
                    key={p.id}
                    cx="80"
                    cy="80"
                    r="59"
                    fill="none"
                    stroke="var(--hue)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(0, circumference * fraction - 8)} ${circumference}`}
                    strokeDashoffset={-circumference * start}
                    transform="rotate(-90 80 80)"
                  />
                );
              })}
            </svg>
            <div>
              <strong>{m.done.length}</strong>
              <small>finished</small>
            </div>
          </div>
          <table
            className="project-distribution-table"
            aria-label="Completed tasks by project"
          >
            <thead className="sr-only">
              <tr>
                <th>Project</th>
                <th>Completed</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <th>
                    <button onClick={() => go("/projects/" + p.id)}>
                      <ProjectTag project={p} />
                    </button>
                  </th>
                  <td>{p.count}</td>
                  <td>
                    {Math.round((p.count / Math.max(1, m.done.length)) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!projects.length && (
            <p className="chart-empty">Finished tasks will appear here.</p>
          )}
        </Card>
        <Card
          title="Focus"
          subtitle={
            days === 90
              ? "Team focus hours each week"
              : "Team focus hours each day"
          }
          className="insight-focus-card"
        >
          <p className="insight-total">
            <strong>{Number(m.focus.toFixed(1))}</strong> hours{" "}
            <small>about {(m.focus / days).toFixed(1)}h a day</small>
          </p>
          <Bars
            label="Team focus hours"
            values={points.map((p) => ({ ...p, value: p.focus }))}
          />
        </Card>
        <Card
          title="Workload"
          subtitle="Open task hours against weekly capacity"
          className="insight-workload-card"
          action={
            <span className="quiet-chip">
              {overCapacity
                ? `${overCapacity} over capacity`
                : "All within capacity"}
            </span>
          }
        >
          <div className="workload-legend">
            <span>━ Open work</span>
            <span>┃ Capacity</span>
            <span>━ Over capacity</span>
          </div>
          <ul className="insights-workload">
            {people.map((p) => {
              const load = workload(d.tasks, p.id);
              return (
                <li key={p.id}>
                  <button
                    className="workload-person"
                    onClick={() => show({ kind: "member", id: p.id })}
                  >
                    <Avatar person={p} size={28} />
                    <span>
                      <strong>{p.full_name}</strong>
                      <small>{p.job_title || "Team member"}</small>
                    </span>
                  </button>
                  <span
                    className={
                      "workload-bar " + (load > p.weekly_capacity ? "over" : "")
                    }
                  >
                    <i style={{ width: `${(load / capacity) * 100}%` }} />
                    <b
                      style={{
                        left: `${(p.weekly_capacity / capacity) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="workload-value">
                    <strong>{load}h</strong>
                    <small>/ {p.weekly_capacity}h</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card
          title="Needs a little attention"
          subtitle="Overdue work, oldest due dates first"
          className="insight-attention-card"
        >
          <TaskRows
            tasks={d.tasks
              .filter((t) => overdue(t))
              .sort((a, b) => a.due_date.localeCompare(b.due_date))
              .slice(0, 10)}
          />
        </Card>
      </div>
      <p className="form-hint">
        Cycle time runs from first progress to latest completion. Missing dates
        are excluded. Reopened tasks are excluded from completed totals.
      </p>
      {expanded && (
        <Modal title="Throughput" wide onClose={() => setExpanded(false)}>
          {chart}
        </Modal>
      )}
    </div>
  );
}
