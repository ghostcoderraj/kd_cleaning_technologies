
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS worker_profiles_email_trgm_idx
  ON public.worker_profiles USING gin (lower(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS worker_profiles_name_trgm_idx
  ON public.worker_profiles USING gin (lower(full_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS worker_profiles_phone_trgm_idx
  ON public.worker_profiles USING gin (lower(phone) gin_trgm_ops);
