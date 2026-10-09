create table public.connecting_translation_archive (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 source_language text not null check (char_length(source_language) between 1 and 80),
 target_language text not null check (char_length(target_language) between 1 and 80),
 source_text text not null check (char_length(source_text) between 1 and 100000),
 translated_text text not null check (char_length(translated_text) between 1 and 100000),
 created_at timestamptz not null default now()
);
create index connecting_translation_archive_owner_date on public.connecting_translation_archive (user_id, created_at desc, id desc);
alter table public.connecting_translation_archive enable row level security;
revoke all on public.connecting_translation_archive from public, anon, authenticated;
grant select, insert on public.connecting_translation_archive to authenticated;
create policy connecting_translation_archive_read on public.connecting_translation_archive for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.connecting_profiles p where p.user_id = (select auth.uid()) and p.role_code = 'A'));
create policy connecting_translation_archive_save on public.connecting_translation_archive for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.connecting_profiles p where p.user_id = (select auth.uid()) and p.role_code = 'A'));
