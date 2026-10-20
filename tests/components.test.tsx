import React from "react";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoreContext, UIContext, emptyData, type Data } from "../src/core";
import { Auth, Editor, Invite } from "../src/forms";
import {
  Home,
  Tasks,
  Projects,
  Calendar,
  Team,
  Insights,
  Settings,
} from "../src/pages";
import { Line, Modal } from "../src/ui";
import App, { Shell } from "../src/App";
const { login, signup, reset, lookup } = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  reset: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("../src/core", async (original) => {
  const actual = await original<typeof import("../src/core")>();
  return {
    ...actual,
    db: () => ({
      auth: {
        signInWithPassword: login,
        signUp: signup,
        resetPasswordForEmail: reset,
      },
      rpc: lookup,
    }),
  };
});
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    value: () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const me = {
    id: "u1",
    full_name: "Soroush Team",
    email: "owner@example.com",
    timezone: "Asia/Tehran",
    team: "Product",
    weekly_capacity: 40,
  },
  project = {
    id: "p1",
    name: "Hayola real project",
    owner_id: "u1",
    description: "Actual work",
    start_date: "2026-10-01",
    due_date: "2026-11-01",
    status: "In progress",
    color: "purple",
  };
function wrap(children: React.ReactNode, extra: Partial<Data> = {}) {
  const data = { ...emptyData(), profiles: [me], user_settings: [], ...extra },
    save = vi.fn().mockResolvedValue({ id: "new" }),
    rpc = vi.fn().mockResolvedValue(null),
    taskChange = vi.fn().mockResolvedValue({}),
    show = vi.fn(),
    close = vi.fn(),
    go = vi.fn();
  const store: any = {
    data,
    me,
    session: { user: { id: "u1", email: me.email } },
    settings: {
      theme: "dark",
      accent: "blue",
      wallpaper: "ash",
      glass: "tinted",
      focus_minutes: 25,
      break_minutes: 5,
      notifications: { mentions: true },
    },
    save,
    rpc,
    taskChange,
    notify: vi.fn(),
    run: vi.fn(),
    remove: vi.fn(),
  };
  render(
    <StoreContext.Provider value={store}>
      <UIContext.Provider value={{ show, close, go }}>
        {children}
      </UIContext.Provider>
    </StoreContext.Provider>,
  );
  return { save, rpc, taskChange, show, close, go };
}
describe("Backend setup and authentication", () => {
  it("does not show fake dashboard when unconfigured", () => {
    render(<App />);
    expect(screen.getByText("Database connection required")).toBeTruthy();
    expect(screen.queryByText("Demo account")).toBeNull();
  });
  it("login sends exact credentials to Supabase", async () => {
    login.mockResolvedValue({ error: null });
    render(<Auth />);
    await userEvent.type(screen.getByLabelText("Email"), "member@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "secret-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(login).toHaveBeenCalledWith({
        email: "member@example.com",
        password: "secret-password",
      }),
    );
  });
  it("signup supplies full name and shows confirmation", async () => {
    signup.mockResolvedValue({ error: null, data: { session: null } });
    render(<Auth />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create an account" }),
    );
    await userEvent.type(screen.getByLabelText("Full name"), "New Teammate");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "secure-password");
    await userEvent.click(
      screen.getByRole("button", { name: "Create account" }),
    );
    await waitFor(() =>
      expect(signup).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: { full_name: "New Teammate" },
          }),
        }),
      ),
    );
    expect(screen.getByRole("status").textContent).toContain("confirm");
  });
  it("displays backend failure without entering workspace", async () => {
    login.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<Auth />);
    await userEvent.type(screen.getByLabelText("Email"), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/^Password/), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Invalid login",
    );
  });
});
describe("Real data flows", () => {
  it("offers project creation instead of an unusable task form in an empty workspace", async () => {
    const { show, save } = wrap(<Editor kind="taskForm" />);
    expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
    expect(screen.queryByLabelText("Title")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Create project" }),
    );
    expect(show).toHaveBeenCalledWith({ kind: "projectForm" });
    expect(save).not.toHaveBeenCalled();
  });
  it("links the empty invitation state to project creation without sending an invitation", async () => {
    const { show, rpc } = wrap(<Invite />);
    await userEvent.click(
      screen.getByRole("button", { name: "Create project" }),
    );
    expect(show).toHaveBeenCalledWith({ kind: "projectForm" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("explains owner-only invitations to members who already belong to a project", () => {
    wrap(<Invite />, { projects: [{ ...project, owner_id: "another-owner" }] });
    expect(
      screen.getByText("Create a project to invite teammates"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
  it("task form writes project, author and entered title", async () => {
    const { save } = wrap(<Editor kind="taskForm" projectId="p1" />, {
      projects: [project],
      project_members: [
        { id: "m1", project_id: "p1", user_id: "u1", status: "accepted" },
      ],
    });
    await userEvent.type(
      screen.getByLabelText("Title"),
      "Ship the real application",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "tasks",
        expect.objectContaining({
          title: "Ship the real application",
          project_id: "p1",
          created_by: "u1",
        }),
      ),
    );
  });
  it("board moves a real task through keyboard accessible selector", async () => {
    const task = {
      id: "t1",
      project_id: "p1",
      title: "Database review",
      status: "To do",
      priority: "High",
      revision: 1,
      sort_order: 1,
      due_date: null,
    };
    const { taskChange } = wrap(<Tasks />, {
      projects: [project],
      tasks: [task],
    });
    await userEvent.selectOptions(
      screen.getByLabelText("Move Database review"),
      "In review",
    );
    expect(taskChange).toHaveBeenCalledWith(
      task,
      expect.objectContaining({ status: "In review" }),
    );
  });
  it("lookup and invitation use only returned registered identity", async () => {
    lookup.mockResolvedValue({
      data: [
        { id: "u2", full_name: "Registered Person", email: "real@example.com" },
      ],
      error: null,
    });
    const { rpc } = wrap(<Invite projectId="p1" />, { projects: [project] });
    await userEvent.type(screen.getByLabelText("Email"), "real@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    expect(await screen.findByText("Registered Person")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Send project invitation" }),
    );
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("add_project_member", {
        p_project_id: "p1",
        p_user_id: "u2",
        p_direct: false,
      }),
    );
  });
  it("project detail hides owner-only controls for members", () => {
    wrap(<Projects id="p1" />, {
      projects: [{ ...project, owner_id: "other" }],
    });
    expect(screen.queryByLabelText("Add milestone")).toBeNull();
    expect(screen.queryByLabelText("Edit project")).toBeNull();
  });
  it("profile team options match database values", async () => {
    const { save } = wrap(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: "Profile" }));
    await userEvent.click(screen.getByText("Team, timezone & capacity"));
    await userEvent.selectOptions(screen.getByLabelText("team"), "Other");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "profiles",
        expect.objectContaining({ team: "Other" }),
        "u1",
      ),
    );
  });
});
describe("Empty states and overlays", () => {
  it.each([Home, Tasks, Projects, Calendar, Team, Insights, Settings])(
    "renders %s without seeded tasks",
    (Page) => {
      wrap(<Page />);
      expect(document.body.textContent).not.toContain("Website redesign");
    },
  );
  it("native dialog Escape requests closure", () => {
    const close = vi.fn();
    render(
      <Modal title="Test dialog" onClose={close}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(close).toHaveBeenCalledOnce();
  });
});

it("accept invitation uses the SQL RPC argument contract", async () => {
  const { rpc } = wrap(<Shell />, {
    invitations: [
      {
        id: "inv-1",
        project_id: "p2",
        project_name: "Invited project",
        inviter_name: "Project owner",
      },
    ],
  });
  await userEvent.click(screen.getByLabelText("Notifications, 1 unread"));
  await userEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(rpc).toHaveBeenCalledWith("respond_invitation", {
    p_id: "inv-1",
    p_accept: true,
  });
});

describe("Reference dashboard interactions", () => {
  it("renders reference widget order and a true completion chart", () => {
    wrap(<Home />);
    const names = [...document.querySelectorAll(".home-grid>section")].map(
      (e) => e.getAttribute("aria-label"),
    );
    expect(names).toEqual([
      "Today",
      "Up next",
      "Focus",
      "My tasks",
      "This week",
      "Projects",
      "Right now",
    ]);
    expect(
      screen.getByRole("img", { name: "Today’s progress rings" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("list", { name: "Tasks finished each day this week" }),
    ).toBeTruthy();
  });
  it("switches Right now from team to activity without changing stored records", async () => {
    const { save } = wrap(<Home />);
    expect(screen.getByText("Soroush Team")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Activity" }));
    expect(screen.getByText("A little quiet here")).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });
  it("starts the selected focus preset through the server RPC", async () => {
    const { rpc } = wrap(<Home />);
    await userEvent.click(screen.getByRole("button", { name: "50m" }));
    await userEvent.click(screen.getByRole("button", { name: "Start focus" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("focus_command", {
        p_action: "start",
        p_task_id: null,
        p_minutes: 50,
      }),
    );
  });
});

describe("Calendar and reports after layout alignment", () => {
  it("week calendar offers actual hour-specific event creation", async () => {
    const { show } = wrap(<Calendar />);
    await userEvent.click(screen.getByRole("button", { name: "Week" }));
    const first = document.querySelector<HTMLButtonElement>(".calendar-hour");
    expect(first).toBeTruthy();
    await userEvent.click(first!);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "eventForm", time: "07:00" }),
    );
  });
  it("throughput can be inspected as a real-data table", async () => {
    wrap(<Insights />);
    await userEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByRole("table", { name: "Task throughput" })).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Completed tasks by project" }),
    ).toBeTruthy();
  });
  it("preference controls persist the chosen theme", async () => {
    const { save } = wrap(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: "light" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "user_settings",
        { theme: "light" },
        "u1",
      ),
    );
  });
});

