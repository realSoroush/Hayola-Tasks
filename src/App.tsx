import { useEffect, useState, useRef, Component, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Home as HomeIcon,
  CheckSquare,
  CalendarDays,
  Folder,
  ChartNoAxesCombined,
  Users,
  Settings as SettingsIcon,
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  LogOut,
  Mail,
  X,
  Timer,
  ArrowRight,
} from "lucide-react";
import {
  client,
  db,
  Provider,
  useStore,
  useAppearance,
  useUI,
  UIContext,
  type Overlay,
  errorText,
} from "./core";
import {
  Brand,
  Button,
  IconButton,
  Avatar,
  Modal,
  Form,
  Empty,
  ProjectTag,
} from "./ui";
import {
  Auth,
  Setup,
  Editor,
  Invite,
  TaskDetail,
  EventDetail,
  MemberDetail,
  Messages,
} from "./forms";
import {
  Home,
  Tasks,
  Projects,
  Calendar,
  Team,
  Insights,
  Settings,
  Focus,
} from "./pages";
import { relative, elapsed, clock } from "./utils";
const NAV = [
  ["home", "Home", HomeIcon],
  ["tasks", "Tasks", CheckSquare],
  ["calendar", "Calendar", CalendarDays],
  ["projects", "Projects", Folder],
  ["insights", "Insights", ChartNoAxesCombined],
  ["team", "Team", Users],
  ["settings", "Settings", SettingsIcon],
] as const;
function FocusMonitor() {
  const { data, session, settings, rpc, notify } = useStore();
  const [now, setNow] = useState(Date.now()),
    [breakEnd, setBreakEnd] = useState(0);
  const pending = useRef(false),
    retryAfter = useRef(0);
  const active = data.focus_sessions.find(
    (s) =>
      s.user_id === session.user.id && ["running", "paused"].includes(s.status),
  );
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (
      !active ||
      active.status !== "running" ||
      elapsed(active, now) < active.planned_seconds ||
      pending.current ||
      now < retryAfter.current
    )
      return;
    pending.current = true;
    void rpc("focus_command", { p_action: "complete" })
      .then(() => {
        setBreakEnd(Date.now() + settings.break_minutes * 60000);
        notify(
          "Focus finished. Time for a " +
            settings.break_minutes +
            " minute break.",
        );
      })
      .catch((e) => {
        retryAfter.current = Date.now() + 10000;
        notify(errorText(e));
      })
      .finally(() => {
        pending.current = false;
      });
  }, [active, now]);
  useEffect(() => {
    if (breakEnd && now >= breakEnd) {
      setBreakEnd(0);
      notify("Break finished. Ready when you are.");
    }
  }, [now, breakEnd]);
  const { show } = useUI();
  return active ? (
    <button
      className="focus-island glass"
      onClick={() => show({ kind: "focus" })}
    >
      <Timer size={17} />
      <span>{active.status === "paused" ? "Paused" : "Focusing"}</span>
      <strong>{clock(active.planned_seconds - elapsed(active, now))}</strong>
    </button>
  ) : breakEnd ? (
    <div className="focus-island glass">
      <Timer size={17} />
      <span>Take a breather</span>
      <strong>{clock((breakEnd - now) / 1000)}</strong>
      <button aria-label="Skip break" onClick={() => setBreakEnd(0)}>
        <X size={15} />
      </button>
    </div>
  ) : null;
}
export function Shell() {
  const {
    data: d,
    session,
    me,
    loading,
    error,
    refresh,
    settings,
    save,
    notify,
    toast,
    rpc,
  } = useStore();
  useAppearance();
  const [path, setPath] = useState(location.hash.slice(1) || "/home"),
    [overlay, setOverlay] = useState<Overlay | null>(null),
    [query, setQuery] = useState(""),
    [scrolled, setScrolled] = useState(false);
  const go = (p: string) => {
    setOverlay(null);
    location.hash = p;
  };
  const show = (o: Overlay) => setOverlay(o),
    close = () => setOverlay(null);
  useEffect(() => {
    const change = () => setPath(location.hash.slice(1) || "/home");
    window.addEventListener("hashchange", change);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        show({ kind: "search" });
      }
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement)?.tagName,
        ) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key === "n") show({ kind: "taskForm" });
      if (e.key === "/") {
        e.preventDefault();
        show({ kind: "search" });
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 82);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    let frame = 0;
    const pointer = (event: PointerEvent) => {
      const target = (event.target as Element)?.closest?.(
        ".card,.project-tile,.team-card",
      ) as HTMLElement | null;
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        target.style.setProperty("--pointer-x", `${event.clientX - r.left}px`);
        target.style.setProperty("--pointer-y", `${event.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", pointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", pointer);
    };
  }, []);
  const previousPage = useRef(path.split("/")[1]);
  useEffect(() => {
    const nextPage = path.split("/")[1];
    if (nextPage !== previousPage.current) {
      if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "instant" });
      const title = document.querySelector<HTMLElement>(".page-lead h1");
      title?.setAttribute("tabindex", "-1");
      title?.focus({ preventScroll: true });
    }
    previousPage.current = nextPage;
  }, [path]);
  const [page, id] = path.split("/").filter(Boolean),
    unread =
      d.notifications.filter((n) => !n.read_at).length + d.invitations.length;
  let content =
    page === "home" ? (
      <Home />
    ) : page === "tasks" ? (
      <Tasks />
    ) : page === "projects" ? (
      <Projects id={id} />
    ) : page === "calendar" ? (
      <Calendar />
    ) : page === "team" ? (
      <Team />
    ) : page === "insights" ? (
      <Insights />
    ) : page === "settings" ? (
      <Settings />
    ) : (
      <Empty
        title="Page not found"
        action={<Button onClick={() => go("/home")}>Home</Button>}
      />
    );
  let o = overlay;
  if (!o && page === "tasks" && id) o = { kind: "task", id };
  if (!o && page === "team" && id) o = { kind: "member", id };
  const closeDetail = () => {
    if (!overlay && id && ["tasks", "team"].includes(page)) go("/" + page);
    else close();
  };
  return (
    <UIContext.Provider value={{ show, close: closeDetail, go }}>
      <FocusMonitor />
      <aside className="sidebar glass">
        <button className="brand-button" onClick={() => go("/home")}>
          <Brand />
        </button>
        <nav aria-label="Main navigation">
          {NAV.map(([key, label, Icon]) => (
            <a
              href={"#/" + key}
              key={key}
              className={page === key ? "selected" : ""}
              aria-current={page === key ? "page" : undefined}
              title={label}
            >
              <Icon size={20} />
              <span>{label}</span>
              {key === "tasks" &&
                d.tasks.some(
                  (t) =>
                    t.assignee_id === session.user.id && t.status !== "Done",
                ) && (
                  <small>
                    {
                      d.tasks.filter(
                        (t) =>
                          t.assignee_id === session.user.id &&
                          t.status !== "Done",
                      ).length
                    }
                  </small>
                )}
            </a>
          ))}
        </nav>
        <div className="pinned-projects">
          <header>
            Pinned{" "}
            <IconButton
              icon={Plus}
              label="Create project"
              onClick={() => show({ kind: "projectForm" })}
            />
          </header>
          {d.projects
            .filter((p) =>
              d.project_pins.some((pin) => pin.project_id === p.id),
            )
            .map((p) => (
              <a key={p.id} href={"#/projects/" + p.id}>
                <ProjectTag project={p} />
              </a>
            ))}
          {!d.project_pins.length && (
            <small>Pin a project to keep it close.</small>
          )}
        </div>
        <button
          className="account-button"
          onClick={() => show({ kind: "account" })}
        >
          <Avatar person={me} size={36} />
          <span>
            <strong>{me?.full_name || "Your account"}</strong>
            <small>{me?.job_title || "Team member"}</small>
          </span>
          <span>⌄</span>
        </button>
      </aside>
      {scrolled && (
        <div className="toolbar-page glass">
          <span>{NAV.find((n) => n[0] === page)?.[1] || "Hayola Tasks"}</span>
        </div>
      )}
      <div className="topbar glass">
        <button
          className="search-button"
          onClick={() => show({ kind: "search" })}
        >
          <Search size={17} />
          <span>Search</span>
          <kbd>⌘ K</kbd>
        </button>
        <IconButton
          icon={Plus}
          label="Create new"
          onClick={() => show({ kind: "create" })}
        />
        <div className="notification-button">
          <IconButton
            icon={Bell}
            label={`Notifications${unread ? ", " + unread + " unread" : ""}`}
            onClick={() => show({ kind: "notifications" })}
          />
          {unread > 0 && <i />}
        </div>
        <IconButton
          icon={settings.theme === "dark" ? Sun : Moon}
          label="Toggle appearance"
          onClick={() =>
            void save(
              "user_settings",
              {
                theme:
                  document.documentElement.dataset.theme === "dark"
                    ? "light"
                    : "dark",
              },
              session.user.id,
            ).catch((e) => notify(errorText(e)))
          }
        />
      </div>
      <main className="workspace" id="main-content">
        {loading ? (
          <div className="loading-state">
            <Brand />
            <p>Opening your workspace…</p>
          </div>
        ) : error ? (
          <div className="error-state glass" role="alert">
            <h1>Let’s reconnect.</h1>
            <p>{error}</p>
            <Button primary onClick={() => void refresh()}>
              Try again
            </Button>
            <Button onClick={() => void db().auth.signOut()}>Sign out</Button>
          </div>
        ) : (
          content
        )}
      </main>
      <nav className="mobile-nav glass" aria-label="Mobile navigation">
        {NAV.map(([key, label, Icon]) => (
          <a
            key={key}
            href={"#/" + key}
            aria-label={label}
            className={page === key ? "selected" : ""}
          >
            <Icon size={21} />
          </a>
        ))}
      </nav>
      {o &&
        (o.kind.endsWith("Form") ? (
          <Editor key={o.kind + (o.id || "new")} {...o} />
        ) : o.kind === "task" ? (
          <TaskDetail id={o.id!} />
        ) : o.kind === "event" ? (
          <EventDetail id={o.id!} />
        ) : o.kind === "member" ? (
          <MemberDetail id={o.id!} />
        ) : o.kind === "invite" ? (
          <Invite projectId={o.projectId} />
        ) : o.kind === "messages" ? (
          <Messages id={o.id} />
        ) : o.kind === "confirm" ? (
          <Modal title={o.title || "Confirm"} onClose={close}>
            <p>{o.body}</p>
            <Form
              label={o.label || "Confirm"}
              submit={async () => {
                await o!.run?.();
                close();
              }}
            />
          </Modal>
        ) : o.kind === "focus" ? (
          <Modal title="Focus" onClose={close}>
            <Focus />
          </Modal>
        ) : o.kind === "create" ? (
          <Modal title="Make something happen" onClose={close}>
            <div className="command-list">
              {[
                ["taskForm", "New task", "A small step forward."],
                [
                  "projectForm",
                  "New project",
                  "A home for the bigger picture.",
                ],
                ["eventForm", "New event", "Make time for what matters."],
                ["invite", "Add person", "Bring your team together."],
              ].map(([kind, title, sub]) => (
                <button key={kind} onClick={() => show({ kind })}>
                  <Plus size={20} />
                  <span>
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          </Modal>
        ) : o.kind === "account" ? (
          <Modal title="Your workspace" onClose={close}>
            <div className="account-summary">
              <Avatar person={me} size={64} />
              <h2>{me?.full_name}</h2>
              <p>{session.user.email}</p>
            </div>
            <div className="command-list">
              <button onClick={() => go("/settings")}>
                <SettingsIcon size={19} />
                Settings
              </button>
              <button onClick={() => show({ kind: "messages" })}>
                <Mail size={19} />
                Messages
              </button>
              <button onClick={() => show({ kind: "focus" })}>
                <Timer size={19} />
                Focus timer
              </button>
              <button
                onClick={() =>
                  void db()
                    .auth.signOut()
                    .then((r) => {
                      if (r.error) notify(r.error.message);
                    })
                }
              >
                <LogOut size={19} />
                Sign out
              </button>
            </div>
          </Modal>
        ) : o.kind === "search" ? (
          <Modal title="Search your workspace" onClose={close} wide>
            <input
              className="global-search"
              autoFocus
              placeholder="Search tasks, projects, people…"
              aria-label="Search workspace"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="search-results">
              {query.trim() ? (
                <>
                  {d.tasks
                    .filter((t) =>
                      t.title.toLowerCase().includes(query.toLowerCase()),
                    )
                    .slice(0, 12)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => show({ kind: "task", id: t.id })}
                      >
                        <CheckSquare size={19} />
                        <span>
                          <strong>{t.title}</strong>
                          <small>
                            Task ·{" "}
                            {
                              d.projects.find((p) => p.id === t.project_id)
                                ?.name
                            }
                          </small>
                        </span>
                      </button>
                    ))}
                  {d.projects
                    .filter((p) =>
                      p.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => go("/projects/" + p.id)}
                      >
                        <Folder size={19} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>Project</small>
                        </span>
                      </button>
                    ))}
                  {d.profiles
                    .filter((p) =>
                      `${p.full_name} ${p.email}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => show({ kind: "member", id: p.id })}
                      >
                        <Avatar person={p} />
                        <span>
                          <strong>{p.full_name}</strong>
                          <small>{p.email}</small>
                        </span>
                      </button>
                    ))}
                </>
              ) : (
                <Empty
                  compact
                  title="Find your next step"
                  description="Search the real tasks, projects and people in your workspace."
                />
              )}
            </div>
          </Modal>
        ) : o.kind === "notifications" ? (
          <Modal title="Notifications" onClose={close} drawer>
            <div className="notification-list">
              {d.invitations.map((i) => (
                <div className="invitation glass" key={i.id}>
                  <strong>{i.project_name}</strong>
                  <p>{i.inviter_name} invited you to this project.</p>
                  <div>
                    <Button
                      small
                      primary
                      onClick={() =>
                        void rpc("respond_invitation", {
                          p_id: i.id,
                          p_accept: true,
                        }).catch((e) => notify(errorText(e)))
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      small
                      onClick={() =>
                        void rpc("respond_invitation", {
                          p_id: i.id,
                          p_accept: false,
                        }).catch((e) => notify(errorText(e)))
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
              {d.notifications
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((n) => (
                  <button
                    className={n.read_at ? "read" : ""}
                    key={n.id}
                    onClick={() => {
                      void save(
                        "notifications",
                        { read_at: new Date().toISOString() },
                        n.id,
                      ).catch((e) => notify(errorText(e)));
                      if (n.task_id) show({ kind: "task", id: n.task_id });
                      else if (n.project_id) go("/projects/" + n.project_id);
                    }}
                  >
                    <i />
                    <span>
                      <strong>{n.body}</strong>
                      <small>{relative(n.created_at)}</small>
                    </span>
                  </button>
                ))}
              {!unread && !d.notifications.length && (
                <Empty
                  title="All caught up"
                  description="Project updates and reminders will appear here."
                />
              )}
            </div>
          </Modal>
        ) : null)}
      {toast && (
        <div className="toast glass" role="status">
          <CheckSquare size={17} />
          <span>{toast.text}</span>
          {toast.action && (
            <button onClick={toast.action.run}>{toast.action.label}</button>
          )}
        </div>
      )}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
    </UIContext.Provider>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(!client),
    [recovery, setRecovery] = useState(location.hash.includes("recovery")),
    [failure, setFailure] = useState("");
  useEffect(() => {
    if (!client) return;
    void client.auth
      .getSession()
      .then((r) => {
        if (r.error) setFailure(r.error.message);
        setSession(r.data.session);
        setReady(true);
      })
      .catch((e) => {
        setFailure(errorText(e));
        setReady(true);
      });
    const { data } = client.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!client) return <Setup />;
  if (!ready)
    return (
      <div className="auth-page">
        <Brand />
        <p>Opening Hayola Tasks…</p>
      </div>
    );
  if (failure)
    return (
      <div className="auth-page">
        <p role="alert">{failure}</p>
        <Button onClick={() => location.reload()}>Retry</Button>
      </div>
    );
  if (recovery)
    return (
      <Auth
        recovery
        onRecovered={() => {
          setRecovery(false);
          location.hash = "/home";
        }}
      />
    );
  return session ? (
    <Provider key={session.user.id} session={session}>
      <Shell />
    </Provider>
  ) : (
    <Auth />
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <main className="auth-page">
        <Brand />
        <section className="auth-card glass">
          <h1>Something needs a refresh.</h1>
          <p>{this.state.error}</p>
          <Button onClick={() => location.reload()}>Reload</Button>
        </section>
      </main>
    ) : (
      this.props.children
    );
  }
}
