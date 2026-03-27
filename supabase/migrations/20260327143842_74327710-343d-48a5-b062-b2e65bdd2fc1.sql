-- Step 1: Delete ALL duplicate Torrance equity grants (wrong 20%/2M values)
DELETE FROM equity_grants WHERE id IN (
  'f458e540-e355-4d4e-8343-0159d9b9c634',
  '5c4c4fa6-71a7-40ef-b275-42b2577fef93',
  '06883edc-a24d-4288-a2a8-08ae9b0c2610',
  '8a612e70-f94f-4901-b015-484229a35989',
  '733cef04-1aba-4a99-a93d-d65ef0894c36',
  '0c38a7bd-ca57-4eca-872b-5f638a807072',
  '296b738e-c432-4e1b-91d4-87c51af73902',
  'e3089b7c-cc2d-441d-85e7-4cd57cc67318',
  'ee4e334d-1b12-4b8f-a58a-ecb2ff386d53',
  '73bcc542-5989-494a-b076-b78a60a09447'
);

-- Step 2: Reassign time_entries from duplicate exec_user to the correct one
UPDATE time_entries 
SET exec_user_id = '017a7387-1da0-4718-a801-9cb7a2ff037c'
WHERE exec_user_id = 'ca4e4a39-c2d2-4207-a15d-d5177a51ed79';

-- Step 3: Remove the duplicate CEO exec_users entry
DELETE FROM exec_users WHERE id = 'ca4e4a39-c2d2-4207-a15d-d5177a51ed79';

-- Step 4: Insert the ONE correct equity grant for Torrance Stroman, Founder & CEO
INSERT INTO equity_grants (
  executive_id, shares_total, shares_percentage, strike_price, 
  status, grant_date, share_class, consideration_type,
  vesting_schedule, notes
) VALUES (
  '017a7387-1da0-4718-a801-9cb7a2ff037c',
  10500000,
  15.00,
  0.0001,
  'approved',
  '2025-01-01',
  'Common',
  'founder_contribution',
  '{"type": "immediate"}'::jsonb,
  'Founder equity grant - Torrance Stroman, Founder & CEO - 15% (10,500,000 shares of 70M authorized)'
);