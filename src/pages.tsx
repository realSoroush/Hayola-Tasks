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
} from "lucide-react";
import {
  useStore,
  useUI,
  db,
  errorText,
  STATUSES,
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
  workload,
  presence,
  exportCSV,
} from "./utils";
export function TaskRows({ tasks }: { tasks: Row[] }) {
  const { data: d, taskChange, notify } = useStore(),
    { show } = useUI();
  return tasks.length ? (
    <ul className="task-rows">
      {tasks.map((t) => (
        <li key={t.id}>
          <Checkmark
            label={"Complete " + t.title}
            checked={t.status === "Done"}
            onChange={() =>
              void taskChange(t, {
                status: t.status === "Done" ? "To do" : "Done",
              }).catch((e) => notify(errorText(e)))
            }
          />
          <button
            className={"task-title " + (t.status === "Done" ? "strike" : "")}
            onClick={() => show({ kind: "task", id: t.id })}
          >
            {t.title}
            <small>
              <ProjectTag
                project={d.projects.find((p) => p.id === t.project_id)}
              />
            </small>
          </button>
          <Due date={t.due_date} done={t.status === "Done"} />
          <Avatar
            person={d.profiles.find((p) => p.id === t.assignee_id)}
            size={27}
          />
        </li>
      ))}
    </ul>
  ) : (
    <Empty
      compact
      title="A clean slate"
      description="Add a task when you’re ready."
    />
  );
}
export function Focus({ compact = false }: { compact?: boolean }) {
  const { data: d, session, settings, rpc, notify } = useStore();
  const [tick, setTick] = useState(Date.now()),
    [task, setTask] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const s = d.focus_sessions.find(
      (s) =>
        s.user_id === session.user.id &&
        ["running", "paused"].includes(s.status),
    ),
    seconds = s
      ? Math.max(0, s.planned_seconds - elapsed(s, tick))
      : settings.focus_minutes * 60;
  const command = async (action: string) => {
    setBusy(true);
    try {
      await rpc("focus_command", {
        p_action: action,
        ...(action === "start"
          ? { p_task_id: task || null, p_minutes: settings.focus_minutes }
          : {}),
      });
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={"focus-widget " + (compact ? "compact-focus" : "")}>
      <Ring
        value={s ? (elapsed(s, tick) / s.planned_seconds) * 100 : 0}
        size={compact ? 70 : 112}
        color="var(--green)"
        label="Focus timer"
      >
        <strong className="timer-digits">{clock(seconds)}</strong>
      </Ring>
      <p>
        {s
          ? d.tasks.find((t) => t.id === s.task_id)?.title ||
            "Time for deep work"
          : "One thing at a time."}
      </p>
      {!s && (
        <select
          aria-label="Focus task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
        >
          <option value="">Open focus</option>
          {d.tasks
            .filter((t) => t.status !== "Done")
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      )}
      <div className="focus-controls">
        {s ? (
          <>
            <Button
              disabled={busy}
              primary
              onClick={() =>
                void command(
                  seconds <= 0
                    ? "complete"
                    : s.status === "running"
                      ? "pause"
                      : "resume",
                )
              }
            >
              {seconds <= 0 ? (
                <Check size={16} />
              ) : s.status === "running" ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}{" "}
              {seconds <= 0
                ? "Complete"
                : s.status === "running"
                  ? "Pause"
                  : "Resume"}
            </Button>
            <IconButton
              icon={Plus}
              label="Add five minutes"
              disabled={busy}
              onClick={() => void command("extend")}
            />
            <IconButton
              icon={Square}
              label="End session"
              disabled={busy}
              onClick={() => void command("end")}
            />
          </>
        ) : (
          <Button disabled={busy} primary onClick={() => void command("start")}>
            <Play size={16} />
            Start focus
          </Button>
        )}
      </div>
      <div className="focus-total">
        <Timer size={16} />
        <span>Focused today</span>
        <strong>
          {duration(
            focusIn(
              d.focus_sessions.filter((s) => s.user_id === session.user.id),
              dayKey(),
            ) * 3600,
          )}
        </strong>
      </div>
    </div>
  );
}
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
          <Folder size={26} />
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
            {tasks.filter((t) => t.status === "Done").length} of {tasks.length}{" "}
            tasks done
          </strong>
          <small>
            {next ? "Next: " + next.title : "No upcoming milestones"}
          </small>
        </span>
      </button>
      <footer>
        <AvatarStack people={members} />
        <small>
          {members.length} {members.length === 1 ? "member" : "members"}
        </small>
        <span>
          <Due date={p.due_date} />
        </span>
      </footer>
    </article>
  );
}
export function Home() {
  const { data: d, session, me } = useStore(),
    { show, go } = useUI();
  const mine = d.tasks.filter((t) => t.assignee_id === session.user.id),
    today = mine.filter((t) => t.due_date === dayKey()),
    done = today.filter((t) => t.status === "Done").length,
    events = d.calendar_events
      .filter((e) => dayKey(e.starts_at) === dayKey())
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    week = weekStart(),
    next = events.find((e) => Date.parse(e.ends_at) > Date.now());
  return (
    <>
      <Header
        title={`Good ${Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", hour: "numeric", hour12: false }).format(new Date())) < 12 ? "morning" : "afternoon"}, ${me?.full_name?.split(" ")[0] || "there"}.`}
        subtitle="A little clarity. A lot of possibility."
        stats={[
          {
            label: "Open tasks",
            value: mine.filter((t) => t.status !== "Done").length,
          },
          { label: "Projects", value: d.projects.length },
          {
            label: "Focus this week",
            value: duration(
              focusIn(
                d.focus_sessions.filter((s) => s.user_id === session.user.id),
                week,
              ) * 3600,
            ),
          },
        ]}
        actions={
          <Button primary onClick={() => show({ kind: "taskForm" })}>
            <Plus size={16} />
            New task
          </Button>
        }
      />
      <div className="home-grid">
        <Card
          title="Today at a glance"
          subtitle={dateLabel(dayKey(), {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          className="today-card"
        >
          <div className="today-ring">
            <Ring
              size={153}
              width={12}
              value={today.length ? (done / today.length) * 100 : 0}
              color="var(--pink)"
              label={`${done} of ${today.length} tasks due today completed`}
            >
              <strong>
                {done}
                <small>/{today.length}</small>
              </strong>
            </Ring>
          </div>
          <div className="today-legend">
            <span>
              <i className="dot pink" />
              Tasks done{" "}
              <b>
                {done}/{today.length}
              </b>
            </span>
            <span>
              <i className="dot green" />
              Focus{" "}
              <b>
                {duration(
                  focusIn(
                    d.focus_sessions.filter(
                      (s) => s.user_id === session.user.id,
                    ),
                    dayKey(),
                  ) * 3600,
                )}
              </b>
            </span>
            <span>
              <i className="dot cyan" />
              Meetings <b>{events.length}</b>
            </span>
          </div>
        </Card>
        <Card title="Focus" subtitle="Find your flow." className="focus-card">
          <Focus />
        </Card>
        <Card
          title="Up next"
          subtitle="A little room to prepare."
          className="next-card"
        >
          {next ? (
            <div className="next-event">
              <span className="quiet-chip">{next.type}</span>
              <strong className="meeting-time">
                {timeLabel(next.starts_at)}
              </strong>
              <h3>{next.title}</h3>
              <p>{next.location || "Your calendar"}</p>
              <AvatarStack
                people={d.profiles.filter((p) =>
                  next.attendee_ids.includes(p.id),
                )}
              />
              <Button
                primary
                onClick={() => show({ kind: "event", id: next.id })}
              >
                View event
                <ArrowUpRight size={15} />
              </Button>
            </div>
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
          title="My tasks"
          subtitle="Your next small wins."
          className="my-tasks-card"
          action={
            <IconButton
              icon={ArrowUpRight}
              label="View tasks"
              onClick={() => go("/tasks")}
            />
          }
        >
          <TaskRows
            tasks={mine
              .filter((t) => t.status !== "Done")
              .sort((a, b) =>
                (a.due_date || "9999").localeCompare(b.due_date || "9999"),
              )
              .slice(0, 7)}
          />
          <Button onClick={() => show({ kind: "taskForm" })}>
            <Plus size={15} />
            Add task
          </Button>
        </Card>
        <Card
          title="This week"
          subtitle={`${dateLabel(week)} – ${dateLabel(addDays(week, 6))}`}
          className="week-card"
        >
          <div className="week-strip">
            {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(
              (key) => (
                <div className={key === dayKey() ? "today" : ""} key={key}>
                  <small>{dateLabel(key, { weekday: "short" })}</small>
                  <strong>{key.slice(-2)}</strong>
                  <span>
                    {d.calendar_events.filter(
                      (e) => dayKey(e.starts_at) === key,
                    ).length || "·"}
                  </span>
                </div>
              ),
            )}
          </div>
          <div className="agenda">
            {d.calendar_events
              .filter(
                (e) =>
                  dayKey(e.starts_at) >= week &&
                  dayKey(e.starts_at) <= addDays(week, 6),
              )
              .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              .slice(0, 5)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => show({ kind: "event", id: e.id })}
                >
                  <time>
                    {dateLabel(dayKey(e.starts_at), { weekday: "short" })}
                    <small>{timeLabel(e.starts_at)}</small>
                  </time>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {e.type} · {e.location || "Calendar"}
                    </small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
          </div>
          {!d.calendar_events.some(
            (e) =>
              dayKey(e.starts_at) >= week &&
              dayKey(e.starts_at) <= addDays(week, 6),
          ) && (
            <Empty
              compact
              title="Your week is open"
              description="Put important time on the calendar."
            />
          )}
        </Card>
        <Card
          title="Projects"
          subtitle="Big ideas, moving forward."
          className="home-projects"
          action={
            <IconButton
              icon={ArrowUpRight}
              label="All projects"
              onClick={() => go("/projects")}
            />
          }
        >
          {d.projects.length ? (
            <div className="project-summary">
              {d.projects.slice(0, 4).map((p) => (
                <button key={p.id} onClick={() => go("/projects/" + p.id)}>
                  <i className={"project-square hue-" + p.color} />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.status}</small>
                  </span>
                  <Ring
                    size={45}
                    width={4}
                    value={progress(d.tasks, p.id)}
                    label="Project progress"
                  />
                </button>
              ))}
            </div>
          ) : (
            <Empty
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
          subtitle="The team’s latest moves."
          className="right-now"
        >
          <ActivityFeed onTask={(id) => show({ kind: "task", id })} />
        </Card>
      </div>
    </>
  );
}
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
      t.title.toLowerCase().includes(query.toLowerCase()),
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
          subtitle="From a thought to a thing done."
          stats={[
            {
              label: "Open",
              value: tasks.filter((t) => t.status !== "Done").length,
            },
            { label: "Overdue", value: tasks.filter((t) => overdue(t)).length },
            {
              label: "Done",
              value: tasks.filter((t) => t.status === "Done").length,
            },
          ]}
          actions={
            <Button
              primary
              onClick={() => show({ kind: "taskForm", projectId })}
            >
              <Plus size={16} />
              New task
            </Button>
          }
        />
      )}
      <div className="filters">
        <Segments
          label="Task view"
          options={["Board", "List"]}
          value={view}
          onChange={setView}
        />
        <div className="filter-search glass">
          <Search size={16} />
          <input
            aria-label="Filter tasks"
            placeholder="Filter tasks…"
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
          label="Sort tasks"
          value={sort}
          onChange={setSort}
          options={["Manual", "Due date", "Priority"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </div>
      {view === "List" ? (
        <Card title="All tasks" subtitle={`${tasks.length} tasks`}>
          <TaskRows tasks={tasks} />
        </Card>
      ) : (
        <div className="board">
          {STATUSES.map((status) => (
            <section
              className="board-column"
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
                    className="task-card glass"
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
                      <Priority value={t.priority} />
                    </div>
                    <button
                      className="task-card-title"
                      onClick={() => show({ kind: "task", id: t.id })}
                    >
                      {t.title}
                    </button>
                    {d.subtasks.some((s) => s.task_id === t.id) && (
                      <small>
                        {
                          d.subtasks.filter((s) => s.task_id === t.id && s.done)
                            .length
                        }
                        /{d.subtasks.filter((s) => s.task_id === t.id).length}{" "}
                        subtasks
                      </small>
                    )}
                    <footer>
                      <Due date={t.due_date} done={t.status === "Done"} />
                      <span>
                        {d.comments.filter((c) => c.task_id === t.id).length}{" "}
                        comments
                      </span>
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
        p.status === filter),
  );
  return (
    <>
      <Header
        title="Projects"
        subtitle="The big picture, beautifully in focus."
        stats={[
          {
            label: "Active projects",
            value: d.projects.filter((p) => p.status !== "Shipped").length,
          },
          {
            label: "Tasks in motion",
            value: d.tasks.filter((t) => t.status === "In progress").length,
          },
          {
            label: "Shipped",
            value: d.projects.filter((p) => p.status === "Shipped").length,
          },
        ]}
        actions={
          <Button primary onClick={() => show({ kind: "projectForm" })}>
            <Plus size={16} />
            New project
          </Button>
        }
      />
      <div className="filters">
        <Segments
          label="Project filter"
          options={["All", "Pinned", "In progress", "Shipped"]}
          value={filter}
          onChange={setFilter}
        />
        <div className="filter-search glass">
          <Search size={16} />
          <input
            aria-label="Search projects"
            placeholder="Find a project…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectTile project={p} key={p.id} />
          ))}
        </div>
      ) : (
        <Empty
          title="Make space for something great"
          description="Create your first project, then add your team and tasks."
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
export function Calendar() {
  const { data: d } = useStore(),
    { show } = useUI(),
    [date, setDate] = useState(dayKey()),
    [view, setView] = useState("Month");
  const first = date.slice(0, 7) + "-01",
    start = view === "Week" ? weekStart(date) : weekStart(first),
    count = view === "Week" ? 7 : 42,
    events = d.calendar_events;
  return (
    <>
      <Header
        title="Calendar"
        subtitle="Give your best work a little room."
        stats={[
          {
            label: "This week",
            value: events.filter(
              (e) =>
                dayKey(e.starts_at) >= weekStart() &&
                dayKey(e.starts_at) <= addDays(weekStart(), 6),
            ).length,
          },
          {
            label: "Today",
            value: events.filter((e) => dayKey(e.starts_at) === dayKey())
              .length,
          },
          { label: "Timezone", value: "Tehran" },
        ]}
        actions={
          <Button primary onClick={() => show({ kind: "eventForm", date })}>
            <Plus size={16} />
            New event
          </Button>
        }
      />
      <div className="calendar-toolbar">
        <div>
          <IconButton
            icon={ChevronLeft}
            label="Previous period"
            onClick={() =>
              setDate(
                view === "Week"
                  ? addDays(date, -7)
                  : new Date(
                      Date.UTC(
                        Number(date.slice(0, 4)),
                        Number(date.slice(5, 7)) - 2,
                        15,
                      ),
                    )
                      .toISOString()
                      .slice(0, 10),
              )
            }
          />
          <h2>{dateLabel(date, { month: "long", year: "numeric" })}</h2>
          <IconButton
            icon={ChevronRight}
            label="Next period"
            onClick={() =>
              setDate(
                view === "Week"
                  ? addDays(date, 7)
                  : new Date(
                      Date.UTC(
                        Number(date.slice(0, 4)),
                        Number(date.slice(5, 7)),
                        15,
                      ),
                    )
                      .toISOString()
                      .slice(0, 10),
              )
            }
          />
          <Button small onClick={() => setDate(dayKey())}>
            Today
          </Button>
        </div>
        <Segments
          label="Calendar view"
          options={["Month", "Week"]}
          value={view}
          onChange={setView}
        />
      </div>
      <section
        className={"calendar glass " + (view === "Week" ? "week-view" : "")}
        aria-label="Calendar"
      >
        <div className="calendar-labels">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <div className="calendar-days">
          {Array.from({ length: count }, (_, i) => addDays(start, i)).map(
            (key) => (
              <div
                className={`calendar-day ${key === dayKey() ? "is-today" : ""} ${key.slice(0, 7) !== date.slice(0, 7) ? "outside" : ""}`}
                key={key}
              >
                <button
                  className="date-button"
                  aria-label={"Add event " + key}
                  onClick={() => show({ kind: "eventForm", date: key })}
                >
                  {Number(key.slice(-2))}
                </button>
                {events
                  .filter((e) => dayKey(e.starts_at) === key)
                  .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                  .map((e) => (
                    <button
                      className={
                        "calendar-event type-" +
                        e.type.toLowerCase().replaceAll(" ", "-")
                      }
                      key={e.id}
                      onClick={() => show({ kind: "event", id: e.id })}
                    >
                      <small>{timeLabel(e.starts_at)}</small>
                      <strong>{e.title}</strong>
                    </button>
                  ))}
              </div>
            ),
          )}
        </div>
      </section>
      <p className="form-hint">
        All event times are shown in Asia/Tehran (Gregorian calendar).
      </p>
    </>
  );
}
export function Team() {
  const { data: d } = useStore(),
    { show } = useUI(),
    [query, setQuery] = useState("");
  const people = d.profiles.filter((p) =>
    `${p.full_name} ${p.email} ${p.team}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <Header
        title="Team"
        subtitle="Good people. Good work. Together."
        stats={[
          { label: "People", value: d.profiles.length },
          {
            label: "Online",
            value: d.profiles.filter((p) => presence(p, d).cls === "online")
              .length,
          },
          {
            label: "In focus",
            value: d.profiles.filter((p) => presence(p, d).cls === "focus")
              .length,
          },
        ]}
        actions={
          <Button primary onClick={() => show({ kind: "invite" })}>
            <Plus size={16} />
            Add person
          </Button>
        }
      />
      <div className="filters">
        <div className="filter-search glass">
          <Search size={16} />
          <input
            aria-label="Search team"
            placeholder="Find someone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="muted">People who share a project with you.</p>
      </div>
      <div className="team-grid">
        {people.map((p) => {
          const state = presence(p, d),
            load = workload(d.tasks, p.id);
          return (
            <button
              className="team-card glass"
              key={p.id}
              onClick={() => show({ kind: "member", id: p.id })}
            >
              <div>
                <Avatar person={p} size={58} online />
                <span className={"team-presence " + state.cls}>
                  <i />
                  {state.label}
                </span>
              </div>
              <h3>{p.full_name}</h3>
              <p>{p.job_title || "Team member"}</p>
              <span className="quiet-chip">{p.team}</span>
              <div className="member-load">
                <span>Workload</span>
                <strong>
                  {load}h / {p.weekly_capacity}h
                </strong>
              </div>
              <meter
                min={0}
                max={Math.max(load, p.weekly_capacity)}
                value={load}
              />
              <small>
                {
                  d.tasks.filter(
                    (t) => t.assignee_id === p.id && t.status !== "Done",
                  ).length
                }{" "}
                open tasks · {timeLabel(new Date(), p.timezone)}
              </small>
            </button>
          );
        })}
      </div>
      <p className="form-hint">
        Workload includes all open task estimates, compared with weekly
        capacity. Presence reflects the latest app heartbeat.
      </p>
    </>
  );
}
export function Insights() {
  const { data: d } = useStore(),
    [period, setPeriod] = useState("30 days"),
    days = parseInt(period),
    m = metrics(d, days),
    points = series(d, days),
    previous = metrics(d, days, days);
  return (
    <>
      <Header
        title="Insights"
        subtitle="Small steps add up. Here’s the picture."
        stats={[
          {
            label: "Tasks completed",
            value: m.done.length,
            change: `Previous period: ${previous.done.length}`,
          },
          {
            label: "On-time rate",
            value: m.onTime === null ? "—" : Math.round(m.onTime) + "%",
          },
          {
            label: "Average cycle",
            value: m.cycle === null ? "—" : m.cycle.toFixed(1) + "d",
          },
          { label: "Focus time", value: duration(m.focus * 3600) },
        ]}
        actions={
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
        }
      />
      <div className="filters">
        <Segments
          label="Reporting period"
          options={["7 days", "30 days", "90 days"]}
          value={period}
          onChange={setPeriod}
        />
        <span className="muted">
          {dateLabel(m.from)} – {dateLabel(m.to)}
        </span>
      </div>
      <div className="detail-grid">
        <Card
          title="Tasks completed"
          subtitle="Current period compared with the previous period"
        >
          <Line points={points} label="Completed tasks over time" />
          <div className="chart-legend">
            <span>● Current period</span>
            <span>┄ Previous period</span>
          </div>
        </Card>
        <Card title="Task distribution" subtitle="All visible tasks, right now">
          <div className="distribution">
            <Ring
              size={145}
              value={progress(d.tasks)}
              label="Tasks completed"
            />
            {STATUSES.map((s) => (
              <div key={s}>
                <span>{s}</span>
                <strong>{d.tasks.filter((t) => t.status === s).length}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Focus time" subtitle="Hours recorded in each period">
          <Bars
            label="Focus hours"
            values={points.map((p) => ({ ...p, value: p.focus }))}
          />
        </Card>
        <Card
          title="Team workload"
          subtitle="Open estimates against weekly capacity"
        >
          {d.profiles.map((p) => (
            <div className="workload-row" key={p.id}>
              <Avatar person={p} />
              <span>{p.full_name}</span>
              <strong>
                {workload(d.tasks, p.id)}h / {p.weekly_capacity}h
              </strong>
              <meter
                min={0}
                max={Math.max(workload(d.tasks, p.id), p.weekly_capacity)}
                value={workload(d.tasks, p.id)}
              />
            </div>
          ))}
        </Card>
        <Card
          title="Needs a little attention"
          subtitle="Overdue tasks, oldest due date first"
          className="full-width"
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
    </>
  );
}
export function Settings() {
  const { data: d, me, settings: s, session, save, notify } = useStore();
  const [tab, setTab] = useState("Appearance"),
    [profile, setProfile] = useState(() => ({
      full_name: me?.full_name || "",
      job_title: me?.job_title || "",
      team: me?.team || "Product",
      timezone: me?.timezone || "Asia/Tehran",
      weekly_capacity: me?.weekly_capacity || 40,
    }));
  const update = async (values: Record<string, unknown>) => {
    try {
      await save("user_settings", values, session.user.id);
      notify("Preferences saved");
    } catch (e) {
      notify(errorText(e));
    }
  };
  return (
    <>
      <Header title="Settings" subtitle="Make a little space your own." />
      <Segments
        label="Settings section"
        options={["Appearance", "Profile", "Focus", "Notifications", "Account"]}
        value={tab}
        onChange={setTab}
      />
      <div className="settings-content">
        {tab === "Appearance" ? (
          <>
            <Card title="Appearance" subtitle="Set the mood for your work.">
              <Field label="Theme">
                <Segments
                  label="Theme"
                  options={["light", "dark", "auto"]}
                  value={s.theme}
                  onChange={(theme) => void update({ theme })}
                />
              </Field>
              <Field label="Accent colour">
                <div className="accent-picker">
                  {[
                    "blue",
                    "purple",
                    "pink",
                    "orange",
                    "green",
                    "graphite",
                  ].map((accent) => (
                    <button
                      key={accent}
                      className={"accent-swatch accent-" + accent}
                      aria-label={accent}
                      aria-pressed={s.accent === accent}
                      onClick={() => void update({ accent })}
                    >
                      {s.accent === accent && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Glass">
                <Segments
                  label="Glass style"
                  options={["tinted", "clear"]}
                  value={s.glass}
                  onChange={(glass) => void update({ glass })}
                />
              </Field>
              <label className="switch-row">
                <span>
                  <strong>Reduce transparency</strong>
                  <small>Give surfaces a more solid finish.</small>
                </span>
                <input
                  type="checkbox"
                  checked={s.reduce_transparency}
                  onChange={(e) =>
                    void update({ reduce_transparency: e.target.checked })
                  }
                />
              </label>
            </Card>
            <Card title="Wallpaper" subtitle="A quiet backdrop for a busy day.">
              <div className="wallpaper-grid">
                {WALLS.map((w) => (
                  <button
                    className={"wallpaper-swatch wall-" + w}
                    key={w}
                    aria-pressed={s.wallpaper === w}
                    onClick={() => void update({ wallpaper: w })}
                  >
                    <span>{w}</span>
                    {s.wallpaper === w && <Check size={17} />}
                  </button>
                ))}
              </div>
            </Card>
          </>
        ) : tab === "Profile" ? (
          <Card title="Your profile">
            <Form
              label="Save profile"
              submit={async () => {
                await save(
                  "profiles",
                  {
                    ...profile,
                    full_name: profile.full_name.trim(),
                    weekly_capacity: Number(profile.weekly_capacity),
                  },
                  session.user.id,
                );
                notify("Profile updated");
              }}
            >
              {Object.entries(profile).map(([k, v]) => (
                <Field label={k.replaceAll("_", " ")} key={k}>
                  {k === "team" ? (
                    <select
                      value={v}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, team: e.target.value }))
                      }
                    >
                      {[
                        "Product",
                        "Design",
                        "Engineering",
                        "Marketing",
                        "Other",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={v}
                      type={k === "weekly_capacity" ? "number" : "text"}
                      min={1}
                      max={168}
                      required={k !== "job_title"}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, [k]: e.target.value }))
                      }
                    />
                  )}
                </Field>
              ))}
            </Form>
          </Card>
        ) : tab === "Focus" ? (
          <Card
            title="Focus preferences"
            subtitle="Your next session starts with these defaults."
          >
            {[
              ["focus_minutes", "Focus length", 5, 180],
              ["break_minutes", "Break length", 5, 60],
            ].map(([key, label, min, max]) => (
              <Field key={String(key)} label={String(label)}>
                <select
                  value={s[String(key) as keyof typeof s] as number}
                  onChange={(e) =>
                    void update({ [key]: Number(e.target.value) })
                  }
                >
                  {Array.from(
                    { length: Number(max) - Number(min) + 1 },
                    (_, i) => i + Number(min),
                  ).map((n) => (
                    <option value={n} key={n}>
                      {n} minutes
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <p className="muted">
              Focus sessions are timed and recorded on the server. Break length
              is available after completing a session.
            </p>
          </Card>
        ) : tab === "Notifications" ? (
          <Card
            title="Notifications"
            subtitle="In-app reminders, while Hayola Tasks is open."
          >
            {Object.entries(s.notifications).map(([key, value]) => (
              <label key={key} className="switch-row">
                <span>
                  <strong>{key.replaceAll("_", " ")}</strong>
                  <small>
                    {key === "digest"
                      ? "A daily in-app summary after 9 AM Tehran."
                      : "Show relevant updates inside the app."}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) =>
                    void update({
                      notifications: {
                        ...s.notifications,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
              </label>
            ))}
          </Card>
        ) : (
          <Card title="Account" subtitle={session.user.email}>
            <Button
              onClick={() =>
                void db()
                  .auth.resetPasswordForEmail(session.user.email!, {
                    redirectTo: location.origin + "/#/recovery",
                  })
                  .then((r) =>
                    notify(
                      r.error
                        ? r.error.message
                        : "Password reset email requested",
                    ),
                  )
              }
            >
              Send password reset email
            </Button>
            <Button
              onClick={() =>
                exportCSV(
                  "hayola-tasks.csv",
                  ["Task", "Status", "Project", "Due", "Hours"],
                  d.tasks.map((t) => [
                    t.title,
                    t.status,
                    d.projects.find((p) => p.id === t.project_id)?.name,
                    t.due_date,
                    t.estimate_hours,
                  ]),
                )
              }
            >
              <Download size={15} />
              Export visible tasks
            </Button>
            <Button
              onClick={() =>
                void db()
                  .auth.signOut()
                  .then((r) => {
                    if (r.error) notify(r.error.message);
                  })
              }
            >
              Sign out
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
