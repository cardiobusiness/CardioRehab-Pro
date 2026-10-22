create extension if not exists "uuid-ossp";

create type sex as enum ('female', 'male', 'other');
create type risk_level as enum ('baixo risco', 'risco moderado', 'alto risco');
create type sensor_model as enum ('polar_h7', 'polar_h10', 'polar_verity_sense');
create type session_phase as enum ('initial', 'exercise', 'final');

create table patients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  age integer not null check (age >= 0 and age <= 130),
  sex sex not null,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  cardiovascular_diagnosis text,
  procedure_performed text,
  comorbidities text[] not null default '{}',
  medications text[] not null default '{}',
  beta_blocker boolean not null default false,
  pacemaker boolean not null default false,
  icd boolean not null default false,
  ejection_fraction numeric(5,2),
  exercise_test text,
  scintigraphy text,
  echocardiogram text,
  functional_capacity_mets numeric(5,2),
  symptoms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table risk_assessments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  level risk_level not null,
  score integer not null,
  criteria jsonb not null,
  reasons text[] not null default '{}',
  assessed_at timestamptz not null default now()
);

create table rehab_sessions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references patients(id) on delete cascade,
  sensor_model sensor_model not null,
  target_zone_min_bpm integer,
  target_zone_max_bpm integer,
  exercise_load text,
  exercise_time_minutes integer,
  symptoms text[] not null default '{}',
  incidents text[] not null default '{}',
  therapist_notes text,
  suggested_conduct text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table heart_rate_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  bpm integer not null,
  rr_intervals_ms integer[],
  recorded_at timestamptz not null
);

create table blood_pressure_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  systolic integer not null,
  diastolic integer not null,
  phase session_phase not null,
  recorded_at timestamptz not null
);

create table spo2_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  value integer not null check (value >= 0 and value <= 100),
  recorded_at timestamptz not null
);

create table borg_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  value integer not null check (value >= 0 and value <= 10),
  recorded_at timestamptz not null
);

create table double_product_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  heart_rate integer not null,
  systolic_blood_pressure integer not null,
  value integer not null,
  alert_types text[] not null default '{}',
  recorded_at timestamptz not null
);

create table ecg_samples (
  id bigint generated always as identity primary key,
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  microvolts integer not null,
  recorded_at timestamptz not null
);

create table ecg_events (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  label text not null,
  symptom text,
  start_sample_index integer,
  end_sample_index integer,
  recorded_at timestamptz not null
);

create table ecg_strips (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  label text not null,
  start_sample_index integer not null,
  end_sample_index integer not null,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references rehab_sessions(id) on delete cascade,
  pdf_url text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index heart_rate_samples_session_recorded_at_idx
  on heart_rate_samples(session_id, recorded_at);

create index double_product_samples_session_recorded_at_idx
  on double_product_samples(session_id, recorded_at);

create index ecg_samples_session_recorded_at_idx
  on ecg_samples(session_id, recorded_at);
