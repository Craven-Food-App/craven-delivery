
INSERT INTO public.restaurants (
  name, address, email, phone, owner_id,
  business_type, restaurant_type,
  cx_insurance_approved, cx_subscription_status,
  cx_current_period_end
)
VALUES (
  'Crave''N Express Courier',
  '1 Crave''N Way',
  'craven@usa.com',
  '+10000000000',
  '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd',
  'courier_service',
  'courier',
  true,
  'active',
  (now() + interval '10 years')
);

INSERT INTO public.cx_courier_documents (
  restaurant_id, uploaded_by, document_type, status, file_url, file_name, reviewed_at, reviewed_by
)
SELECT id, '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd',
       'courier_insurance', 'approved',
       'internal://owner-bypass', 'owner-bypass.pdf',
       now(), '93a342c6-9dc2-4bf6-ab1c-0dc1d17148cd'
FROM public.restaurants
WHERE email = 'craven@usa.com' AND business_type = 'courier_service';
