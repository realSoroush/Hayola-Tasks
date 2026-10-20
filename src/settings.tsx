import { useState, type ReactNode } from "react";
import {
  UserRound,
  Bell,
  Palette,
  Timer,
  Layers,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Play,
  Download,
  LogOut,
  Mail,
  Lock,
} from "lucide-react";
import { useStore, useUI, db, errorText, WALLS } from "./core";
import {
  Header,
  Card,
  Avatar,
  Form,
  Field,
  Button,
  IconButton,
  Segments,
} from "./ui";
import { exportCSV } from "./utils";
const SECTIONS = [
  ["Profile", UserRound, "blue"],
  ["Notifications", Bell, "pink"],
  ["Appearance", Palette, "purple"],
  ["Focus", Timer, "orange"],
  ["Data", Layers, "teal"],
] as const;
const NOTIFICATIONS = [
  ["mentions", "Mentions", "When someone @mentions you", Mail, "blue"],
  [
    "due_dates",
    "Due dates",
    "The morning a task of yours is due",
    Check,
    "orange",
  ],
  ["meetings", "Meetings", "Five minutes before they start", Bell, "pink"],
  ["digest", "Daily digest", "One summary at 9:00 AM", Layers, "teal"],
  ["focus_finished", "Focus finished", "When a session ends", Timer, "purple"],
] as const;
function SettingRow({
  title,
  hint,
  children,
  colour = "purple",
  icon: Icon = Palette,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  colour?: string;
  icon?: typeof Palette;
}) {
  return (
    <div className="setting-row">
      <span className={"setting-icon hue-" + colour}>
        <Icon size={16} />
      </span>
      <div className="setting-row-label">
        <strong>{title}</strong>
        {hint && <small>{hint}</small>}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}
export function Settings() {
  const { data: d, me, settings: s, session, save, notify, rpc } = useStore(),
    { show } = useUI(),
    [section, setSection] = useState("Profile"),
    [pending, setPending] = useState(false),
    [profile, setProfile] = useState(() => ({
      full_name: me?.full_name || "",
      job_title: me?.job_title || "",
      team: me?.team || "Product",
      timezone: me?.timezone || "Asia/Tehran",
      weekly_capacity: me?.weekly_capacity || 40,
    }));
  const update = async (values: Record<string, unknown>) => {
    if (pending) return;
    setPending(true);
    try {
      await save("user_settings", values, session.user.id);
      notify("Preferences saved");
    } catch (e) {
      notify(errorText(e));
    } finally {
      setPending(false);
    }
  };
  const move = (name: string) => {
    setSection(name);
    document
      .getElementById("settings-" + name.toLowerCase())
      ?.scrollIntoView?.({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };
  return (
    <div className="settings-page">
      <Header
        title="Settings"
        subtitle="Your profile, the look of Hayola Tasks, and when it nudges you"
      />
      <div className="settings-layout">
        <nav className="settings-nav glass" aria-label="Settings sections">
          <button className="settings-account" onClick={() => move("Profile")}>
            <Avatar person={me} size={44} />
            <span>
              <strong>{me?.full_name}</strong>
              <small>{session.user.email}</small>
            </span>
          </button>
          {SECTIONS.map(([name, Icon, colour]) => (
            <button
              key={name}
              className={section === name ? "selected" : ""}
              aria-current={section === name ? "location" : undefined}
              onClick={() => move(name)}
            >
              <span className={"setting-icon hue-" + colour}>
                <Icon size={16} />
              </span>
              <strong>{name}</strong>
              <ChevronRight size={15} />
            </button>
          ))}
        </nav>
        <div className="settings-panels">
          <div id="settings-profile" className="settings-profile">
            <Card title="Profile" subtitle="How the team sees you">
              <div className="settings-profile-summary">
                <Avatar person={me} size={86} online />
                <div>
                  <strong>{me?.full_name}</strong>
                  <p>{me?.job_title || "Team member"}</p>
                  <small>{session.user.email}</small>
                </div>
              </div>
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
                <Field label="Name">
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, full_name: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={session.user.email || ""}
                    type="email"
                    readOnly
                  />
                </Field>
                <Field label="Role">
                  <input
                    value={profile.job_title}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, job_title: e.target.value }))
                    }
                  />
                </Field>
                <details className="profile-extra">
                  <summary>Team, timezone & capacity</summary>
                  <Field label="team">
                    <select
                      value={profile.team}
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
                  </Field>
                  <Field label="Timezone">
                    <input
                      required
                      value={profile.timezone}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, timezone: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Weekly capacity">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      required
                      value={profile.weekly_capacity}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          weekly_capacity: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                </details>
              </Form>
            </Card>
          </div>
          <div id="settings-notifications" className="settings-notifications">
            <Card
              title="Notifications"
              subtitle="What Hayola Tasks taps you on the shoulder for"
            >
              {NOTIFICATIONS.map(([key, title, hint, Icon, colour]) => (
                <SettingRow
                  key={key}
                  title={title}
                  hint={hint}
                  icon={Icon}
                  colour={colour}
                >
                  <label className="switch-row settings-switch">
                    <span className="sr-only">{title}</span>
                    <input
                      role="switch"
                      type="checkbox"
                      aria-label={title}
                      checked={Boolean(s.notifications[key])}
                      disabled={pending}
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
                </SettingRow>
              ))}
              <p className="form-hint">
                Reminders appear in-app while Hayola Tasks is open.
              </p>
            </Card>
          </div>
          <div id="settings-appearance" className="settings-appearance">
            <Card
              title="Appearance"
              subtitle="The whole app re-tints through its glass"
            >
              <SettingRow title="Theme" hint="Auto follows your system">
                <Segments
                  label="Theme"
                  options={["light", "dark", "auto"]}
                  value={s.theme}
                  onChange={(theme) => void update({ theme })}
                  disabled={pending}
                />
              </SettingRow>
              <div className="setting-wallpapers">
                <SettingRow
                  title="Wallpaper"
                  hint={s.wallpaper}
                  icon={Palette}
                  colour="pink"
                >
                  <span />
                </SettingRow>
                <div className="wallpaper-grid">
                  {WALLS.map((w) => (
                    <button
                      key={w}
                      className={
                        "wallpaper-choice " +
                        (s.wallpaper === w ? "selected" : "")
                      }
                      aria-label={
                        w[0].toUpperCase() + w.slice(1) + " wallpaper"
                      }
                      aria-pressed={s.wallpaper === w}
                      disabled={pending}
                      onClick={() => void update({ wallpaper: w })}
                    >
                      <span className={"wallpaper-preview wall-" + w}>
                        <i />
                        <i />
                        <i />
                        {s.wallpaper === w && (
                          <b>
                            <Check size={13} />
                          </b>
                        )}
                      </span>
                      <strong>{w}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <SettingRow title="Accent" hint={s.accent} colour="blue">
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
                      disabled={pending}
                      onClick={() => void update({ accent })}
                    >
                      {s.accent === accent && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow
                title="Glass"
                hint="Clear shows more of the wallpaper"
                icon={Layers}
              >
                <Segments
                  label="Glass"
                  options={["clear", "tinted"]}
                  value={s.glass}
                  onChange={(glass) => void update({ glass })}
                  disabled={pending}
                />
              </SettingRow>
              <SettingRow
                title="Reduce transparency"
                hint="Solid surfaces, no frost"
                colour="teal"
                icon={Layers}
              >
                <label className="switch-row settings-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Reduce transparency"
                    checked={s.reduce_transparency}
                    disabled={pending}
                    onChange={(e) =>
                      void update({ reduce_transparency: e.target.checked })
                    }
                  />
                </label>
              </SettingRow>
            </Card>
          </div>
          <div id="settings-focus" className="settings-focus">
            <Card title="Focus" subtitle="The timer the island keeps">
              <div className="focus-steppers">
                {[
                  { key: "focus_minutes", label: "Session", min: 5, max: 180 },
                  { key: "break_minutes", label: "Break", min: 5, max: 60 },
                ].map(({ key, label, min, max }) => {
                  const value = Number(s[key as keyof typeof s]);
                  return (
                    <div
                      className="focus-stepper"
                      role="group"
                      aria-label={label}
                      key={key}
                    >
                      <span>{label}</span>
                      <div>
                        <IconButton
                          icon={Minus}
                          label={"Shorter " + label.toLowerCase()}
                          disabled={pending || value <= min}
                          onClick={() =>
                            void update({ [key]: Math.max(min, value - 5) })
                          }
                        />
                        <output>
                          <strong>{value}</strong>
                          <small> min</small>
                        </output>
                        <IconButton
                          icon={Plus}
                          label={"Longer " + label.toLowerCase()}
                          disabled={pending || value >= max}
                          onClick={() =>
                            void update({ [key]: Math.min(max, value + 5) })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <SettingRow
                title="Start a session now"
                hint={`${s.focus_minutes} minutes, then a ${s.break_minutes}-minute break`}
                icon={Timer}
                colour="orange"
              >
                <Button
                  primary
                  small
                  onClick={() =>
                    void rpc("focus_command", {
                      p_action: "start",
                      p_task_id: null,
                      p_minutes: s.focus_minutes,
                    })
                      .then(() => {
                        show({ kind: "focus" });
                      })
                      .catch((e) => notify(errorText(e)))
                  }
                >
                  <Play size={13} />
                  Start
                </Button>
              </SettingRow>
            </Card>
          </div>
          <div id="settings-data" className="settings-data">
            <Card title="Data" subtitle="Your workspace, stored in Supabase">
              <button
                className="settings-data-action"
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
                <span className="setting-icon hue-teal">
                  <Download size={16} />
                </span>
                <span>
                  <strong>Export tasks as CSV</strong>
                  <small>{d.tasks.length} tasks, one row each</small>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                className="settings-data-action"
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
                    .catch((e) => notify(errorText(e)))
                }
              >
                <span className="setting-icon hue-purple">
                  <Lock size={16} />
                </span>
                <span>
                  <strong>Reset password</strong>
                  <small>Send a secure reset email</small>
                </span>
                <ChevronRight size={15} />
              </button>
              <button
                className="settings-data-action"
                onClick={() =>
                  void db()
                    .auth.signOut()
                    .then((r) => {
                      if (r.error) notify(r.error.message);
                    })
                    .catch((e) => notify(errorText(e)))
                }
              >
                <span className="setting-icon hue-pink">
                  <LogOut size={16} />
                </span>
                <span>
                  <strong>Sign out</strong>
                  <small>{session.user.email}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
