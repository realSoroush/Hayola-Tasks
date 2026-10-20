import { useState } from "react";
import {
  UserPlus,
  MessageSquare,
  CheckSquare,
  Sun,
  Moon,
  Search,
} from "lucide-react";
import { useStore, useUI } from "./core";
import { Header, Button, IconButton, Segments, Avatar, Empty } from "./ui";
import { presence, workload, timeLabel, TZ } from "./utils";
const TEAM_COLOURS: Record<string, string> = {
  Product: "blue",
  Design: "pink",
  Engineering: "purple",
  Marketing: "orange",
  Other: "teal",
};
function offset(zone: string) {
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value || "GMT";
  const match = name.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return match
    ? (match[1] === "-" ? -1 : 1) *
        (Number(match[2]) + Number(match[3] || 0) / 60)
    : 0;
}
export function Team() {
  const { data: d, session, me } = useStore(),
    { show } = useUI(),
    [query, setQuery] = useState(""),
    [team, setTeam] = useState("All");
  const teams = [...new Set(d.profiles.map((p) => p.team))].sort(),
    people = d.profiles.filter(
      (p) =>
        (team === "All" || p.team === team) &&
        `${p.full_name} ${p.email} ${p.team}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ),
    average = d.profiles.length
      ? Math.round(
          d.profiles.reduce(
            (n, p) => n + (workload(d.tasks, p.id) / p.weekly_capacity) * 100,
            0,
          ) / d.profiles.length,
        )
      : 0;
  return (
    <div className="team-page">
      <Header
        title="Team"
        subtitle={`${d.profiles.length} ${d.profiles.length === 1 ? "person" : "people"} · ${teams.length} ${teams.length === 1 ? "team" : "teams"}`}
        stats={[
          {
            label: "Online now",
            value: (
              <>
                {d.profiles.filter((p) => presence(p, d).cls !== "away").length}
                <small> / {d.profiles.length}</small>
              </>
            ),
          },
          {
            label: "In focus",
            value: d.profiles.filter((p) => presence(p, d).cls === "focus")
              .length,
          },
          { label: "Average load", value: average + "%" },
        ]}
        actions={
          <>
            <Segments
              label="Team"
              options={["All", ...teams]}
              value={team}
              onChange={setTeam}
            />
            <details className="project-search">
              <summary aria-label="Search team">
                <Search size={17} />
              </summary>
              <input
                aria-label="Search team"
                placeholder="Find someone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </details>
            <Button primary onClick={() => show({ kind: "invite" })}>
              <UserPlus size={16} />
              Invite
            </Button>
          </>
        }
      />
      <div className="team-grid">
        {people.map((p) => {
          const state = presence(p, d),
            load = workload(d.tasks, p.id),
            localHour = Number(
              new Intl.DateTimeFormat("en-GB", {
                timeZone: p.timezone,
                hour: "numeric",
                hour12: false,
              }).format(new Date()),
            ),
            localDiff = offset(p.timezone) - offset(me?.timezone || TZ),
            ClockIcon = localHour >= 7 && localHour < 19 ? Sun : Moon;
          return (
            <article
              className={
                "team-card glass hue-" + (TEAM_COLOURS[p.team] || "teal")
              }
              key={p.id}
            >
              <header className="team-card-header">
                <button
                  className="team-avatar-link"
                  aria-label={"View " + p.full_name}
                  onClick={() => show({ kind: "member", id: p.id })}
                >
                  <Avatar person={p} size={48} online />
                </button>
                <div>
                  <h3>
                    <button onClick={() => show({ kind: "member", id: p.id })}>
                      {p.full_name}
                    </button>
                    {p.id === session.user.id && (
                      <span className="you-badge">You</span>
                    )}
                  </h3>
                  <p>{p.job_title || "Team member"}</p>
                  <span className="team-tag">
                    <i />
                    {p.team}
                  </span>
                </div>
              </header>
              <div className="team-card-presence">
                <span className={"team-presence " + state.cls}>
                  <i />
                  {state.label}
                </span>
                <div>
                  <span>
                    <ClockIcon size={13} />
                    <strong>{timeLabel(new Date(), p.timezone)}</strong>
                    {p.timezone.split("/").at(-1)?.replaceAll("_", " ")}
                  </span>
                  <small>
                    {p.id === session.user.id
                      ? "Your time"
                      : localDiff === 0
                        ? "Same time as you"
                        : `${Math.abs(localDiff)}h ${localDiff > 0 ? "ahead" : "behind"}`}
                  </small>
                </div>
              </div>
              <div className="team-workload">
                <div>
                  <span>Workload</span>
                  <strong>
                    {load}h <small>/ {p.weekly_capacity}h</small>
                  </strong>
                </div>
                <meter
                  aria-label={p.full_name + " workload"}
                  min={0}
                  max={Math.max(load, p.weekly_capacity)}
                  value={load}
                />
              </div>
              <footer>
                <span>
                  <CheckSquare size={14} />
                  <strong>
                    {
                      d.tasks.filter(
                        (t) => t.assignee_id === p.id && t.status !== "Done",
                      ).length
                    }
                  </strong>{" "}
                  open tasks
                </span>
                <Button
                  small
                  onClick={() => show({ kind: "member", id: p.id })}
                >
                  Profile
                </Button>
                {p.id !== session.user.id && (
                  <IconButton
                    icon={MessageSquare}
                    label={"Message " + p.full_name}
                    onClick={() => show({ kind: "messages", id: p.id })}
                  />
                )}
              </footer>
            </article>
          );
        })}
      </div>
      {!people.length && (
        <Empty
          title="No matching people"
          description="Try another team or search."
        />
      )}
      <p className="form-hint">
        Workload compares all open task estimates with weekly capacity. Presence
        reflects the latest app heartbeat.
      </p>
    </div>
  );
}