describe("Throughput chart scale", () => {
  it.each([0, 1, 3, 19])(
    "uses distinct integer ticks for a peak of %i tasks",
    (peak) => {
      const { container } = render(
        <Line
          points={[{ key: "2026-10-20", value: peak, previous: 0 }]}
          label="Throughput"
        />,
      );
      const ticks = [...container.querySelectorAll("svg > g > text")]
        .filter((node) => node.getAttribute("text-anchor") === "end")
        .map((node) => Number(node.textContent));
      expect(ticks).toHaveLength(3);
      expect(new Set(ticks).size).toBe(3);
      expect(ticks.every(Number.isInteger)).toBe(true);
      expect(ticks[0]).toBe(0);
      expect(ticks[2]).toBeGreaterThanOrEqual(peak);
    },
  );
  it("scales to the previous period when that series is visible", () => {
    const { container } = render(
      <Line
        points={[{ key: "2026-10-20", value: 1, previous: 19 }]}
        label="Throughput"
      />,
    );
    expect(container.querySelector("svg > g:last-of-type")).toBeTruthy();
    const ticks = [
      ...container.querySelectorAll('text[text-anchor="end"]'),
    ].map((node) => Number(node.textContent));
    expect(ticks).toEqual([0, 10, 20]);
  });
});
