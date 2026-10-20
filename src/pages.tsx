import { useState, useEffect } from "react";
import {
  Plus,
  Star,
  Folder,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Square,
  ArrowUpRight,
  Pencil,
  Trash2,
  Download,
  Search,
  Check,
  Users,
  Timer,
  CalendarDays,
  MessageSquare,
  Rocket,
  Leaf,
  Flame,
  Smartphone,
  Grid2X2,
  ChartNoAxesCombined,
  Sparkles,
} from "lucide-react";
import {
  useStore,
  useUI,
  db,
  errorText,
  STATUSES,
  PRIORITIES,
  WALLS,
  type Row,
} from "./core";
import {
  Header,
  Card,
  Button,
  IconButton,
  Empty,
  Avatar,
  AvatarStack,
  ProjectTag,
  Priority,
  Due,
  Ring,
  Checkmark,
  Segments,
  SelectFilter,
  ActivityFeed,
  Line,
  Bars,
  Field,
  Form,
} from "./ui";
import {
  dayKey,
  addDays,
  dateLabel,
  timeLabel,
  weekStart,
  progress,
  overdue,
  focusIn,
  duration,
  elapsed,
  clock,
  metrics,
  series,
  burnup,
  doneIn,
  onTrack,
  daysBetween,
  workload,
  presence,
  exportCSV,
} from "./utils";
import { TaskRows } from "./task-rows";
export { TaskRows } from "./task-rows";
export { Focus } from "./focus";
export function ProjectTile({ project: p }: { project: Row }) {
  const { data: d, session, run, notify } = useStore(),
    { go } = useUI(),
    pin = d.project_pins.some(
      (x) => x.project_id === p.id && x.user_id === session.user.id,
    ),
    members = d.profiles.filter((x) =>
      d.project_members.some(
        (m) =>
          m.project_id === p.id &&
          m.user_id === x.id &&
          m.status === "accepted",
      ),
    ),
    tasks = d.tasks.filter((t) => t.project_id === p.id),
    next = d.milestones
      .filter((m) => m.project_id === p.id && !m.done)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  return (
    <article className="project-tile glass">
      <div className="project-tile-head">
        <button
          className={"project-icon hue-" + p.color}
          aria-label={"Open " + p.name}
          onClick={() => go("/projects/" + p.id)}
        >
          {(() => {
            const Icon =
              (
                {
                  rocket: Rocket,
                  leaf: Leaf,
                  flame: Flame,
                  phone: Smartphone,
                  grid: Grid2X2,
                  chart: ChartNoAxesCombined,
                  sparkle: Sparkles,
                } as Record<string, typeof Folder>
              )[p.icon] || Folder;
            return <Icon size={26} />;
          })()}
        </button>
        <button
          className="project-tile-name"
          onClick={() => go("/projects/" + p.id)}
        >
          <h3>{p.name}</h3>
          <span className="quiet-chip">{p.status}</span>
        </button>
        <IconButton
          icon={Star}
          active={pin}
          label={pin ? "Unpin project" : "Pin project"}
          onClick={() =>
            void run(
              pin
                ? db()
                    .from("project_pins")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("project_id", p.id)
                : db()
                    .from("project_pins")
                    .insert({ user_id: session.user.id, project_id: p.id }),
            ).catch((e) => notify(errorText(e)))
          }
        />
      </div>
      <p className="project-description">
        {p.description || "A new space for your team’s next great idea."}
      </p>
      <button
        className="project-progress"
        onClick={() => go("/projects/" + p.id)}
      >
        <Ring
          size={62}
          value={progress(tasks)}
          label={`${progress(tasks)}% complete`}
        />
        <span>
          <strong>
            {p.status === "Shipped" ? "Shipped" : "Next milestone"}
          </strong>
          <span className="milestone-name">
            {next
              ? next.title
              : p.status === "Shipped"
                ? "Every milestone met"
                : "No upcoming milestones"}
          </span>
          <small>
            {next
              ? `${dateLabel(next.due_date)} · ${daysBetween(dayKey(), next.due_date) < 0 ? "overdue" : "in " + daysBetween(dayKey(), next.due_date) + " days"}`
              : dateLabel(p.due_date)}
          </small>
        </span>
      </button>
      <footer>
        <AvatarStack people={members} />
        <small>
          {tasks.filter((t) => t.status === "Done").length}/{tasks.length} tasks
        </small>
        <span>
          <Due date={p.due_date} />
        </span>
      </footer>
    </article>
  );
}
export { Home } from "./home";
export function Tasks({
  projectId,
  embedded = false,
}: {
  projectId?: string;
  embedded?: boolean;
}) {
  const { data: d, session, taskChange, notify } = useStore(),
    { show } = useUI();
  const [view, setView] = useState("Board"),
    [project, setProject] = useState("all"),
    [person, setPerson] = useState("all"),
    [priority, setPriority] = useState("all"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("Manual");
  let tasks = d.tasks.filter(
    (t) =>
      (!projectId || t.project_id === projectId) &&
      (project === "all" || t.project_id === project) &&
      (person === "all" ||
        (person === "me"
          ? t.assignee_id === session.user.id
          : !t.assignee_id)) &&
      (priority === "all" || t.priority === priority) &&
      `${t.title} ${d.projects.find((p) => p.id === t.project_id)?.name || ""} ${d.profiles.find((p) => p.id === t.assignee_id)?.full_name || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  tasks = [...tasks].sort((a, b) =>
    sort === "Due date"
      ? (a.due_date || "9999").localeCompare(b.due_date || "9999")
      : sort === "Priority"
        ? ["Urgent", "High", "Medium", "Low"].indexOf(a.priority) -
          ["Urgent", "High", "Medium", "Low"].indexOf(b.priority)
        : a.sort_order - b.sort_order,
  );
  const move = async (t: Row, status: string) => {
    try {
      await taskChange(t, {
        status,
        sort_order:
          Math.max(
            0,
            ...d.tasks
              .filter((x) => x.status === status)
              .map((x) => x.sort_order),
          ) + 1024,
      });
      notify("Task moved");
    } catch (e) {
      notify(errorText(e));
    }
  };
  return (
    <>
      {!embedded && (
        <Header
          title="Tasks"
          subtitle={`${tasks.filter((t) => t.status !== "Done").length} open across ${new Set(tasks.map((t) => t.project_id)).size} projects`}
          stats={[
            {
              label: "Open",
              value: tasks.filter((t) => t.status !== "Done").length,
            },
            {
              label: "Due this week",
              value: tasks.filter(
                (t) =>
                  t.status !== "Done" &&
                  t.due_date &&
                  t.due_date >= weekStart() &&
                  t.due_date <= addDays(weekStart(), 6),
              ).length,
            },
            { label: "Overdue", value: tasks.filter((t) => overdue(t)).length },
            {
              label: "Done this week",
              value: doneIn(tasks, weekStart()).length,
            },
          ]}
          actions={
            <>
              <Segments
                label="Task view"
                options={["Board", "List"]}
                value={view}
                onChange={setView}
              />
              <Button
                primary
                onClick={() => show({ kind: "taskForm", projectId })}
              >
                <Plus size={16} />
                New task
              </Button>
            </>
          }
        />
      )}
      <div className="filters task-filters glass">
        {embedded && (
          <Segments
            label="Task view"
            options={["Board", "List"]}
            value={view}
            onChange={setView}
          />
        )}
        <div className="filter-search glass">
          <Search size={16} />
          <input
            aria-label="Filter tasks"
            placeholder="Filter by title, project or person"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!projectId && (
          <SelectFilter
            label="Project"
            value={project}
            onChange={setProject}
            options={[
              { value: "all", label: "All projects" },
              ...d.projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        )}
        <SelectFilter
          label="Assignee"
          value={person}
          onChange={setPerson}
          options={[
            { value: "all", label: "Everyone" },
            { value: "me", label: "Assigned to me" },
            { value: "none", label: "Unassigned" },
          ]}
        />
        <SelectFilter
          label="Priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "all", label: "Any priority" },
            ...PRIORITIES.map((p) => ({ value: p, label: p })),
          ]}
        />
        {view === "List" && (
          <>
            {" "}
            <SelectFilter
              label="Sort tasks"
              value={sort}
              onChange={setSort}
              options={["Manual", "Due date", "Priority"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </>
        )}
      </div>
      {view === "List" ? (
        <Card title="All tasks" subtitle={`${tasks.length} tasks`}>
          <TaskRows tasks={tasks} />
        </Card>
      ) : (
        <div className="board">
          {STATUSES.map((status) => (
            <section
              aria-label={status}
              className="board-column glass"
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const t = d.tasks.find(
                  (t) => t.id === e.dataTransfer.getData("text/plain"),
                );
                if (t) void move(t, status);
              }}
            >
              <header>
                <i
                  className={
                    "status-dot status-" +
                    status.toLowerCase().replaceAll(" ", "-")
                  }
                />
                <h2>{status}</h2>
                <span>{tasks.filter((t) => t.status === status).length}</span>
                <IconButton
                  icon={Plus}
                  label={"Add " + status + " task"}
                  onClick={() => show({ kind: "taskForm", projectId, status })}
                />
              </header>
              {tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <article
                    className={
                      "task-card glass hue-" +
                      (d.projects.find((p) => p.id === t.project_id)?.color ||
                        "blue")
                    }
                    key={t.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", t.id)
                    }
                  >
                    <div>
                      <ProjectTag
                        project={d.projects.find((p) => p.id === t.project_id)}
                      />
                      {["High", "Urgent"].includes(t.priority) && (
                        <Priority value={t.priority} />
                      )}
                    </div>
                    <button
                      className="task-card-title"
                      onClick={() => show({ kind: "task", id: t.id })}
                    >
                      {t.title}
                    </button>
                    {d.subtasks.some((s) => s.task_id === t.id) && (
                      <div className="task-subtask-progress">
                        <meter
                          aria-label="Subtasks completed"
                          min={0}
                          max={
                            d.subtasks.filter((s) => s.task_id === t.id).length
                          }
                          value={
                            d.subtasks.filter(
                              (s) => s.task_id === t.id && s.done,
                            ).length
                          }
                        />
                        <small>
                          {
                            d.subtasks.filter(
                              (s) => s.task_id === t.id && s.done,
                            ).length
                          }
                          /{d.subtasks.filter((s) => s.task_id === t.id).length}
                        </small>
                      </div>
                    )}
                    <footer>
                      <span className="task-card-due">
                        <CalendarDays size={12} />
                        <Due date={t.due_date} done={t.status === "Done"} />
                      </span>
                      {d.comments.some((c) => c.task_id === t.id) && (
                        <span className="task-comment-count">
                          <MessageSquare size={12} />
                          {d.comments.filter((c) => c.task_id === t.id).length}
                        </span>
                      )}
                      <Avatar
                        person={d.profiles.find((p) => p.id === t.assignee_id)}
                        size={26}
                      />
                    </footer>
                    <select
                      className="move-task"
                      aria-label={"Move " + t.title}
                      value={t.status}
                      onChange={(e) => void move(t, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </article>
                ))}
              <button
                className="add-task"
                onClick={() => show({ kind: "taskForm", projectId, status })}
              >
                <Plus size={15} />
                Add task
              </button>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
export function Projects({ id }: { id?: string }) {
  const { data: d, session, save, remove, run, rpc, notify } = useStore(),
    { show, go } = useUI();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All"),
    [tab, setTab] = useState("Overview");
  const p = d.projects.find((p) => p.id === id),
    owned = p?.owner_id === session.user.id;
  const action = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      notify(errorText(e));
    }
  };
  if (id && !p)
    return (
      <Empty
        title="Project unavailable"
        action={<Button onClick={() => go("/projects")}>All projects</Button>}
      />
    );
  if (p) {
    const members = d.profiles.filter((x) =>
      d.project_members.some(
        (m) =>
          m.project_id === p.id &&
          m.user_id === x.id &&
          m.status === "accepted",
      ),
    );
    return (
      <>
        <button className="back-link" onClick={() => go("/projects")}>
          ← All projects
        </button>
        <Header
          title={p.name}
          subtitle={p.description}
          stats={[
            { label: "Progress", value: progress(d.tasks, id) + "%" },
            { label: "Members", value: members.length },
            { label: "Target", value: dateLabel(p.due_date) },
          ]}
          actions={
            <>
              <Button onClick={() => show({ kind: "taskForm", projectId: id })}>
                <Plus size={15} />
                Add task
              </Button>
              {owned && (
                <IconButton
                  icon={Pencil}
                  label="Edit project"
                  onClick={() => show({ kind: "projectForm", id })}
                />
              )}
            </>
          }
        />
        <Segments
          label="Project view"
          options={["Overview", "Tasks", "Team"]}
          value={tab}
          onChange={setTab}
        />
        {tab === "Tasks" ? (
          <Tasks projectId={id} embedded />
        ) : tab === "Team" ? (
          <Card
            title="Project team"
            action={
              owned && (
                <Button onClick={() => show({ kind: "invite", projectId: id })}>
                  <Plus size={15} />
                  Add person
                </Button>
              )
            }
          >
            <div className="member-list">
              {members.map((m) => (
                <div key={m.id}>
                  <button onClick={() => show({ kind: "member", id: m.id })}>
                    <Avatar person={m} size={42} />
                    <span>
                      <strong>{m.full_name}</strong>
                      <small>{m.email}</small>
                    </span>
                  </button>
                  <span>{m.id === p.owner_id ? "Owner" : "Member"}</span>
                  {owned && m.id !== p.owner_id && (
                    <IconButton
                      icon={Trash2}
                      label={"Remove " + m.full_name}
                      onClick={() =>
                        show({
                          kind: "confirm",
                          title: "Remove member?",
                          body: "They will lose project access and their tasks will become unassigned.",
                          label: "Remove member",
                          run: () =>
                            rpc("remove_project_member", {
                              p_project_id: id,
                              p_user_id: m.id,
                            }),
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="detail-grid">
            <Card title="Progress" subtitle="Completed tasks and total scope">
              <Line points={burnup(p, d.tasks)} label="Project burnup" />
              <div className="chart-legend">
                <span>● Done</span>
                <span>┄ Total scope</span>
              </div>
            </Card>
            <Card
              title="Milestones"
              action={
                owned && (
                  <IconButton
                    icon={Plus}
                    label="Add milestone"
                    onClick={() =>
                      show({ kind: "milestoneForm", projectId: id })
                    }
                  />
                )
              }
            >
              {d.milestones
                .filter((m) => m.project_id === id)
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map((m) => (
                  <div className="milestone" key={m.id}>
                    <Checkmark
                      label={"Complete " + m.title}
                      checked={m.done}
                      disabled={!owned}
                      onChange={() =>
                        void action(() =>
                          save("milestones", { done: !m.done }, m.id),
                        )
                      }
                    />
                    <button
                      disabled={!owned}
                      onClick={() =>
                        show({ kind: "milestoneForm", id: m.id, projectId: id })
                      }
                    >
                      {m.title}
                      <small>{dateLabel(m.due_date)}</small>
                    </button>
                    <IconButton
                      icon={Trash2}
                      disabled={!owned}
                      label={"Delete " + m.title}
                      onClick={() =>
                        void action(() => remove("milestones", m.id))
                      }
                    />
                  </div>
                ))}
              {!d.milestones.some((m) => m.project_id === id) && (
                <Empty
                  compact
                  title="Set your next marker"
                  description="Break a big project into meaningful milestones."
                />
              )}
            </Card>
            <Card title="Recent activity">
              <ActivityFeed
                projectId={id}
                onTask={(id) => show({ kind: "task", id })}
              />
            </Card>
            <Card title="Project timeline">
              <dl className="detail-metadata">
                <div>
                  <dt>Start</dt>
                  <dd>{dateLabel(p.start_date)}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{dateLabel(p.due_date)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{p.status}</dd>
                </div>
                <div>
                  <dt>Lead</dt>
                  <dd>
                    {d.profiles.find((x) => x.id === p.owner_id)?.full_name}
                  </dd>
                </div>
              </dl>
              {owned && (
                <Button
                  onClick={() =>
                    show({
                      kind: "confirm",
                      title: "Archive project?",
                      body: "The project and its tasks will be hidden from the workspace.",
                      label: "Archive project",
                      run: async () => {
                        await save(
                          "projects",
                          { deleted_at: new Date().toISOString() },
                          id,
                        );
                        go("/projects");
                        notify("Project archived", {
                          label: "Undo",
                          run: () =>
                            void run(
                              db()
                                .from("projects")
                                .update({ deleted_at: null })
                                .eq("id", id!),
                            ).catch((e) => notify(errorText(e))),
                        });
                      },
                    })
                  }
                >
                  Archive project
                </Button>
              )}
            </Card>
          </div>
        )}
      </>
    );
  }
  const projects = d.projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" ||
        (filter === "Pinned" &&
          d.project_pins.some((pin) => pin.project_id === p.id)) ||
        (filter === "Active" &&
          ["In progress", "In review"].includes(p.status)) ||
        p.status === filter),
  );
  return (
    <>
      <Header
        title="Projects"
        subtitle={`${d.projects.filter((p) => p.status !== "Shipped").length} in flight · ${d.projects.filter((p) => p.status === "Shipped").length} shipped`}
        stats={[
          {
            label: "Active",
            value: d.projects.filter((p) =>
              ["In progress", "In review"].includes(p.status),
            ).length,
          },
          {
            label: "Shipped",
            value: d.projects.filter((p) => p.status === "Shipped").length,
          },
          {
            label: "On track",
            value: d.projects.length
              ? Math.round(
                  (d.projects.filter((p) => onTrack(p, d.tasks)).length /
                    d.projects.length) *
                    100,
                ) + "%"
              : "—",
          },
          {
            label: "Due this month",
            value: d.projects.filter(
              (p) =>
                p.status !== "Shipped" &&
                p.due_date?.slice(0, 7) === dayKey().slice(0, 7),
            ).length,
          },
        ]}
        actions={
          <>
            <Segments
              label="Project filter"
              options={["All", "Active", "Planning", "Shipped", "Pinned"]}
              value={filter}
              onChange={setFilter}
            />
            <details className="project-search">
              <summary aria-label="Search projects">
                <Search size={17} />
              </summary>
              <input
                aria-label="Search projects"
                placeholder="Find a project…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </details>
            <Button primary onClick={() => show({ kind: "projectForm" })}>
              <Plus size={16} />
              New project
            </Button>
          </>
        }
      />
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectTile project={p} key={p.id} />
          ))}
        </div>
      ) : (
        <Empty
          title={
            d.projects.length
              ? "No matching projects"
              : "Make space for something great"
          }
          description={
            d.projects.length
              ? "Try another filter or search."
              : "Create your first project, then add your team and tasks."
          }
          action={
            <Button primary onClick={() => show({ kind: "projectForm" })}>
              Create project
            </Button>
          }
        />
      )}
    </>
  );
}
export { Calendar } from "./calendar";
export { Team } from "./team";
export { Insights } from "./insights";
export { Settings } from "./settings";
