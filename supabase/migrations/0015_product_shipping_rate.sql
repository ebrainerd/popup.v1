-- Per-product flat shipping (cents). Shop-level shipping_rate is deprecated.
alter table public.products
  add column if not exists shipping_rate integer not null default 0 check (shipping_rate >= 0);

-- Existing shops used a single shop shipping rate — copy it onto their products.
update public.products p
set shipping_rate = s.shipping_rate
from public.shops s
where p.shop_id = s.id
  and s.shipping_rate > 0
  and p.shipping_rate = 0;
