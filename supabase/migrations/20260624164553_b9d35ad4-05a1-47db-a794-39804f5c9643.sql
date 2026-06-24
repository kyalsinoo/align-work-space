ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS telegram_bot_token text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_chat_id text NOT NULL DEFAULT '';

CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_by uuid,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (company_id = public.current_company_id());

CREATE POLICY "Admins and managers can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.current_company_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Admins and managers can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );