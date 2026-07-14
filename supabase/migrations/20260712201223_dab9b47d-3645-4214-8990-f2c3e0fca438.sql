-- ========= ROLES =========
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'investor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ========= PROFILES =========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (kyc_status IN ('not_submitted','pending','approved','rejected')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','suspended')),
  language TEXT NOT NULL DEFAULT 'ar' CHECK (language IN ('en','ar')),
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- ========= WALLETS =========
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sak_balance NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (sak_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ========= GOLD PRICE HISTORY (append-only) =========
CREATE TABLE public.gold_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gram_price_usd NUMERIC(12,4) NOT NULL CHECK (gram_price_usd > 0),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gold_price_history TO anon, authenticated;
GRANT ALL ON public.gold_price_history TO service_role;
ALTER TABLE public.gold_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read gold prices" ON public.gold_price_history FOR SELECT USING (true);

-- ========= SAK CONFIG (append-only, versioned) =========
CREATE TABLE public.sak_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sak_to_gold_ratio NUMERIC(10,4) NOT NULL DEFAULT 0.1 CHECK (sak_to_gold_ratio > 0),
  sell_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 2.0 CHECK (sell_fee_percent >= 0),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sak_config TO anon, authenticated;
GRANT ALL ON public.sak_config TO service_role;
ALTER TABLE public.sak_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sak config" ON public.sak_config FOR SELECT USING (true);

-- ========= PROJECTS =========
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed')),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('none','low','medium','high')),
  expected_roi NUMERIC(5,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active projects" ON public.projects FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage projects" ON public.projects FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ========= LANDS =========
CREATE TABLE public.lands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_ar TEXT NOT NULL DEFAULT '',
  asset_type TEXT NOT NULL DEFAULT 'land' CHECK (asset_type IN ('land','hotel','mall','warehouse','resort','agricultural')),
  country TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  area_m2 NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_sak_inventory NUMERIC(20,4) NOT NULL CHECK (total_sak_inventory > 0),
  available_sak NUMERIC(20,4) NOT NULL CHECK (available_sak >= 0),
  maturity_months INT NOT NULL DEFAULT 12 CHECK (maturity_months > 0),
  expected_roi NUMERIC(5,2) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('none','low','medium','high')),
  cover_image_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]',
  lat NUMERIC(10,6),
  lng NUMERIC(10,6),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','partially_sold','sold_out','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lands TO authenticated;
GRANT ALL ON public.lands TO service_role;
ALTER TABLE public.lands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published lands" ON public.lands FOR SELECT USING (status IN ('active','partially_sold','sold_out') OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage lands" ON public.lands FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ========= HOLDINGS =========
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  land_id UUID NOT NULL REFERENCES public.lands(id),
  sak_owned NUMERIC(20,4) NOT NULL CHECK (sak_owned > 0),
  purchase_price_per_sak_usd NUMERIC(12,4) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  maturity_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','listed','sold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.holdings TO authenticated;
GRANT ALL ON public.holdings TO service_role;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own holdings" ON public.holdings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all holdings" ON public.holdings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ========= TRANSACTIONS (append-only) =========
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal','buy_sak','sell_sak','profit_distribution','affiliate_commission','fee','refund')),
  direction TEXT NOT NULL CHECK (direction IN ('credit','debit')),
  sak_amount NUMERIC(20,4) NOT NULL DEFAULT 0,
  usd_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  sak_price_at_time NUMERIC(12,4),
  reference_id UUID,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX idx_transactions_user ON public.transactions(user_id, created_at DESC);

-- ========= KYC SUBMISSIONS =========
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id','passport','driver_license')),
  front_image_path TEXT NOT NULL,
  back_image_path TEXT,
  selfie_image_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own kyc" ON public.kyc_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users submit own kyc" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all kyc" ON public.kyc_submissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ========= PAYMENT REQUESTS (deposits & withdrawals) =========
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  method TEXT NOT NULL CHECK (method IN ('bank_transfer','card','paypal','crypto')),
  usd_amount NUMERIC(14,2) NOT NULL CHECK (usd_amount > 0),
  sak_amount NUMERIC(20,4),
  rate_used_at_approval NUMERIC(12,4),
  proof_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  reviewed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own payment requests" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ========= NOTIFICATIONS =========
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general','kyc','deposit','withdrawal','investment','security')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ========= TRIGGERS =========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER upd_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER upd_wallets BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER upd_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER upd_lands BEFORE UPDATE ON public.lands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER upd_holdings BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + wallet + investor role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8))
  );
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'investor');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========= STORAGE POLICIES =========
CREATE POLICY "Users upload own kyc docs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own kyc docs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));

CREATE POLICY "Users upload own payment proofs" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own payment proofs" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));

CREATE POLICY "Anyone views land images" ON storage.objects FOR SELECT USING (bucket_id = 'land-images');
CREATE POLICY "Admins upload land images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'land-images' AND public.is_admin(auth.uid()));