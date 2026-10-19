import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let count = 0;
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
);
await db.exec(
  await readFile(
    new URL("../supabase/migrations/202610190001_hayola.sql", import.meta.url),
    "utf8",
  ),
);
const A = "10000000-0000-4000-8000-000000000001",
  B = "10000000-0000-4000-8000-000000000002",
  C = "10000000-0000-4000-8000-000000000003",
  P = "20000000-0000-4000-8000-000000000001",
  T = "30000000-0000-4000-8000-000000000001";
await db.query(
  `insert into auth.users values ($1,'owner@test.invalid','{"full_name":"Owner Person"}'),($2,'member@test.invalid','{"full_name":"Member Person"}'),($3,'outsider@test.invalid','{"full_name":"Outsider Person"}')`,
  [A, B, C],
);
async function as(uid, sql, params = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
  await db.exec("set role authenticated");
  return db.query(sql, params);
}
async function ok(name, fn) {
  await fn();
  count++;
  console.log("✓ " + name);
}
async function denied(uid, sql, params = []) {
  let failed = false;
  try {
    await as(uid, sql, params);
  } catch {
    failed = true;
  }
  assert.equal(failed, true);
}
await ok("Signup creates private profile and preferences", async () => {
  assert.equal((await as(A, "select * from profiles")).rows.length, 1);
  assert.equal((await as(A, "select * from user_settings")).rows.length, 1);
});
await ok("Create project adds owner membership", async () => {
  await as(A, "insert into projects(id,owner_id,name) values($1,$2,$3)", [
    P,
    A,
    "Private project",
  ]);
  assert.equal(
    (await as(A, "select * from project_members")).rows[0].role,
    "owner",
  );
});
await ok("Unrelated account cannot read projects or profiles", async () => {
  assert.equal((await as(C, "select * from projects")).rows.length, 0);
  assert.equal((await as(C, "select * from profiles")).rows.length, 1);
});
await ok("Project owner identity cannot be forged", () =>
  denied(C, "insert into projects(owner_id,name) values($1,$2)", [A, "Forged"]),
);
await ok("Non-owner cannot search registered directory", () =>
  denied(C, "select * from find_registered_member($1,$2)", [
    P,
    "member@test.invalid",
  ]),
);
await ok(
  "Owner exact email search works without exposing directory",
  async () => {
    assert.equal(
      (
        await as(A, "select * from find_registered_member($1,$2)", [
          P,
          "MEMBER@test.invalid",
        ])
      ).rows[0].id,
      B,
    );
    assert.equal(
      (await as(A, "select * from find_registered_member($1,$2)", [P, "%"]))
        .rows.length,
      0,
    );
  },
);
await ok("Invited member has no project access until acceptance", async () => {
  await as(A, "select add_project_member($1,$2,false)", [P, B]);
  assert.equal((await as(B, "select * from projects")).rows.length, 0);
  assert.equal(
    (await as(B, "select * from pending_invitations()")).rows[0].project_name,
    "Private project",
  );
});
const inv = (await as(B, "select * from pending_invitations()")).rows[0].id;
await ok("Only invited person may accept", () =>
  denied(C, "select respond_invitation($1,true)", [inv]),
);
await ok("Acceptance grants shared project and profile access", async () => {
  await as(B, "select respond_invitation($1,true)", [inv]);
  assert.equal((await as(B, "select * from projects")).rows.length, 1);
  assert.equal((await as(B, "select * from profiles")).rows.length, 2);
});
await ok("Member cannot change project", async () => {
  assert.equal(
    (
      await as(
        B,
        "update projects set name='Hacked' where id=$1 returning id",
        [P],
      )
    ).rows.length,
    0,
  );
});
await ok("Owner cannot be transferred with a direct update", () =>
  denied(A, "update projects set owner_id=$1 where id=$2", [B, P]),
);
await ok("Membership cannot be forged directly", () =>
  denied(
    B,
    "insert into project_members(project_id,user_id,invited_by,status) values($1,$2,$3,'accepted')",
    [P, C, B],
  ),
);
await ok(
  "Member can create a task assigned to an accepted member",
  async () => {
    await as(
      B,
      "insert into tasks(id,project_id,created_by,title,assignee_id,due_date) values($1,$2,$3,'Real task',$4,(now() at time zone 'Asia/Tehran')::date)",
      [T, P, B, A],
    );
    assert.equal((await as(A, "select * from tasks")).rows.length, 1);
  },
);
await ok("Task cannot be assigned outside the project", () =>
  denied(A, "update tasks set assignee_id=$1 where id=$2", [C, T]),
);
await ok("Unrelated user cannot create tasks", () =>
  denied(
    C,
    "insert into tasks(project_id,created_by,title) values($1,$2,'Forbidden')",
    [P, C],
  ),
);
await ok("Task creator cannot be forged", () =>
  denied(
    B,
    "insert into tasks(project_id,created_by,title) values($1,$2,'Forged')",
    [P, A],
  ),
);
await ok(
  "Task progress uses server dates and increments revision",
  async () => {
    await as(A, "update tasks set status='In progress' where id=$1", [T]);
    let t = (await as(A, "select * from tasks where id=$1", [T])).rows[0];
    assert.ok(t.started_at);
    assert.equal(t.revision, 2);
    await as(A, "update tasks set status='Done' where id=$1 and revision=2", [
      T,
    ]);
    t = (await as(A, "select * from tasks where id=$1", [T])).rows[0];
    assert.ok(t.completed_at);
    assert.equal(t.revision, 3);
  },
);
await ok("Stale revision changes no rows", async () => {
  assert.equal(
    (
      await as(
        A,
        "update tasks set title='Stale' where id=$1 and revision=1 returning id",
        [T],
      )
    ).rows.length,
    0,
  );
});
await ok("Completion dates cannot be fabricated", () =>
  denied(A, "update tasks set completed_at='2000-01-01' where id=$1", [T]),
);
await ok("Reopening clears completion time", async () => {
  await as(A, "update tasks set status='To do' where id=$1", [T]);
  assert.equal(
    (await as(A, "select completed_at from tasks where id=$1", [T])).rows[0]
      .completed_at,
    null,
  );
});
await ok("Subtask requires project access", async () => {
  await as(
    B,
    "insert into subtasks(task_id,title) values($1,'Checklist item')",
    [T],
  );
  assert.equal((await as(C, "select * from subtasks")).rows.length, 0);
  await denied(
    C,
    "insert into subtasks(task_id,title) values($1,'Forbidden')",
    [T],
  );
});
await ok("Comment author cannot be forged", () =>
  denied(
    B,
    "insert into comments(task_id,author_id,body) values($1,$2,'Forged')",
    [T, A],
  ),
);
await ok("Comment mention generates recipient notification", async () => {
  await as(
    B,
    "insert into comments(task_id,author_id,body) values($1,$2,'Hello @Owner Person')",
    [T, B],
  );
  assert.equal(
    (await as(A, "select * from notifications where kind='mention'")).rows
      .length,
    1,
  );
});
await ok("Clients cannot fabricate notifications or activity", async () => {
  await denied(
    A,
    "insert into notifications(user_id,kind,body) values($1,'fake','Fake')",
    [A],
  );
  await denied(
    A,
    "insert into activity_log(project_id,kind,body) values($1,'fake','Fake')",
    [P],
  );
});
await ok("Due reminders deduplicate", async () => {
  await as(A, "select sync_my_reminders()");
  await as(A, "select sync_my_reminders()");
  assert.equal(
    (await as(A, "select * from notifications where kind='due'")).rows.length,
    1,
  );
});
await ok("Personal calendar remains private", async () => {
  await as(
    A,
    "insert into calendar_events(created_by,title,starts_at,ends_at,attendee_ids) values($1,'Private event',now(),now()+interval '1 hour',array[$1]::uuid[])",
    [A],
  );
  assert.equal((await as(B, "select * from calendar_events")).rows.length, 0);
});
await ok("Personal event cannot invite other users", () =>
  denied(
    A,
    "insert into calendar_events(created_by,title,starts_at,ends_at,attendee_ids) values($1,'Private event',now(),now()+interval '1 hour',array[$2]::uuid[])",
    [A, B],
  ),
);
await ok("Project events require accepted attendees", () =>
  denied(
    A,
    "insert into calendar_events(project_id,created_by,title,starts_at,ends_at,attendee_ids) values($1,$2,'Review',now(),now()+interval '1 hour',array[$3]::uuid[])",
    [P, A, C],
  ),
);
await ok("Meeting URLs reject unsafe protocols", () =>
  denied(
    A,
    "insert into calendar_events(created_by,title,starts_at,ends_at,meeting_url) values($1,'Unsafe',now(),now()+interval '1 hour','javascript:alert(1)')",
    [A],
  ),
);
await ok("Only owners create milestones", () =>
  denied(
    B,
    "insert into milestones(project_id,title,due_date) values($1,'Forbidden',current_date)",
    [P],
  ),
);
await ok("Messages require shared project", async () => {
  await as(
    B,
    "insert into direct_messages(sender_id,recipient_id,body) values($1,$2,'Hello')",
    [B, A],
  );
  assert.equal((await as(C, "select * from direct_messages")).rows.length, 0);
  await denied(
    C,
    "insert into direct_messages(sender_id,recipient_id,body) values($1,$2,'Forbidden')",
    [C, A],
  );
});
await ok("Timezone validates IANA value", () =>
  denied(A, "update profiles set timezone='Invalid/Zone' where id=$1", [A]),
);
await ok("Profiles cannot expose or edit another user email", () =>
  denied(A, "update profiles set email='forged@example.com' where id=$1", [A]),
);
await ok("Focus starts through server RPC", async () => {
  await as(A, "select focus_command('start',$1,25)", [T]);
  assert.equal((await as(A, "select * from focus_sessions")).rows.length, 1);
});
await ok("Only one active focus session is allowed", () =>
  denied(A, "select focus_command('start',null,25)"),
);
await ok("Focus cannot complete early or be edited directly", async () => {
  await denied(A, "select focus_command('complete')");
  await denied(A, "update focus_sessions set elapsed_seconds=1500");
});
await ok("Focus can pause resume extend and end", async () => {
  await as(A, "select focus_command('pause')");
  assert.equal(
    (await as(A, "select * from focus_sessions")).rows[0].status,
    "paused",
  );
  await as(A, "select focus_command('resume')");
  await as(A, "select focus_command('extend')");
  assert.equal(
    (await as(A, "select * from focus_sessions")).rows[0].planned_seconds,
    1800,
  );
  await as(A, "select focus_command('end')");
  assert.equal(
    (await as(A, "select * from focus_sessions")).rows[0].status,
    "ended",
  );
});
await ok("Member can create a shared project event", async () => {
  await as(
    B,
    "insert into calendar_events(project_id,created_by,title,starts_at,ends_at,attendee_ids) values($1,$2,'Member review',now(),now()+interval '1 hour',array[$2]::uuid[])",
    [P, B],
  );
  assert.equal(
    (await as(A, "select * from calendar_events where project_id=$1", [P])).rows
      .length,
    1,
  );
});
await ok("Non-owner cannot remove project member", () =>
  denied(B, "select remove_project_member($1,$2)", [P, A]),
);
await ok("Owner cannot remove self", () =>
  denied(A, "select remove_project_member($1,$2)", [P, A]),
);
await ok("Removing member revokes tasks and profiles", async () => {
  await as(A, "select remove_project_member($1,$2)", [P, B]);
  assert.equal((await as(B, "select * from tasks")).rows.length, 0);
  assert.equal((await as(B, "select * from profiles")).rows.length, 1);
});
await ok("Removed event creator loses read and edit access", async () => {
  assert.equal((await as(B, "select * from calendar_events")).rows.length, 0);
  assert.equal(
    (await as(B, "update calendar_events set title='Forbidden' returning id"))
      .rows.length,
    0,
  );
});
await ok("Direct add grants immediate access", async () => {
  await as(A, "select add_project_member($1,$2,true)", [P, B]);
  assert.equal((await as(B, "select * from tasks")).rows.length, 1);
});
await ok("Archive revokes project access; owner may restore", async () => {
  await as(A, "update projects set deleted_at=now() where id=$1", [P]);
  assert.equal((await as(B, "select * from tasks")).rows.length, 0);
  await as(A, "update projects set deleted_at=null where id=$1", [P]);
  assert.equal((await as(B, "select * from tasks")).rows.length, 1);
});
await db.exec("reset role;set role anon");
await ok("Anonymous role cannot read private data", async () => {
  let failed = false;
  try {
    await db.query("select * from projects");
  } catch {
    failed = true;
  }
  assert.ok(failed);
});
await db.close();
console.log(`\n${count} database checks passed.`);
