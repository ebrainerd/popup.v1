-- ===========================================================================
-- Settle auction payments that complete after the checkout window flipped the
-- run to payment_expired.
--
-- Race: the winner opens Stripe checkout near the 30-minute deadline. The
-- checkout session stays completable for up to 30 more minutes, but any
-- viewer (client timer or shop page load) flips the run to payment_expired
-- the moment checkout_expires_at passes. If the payment then completes, the
-- webhook's settle_auction_payment no-oped (it only matched awaiting_payment),
-- leaving a paid-for lot marked expired and offering the seller a re-run.
--
-- Money was captured and the order + stock decrement already happened, so
-- recording the run as paid is strictly more accurate. Sessions can only be
-- created while the run is awaiting_payment, so this cannot resurrect
-- arbitrary old runs.
-- ===========================================================================

create or replace function public.settle_auction_payment(
  p_auction_id uuid,
  p_order_id uuid,
  p_stripe_session_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.auction_runs
  set status = 'paid',
      stripe_session_id = p_stripe_session_id,
      updated_at = now()
  where id = p_auction_id
    and status in ('awaiting_payment', 'payment_expired');
end;
$$;
