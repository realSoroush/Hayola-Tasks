import { useState, useEffect } from "react";
import { Play, Pause, Check, Plus, Square } from "lucide-react";
import { useStore, errorText } from "./core";
import { Ring, Segments, Button, IconButton } from "./ui";
import { dayKey, elapsed, clock, duration, focusIn } from "./utils";
export function Focus({ compact = false }: { compact?: boolean }) {
  const { data: d, session, settings, rpc, notify } = useStore();
  const [tick, setTick] = useState(Date.now()),
    [task, setTask] = useState(""),
    [busy, setBusy] = useState(false),
    [minutes, setMinutes] = useState(settings.focus_minutes);
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
      : minutes * 60;
  const command = async (action: string) => {
    setBusy(true);
    try {
      await rpc("focus_command", {
        p_action: action,
        ...(action === "start"
          ? { p_task_id: task || null, p_minutes: minutes }
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
      <div className="focus-presets">
        <Segments
          label="Session length"
          options={["15m", "25m", "50m"]}
          value={minutes + "m"}
          onChange={(v) => {
            if (!s) setMinutes(parseInt(v));
          }}
        />
      </div>
      <Ring
        value={s ? (elapsed(s, tick) / s.planned_seconds) * 100 : 0}
        size={compact ? 70 : 104}
        color="var(--green)"
        label="Focus timer"
      >
        <strong className="timer-digits">{clock(seconds)}</strong>
        <small className="focus-state">
          {s ? (s.status === "paused" ? "Paused" : "Focusing") : "Ready"}
        </small>
      </Ring>
      <label className="focus-task-label">
        Focus on
        <select
          aria-label="Focus on"
          value={s?.task_id || task}
          disabled={!!s}
          onChange={(e) => setTask(e.target.value)}
        >
          <option value="">No task — just focus</option>
          {d.tasks
            .filter((t) => t.status !== "Done" || t.id === s?.task_id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </select>
      </label>
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
        <div>
          <span>Focused today</span>
          <strong>
            {duration(
              focusIn(
                d.focus_sessions.filter((s) => s.user_id === session.user.id),
                dayKey(),
              ) * 3600,
            )}{" "}
            ·{" "}
            {
              d.focus_sessions.filter(
                (s) =>
                  s.user_id === session.user.id &&
                  dayKey(s.started_at) === dayKey(),
              ).length
            }{" "}
            sessions
          </strong>
        </div>
        <meter
          aria-label="Focus today against a two-hour goal"
          min={0}
          max={2}
          value={Math.min(
            2,
            focusIn(
              d.focus_sessions.filter((s) => s.user_id === session.user.id),
              dayKey(),
            ),
          )}
        />
      </div>
    </div>
  );
}
