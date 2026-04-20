-- Allow multiple rows with the same placement_key (e.g. several main_customer_ad
-- creatives on /restaurants) so the customer app can randomize on load and rotate
-- every minute. The previous UNIQUE(page_path, placement_key) allowed only one ad.

ALTER TABLE public.ad_placements
  DROP CONSTRAINT IF EXISTS ad_placements_page_path_placement_key_key;

COMMENT ON COLUMN public.ad_placements.placement_key IS
  'Slot id (e.g. main_customer_ad). Multiple rows may share page_path + placement_key for A/B rotation; use display_order.';

CREATE INDEX IF NOT EXISTS idx_ad_placements_page_path_key_order
  ON public.ad_placements (page_path, placement_key, display_order);
