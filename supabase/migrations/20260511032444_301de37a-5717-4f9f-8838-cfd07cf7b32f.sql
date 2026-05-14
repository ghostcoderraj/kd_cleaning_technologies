-- ============ Helper: shorthand role checks ============
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager','supervisor')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager')
  )
$$;

-- ============ client_sites ============
CREATE TABLE public.client_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text DEFAULT '',
  latitude numeric,
  longitude numeric,
  contact_name text,
  contact_phone text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage all sites" ON public.client_sites
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Clients view own sites" ON public.client_sites
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

CREATE POLICY "Clients manage own sites" ON public.client_sites
  FOR ALL TO authenticated
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

CREATE TRIGGER trg_client_sites_updated
BEFORE UPDATE ON public.client_sites
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ worker_profiles ============
CREATE TABLE public.worker_profiles (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  current_latitude numeric,
  current_longitude numeric,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view all workers" ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff manage all workers" ON public.worker_profiles
  FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Worker views own profile" ON public.worker_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Worker updates own profile" ON public.worker_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Worker inserts own profile" ON public.worker_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_worker_profiles_updated
BEFORE UPDATE ON public.worker_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ tasks ============
CREATE TYPE public.task_status AS ENUM ('pending','accepted','in_progress','completed','cancelled');
CREATE TYPE public.task_urgency AS ENUM ('low','medium','high','emergency');
CREATE TYPE public.task_phase AS ENUM ('before','during','after');
CREATE TYPE public.note_kind AS ENUM ('general','material','damage','feedback');

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  client_user_id uuid,
  assigned_worker_id uuid,
  status public.task_status NOT NULL DEFAULT 'pending',
  urgency public.task_urgency NOT NULL DEFAULT 'medium',
  priority integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_duration text,
  special_instructions text,
  address_snapshot text,
  latitude numeric,
  longitude numeric,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_tasks_assigned_worker ON public.tasks(assigned_worker_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_scheduled ON public.tasks(scheduled_at);

CREATE POLICY "Staff manage all tasks" ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Workers view own tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (assigned_worker_id = auth.uid());

CREATE POLICY "Workers update own tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (assigned_worker_id = auth.uid())
  WITH CHECK (assigned_worker_id = auth.uid());

CREATE POLICY "Clients view own tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

CREATE TRIGGER trg_tasks_updated
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ task_photos ============
CREATE TABLE public.task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  phase public.task_phase NOT NULL,
  image_url text NOT NULL,
  caption text,
  latitude numeric,
  longitude numeric,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_photos_task ON public.task_photos(task_id);

CREATE POLICY "Staff manage task photos" ON public.task_photos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Workers add photos to own tasks" ON public.task_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid())
  );

CREATE POLICY "Workers view photos on own tasks" ON public.task_photos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid()));

CREATE POLICY "Workers delete own photos" ON public.task_photos
  FOR DELETE TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "Clients view photos on own tasks" ON public.task_photos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.client_user_id = auth.uid()));

-- ============ task_notes ============
CREATE TABLE public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  kind public.note_kind NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_notes_task ON public.task_notes(task_id);

CREATE POLICY "Staff manage notes" ON public.task_notes
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Workers add notes to own tasks" ON public.task_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid())
  );

CREATE POLICY "Workers view notes on own tasks" ON public.task_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid()));

CREATE POLICY "Clients view notes on own tasks" ON public.task_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.client_user_id = auth.uid()));

CREATE POLICY "Clients add feedback notes" ON public.task_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND kind = 'feedback'
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.client_user_id = auth.uid())
  );

-- ============ task_locations (GPS pings) ============
CREATE TABLE public.task_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_locations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_locations_task_time ON public.task_locations(task_id, recorded_at DESC);

CREATE POLICY "Staff view all locations" ON public.task_locations
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Workers insert own locations" ON public.task_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid())
  );

CREATE POLICY "Workers view own task locations" ON public.task_locations
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid());

-- ============ task_status_history ============
CREATE TABLE public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_status public.task_status,
  to_status public.task_status NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_task_status_history_task ON public.task_status_history(task_id, changed_at DESC);

CREATE POLICY "Staff view all history" ON public.task_status_history
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Workers view own task history" ON public.task_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid()));

CREATE POLICY "Clients view own task history" ON public.task_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.client_user_id = auth.uid()));

CREATE POLICY "Authorized users insert history" ON public.task_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.assigned_worker_id = auth.uid())
  );

-- Auto-log status transitions
CREATE OR REPLACE FUNCTION public.log_task_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.created_by);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_log_status
AFTER INSERT OR UPDATE OF status ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();

-- ============ Storage bucket for task photos ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Task photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-photos');

CREATE POLICY "Authenticated users upload task photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-photos');

CREATE POLICY "Users update own task photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-photos' AND owner = auth.uid());

CREATE POLICY "Users delete own task photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-photos' AND owner = auth.uid());
