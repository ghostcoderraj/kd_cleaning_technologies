ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_locations;
ALTER TABLE public.worker_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.task_locations REPLICA IDENTITY FULL;