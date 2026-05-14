GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone views active services" ON public.services;
DROP POLICY IF EXISTS "Admins view all services" ON public.services;

CREATE POLICY "Anyone views active services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins view all services"
ON public.services
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));