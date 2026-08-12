-- "Script Used" on the result/history pages was rendering the *live* scripts.body, which drifts
-- from what actually produced the video once a script is edited/regenerated after a generation
-- already ran. Freeze the exact text that went into the prompt at submit time.
alter table public.generations
  add column script_body text;

comment on column public.generations.script_body is
  'Snapshot of scripts.body at the moment this generation was submitted — scripts.body can change afterward, this cannot.';
