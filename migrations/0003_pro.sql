alter table radar_settings add column if not exists is_pro boolean not null default false;
alter table radar_settings add column if not exists goal_name text not null default '';
alter table radar_settings add column if not exists goal_target numeric not null default 0;
