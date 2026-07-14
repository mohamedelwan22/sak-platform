-- Column-level profile updates: users can only change name/phone/language
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, language) ON public.profiles TO authenticated;

-- Current SAK price helper
CREATE OR REPLACE FUNCTION public.current_sak_price()
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.gram_price_usd * c.sak_to_gold_ratio
  FROM (SELECT gram_price_usd FROM public.gold_price_history ORDER BY created_at DESC LIMIT 1) g,
       (SELECT sak_to_gold_ratio FROM public.sak_config WHERE effective_from <= now() ORDER BY effective_from DESC LIMIT 1) c
$$;
REVOKE EXECUTE ON FUNCTION public.current_sak_price() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_sak_price() TO service_role;

-- BUY SAK (BR-001..BR-009, BR-015)
CREATE OR REPLACE FUNCTION public.fn_buy_sak(p_user UUID, p_land UUID, p_sak NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price NUMERIC; v_land RECORD; v_kyc TEXT; v_balance NUMERIC; v_holding UUID; v_cost NUMERIC;
BEGIN
  IF p_sak IS NULL OR p_sak <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  SELECT kyc_status INTO v_kyc FROM public.profiles WHERE id = p_user;
  IF v_kyc IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'KYC_001'; END IF;
  v_price := public.current_sak_price();
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'PRICE_UNAVAILABLE'; END IF;

  SELECT * INTO v_land FROM public.lands WHERE id = p_land FOR UPDATE;
  IF NOT FOUND OR v_land.status NOT IN ('active','partially_sold') THEN RAISE EXCEPTION 'LAND_UNAVAILABLE'; END IF;
  IF v_land.available_sak < p_sak THEN RAISE EXCEPTION 'INV_001'; END IF;

  SELECT sak_balance INTO v_balance FROM public.wallets WHERE user_id = p_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_sak THEN RAISE EXCEPTION 'WALLET_001'; END IF;

  v_cost := p_sak * v_price;

  UPDATE public.wallets SET sak_balance = sak_balance - p_sak WHERE user_id = p_user;
  UPDATE public.lands SET
    available_sak = available_sak - p_sak,
    status = CASE WHEN available_sak - p_sak = 0 THEN 'sold_out' ELSE 'partially_sold' END
  WHERE id = p_land;

  INSERT INTO public.holdings (user_id, land_id, sak_owned, purchase_price_per_sak_usd, maturity_date, status)
  VALUES (p_user, p_land, p_sak, v_price, now() + make_interval(months => v_land.maturity_months), 'active')
  RETURNING id INTO v_holding;

  INSERT INTO public.transactions (user_id, type, direction, sak_amount, usd_amount, sak_price_at_time, reference_id, description)
  VALUES (p_user, 'buy_sak', 'debit', p_sak, v_cost, v_price, v_holding, 'Buy SAK: ' || v_land.title_en);

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (p_user, 'تم تأكيد استثمارك', 'تم شراء ' || p_sak || ' SAK في ' || v_land.title_ar, 'investment');

  RETURN v_holding;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fn_buy_sak(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_buy_sak(UUID, UUID, NUMERIC) TO service_role;

-- APPROVE DEPOSIT (BR-001)
CREATE OR REPLACE FUNCTION public.fn_approve_deposit(p_request UUID, p_admin UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req RECORD; v_price NUMERIC; v_sak NUMERIC;
BEGIN
  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND OR v_req.type <> 'deposit' OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'REQUEST_INVALID'; END IF;
  v_price := public.current_sak_price();
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'PRICE_UNAVAILABLE'; END IF;
  v_sak := round(v_req.usd_amount / v_price, 4);

  UPDATE public.wallets SET sak_balance = sak_balance + v_sak WHERE user_id = v_req.user_id;
  UPDATE public.payment_requests SET status = 'approved', sak_amount = v_sak, rate_used_at_approval = v_price, reviewed_by = p_admin, processed_at = now() WHERE id = p_request;

  INSERT INTO public.transactions (user_id, type, direction, sak_amount, usd_amount, sak_price_at_time, reference_id, description)
  VALUES (v_req.user_id, 'deposit', 'credit', v_sak, v_req.usd_amount, v_price, p_request, 'Deposit approved');

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (v_req.user_id, 'تم اعتماد الإيداع', 'تمت إضافة ' || v_sak || ' SAK إلى محفظتك', 'deposit');

  RETURN v_sak;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fn_approve_deposit(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_deposit(UUID, UUID) TO service_role;

-- APPROVE WITHDRAWAL (BR-006)
CREATE OR REPLACE FUNCTION public.fn_approve_withdrawal(p_request UUID, p_admin UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req RECORD; v_price NUMERIC; v_sak NUMERIC; v_balance NUMERIC;
BEGIN
  SELECT * INTO v_req FROM public.payment_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND OR v_req.type <> 'withdrawal' OR v_req.status <> 'pending' THEN RAISE EXCEPTION 'REQUEST_INVALID'; END IF;
  v_price := public.current_sak_price();
  IF v_price IS NULL OR v_price <= 0 THEN RAISE EXCEPTION 'PRICE_UNAVAILABLE'; END IF;
  v_sak := round(v_req.usd_amount / v_price, 4);

  SELECT sak_balance INTO v_balance FROM public.wallets WHERE user_id = v_req.user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_sak THEN RAISE EXCEPTION 'WALLET_001'; END IF;

  UPDATE public.wallets SET sak_balance = sak_balance - v_sak WHERE user_id = v_req.user_id;
  UPDATE public.payment_requests SET status = 'approved', sak_amount = v_sak, rate_used_at_approval = v_price, reviewed_by = p_admin, processed_at = now() WHERE id = p_request;

  INSERT INTO public.transactions (user_id, type, direction, sak_amount, usd_amount, sak_price_at_time, reference_id, description)
  VALUES (v_req.user_id, 'withdrawal', 'debit', v_sak, v_req.usd_amount, v_price, p_request, 'Withdrawal approved');

  INSERT INTO public.notifications (user_id, title, body, category)
  VALUES (v_req.user_id, 'تمت الموافقة على السحب', 'تم خصم ' || v_sak || ' SAK وجارٍ تحويل المبلغ', 'withdrawal');

  RETURN v_sak;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fn_approve_withdrawal(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_withdrawal(UUID, UUID) TO service_role;