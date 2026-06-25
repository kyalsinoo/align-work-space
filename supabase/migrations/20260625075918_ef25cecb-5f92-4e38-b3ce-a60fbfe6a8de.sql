-- Restrict leaves UPDATE to admins/managers only
DROP POLICY IF EXISTS "update company leaves" ON public.leaves;
CREATE POLICY "admin manage leaves" ON public.leaves
  FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = current_company_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager')));

-- Restrict tasks UPDATE to admins/managers only
DROP POLICY IF EXISTS "update company tasks" ON public.tasks;
CREATE POLICY "admin update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (company_id = current_company_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager')));

-- Restrict tasks DELETE to admins/managers only
DROP POLICY IF EXISTS "delete company tasks" ON public.tasks;
CREATE POLICY "admin delete tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (company_id = current_company_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager')));