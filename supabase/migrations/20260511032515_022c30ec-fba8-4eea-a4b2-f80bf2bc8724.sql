-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_status_change() FROM PUBLIC, anon, authenticated;

-- Replace broad public SELECT on task-photos bucket with signed-in listing
DROP POLICY IF EXISTS "Task photos are publicly viewable" ON storage.objects;

CREATE POLICY "Authenticated list task photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-photos');
