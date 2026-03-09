-- Add logos to all stores missing them via Brandfetch CDN

-- Convenience stores
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/7-eleven.com/logo', image_url = 'https://cdn.brandfetch.io/7-eleven.com/logo' WHERE id = '41982352-4d00-45b2-a0a7-a8e1a7e15416';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/circlek.com/logo', image_url = 'https://cdn.brandfetch.io/circlek.com/logo' WHERE id = 'e7bceed6-dc76-4682-bf9f-c5ee8dbf73d7';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/cvs.com/logo', image_url = 'https://cdn.brandfetch.io/cvs.com/logo' WHERE id = 'cab1d2e7-b0e3-4ff3-9b33-5ec59ff3de78';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/getgo.com/logo', image_url = 'https://cdn.brandfetch.io/getgo.com/logo' WHERE id = 'b3997e33-5b69-4d30-967f-d8f614f0074b';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/riteaid.com/logo', image_url = 'https://cdn.brandfetch.io/riteaid.com/logo' WHERE id = '15bb16cf-78ba-4929-bc57-2c16c9e9ba8b';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/sheetz.com/logo', image_url = 'https://cdn.brandfetch.io/sheetz.com/logo' WHERE id = '4eabfcbc-ef80-4bff-a81e-f5728f61bc94';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/speedway.com/logo', image_url = 'https://cdn.brandfetch.io/speedway.com/logo' WHERE id = 'acd755e4-3058-4e39-9d9d-b0215dde73ac';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/walgreens.com/logo', image_url = 'https://cdn.brandfetch.io/walgreens.com/logo' WHERE id = 'a93990be-71d0-4a05-93db-d47abfd1c64c';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/wawa.com/logo', image_url = 'https://cdn.brandfetch.io/wawa.com/logo' WHERE id = '7afd2db1-59a2-4ef4-b94f-f754b6889ce8';

-- Cosmetics
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/bareminerals.com/logo', image_url = 'https://cdn.brandfetch.io/bareminerals.com/logo' WHERE id = '040109da-fc72-4105-8a49-0271335a263a';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/bathandbodyworks.com/logo', image_url = 'https://cdn.brandfetch.io/bathandbodyworks.com/logo' WHERE id = '396d6f99-f861-4e62-a4bf-d3e488c42b91';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/kiehls.com/logo', image_url = 'https://cdn.brandfetch.io/kiehls.com/logo' WHERE id = 'a85bf86a-155f-48e3-bb7d-37aea175b934';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/loccitane.com/logo', image_url = 'https://cdn.brandfetch.io/loccitane.com/logo' WHERE id = '7219a450-b728-4815-8616-e43331f9f7fc';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/lush.com/logo', image_url = 'https://cdn.brandfetch.io/lush.com/logo' WHERE id = '503063c5-8f6e-4a62-823a-a5b47a397e44';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/maccosmetics.com/logo', image_url = 'https://cdn.brandfetch.io/maccosmetics.com/logo' WHERE id = '15fddcf2-8c73-46e3-962d-cdc864595a92';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/origins.com/logo', image_url = 'https://cdn.brandfetch.io/origins.com/logo' WHERE id = '5ba66430-ff7e-4c3a-b7d3-2864f227b1eb';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/sephora.com/logo', image_url = 'https://cdn.brandfetch.io/sephora.com/logo' WHERE id = 'ca19c5e1-91d9-4209-bc98-559d0a670686';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/thebodyshop.com/logo', image_url = 'https://cdn.brandfetch.io/thebodyshop.com/logo' WHERE id = 'aabd1a53-921f-44a7-93cd-60d0cb33315b';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/ulta.com/logo', image_url = 'https://cdn.brandfetch.io/ulta.com/logo' WHERE id = 'e5bc4dde-7600-47eb-8cfc-d8ccc990d738';

-- Pet stores (remaining)
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/chuckanddons.com/logo', image_url = 'https://cdn.brandfetch.io/chuckanddons.com/logo' WHERE id = 'c4904a77-7b57-499f-b875-4725c4058ca2';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/hollywoodfeed.com/logo', image_url = 'https://cdn.brandfetch.io/hollywoodfeed.com/logo' WHERE id = '06c797f3-36f9-487f-9dac-003ac6b7ac5f';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/mudbay.com/logo', image_url = 'https://cdn.brandfetch.io/mudbay.com/logo' WHERE id = '761c5434-995c-4646-8a38-c1dc36b717da';

-- Asian
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/balancegrille.com/logo', image_url = 'https://cdn.brandfetch.io/balancegrille.com/logo' WHERE id = 'c94d6336-932a-4423-a9c9-5a56b4eb24ab';

-- Local restaurants (use Brandfetch where possible)
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/docwatsons.com/logo', image_url = 'https://cdn.brandfetch.io/docwatsons.com/logo' WHERE id = '7240949f-707e-43ca-908d-b4f197f5d2af';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/fowlandfodder.com/logo', image_url = 'https://cdn.brandfetch.io/fowlandfodder.com/logo' WHERE id = 'e6ef68f2-84dd-45e4-b9e1-2a610b0637aa';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/grumpys.com/logo', image_url = 'https://cdn.brandfetch.io/grumpys.com/logo' WHERE id = 'bf53bcc9-71cd-416e-8b8f-aa14a42c2bcd';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/yeoldedurtybird.com/logo', image_url = 'https://cdn.brandfetch.io/yeoldedurtybird.com/logo' WHERE id = '768df972-30fa-4b74-9986-3cbbbe4c666f';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/flapflaps.com/logo', image_url = 'https://cdn.brandfetch.io/flapflaps.com/logo' WHERE id = 'ddaf77cc-5104-4d75-8947-69db590ebdc4';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/homeslicepizza.com/logo', image_url = 'https://cdn.brandfetch.io/homeslicepizza.com/logo' WHERE id = 'c018a9fc-161c-436b-acfb-cbf4ab682fc3';
UPDATE public.restaurants_master SET logo_url = 'https://cdn.brandfetch.io/mancys.com/logo', image_url = 'https://cdn.brandfetch.io/mancys.com/logo' WHERE id = '2724ed92-2f6c-4d47-bc54-c8c81bac8ac7';