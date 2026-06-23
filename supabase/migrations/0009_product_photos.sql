-- ===========================================================================
-- PopUp — multiple photos per product
-- ===========================================================================

alter table public.products
  add column if not exists photo_urls text[] not null default '{}';

-- Backfill the array from the existing single photo where present.
update public.products
set photo_urls = array[photo_url]
where photo_url is not null and coalesce(array_length(photo_urls, 1), 0) = 0;
