-- One generic trigger to keep updated_at fresh, attached to every table that has it.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.brand_profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.scripts
  for each row execute function public.set_updated_at();
