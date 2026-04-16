-- Update Justin Sweet's equity_grants record to match the edited ledger value
UPDATE public.equity_grants 
SET shares_total = 2450000,
    share_class = 'Common'
WHERE id = 'ea6bdcbd-fb80-4a9e-9988-4dcf9d211e50';

-- Also update the cap_tables to reflect correct totals
-- Torrance: 10,500,000 (founder) + Jason: 2,100,000 + Justin: 2,450,000 = 15,050,000 exec grants
-- holding_company: 40,600,000 + founder: 10,500,000 + non-founder grants (2,100,000 + 2,450,000) = 55,650,000
-- But Justin's grant has a cancellation matching it, so net Justin from ledger = 0
-- Active grants from ledger: Torrance 10.5M, Jason 2.1M, Justin 2.45M (grant) - 2.45M (cancellation) = 0
-- Non-founder grants = Jason 2.1M = 2,100,000
-- total_issued = 40,600,000 + 10,500,000 + 2,100,000 = 53,200,000
-- total_unissued = 70,000,000 - 53,200,000 = 16,800,000
-- equity_pool = 16,800,000 - 1,400,000 = 15,400,000

-- Actually, the cancellation for Justin was from a previous revocation. The current grant of 2,450,000 
-- has a matching cancellation with the same grant_id. So Justin's net = 0 from ledger.
-- We need to remove that cancellation since the grant was re-edited (not revoked).

-- Delete the erroneous cancellation entry for Justin's current grant
DELETE FROM public.equity_ledger 
WHERE recipient_user_id = '5a259c29-8cdd-4569-9a3c-4f7481f1b441'
  AND transaction_type = 'cancellation'
  AND grant_id = 'e4e4c3e6-4409-4c48-9f60-cadfeb14bd7f';
