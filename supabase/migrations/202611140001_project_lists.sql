begin;

alter table public.projects
  add column task_statuses text[] not null default array['To do', 'In progress', 'In review', 'Done'];

grant update(task_statuses) on public.projects to authenticated;

create function public.guard_project_task_statuses() returns trigger
language plpgsql set search_path = '' as $$
declare
  required_statuses text[] := array['To do', 'In progress', 'In review', 'Done'];
begin
  if tg_op = 'UPDATE' then
    required_statuses := old.task_statuses;
  end if;
  if not new.task_statuses @> required_statuses
    or cardinality(new.task_statuses) > 40
    or array_ndims(new.task_statuses) is distinct from 1
    or exists (
      select 1 from unnest(new.task_statuses) as s(name)
      where name is null or length(name) not between 1 and 40 or name <> btrim(name)
    )
    or cardinality(new.task_statuses) <> (
      select count(distinct lower(name)) from unnest(new.task_statuses) as s(name)
    )
  then
    raise exception 'Lists must have unique names of 1–40 characters. Existing lists must be kept.';
  end if;
  return new;
end;
$$;

create trigger project_task_statuses_guard
before insert or update of task_statuses on public.projects
for each row execute function public.guard_project_task_statuses();

create function public.set_project_task_statuses(
  p_project_id uuid, p_previous text[], p_statuses text[]
) returns void language plpgsql set search_path = '' as $$
begin
  update public.projects
     set task_statuses = p_statuses
   where id = p_project_id and deleted_at is null and task_statuses = p_previous;
  if not found then
    raise exception 'Could not save lists. Refresh the project and try again.';
  end if;
end;
$$;

revoke all on function public.set_project_task_statuses(uuid, text[], text[]) from public, anon;
grant execute on function public.set_project_task_statuses(uuid, text[], text[]) to authenticated;

create function public.guard_task_project_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.projects
     where id = new.project_id and new.status = any(task_statuses)
  ) then
    raise exception 'Choose a list from this project.';
  end if;
  return new;
end;
$$;

create trigger task_project_status_guard
before insert or update of status on public.tasks
for each row execute function public.guard_task_project_status();

alter table public.tasks drop constraint tasks_status_check;

commit;
