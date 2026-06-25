
CREATE TABLE public.recruitment_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  min_experience INTEGER NOT NULL DEFAULT 0,
  required_education TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  additional_requirements TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.recruitment_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  job_id UUID NOT NULL REFERENCES public.recruitment_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'review',
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_jobs TO authenticated;
GRANT ALL ON public.recruitment_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_candidates TO authenticated;
GRANT ALL ON public.recruitment_candidates TO service_role;

ALTER TABLE public.recruitment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage recruitment jobs in their company"
  ON public.recruitment_jobs FOR ALL
  TO authenticated
  USING (public.is_admin() AND company_id = public.current_company_id())
  WITH CHECK (public.is_admin() AND company_id = public.current_company_id());

CREATE POLICY "Admins manage recruitment candidates in their company"
  ON public.recruitment_candidates FOR ALL
  TO authenticated
  USING (public.is_admin() AND company_id = public.current_company_id())
  WITH CHECK (public.is_admin() AND company_id = public.current_company_id());
