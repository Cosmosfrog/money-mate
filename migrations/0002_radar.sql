create table if not exists radar_bills (
  id text primary key,
  user_id text not null,
  name text not null,
  amount numeric not null,
  category text not null,
  frequency text not null,
  next_due date not null,
  auto_debit boolean not null default false,
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  account text not null default '',
  remaining_emis integer not null default 0,
  reminder_days integer not null default 0
);
create index if not exists radar_bills_user_id_idx on radar_bills (user_id);

create table if not exists radar_payments (
  id text primary key,
  user_id text not null,
  bill_id text not null,
  bill_name text not null,
  amount numeric not null,
  paid_on date not null,
  due_on date not null,
  status text not null,
  previous_due date,
  previous_remaining_emis integer not null default 0,
  previous_archived boolean not null default false
);
create index if not exists radar_payments_user_id_idx on radar_payments (user_id);

create table if not exists radar_settings (
  user_id text primary key,
  income numeric not null default 0,
  payday_day integer not null default 1,
  reminder_days integer not null default 1,
  notify_enabled boolean not null default false,
  notified_keys text not null default '[]',
  started_empty boolean not null default false,
  is_sample boolean not null default false
);
