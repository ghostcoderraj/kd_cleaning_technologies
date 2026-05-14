
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill from auth.users for existing workers
UPDATE public.worker_profiles wp
SET email = lower(u.email)
FROM auth.users u
WHERE wp.user_id = u.id
  AND (wp.email IS NULL OR wp.email = '');

CREATE INDEX IF NOT EXISTS worker_profiles_email_idx
  ON public.worker_profiles (lower(email));

CREATE OR REPLACE FUNCTION public.admin_get_email_by_user_id(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e text;
BEGIN
  IF NOT public.is_admin_or_manager(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT email INTO e FROM auth.users WHERE id = _user_id LIMIT 1;
  RETURN e;
END;
$$;
