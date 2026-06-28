-- Record when a seller accepts the Terms of Service before opening a shop.

alter table public.profiles
  add column if not exists seller_terms_accepted_at timestamptz;
