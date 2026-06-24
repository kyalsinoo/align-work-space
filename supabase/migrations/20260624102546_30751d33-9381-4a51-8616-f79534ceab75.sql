-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'sales', 'developer');

-- Companies
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Tech Startup',
  wifi_password TEXT NOT NULL DEFAULT 'OFM-Office-2024',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  roles public.app_role[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_by_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaves
CREATE TABLE public.leaves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TEXT,
  check_out TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaves TO authenticated;
GRANT ALL ON public.leaves TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;

-- Helper functions (SECURITY DEFINER to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle_new_user: create company + profile + admin role when registering a company
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_name TEXT := NEW.raw_user_meta_data->>'company_name';
  v_company_type TEXT := COALESCE(NEW.raw_user_meta_data->>'company_type', 'Tech Startup');
  v_full_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_company_id UUID;
BEGIN
  -- Only auto-provision for company registrations (those carrying a company_name).
  IF v_company_name IS NOT NULL AND v_company_name <> '' THEN
    INSERT INTO public.companies (name, type) VALUES (v_company_name, v_company_type)
      RETURNING id INTO v_company_id;
    INSERT INTO public.profiles (id, company_id, full_name, email)
      VALUES (NEW.id, v_company_id, v_full_name, NEW.email);
    INSERT INTO public.user_roles (user_id, company_id, role)
      VALUES (NEW.id, v_company_id, 'admin');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policies: companies
CREATE POLICY "view own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY "admin update own company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.is_admin())
  WITH CHECK (id = public.current_company_id() AND public.is_admin());

-- Policies: profiles
CREATE POLICY "view company profiles" ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND public.is_admin());
CREATE POLICY "admin update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_admin());
CREATE POLICY "admin delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (company_id = public.current_company_id() AND public.is_admin());

-- Policies: user_roles
CREATE POLICY "view company roles" ON public.user_roles FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (company_id = public.current_company_id() AND public.is_admin())
  WITH CHECK (company_id = public.current_company_id() AND public.is_admin());

-- Policies: tasks
CREATE POLICY "view company tasks" ON public.tasks FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "create company tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "update company tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "delete company tasks" ON public.tasks FOR DELETE TO authenticated
  USING (company_id = public.current_company_id());

-- Policies: leaves
CREATE POLICY "view company leaves" ON public.leaves FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "create company leaves" ON public.leaves FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "update company leaves" ON public.leaves FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id());

-- Policies: attendance
CREATE POLICY "view company attendance" ON public.attendance FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "manage own attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id() AND user_id = auth.uid());
CREATE POLICY "update own attendance" ON public.attendance FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id() AND user_id = auth.uid());