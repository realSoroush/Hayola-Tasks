import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { createClient, type Session } from "@supabase/supabase-js";
export type Row = { id: string; [key: string]: any };
export const STATUSES = ["To do", "In progress", "In review", "Done"];
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const COLORS = [
  "blue",
  "purple",
  "pink",
  "orange",
  "green",
  "teal",
  "indigo",
  "yellow",
];
export const WALLS = [
  "ash",
  "sand",
  "sage",
  "aurora",
  "smoke",
  "tide",
  "bloom",
  "ember",
  "grove",
  "dusk",
];
export const DEFAULTS = {
  theme: "dark",
  accent: "blue",
  wallpaper: "ash",
  glass: "tinted",
  reduce_transparency: false,
  focus_minutes: 25,
  break_minutes: 5,
  notifications: {
    mentions: true,
    due_dates: true,
    meetings: true,
    digest: false,
    focus_finished: true,
  },
};
const url = import.meta.env.VITE_SUPABASE_URL?.trim(),
  key = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim();
export const client =
  url && key && /^https:\/\//.test(url)
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export function db() {
  if (!client) throw Error("Connect Supabase before signing in.");
  return client;
}
export function errorText(e: unknown) {
  const m =
    (e as { message?: string })?.message || "Could not save. Please try again.";
  return /schema cache|does not exist/.test(m)
    ? "Database setup is incomplete. Apply the Hayola Tasks migration."
    : m;
}
export const TABLES = [
  "profiles",
  "projects",
  "project_members",
  "project_pins",
  "tasks",
  "subtasks",
  "comments",
  "milestones",
  "calendar_events",
  "focus_sessions",
  "user_settings",
  "notifications",
  "activity_log",
  "direct_messages",
  "task_status_events",
] as const;
export type Data = Record<(typeof TABLES)[number] | "invitations", Row[]>;
export const emptyData = () =>
  Object.fromEntries(
    [...TABLES, "invitations"].map((t) => [t, []]),
  ) as unknown as Data;
type Toast = { text: string; action?: { label: string; run: () => void } };
type Store = {
  data: Data;
  me: Row | undefined;
  session: Session;
  settings: Row | typeof DEFAULTS;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  run: <T>(p: PromiseLike<{ data: T; error: unknown }>) => Promise<T>;
  save: (
    table: string,
    values: Record<string, unknown>,
    id?: string,
  ) => Promise<Row>;
  remove: (table: string, id: string) => Promise<void>;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<any>;
  taskChange: (task: Row, values: Record<string, unknown>) => Promise<Row>;
  notify: (text: string, action?: Toast["action"]) => void;
  toast: Toast | null;
};
export const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw Error("Missing store");
  return c;
}
export async function fetchTable(table: string) {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db()
      .from(table)
      .select("*")
      .order(
        ["project_pins", "user_settings"].includes(table) ? "user_id" : "id",
      );
    if (table === "project_pins") q = q.order("project_id");
    if (["projects", "tasks"].includes(table)) q = q.is("deleted_at", null);
    const r = await q.range(from, from + 999);
    if (r.error) throw r.error;
    out.push(...r.data);
    if (r.data.length < 1000) return out;
  }
}
export function Provider({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const [data, setData] = useState<Data>(emptyData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState<Toast | null>(null);
  const live = useRef(true),
    request = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((text: string, action?: Toast["action"]) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, action });
    timer.current = setTimeout(() => setToast(null), action ? 10000 : 5000);
  }, []);
  const refresh = useCallback(async () => {
    const ticket = ++request.current;
    try {
      const results = await Promise.all(TABLES.map(fetchTable));
      const invites = await db().rpc("pending_invitations");
      if (invites.error) throw invites.error;
      if (live.current && ticket === request.current) {
        setData({
          ...Object.fromEntries(TABLES.map((t, i) => [t, results[i]])),
          invitations: invites.data || [],
        } as Data);
        setError("");
      }
    } catch (e) {
      if (live.current && ticket === request.current) setError(errorText(e));
    } finally {
      if (live.current && ticket === request.current) setLoading(false);
    }
  }, [session.user.id]);
  useEffect(() => {
    live.current = true;
    void refresh();
    let debounce: ReturnType<typeof setTimeout>;
    const channel = db()
      .channel(`hayola:${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => void refresh(), 180);
      })
      .subscribe();
    const beat = () => {
      if (document.visibilityState === "visible") {
        void db()
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", session.user.id)
          .then(() => {});
        void db()
          .rpc("sync_my_reminders")
          .then(() => {});
        void refresh();
      }
    };
    beat();
    const i = setInterval(beat, 60000);
    window.addEventListener("focus", beat);
    return () => {
      live.current = false;
      clearInterval(i);
      clearTimeout(debounce);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", beat);
      void db().removeChannel(channel);
    };
  }, [refresh, session.user.id]);
  async function run<T>(promise: PromiseLike<{ data: T; error: unknown }>) {
    const r = await promise;
    if (r.error) throw r.error;
    await refresh();
    return r.data;
  }
  async function save(
    table: string,
    values: Record<string, unknown>,
    id?: string,
  ) {
    const result = await run(
      id
        ? db()
            .from(table)
            .update(values)
            .eq(table === "user_settings" ? "user_id" : "id", id)
            .select()
            .single()
        : db().from(table).insert(values).select().single(),
    );
    return result as Row;
  }
  async function remove(table: string, id: string) {
    await run(db().from(table).delete().eq("id", id).select().single());
  }
  async function rpc(name: string, args?: Record<string, unknown>) {
    return run(db().rpc(name, args));
  }
  async function taskChange(task: Row, values: Record<string, unknown>) {
    const r = await run(
      db()
        .from("tasks")
        .update(values)
        .eq("id", task.id)
        .eq("revision", task.revision)
        .select()
        .maybeSingle(),
    );
    if (!r)
      throw Error(
        "This task changed in another session. Refresh and try again.",
      );
    return r as Row;
  }
  return (
    <StoreContext.Provider
      value={{
        data,
        session,
        me: data.profiles.find((p) => p.id === session.user.id),
        settings: data.user_settings[0] || DEFAULTS,
        loading,
        error,
        refresh,
        run,
        save,
        remove,
        rpc,
        taskChange,
        notify,
        toast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export type Overlay = {
  kind: string;
  id?: string;
  projectId?: string;
  status?: string;
  date?: string;
  time?: string;
  days?: number;
  title?: string;
  body?: string;
  label?: string;
  run?: () => Promise<unknown>;
};
export const UIContext = createContext<{
  show: (o: Overlay) => void;
  close: () => void;
  go: (path: string) => void;
}>({ show: () => {}, close: () => {}, go: () => {} });
export const useUI = () => useContext(UIContext);
export function useAppearance() {
  const { settings: s } = useStore();
  useEffect(() => {
    const root = document.documentElement,
      media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme =
        s.theme === "auto" ? (media.matches ? "dark" : "light") : s.theme;
      root.dataset.accent = s.accent;
      root.dataset.wallpaper = s.wallpaper;
      root.dataset.glass = s.glass;
      root.dataset.reduceTransparency = String(s.reduce_transparency);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [s]);
}
