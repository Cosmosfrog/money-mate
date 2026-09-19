-- Phone number columns for Better Auth phoneNumber plugin (OTP sign-in).
alter table "user" add column if not exists "phoneNumber" text;
alter table "user" add column if not exists "phoneNumberVerified" boolean;

create unique index if not exists "user_phoneNumber_uidx"
  on "user" ("phoneNumber")
  where "phoneNumber" is not null;
