import type { Row } from "./core";
import { useStore, useUI, errorText } from "./core";
import { Checkmark, ProjectTag, Due, Avatar, Empty } from "./ui";
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
