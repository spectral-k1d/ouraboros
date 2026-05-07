-- ouroboros schema
-- Run this in Supabase SQL editor

-- Users table (mirrors auth.users with extra fields)
create table if not exists users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  consent_aggregate boolean default false
);

-- Enable RLS
alter table users enable row level security;
create policy "users: own row" on users
  for all using (auth.uid() = user_id);

-- Sessions
create table if not exists sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id) on delete cascade,
  platform text,
  topic_category text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_minutes integer,
  consecutive_yes_count integer default 0
);

alter table sessions enable row level security;
create policy "sessions: own rows" on sessions
  for all using (auth.uid() = user_id);
create policy "sessions: public read (consented)" on sessions
  for select using (
    exists (
      select 1 from users where users.user_id = sessions.user_id and users.consent_aggregate = true
    )
  );

-- Check-ins
create table if not exists checkins (
  checkin_id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(session_id) on delete cascade,
  timestamp timestamptz default now(),
  grounded_score integer check (grounded_score between 1 and 10),
  signal_questions jsonb,
  drift_q1 boolean,
  drift_q2 boolean,
  break_nudge_shown boolean default false,
  instant_risk_score numeric(4,2)
);

alter table checkins enable row level security;
create policy "checkins: session owner" on checkins
  for all using (
    exists (select 1 from sessions where sessions.session_id = checkins.session_id and sessions.user_id = auth.uid())
  );

-- Post-session logs
create table if not exists post_session_logs (
  log_id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(session_id) on delete cascade,
  created_at timestamptz default now(),
  boundary_dissolution integer check (boundary_dissolution between 1 and 10),
  reality_confirmation integer check (reality_confirmation between 1 and 10),
  loop_feeling integer check (loop_feeling between 1 and 10),
  clarity_shift integer check (clarity_shift between 1 and 10),
  ideas_of_reference integer check (ideas_of_reference between 1 and 10),
  grandiosity integer check (grandiosity between 1 and 10),
  paranoid_ideation integer check (paranoid_ideation between 1 and 10),
  emotional_intensity integer check (emotional_intensity between 1 and 10)
);

alter table post_session_logs enable row level security;
create policy "logs: session owner" on post_session_logs
  for all using (
    exists (select 1 from sessions where sessions.session_id = post_session_logs.session_id and sessions.user_id = auth.uid())
  );
create policy "logs: public read (consented)" on post_session_logs
  for select using (
    exists (
      select 1 from sessions
      join users on users.user_id = sessions.user_id
      where sessions.session_id = post_session_logs.session_id
        and users.consent_aggregate = true
    )
  );

-- User corrections
create table if not exists user_corrections (
  correction_id uuid primary key default gen_random_uuid(),
  log_id uuid references post_session_logs(log_id) on delete cascade,
  checkin_id uuid references checkins(checkin_id) on delete cascade,
  original_value text,
  corrected_value text,
  user_note text,
  created_at timestamptz default now(),
  user_id uuid references users(user_id) on delete cascade
);

alter table user_corrections enable row level security;
create policy "corrections: own rows" on user_corrections
  for all using (auth.uid() = user_id);
