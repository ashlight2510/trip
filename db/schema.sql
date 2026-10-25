-- 풍경너머 target schema (Postgres 15+ / Supabase, PostGIS).
-- Tables marked "JSON" are mirrored 1:1 by data/<table>.json today.
-- Tables marked "later" exist only here until the DB goes live.

create extension if not exists postgis;

-- JSON
create table regions (
  id            text primary key,
  parent_id     text references regions(id),
  level         text not null check (level in ('country', 'province', 'city', 'district')),
  name          text not null,
  name_en       text,
  country_code  char(2) not null,
  lat           double precision not null,
  lng           double precision not null
);

-- JSON
create table places (
  id            text primary key,
  name          text not null,
  name_en       text,
  category      text not null,
  region_id     text not null references regions(id),
  address       text,
  lat           double precision not null,
  lng           double precision not null,
  location      geography(point, 4326)
                generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  description   text,
  tags          text[] not null default '{}',
  view_heading  real,
  palette       text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index places_location_idx on places using gist (location);
create index places_region_idx on places (region_id);

-- JSON
create table place_external_refs (
  place_id     text not null references places(id) on delete cascade,
  provider     text not null check (provider in ('kakao', 'google', 'naver', 'osm')),
  external_id  text not null,
  url          text,
  fetched_at   timestamptz not null,
  primary key (provider, external_id)
);

-- JSON
create table sources (
  id             text primary key,
  type           text not null check (type in ('blog', 'youtube', 'article')),
  provider       text not null,
  url            text not null unique,
  title          text not null,
  author         text,
  author_url     text,
  published_at   date,
  snippet        varchar(400),
  thumbnail_url  text,
  view_count     integer,
  score          real,
  fetched_at     timestamptz not null
);

-- JSON: max 3 featured links per place (rank 1..3)
create table place_sources (
  place_id       text not null references places(id) on delete cascade,
  source_id      text not null references sources(id) on delete cascade,
  rank           smallint not null check (rank between 1 and 3),
  relevance      real not null,
  note           text,
  timestamp_sec  integer,
  primary key (place_id, source_id),
  unique (place_id, rank)
);

-- JSON: max 3 featured links per region (시/구)
create table region_sources (
  region_id   text not null references regions(id) on delete cascade,
  source_id   text not null references sources(id) on delete cascade,
  rank        smallint not null check (rank between 1 and 3),
  category    text,
  relevance   real not null,
  note        text,
  primary key (region_id, source_id),
  unique (region_id, rank)
);

-- JSON
create table soundscape_layers (
  place_id  text not null references places(id) on delete cascade,
  position  integer not null,
  kind      text not null,
  gain      real not null,
  bearing   real,
  label     text,
  primary key (place_id, position)
);

-- JSON: freely reusable tourism / commons media only (see src/db/schema.ts)
create table place_media (
  id           text primary key,
  place_id     text not null references places(id) on delete cascade,
  position     integer not null,
  kind         text not null check (kind in ('image', 'youtube')),
  url          text not null,
  title        text,
  credit       text not null,
  credit_url   text,
  license      text not null,
  license_url  text,
  provider     text not null,
  start_sec    integer,
  is_cover     boolean not null default false
);
create index place_media_place_idx on place_media (place_id, position);

-- JSON
create table courses (
  id            text primary key,
  title         text not null,
  subtitle      text,
  country_code  char(2) not null,
  cover         text[] not null,
  visibility    text not null check (visibility in ('public', 'unlisted', 'private')),
  author_id     uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- JSON
create table course_stops (
  course_id  text not null references courses(id) on delete cascade,
  position   integer not null,
  place_id   text not null references places(id),
  heading    real,
  tip        text,
  primary key (course_id, position)
);

-- JSON: user reports that a linked blog/video is gone or wrong
create table source_reports (
  id          text primary key,
  place_id    text not null references places(id) on delete cascade,
  source_id   text references sources(id) on delete set null,
  source_url  text,
  reason      text not null check (reason in ('deleted', 'wrong_place', 'spam', 'other')),
  note        text,
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now()
);

-- later: one row per auth user (Supabase auth.users)
create table profiles (
  id          uuid primary key,
  nickname    text not null,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
alter table courses add constraint courses_author_fk foreign key (author_id) references profiles(id);

-- later: rating + review on a place or a course
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles(id) on delete cascade,
  place_id    text references places(id) on delete cascade,
  course_id   text references courses(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  visited     text not null default 'virtual' check (visited in ('virtual', 'real')),
  created_at  timestamptz not null default now(),
  check ((place_id is null) <> (course_id is null))
);

-- later
create table comments (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

-- later: AR "hidden postcards", unlocked by code/QR within radius_m of the point
create table ar_drops (
  id           uuid primary key default gen_random_uuid(),
  place_id     text references places(id) on delete set null,
  author_id    uuid references profiles(id) on delete set null,
  lat          double precision not null,
  lng          double precision not null,
  radius_m     integer not null default 50,
  unlock_code  text unique,
  content      jsonb not null,
  created_at   timestamptz not null default now()
);
