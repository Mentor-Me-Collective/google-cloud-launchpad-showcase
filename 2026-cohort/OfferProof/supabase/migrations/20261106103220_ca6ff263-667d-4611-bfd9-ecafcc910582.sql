CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  company text,
  job_title text,
  offer_text text CHECK (offer_text IS NULL OR char_length(offer_text) <= 50000),
  salary_amount numeric CHECK (salary_amount IS NULL OR salary_amount >= 0),
  salary_currency text,
  salary_period text CHECK (salary_period IS NULL OR salary_period IN ('year','month','week','day','hour')),
  benefits text,
  location text,
  work_mode text CHECK (work_mode IS NULL OR work_mode IN ('onsite','hybrid','remote')),
  employment_type text CHECK (employment_type IS NULL OR employment_type IN ('full_time','part_time','contract','internship','freelance')),
  employment_terms text,
  growth_rating smallint CHECK (growth_rating IS NULL OR growth_rating BETWEEN 1 AND 5),
  work_life_rating smallint CHECK (work_life_rating IS NULL OR work_life_rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own offers select" ON public.offers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own offers insert" ON public.offers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own offers update" ON public.offers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own offers delete" ON public.offers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX offers_user_idx ON public.offers(user_id, created_at DESC);
CREATE TRIGGER offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.verification_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  assessment text NOT NULL CHECK (assessment IN ('low_concern','needs_review','high_concern')),
  points integer NOT NULL DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  phrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  offer_text text NOT NULL CHECK (char_length(offer_text) <= 50000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_reports TO authenticated;
GRANT ALL ON public.verification_reports TO service_role;
ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reports select" ON public.verification_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own reports insert" ON public.verification_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND (offer_id IS NULL OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.user_id = auth.uid())));
CREATE POLICY "Own reports update" ON public.verification_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND (offer_id IS NULL OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.user_id = auth.uid())));
CREATE POLICY "Own reports delete" ON public.verification_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX reports_user_idx ON public.verification_reports(user_id, created_at DESC);
CREATE INDEX reports_offer_idx ON public.verification_reports(offer_id);
CREATE TRIGGER reports_updated BEFORE UPDATE ON public.verification_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  offer_ids uuid[] NOT NULL CHECK (cardinality(offer_ids) BETWEEN 2 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comparisons TO authenticated;
GRANT ALL ON public.comparisons TO service_role;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own comparisons select" ON public.comparisons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own comparisons insert" ON public.comparisons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own comparisons update" ON public.comparisons FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own comparisons delete" ON public.comparisons FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX comparisons_user_idx ON public.comparisons(user_id, created_at DESC);
CREATE TRIGGER comparisons_updated BEFORE UPDATE ON public.comparisons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();