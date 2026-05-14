DROP POLICY IF EXISTS "Public reads service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins update service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete service images" ON storage.objects;

CREATE POLICY "Admins upload service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK ((bucket_id = 'service-images') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update service images"
ON storage.objects
FOR UPDATE
TO authenticated
USING ((bucket_id = 'service-images') AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((bucket_id = 'service-images') AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete service images"
ON storage.objects
FOR DELETE
TO authenticated
USING ((bucket_id = 'service-images') AND private.has_role(auth.uid(), 'admin'::public.app_role));