import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  X,
  Folder,
  Loader2,
  Check,
  ArrowUpRight,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useStore, errorText, type Row } from "./core";
import { dateLabel, dueLabel, relative, dayKey } from "./utils";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <img src="/hayola-logo.png" alt="Hayola Studio" />
      </span>
      <span>
        Hayola <b>Tasks</b>
      </span>
    </div>
  );
}
export function Button({
  children,
  onClick,
  primary = false,
  small = false,
  disabled = false,
  type = "button",
  className = "",
  form,
}: {
  form?: string;
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`button ${primary ? "primary" : "glass"} ${small ? "small" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={19} />
    </button>
  );
}
export function Segments({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  disabled?: boolean;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {options.map((v) => (
        <button
          key={v}
          disabled={disabled}
          aria-pressed={v === value}
          className={v === value ? "selected" : ""}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
export function Header({
  title,
  subtitle,
  actions,
  stats,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: { label: string; value: ReactNode; change?: string }[];
}) {
  return (
    <header className="page-head">
      <div className="page-lead">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
      {stats && (
        <dl className="head-stats">
          {stats.map((s) => (
            <div className="stat glass" key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
              {s.change && <small>{s.change}</small>}
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card glass ${className}`} aria-label={title}>
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  action,
  compact = false,
  icon: Icon = Folder,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className={`empty ${compact ? "compact" : ""}`}>
      <span>
        <Icon size={27} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Avatar({
  person,
  size = 30,
  online = false,
}: {
  person?: Row;
  size?: number;
  online?: boolean;
}) {
  const name = person?.full_name || "Unassigned",
    hue = person
      ? Array.from(person.id).reduce((n, c) => n + c.charCodeAt(0), 0) % 360
      : 240;
  return (
    <span
      className="avatar"
      role="img"
      aria-label={name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.33,
        background: `linear-gradient(150deg,hsl(${hue} 32% 53%),hsl(${hue} 28% 29%))`,
      }}
    >
      {person
        ? name
            .split(/\s+/)
            .slice(0, 2)
            .map((s: string) => s[0])
            .join("")
            .toUpperCase()
        : "–"}
      {online && (
        <i
          className={
            person?.last_seen_at &&
            Date.now() - Date.parse(person.last_seen_at) < 120000
              ? "online"
              : "away"
          }
        />
      )}
    </span>
  );
}
export function AvatarStack({
  people,
  limit = 4,
}: {
  people: Row[];
  limit?: number;
}) {
  return (
    <span
      className="avatar-stack"
      aria-label={people.map((p) => p.full_name).join(", ")}
    >
      {people.slice(0, limit).map((p) => (
        <Avatar person={p} key={p.id} size={28} />
      ))}
      {people.length > limit && (
        <span className="avatar more">+{people.length - limit}</span>
      )}
    </span>
  );
}
export function ProjectTag({ project }: { project?: Row }) {
  return project ? (
    <span className={`project-tag hue-${project.color}`}>
      <i />
      {project.name}
    </span>
  ) : (
    <span className="muted">Personal</span>
  );
}
export function Priority({ value }: { value: string }) {
  return (
    <span className={`priority priority-${value.toLowerCase()}`}>
      {value === "Urgent" ? "⚑ " : ""}
      {value}
    </span>
  );
}
export function Due({
  date,
  done = false,
}: {
  date: string | null;
  done?: boolean;
}) {
  return (
    <span
      className={!done && date && date < dayKey() ? "danger" : ""}
      title={date ? dateLabel(date, { dateStyle: "full" }) : undefined}
    >
      {dueLabel(date)}
    </span>
  );
}
export function Ring({
  value,
  size = 82,
  width = 7,
  color = "var(--accent-ink)",
  label,
  children,
}: {
  value: number;
  size?: number;
  width?: number;
  color?: string;
  label: string;
  children?: ReactNode;
}) {
  const r = (size - width) / 2,
    c = 2 * Math.PI * r;
  return (
    <div
      className="ring"
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fill)"
          strokeWidth={width}
        />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div>
        {children || (
          <strong>
            {Math.round(value)}
            <small>%</small>
          </strong>
        )}
      </div>
    </div>
  );
}
export function Checkmark({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`checkmark ${checked ? "checked" : ""}`}
      role="checkbox"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
    >
      {checked && <Check size={13} />}
    </button>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="filter-select glass">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Form({
  children,
  submit,
  label = "Save",
  onDone,
  id,
  hideSubmit = false,
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void;
  id?: string;
  hideSubmit?: boolean;
  children?: ReactNode;
  submit: () => Promise<unknown>;
  label?: string;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form"
      id={id}
      onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        onPendingChange?.(true);
        setError("");
        try {
          await submit();
          onDone?.();
        } catch (e) {
          setError(errorText(e));
        } finally {
          setBusy(false);
          onPendingChange?.(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!hideSubmit && (
        <footer>
          <Button type="submit" primary disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : null}
            {busy ? "Saving…" : label}
          </Button>
        </footer>
      )}
    </form>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  drawer = false,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  drawer?: boolean;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const el = ref.current!,
      before = document.activeElement as HTMLElement;
    el.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    el.addEventListener("cancel", cancel);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.removeEventListener("cancel", cancel);
      el.close();
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`dialog glass ${wide ? "wide-dialog" : ""} ${drawer ? "drawer" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="grabber" />
      <header className="dialog-head">
        <IconButton icon={X} label="Close" onClick={onClose} />
        <h2>{title}</h2>
        {actions}
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function ActivityFeed({
  projectId,
  onTask,
}: {
  projectId?: string;
  onTask: (id: string) => void;
}) {
  const { data: d } = useStore();
  const items = d.activity_log
    .filter((a) => !projectId || a.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);
  return items.length ? (
    <ul className="activity-list">
      {items.map((a) => (
        <li key={a.id}>
          <Avatar person={d.profiles.find((p) => p.id === a.actor_id)} />
          <div>
            <button
              disabled={!a.task_id}
              onClick={() => a.task_id && onTask(a.task_id)}
            >
              {d.profiles
                .find((p) => p.id === a.actor_id)
                ?.full_name?.split(" ")[0] || "A team member"}{" "}
              {a.body}
            </button>
            <small>{relative(a.created_at)}</small>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <Empty
      compact
      title="A little quiet here"
      description="Project activity will appear as your team works."
    />
  );
}
export function Expand({ onClick }: { onClick: () => void }) {
  return <IconButton icon={ArrowUpRight} label="Expand" onClick={onClick} />;
}
export function Add({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button onClick={onClick}>
      <Plus size={16} />
      {children}
    </Button>
  );
}
export function Bars({
  values,
  label,
}: {
  values: { key: string; value: number; label?: string }[];
  label: string;
}) {
  const max = Math.max(1, ...values.map((p) => p.value));
  return (
    <div className="bars" role="list" aria-label={label}>
      {values.map((v) => (
        <div key={v.key} role="listitem" aria-label={`${v.key}: ${v.value}`}>
          <span className="bar-track">
            <i style={{ height: `${(v.value / max) * 100}%` }} />
            {values.length <= 14 && v.value > 0 && (
              <b>{Number(v.value.toFixed(1))}</b>
            )}
          </span>
          <small>{v.label ?? dateLabel(v.key, { weekday: "short" })}</small>
        </div>
      ))}
    </div>
  );
}
export function Line({
  points,
  label,
  previous = true,
}: {
  points: { key: string; value: number; previous: number }[];
  label: string;
  previous?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null),
    max = Math.max(1, ...points.flatMap((p) => [p.value, p.previous])),
    x = (i: number) => 35 + (i * 650) / Math.max(1, points.length - 1),
    y = (v: number) => 185 - (v / max) * 165,
    path = (field: "value" | "previous") =>
      points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[field])}`).join(" ");
  return (
    <div className="line-chart">
      <svg viewBox="0 0 720 215" role="img" aria-label={label}>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="35"
              x2="685"
              y1={y(v * max)}
              y2={y(v * max)}
              className="chart-grid"
            />
            <text x="24" y={y(v * max) + 4} textAnchor="end">
              {Math.round(v * max)}
            </text>
          </g>
        ))}
        {previous && <path className="chart-previous" d={path("previous")} />}
        <path className="chart-current" d={path("value")} />
        {points.map((p, i) => (
          <g key={p.key}>
            {(i === 0 ||
              i === points.length - 1 ||
              i % Math.ceil(points.length / 6) === 0) && (
              <text x={x(i)} y="207" textAnchor="middle">
                {dateLabel(p.key)}
              </text>
            )}
            <rect
              x={x(i) - 10}
              y="15"
              width="25"
              height="175"
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <span className="chart-tooltip">
          {dateLabel(points[hover].key)} · {points[hover].value}
        </span>
      )}
    </div>
  );
}
