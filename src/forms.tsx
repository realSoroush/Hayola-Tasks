import { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  Timer,
  Check,
  Plus,
  Send,
  Search,
  UserPlus,
  Mail,
  Video,
  Link,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  useStore,
  useUI,
  db,
  errorText,
  STATUSES,
  PRIORITIES,
  COLORS,
  type Row,
  type Overlay,
} from "./core";
import {
  dayKey,
  addDays,
  timeLabel,
  dateLabel,
  tehranISO,
  TZ,
  relative,
  workload,
  focusIn,
  weekStart,
  duration,
  presence,
} from "./utils";
import {
  Modal,
  Form,
  Field,
  Button,
  IconButton,
  Avatar,
  AvatarStack,
  ProjectTag,
  Priority,
  Checkmark,
  Empty,
  Brand,
  Segments,
} from "./ui";
export function Auth({
  recovery = false,
  onRecovered,
}: {
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const [mode, setMode] = useState("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return (
    <main className="auth-page">
      <Brand />
      <section className="auth-card glass">
        <span className="auth-symbol">
          <Lock size={25} />
        </span>
        <h1>
          {recovery
            ? "A fresh start."
            : mode === "login"
              ? "Welcome back."
              : mode === "signup"
                ? "Make room for\ngood work."
                : "Forgot your password?"}
        </h1>
        <p>
          {recovery
            ? "Choose a new password for your account."
            : mode === "login"
              ? "Your projects, people and priorities. Together."
              : mode === "signup"
                ? "Create an account and join your team."
                : "We’ll send you a secure reset link."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              if (recovery) {
                const r = await db().auth.updateUser({ password });
                if (r.error) throw r.error;
                onRecovered?.();
              } else if (mode === "login") {
                const r = await db().auth.signInWithPassword({
                  email: email.trim(),
                  password,
                });
                if (r.error) throw r.error;
              } else if (mode === "signup") {
                const r = await db().auth.signUp({
                  email: email.trim(),
                  password,
                  options: {
                    data: { full_name: name.trim() },
                    emailRedirectTo: location.origin,
                  },
                });
                if (r.error) throw r.error;
                if (!r.data.session)
                  setNotice(
                    "Check your email to confirm your account, then sign in.",
                  );
              } else {
                const r = await db().auth.resetPasswordForEmail(email.trim(), {
                  redirectTo: location.origin + "/#/recovery",
                });
                if (r.error) throw r.error;
                setNotice(
                  "If this email has an account, a reset link is on its way.",
                );
              }
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {mode === "signup" && !recovery && (
              <Field label="Full name">
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </Field>
            )}
            {!recovery && (
              <Field label="Email">
                <div className="input-icon">
                  <Mail size={17} />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </Field>
            )}
            {(mode !== "reset" || recovery) && (
              <Field
                label="Password"
                hint={
                  mode === "signup" || recovery
                    ? "At least 8 characters."
                    : undefined
                }
              >
                <div className="input-icon">
                  <Lock size={17} />
                  <input
                    type={visible ? "text" : "password"}
                    autoComplete={
                      mode === "signup" || recovery
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={mode === "signup" || recovery ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            )}
            {mode === "login" && !recovery && (
              <button
                type="button"
                className="text-link forgot"
                onClick={() => {
                  setMode("reset");
                  setError("");
                  setNotice("");
                  setPassword("");
                }}
              >
                Forgot password?
              </button>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            <Button type="submit" primary disabled={busy}>
              {busy ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <>
                  {recovery
                    ? "Update password"
                    : mode === "login"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset link"}
                  <ArrowRight size={17} />
                </>
              )}
            </Button>
          </fieldset>
        </form>
        {!recovery && (
          <div className="auth-switch">
            {mode === "login"
              ? "New to Hayola Tasks?"
              : mode === "signup"
                ? "Already have an account?"
                : ""}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setNotice("");
                setPassword("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        )}
        <small className="auth-security">
          <Lock size={12} />
          Private projects. Real progress.
        </small>
      </section>
      <p className="auth-bottom">A calmer way to move work forward.</p>
    </main>
  );
}
export function Setup() {
  return (
    <main className="auth-page">
      <Brand />
      <section className="auth-card glass">
        <span className="auth-symbol">
          <Lock size={25} />
        </span>
        <h1>
          A private place
          <br />
          for your team.
        </h1>
        <p>Hayola Tasks is ready to connect.</p>
        <div className="setup-note">
          <strong>Database connection required</strong>
          <p>Set up Supabase to start using real accounts and project data.</p>
        </div>
        <details>
          <summary>Setup instructions</summary>
          <ol>
            <li>
              Run <code>supabase/setup.sql</code> in a new Supabase project.
            </li>
            <li>
              Enable email/password authentication and configure your Site URL.
            </li>
            <li>
              Set <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in the deployment
              environment.
            </li>
            <li>
              Rebuild and deploy. Full instructions are included in README.md.
            </li>
          </ol>
        </details>
        <small className="auth-security">
          No demo accounts or sample data.
        </small>
      </section>
    </main>
  );
}
export function Editor({ kind, id, projectId, status, date, time }: Overlay) {
  const { data: d, session, me, save, taskChange, notify } = useStore(),
    { close, go } = useUI();
  const mode = kind.replace("Form", ""),
    table =
      mode === "task"
        ? "tasks"
        : mode === "project"
          ? "projects"
          : mode === "milestone"
            ? "milestones"
            : "calendar_events",
    old = (d[table as keyof typeof d] || []).find((r) => r.id === id);
  const [v, setV] = useState<Record<string, any>>(() =>
    mode === "task"
      ? {
          title: old?.title || "",
          project_id: old?.project_id || projectId || d.projects[0]?.id || "",
          assignee_id: old?.assignee_id || "",
          priority: old?.priority || "Medium",
          due_date: old?.due_date || addDays(dayKey(), 2),
          status: old?.status || status || "To do",
          estimate_hours: old?.estimate_hours ?? 2,
        }
      : mode === "project"
        ? {
            name: old?.name || "",
            description: old?.description || "",
            color: old?.color || "blue",
            icon: old?.icon || "folder",
            start_date: old?.start_date || dayKey(),
            due_date: old?.due_date || addDays(dayKey(), 30),
            status: old?.status || "Planning",
          }
        : mode === "milestone"
          ? {
              title: old?.title || "",
              due_date: old?.due_date || addDays(dayKey(), 7),
            }
          : {
              title: old?.title || "",
              project_id: old?.project_id || projectId || "",
              date: old ? dayKey(old.starts_at) : date || dayKey(),
              time: old
                ? new Intl.DateTimeFormat("en-GB", {
                    timeZone: TZ,
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }).format(new Date(old.starts_at))
                : time || "12:00",
              minutes: old
                ? (Date.parse(old.ends_at) - Date.parse(old.starts_at)) / 60000
                : 30,
              type: old?.type || "Meeting",
              location: old?.location || "",
              meeting_url: old?.meeting_url || "",
              attendee_ids: old?.attendee_ids || [session.user.id],
            },
  );
  const set = (key: string, value: any) =>
    setV((s) => ({ ...s, [key]: value }));
  const people = v.project_id
    ? d.profiles.filter((p) =>
        d.project_members.some(
          (m) =>
            m.project_id === v.project_id &&
            m.user_id === p.id &&
            m.status === "accepted",
        ),
      )
    : d.profiles.filter((p) => p.id === session.user.id);
  const input = (
    key: string,
    label: string,
    type = "text",
    required = false,
    placeholder?: string,
  ) => (
    <Field label={label}>
      <input
        type={type}
        value={v[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 9999 : undefined}
        step={type === "number" ? 0.25 : undefined}
        maxLength={300}
      />
    </Field>
  );
  const select = (key: string, label: string, options: string[]) => (
    <Field label={label}>
      <select value={v[key]} onChange={(e) => set(key, e.target.value)}>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal title={`${id ? "Edit" : "New"} ${mode}`} onClose={close}>
      <Form
        label={
          id
            ? "Save changes"
            : mode === "project"
              ? "Create project"
              : `Add ${mode}`
        }
        onDone={close}
        submit={async () => {
          let values: Record<string, unknown>;
          if (mode === "task") {
            if (!v.project_id) throw Error("Create a project first.");
            if (!v.title.trim()) throw Error("Enter a task title.");
            values = {
              title: v.title.trim(),
              assignee_id: v.assignee_id || null,
              priority: v.priority,
              due_date: v.due_date || null,
              status: v.status,
              estimate_hours: Number(v.estimate_hours),
            };
            if (id) await taskChange(old!, values);
            else
              await save("tasks", {
                ...values,
                project_id: v.project_id,
                created_by: session.user.id,
                sort_order:
                  Math.max(
                    0,
                    ...d.tasks
                      .filter((t) => t.status === v.status)
                      .map((t) => t.sort_order),
                  ) + 1024,
              });
          } else if (mode === "project") {
            if (!v.name.trim()) throw Error("Enter a project name.");
            values = {
              ...v,
              name: v.name.trim(),
              description: v.description.trim(),
              due_date: v.due_date || null,
            };
            const result = await save(
              table,
              { ...values, ...(!id ? { owner_id: session.user.id } : {}) },
              id,
            );
            if (!id) go("/projects/" + result.id);
          } else if (mode === "milestone") {
            await save(
              table,
              {
                title: v.title.trim(),
                due_date: v.due_date,
                ...(!id ? { project_id: projectId } : {}),
              },
              id,
            );
          } else {
            const starts_at = tehranISO(v.date, v.time);
            values = {
              title: v.title.trim(),
              type: v.type,
              starts_at,
              ends_at: new Date(
                Date.parse(starts_at) + Number(v.minutes) * 60000,
              ).toISOString(),
              location: v.location.trim(),
              meeting_url: v.meeting_url.trim(),
              attendee_ids: v.attendee_ids.filter((a: string) =>
                people.some((p) => p.id === a),
              ),
            };
            await save(
              table,
              {
                ...values,
                ...(!id
                  ? {
                      project_id: v.project_id || null,
                      created_by: session.user.id,
                    }
                  : {}),
              },
              id,
            );
          }
          notify(
            `${mode[0].toUpperCase() + mode.slice(1)} ${id ? "updated" : "added"}`,
          );
        }}
      >
        {mode === "project" ? (
          <>
            {input("name", "Name", "text", true, "Spring launch")}
            <Field label="What is it for?">
              <textarea
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="One or two sentences the whole team can repeat."
                maxLength={5000}
                rows={3}
              />
            </Field>
            <div className="form-grid">
              <Field label="Lead">
                <input
                  readOnly
                  value={
                    d.profiles.find(
                      (p) => p.id === (old?.owner_id || session.user.id),
                    )?.full_name ||
                    me?.full_name ||
                    "You"
                  }
                />
              </Field>
              {select("color", "Colour", COLORS)}
              {input("start_date", "Start date", "date", true)}
              {input("due_date", "Target date", "date")}
              {select("icon", "Icon", [
                "folder",
                "rocket",
                "leaf",
                "flame",
                "phone",
                "grid",
                "chart",
                "sparkle",
              ])}
              {select("status", "Status", [
                "Planning",
                "In progress",
                "In review",
                "Shipped",
              ])}
            </div>
          </>
        ) : mode === "milestone" ? (
          <>
            {input("title", "Milestone", "text", true)}
            {input("due_date", "Due date", "date", true)}
          </>
        ) : (
          <>
            {input(
              "title",
              "Title",
              "text",
              true,
              mode === "task" ? "What needs doing?" : "Design review",
            )}
            <div className="form-grid">
              <Field label="Project">
                <select
                  value={v.project_id}
                  disabled={!!id}
                  onChange={(e) =>
                    setV((s) => ({
                      ...s,
                      project_id: e.target.value,
                      assignee_id: "",
                      attendee_ids: [session.user.id],
                    }))
                  }
                  required={mode === "task"}
                >
                  <option value="">
                    {mode === "task"
                      ? "Choose a project"
                      : "None — personal event"}
                  </option>
                  {d.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              {mode === "task" ? (
                <>
                  <Field label="Assignee">
                    <select
                      value={v.assignee_id}
                      onChange={(e) => set("assignee_id", e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {select("priority", "Priority", PRIORITIES)}
                  {input("due_date", "Due", "date")}
                  {select("status", "Status", STATUSES)}
                  {input("estimate_hours", "Estimate (hours)", "number", true)}
                </>
              ) : (
                <>
                  {input("date", "Date", "date", true)}
                  {input("time", "Starts (Tehran)", "time", true)}
                  <Field label="Length">
                    <select
                      value={v.minutes}
                      onChange={(e) => set("minutes", Number(e.target.value))}
                    >
                      {Array.from(
                        new Set([15, 30, 45, 60, 90, 120, Number(v.minutes)]),
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n < 60 ? `${n} min` : `${n / 60} h`}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {select("type", "Type", [
                    "Meeting",
                    "Focus block",
                    "Review",
                    "Deadline",
                    "Team",
                  ])}
                  {input("location", "Where", "text", false, "Video call")}
                </>
              )}
            </div>
            {mode !== "task" && (
              <>
                <Field
                  label="Meeting link"
                  hint="Optional. Use an https:// link."
                >
                  <input
                    type="url"
                    pattern="https://.*"
                    value={v.meeting_url}
                    onChange={(e) => set("meeting_url", e.target.value)}
                    placeholder="https://meet.google.com/…"
                  />
                </Field>
                <div className="field">
                  <span>People</span>
                  <div className="people-picker">
                    {people.map((p) => (
                      <label key={p.id}>
                        <input
                          type="checkbox"
                          checked={v.attendee_ids.includes(p.id)}
                          onChange={(e) =>
                            set(
                              "attendee_ids",
                              e.target.checked
                                ? [...v.attendee_ids, p.id]
                                : v.attendee_ids.filter(
                                    (x: string) => x !== p.id,
                                  ),
                            )
                          }
                        />
                        <Avatar person={p} size={23} />
                        {p.full_name}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="form-hint">All times use Asia/Tehran.</p>
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
export function Invite({ projectId }: { projectId?: string }) {
  const { data: d, session, rpc, notify } = useStore(),
    { close } = useUI();
  const projects = d.projects.filter((p) => p.owner_id === session.user.id);
  const [pid, setPid] = useState(projectId || projects[0]?.id || ""),
    [email, setEmail] = useState(""),
    [found, setFound] = useState<Row | null>(null),
    [direct, setDirect] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Add someone to a project" onClose={close}>
      {!projects.length ? (
        <Empty
          title="Create your first project"
          description="Only a project owner can add or invite members."
        />
      ) : (
        <>
          <p className="dialog-intro">
            Find a registered teammate by their exact email address.
          </p>
          <Field label="Project">
            <select
              value={pid}
              onChange={(e) => {
                setPid(e.target.value);
                setFound(null);
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <form
            className="lookup"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setFound(null);
              try {
                const r = await db().rpc("find_registered_member", {
                  p_project_id: pid,
                  p_email: email.trim(),
                });
                if (r.error) throw r.error;
                if (!r.data?.length)
                  throw Error(
                    "No registered account found. Ask them to create an account first.",
                  );
                setFound(r.data[0]);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFound(null);
                }}
                placeholder="teammate@company.com"
                required
              />
            </Field>
            <Button type="submit" disabled={busy}>
              <Search size={16} />
              Find
            </Button>
          </form>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {found && (
            <Form
              label={direct ? "Add to project" : "Send project invitation"}
              onDone={close}
              submit={async () => {
                await rpc("add_project_member", {
                  p_project_id: pid,
                  p_user_id: found.id,
                  p_direct: direct,
                });
                notify(direct ? "Member added" : "Project invitation sent");
              }}
            >
              <div className="found-person">
                <Avatar person={found} size={43} />
                <div>
                  <strong>{found.full_name}</strong>
                  <small>{found.email}</small>
                </div>
                <Check size={17} />
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={direct}
                  onChange={(e) => setDirect(e.target.checked)}
                />
                <span>
                  <strong>Add directly</strong>
                  <small>
                    Give access now. Otherwise, they accept the invitation
                    inside Hayola Tasks.
                  </small>
                </span>
              </label>
              <p className="form-hint">
                Invitations are delivered inside the app. No external email is
                sent.
              </p>
            </Form>
          )}
        </>
      )}
    </Modal>
  );
}
export function TaskDetail({ id }: { id: string }) {
  const {
      data: d,
      settings,
      session,
      taskChange,
      save,
      remove,
      rpc,
      run,
      notify,
    } = useStore(),
    { close, show, go } = useUI();
  const [sub, setSub] = useState(""),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false);
  const t = d.tasks.find((t) => t.id === id);
  if (!t)
    return (
      <Modal title="Task" onClose={close}>
        <Empty
          title="Task unavailable"
          description="It may have been removed, or you may no longer have access."
        />
      </Modal>
    );
  const p = d.projects.find((p) => p.id === t.project_id),
    a = d.profiles.find((p) => p.id === t.assignee_id),
    subs = d.subtasks.filter((s) => s.task_id === id),
    comments = d.comments
      .filter((c) => c.task_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const action = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Task details"
      onClose={close}
      drawer
      actions={
        <>
          <IconButton
            icon={Link}
            label="Copy task link"
            onClick={() =>
              void navigator.clipboard
                .writeText(location.origin + "/#/tasks/" + id)
                .then(() => notify("Link copied"))
                .catch(() => notify("Could not copy link"))
            }
          />
          <IconButton
            icon={Pencil}
            label="Edit task"
            onClick={() => show({ kind: "taskForm", id })}
          />
        </>
      }
    >
      <div className="task-detail-top">
        <ProjectTag project={p} />
        <Priority value={t.priority} />
      </div>
      <h2 className="detail-title">{t.title}</h2>
      <div className="status-segments" role="group" aria-label="Status">
        {STATUSES.map((s) => (
          <button
            key={s}
            aria-pressed={s === t.status}
            className={s === t.status ? "selected" : ""}
            disabled={busy}
            onClick={() => void action(() => taskChange(t, { status: s }))}
          >
            <i
              className={
                "status-dot status-" + s.toLowerCase().replaceAll(" ", "-")
              }
            />
            {s}
          </button>
        ))}
      </div>
      <dl className="detail-metadata">
        <div>
          <dt>Assignee</dt>
          <dd>
            {a && <Avatar person={a} size={24} />}{" "}
            {a?.full_name || "Unassigned"}
          </dd>
        </div>
        <div>
          <dt>Due</dt>
          <dd>{dateLabel(t.due_date)}</dd>
        </div>
        <div>
          <dt>Estimate</dt>
          <dd>{t.estimate_hours} h</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>
            <button
              className="text-link"
              onClick={() => go("/projects/" + t.project_id)}
            >
              {p?.name}
            </button>
          </dd>
        </div>
      </dl>
      <section className="detail-section">
        <header>
          <h3>Subtasks</h3>
          <small>
            {subs.filter((s) => s.done).length}/{subs.length}
          </small>
        </header>
        <ul className="subtask-list">
          {subs.map((s) => (
            <li key={s.id}>
              <Checkmark
                checked={s.done}
                label={"Done: " + s.title}
                disabled={busy}
                onChange={() =>
                  void action(() => save("subtasks", { done: !s.done }, s.id))
                }
              />
              <span className={s.done ? "strike" : ""}>{s.title}</span>
              <IconButton
                icon={Trash2}
                label={"Remove " + s.title}
                disabled={busy}
                onClick={() => void action(() => remove("subtasks", s.id))}
              />
            </li>
          ))}
        </ul>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (sub.trim())
              void action(async () => {
                await save("subtasks", { task_id: id, title: sub.trim() });
                setSub("");
              });
          }}
        >
          <input
            aria-label="Add a subtask"
            placeholder="Add a subtask"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            required
            maxLength={300}
          />
          <Button small type="submit" disabled={busy || !sub.trim()}>
            <Plus size={14} />
            Add
          </Button>
        </form>
      </section>
      <section className="detail-section">
        <header>
          <h3>Comments</h3>
          <small>{comments.length}</small>
        </header>
        {comments.length ? (
          <ul className="comment-list">
            {comments.map((c) => (
              <li key={c.id}>
                <Avatar person={d.profiles.find((p) => p.id === c.author_id)} />
                <div>
                  <header>
                    <strong>
                      {d.profiles.find((p) => p.id === c.author_id)
                        ?.full_name || "Team member"}
                    </strong>
                    <small>{relative(c.created_at)}</small>
                  </header>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted no-comments">Start the conversation.</p>
        )}
        <form
          className="comment-compose"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim())
              void action(async () => {
                await save("comments", {
                  task_id: id,
                  author_id: session.user.id,
                  body: comment.trim(),
                });
                setComment("");
              });
          }}
        >
          <textarea
            aria-label="Write a comment"
            placeholder="Write a comment…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            maxLength={10000}
            rows={3}
          />
          <div className="compose-actions">
            <select
              aria-label="Mention teammate"
              value=""
              onChange={(e) => setComment(comment + "@" + e.target.value + " ")}
            >
              <option value="">@ Mention someone</option>
              {d.profiles
                .filter((p) =>
                  d.project_members.some(
                    (m) =>
                      m.project_id === t.project_id &&
                      m.user_id === p.id &&
                      m.status === "accepted",
                  ),
                )
                .map((p) => (
                  <option key={p.id}>{p.full_name}</option>
                ))}
            </select>
            <Button small type="submit" disabled={busy || !comment.trim()}>
              <Send size={14} />
              Post
            </Button>
          </div>
        </form>
      </section>
      <footer className="detail-footer">
        <Button
          disabled={busy}
          onClick={() =>
            void action(async () => {
              await rpc("focus_command", {
                p_action: "start",
                p_task_id: id,
                p_minutes: settings.focus_minutes,
              });
              notify("Focus started");
              close();
            })
          }
        >
          <Timer size={15} />
          Focus on this
        </Button>
        <Button
          primary
          disabled={busy}
          onClick={() =>
            void action(() =>
              taskChange(t, { status: t.status === "Done" ? "To do" : "Done" }),
            )
          }
        >
          <Check size={15} />
          {t.status === "Done" ? "Reopen" : "Mark done"}
        </Button>
        <IconButton
          icon={Trash2}
          label="Delete task"
          onClick={() =>
            show({
              kind: "confirm",
              title: "Delete this task?",
              body: "The task will be removed from the board. You can undo immediately after deleting it.",
              label: "Delete task",
              run: async () => {
                await taskChange(t, { deleted_at: new Date().toISOString() });
                notify("Task deleted", {
                  label: "Undo",
                  run: () =>
                    void run(
                      db()
                        .from("tasks")
                        .update({ deleted_at: null })
                        .eq("id", id)
                        .select()
                        .single(),
                    ).catch((e) => notify(errorText(e))),
                });
              },
            })
          }
        />
      </footer>
    </Modal>
  );
}
export function EventDetail({ id }: { id: string }) {
  const { data: d, session, remove, notify } = useStore(),
    { close, show } = useUI();
  const e = d.calendar_events.find((e) => e.id === id);
  if (!e)
    return (
      <Modal title="Event" onClose={close}>
        <Empty title="Event unavailable" />
      </Modal>
    );
  const owner =
    e.created_by === session.user.id ||
    d.projects.find((p) => p.id === e.project_id)?.owner_id === session.user.id;
  return (
    <Modal
      title="Event details"
      onClose={close}
      actions={
        owner && (
          <IconButton
            icon={Pencil}
            label="Edit event"
            onClick={() => show({ kind: "eventForm", id })}
          />
        )
      }
    >
      <span
        className={
          "event-type type-" + e.type.toLowerCase().replaceAll(" ", "-")
        }
      >
        {e.type}
      </span>
      <h2 className="detail-title">{e.title}</h2>
      <dl className="detail-metadata">
        {[
          [
            "When",
            `${dateLabel(dayKey(e.starts_at))} · ${timeLabel(e.starts_at)} – ${timeLabel(e.ends_at)}`,
          ],
          ["Timezone", "Asia/Tehran"],
          ["Where", e.location || "Not specified"],
          [
            "Project",
            d.projects.find((p) => p.id === e.project_id)?.name || "Personal",
          ],
        ].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>People</dt>
          <dd>
            <AvatarStack
              people={d.profiles.filter((p) => e.attendee_ids.includes(p.id))}
            />
            {e.attendee_ids.length}
          </dd>
        </div>
      </dl>
      <footer className="detail-footer">
        {e.meeting_url ? (
          <a
            className="button primary"
            href={e.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Video size={16} />
            Join call
          </a>
        ) : (
          <span className="muted">No meeting link added</span>
        )}
        {owner && (
          <Button
            onClick={() =>
              show({
                kind: "confirm",
                title: "Remove event?",
                body: `“${e.title}” will be removed from the calendar.`,
                label: "Remove event",
                run: async () => {
                  await remove("calendar_events", id);
                  notify("Event removed");
                },
              })
            }
          >
            <Trash2 size={14} />
            Remove
          </Button>
        )}
      </footer>
    </Modal>
  );
}
export function MemberDetail({ id }: { id: string }) {
  const { data: d, session } = useStore(),
    { show, close, go } = useUI();
  const p = d.profiles.find((p) => p.id === id);
  if (!p)
    return (
      <Modal title="Profile" onClose={close}>
        <Empty title="Member unavailable" />
      </Modal>
    );
  const state = presence(p, d),
    tasks = d.tasks.filter((t) => t.assignee_id === id && t.status !== "Done"),
    projects = d.projects.filter((pr) =>
      d.project_members.some(
        (m) =>
          m.project_id === pr.id && m.user_id === id && m.status === "accepted",
      ),
    ),
    events = d.calendar_events.filter(
      (e) =>
        e.attendee_ids.includes(id) &&
        dayKey(e.starts_at) >= dayKey() &&
        dayKey(e.starts_at) <= addDays(dayKey(), 6),
    ),
    hours = workload(d.tasks, id);
  return (
    <Modal title="Profile" onClose={close} drawer>
      <div className="profile-banner">
        <Avatar person={p} size={82} online />
        <h2>{p.full_name}</h2>
        <p>{p.job_title || "Team member"}</p>
        <div>
          <span className="quiet-chip">{p.team}</span>
          <span className={"team-presence " + state.cls}>
            <i />
            {state.label}
          </span>
        </div>
      </div>
      <dl className="detail-metadata">
        <div>
          <dt>Email</dt>
          <dd>
            <a href={"mailto:" + p.email}>{p.email}</a>
          </dd>
        </div>
        <div>
          <dt>Local time</dt>
          <dd>
            {timeLabel(new Date(), p.timezone)} ·{" "}
            {p.timezone.split("/").at(-1).replaceAll("_", " ")}
          </dd>
        </div>
      </dl>
      <div className="profile-stats">
        <div>
          <strong>{Math.round((hours / p.weekly_capacity) * 100)}%</strong>
          <small>load</small>
        </div>
        <div>
          <strong>
            {duration(
              focusIn(
                d.focus_sessions.filter((s) => s.user_id === id),
                weekStart(),
              ) * 3600,
            )}
          </strong>
          <small>Focus this week</small>
        </div>
        <div>
          <strong>{tasks.length}</strong>
          <small>Open tasks</small>
        </div>
      </div>
      <p className="profile-load">
        Workload{" "}
        <strong>
          {hours}h of {p.weekly_capacity}h
        </strong>
      </p>
      <meter
        className="load-meter"
        min={0}
        max={Math.max(hours, p.weekly_capacity)}
        value={hours}
      />
      <section className="detail-section">
        <header>
          <h3>Open tasks</h3>
          <small>{tasks.length}</small>
        </header>
        <ul className="profile-task-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <button onClick={() => show({ kind: "task", id: t.id })}>
                <strong>{t.title}</strong>
                <small>
                  {dateLabel(t.due_date)} ·{" "}
                  {d.projects.find((p) => p.id === t.project_id)?.name}
                </small>
                <Priority value={t.priority} />
              </button>
            </li>
          ))}
        </ul>
        {!tasks.length && <p className="muted">No open tasks.</p>}
      </section>
      <section className="detail-section">
        <header>
          <h3>This week</h3>
          <small>{events.length}</small>
        </header>
        <ul className="profile-event-list">
          {events.map((e) => (
            <li key={e.id}>
              <button onClick={() => show({ kind: "event", id: e.id })}>
                <time>
                  {dateLabel(dayKey(e.starts_at), { weekday: "short" })}
                  <strong>{dayKey(e.starts_at).slice(-2)}</strong>
                </time>
                <div>
                  <strong>{e.title}</strong>
                  <small>{timeLabel(e.starts_at)}</small>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {!events.length && <p className="muted">No shared events this week.</p>}
      </section>
      <section className="detail-section">
        <header>
          <h3>Projects</h3>
          <small>{projects.length}</small>
        </header>
        <ul className="profile-project-list">
          {projects.map((pr) => (
            <li key={pr.id}>
              <button onClick={() => go("/projects/" + pr.id)}>
                <i className={"project-square hue-" + pr.color} />
                <strong>{pr.name}</strong>
                <small>{pr.owner_id === id ? "Lead" : "Member"}</small>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <footer className="detail-footer">
        {id !== session.user.id && (
          <Button primary onClick={() => show({ kind: "messages", id })}>
            <Mail size={15} />
            Message {p.full_name.split(" ")[0]}
          </Button>
        )}
        <a className="button glass" href={"mailto:" + p.email}>
          <Mail size={15} />
          Email
        </a>
      </footer>
    </Modal>
  );
}
export function Messages({ id }: { id?: string }) {
  const { data: d, session, save, notify } = useStore(),
    { close } = useUI();
  const [recipient, setRecipient] = useState(id || ""),
    [body, setBody] = useState("");
  const messages = d.direct_messages
    .filter(
      (m) =>
        (m.sender_id === session.user.id && m.recipient_id === recipient) ||
        (m.sender_id === recipient && m.recipient_id === session.user.id),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => {
    const ids = messages
      .filter((m) => m.recipient_id === session.user.id && !m.read_at)
      .map((m) => m.id);
    if (ids.length)
      void db()
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .then(() => {});
  }, [d.direct_messages, recipient, session.user.id]);
  return (
    <Modal title="Messages" onClose={close} wide>
      <Field label="To">
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        >
          <option value="">Choose a teammate</option>
          {d.profiles
            .filter((p) => p.id !== session.user.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
        </select>
      </Field>
      {recipient ? (
        <>
          <div className="conversation">
            {messages.map((m) => (
              <div
                className={
                  "message-bubble " +
                  (m.sender_id === session.user.id ? "sent" : "received")
                }
                key={m.id}
              >
                <p>{m.body}</p>
                <small>
                  {relative(m.created_at)}
                  {m.sender_id === session.user.id && m.read_at
                    ? " · Read"
                    : ""}
                </small>
              </div>
            ))}
            {!messages.length && (
              <Empty
                compact
                title="Say hello"
                description="A quick conversation can move a project forward."
              />
            )}
          </div>
          <Form
            label="Send"
            submit={async () => {
              if (!body.trim()) throw Error("Enter a message.");
              await save("direct_messages", {
                sender_id: session.user.id,
                recipient_id: recipient,
                body: body.trim(),
              });
              setBody("");
            }}
          >
            <textarea
              aria-label="Message"
              placeholder="Write a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={10000}
              rows={3}
            />
          </Form>
        </>
      ) : (
        <Empty
          compact
          title="Choose someone to talk to"
          description="You can message people who share a project with you."
        />
      )}
    </Modal>
  );
}
