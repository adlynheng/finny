-- Recording a sale, in one transaction (build plan Task 69). The app runs the FIFO consumer
-- (consumeFifo in src/utils/derive/positions.ts) and passes each lot it drew on: the quantity it
-- read and what is left. This applies all of it or none of it: a lot that has changed since the
-- app read it, or lots that do not add up to the quantity sold, refuse the whole sale. The cost
-- basis is summed here from the lots themselves and snapshotted on the sale row, because it
-- cannot be recomputed once the lots are gone.
--
-- p_lots: [{"id": 12, "quantity": 25, "remaining": 5}, …]; quantities in shares, prices in the
-- instrument's currency.
create function record_sale(
  p_instrument_id bigint,
  p_account_id bigint,
  p_quantity double precision,
  p_price_per_unit_cents bigint,
  p_sold_at date,
  p_lots jsonb
)
returns bigint
language plpgsql
as $$
declare
  drawn jsonb;
  before double precision;
  remaining double precision;
  cost bigint;
  taken_total double precision := 0;
  cost_total double precision := 0;
  proceeds bigint := round(p_quantity * p_price_per_unit_cents);
  sale_id bigint;
begin
  if not (p_quantity > 0 and p_price_per_unit_cents > 0) then
    raise exception 'The quantity and price must be more than zero.';
  end if;

  for drawn in select * from jsonb_array_elements(p_lots) loop
    before := (drawn ->> 'quantity')::double precision;
    remaining := (drawn ->> 'remaining')::double precision;
    if not (remaining >= 0 and remaining < before) then
      raise exception 'Lot % cannot go from % to % shares.', drawn ->> 'id', before, remaining;
    end if;

    if remaining > 0 then
      update lot set quantity = remaining
      where id = (drawn ->> 'id')::bigint
        and quantity = before
        and position_id in (select id from position where instrument_id = p_instrument_id)
      returning cost_per_unit_cents into cost;
    else
      delete from lot
      where id = (drawn ->> 'id')::bigint
        and quantity = before
        and position_id in (select id from position where instrument_id = p_instrument_id)
      returning cost_per_unit_cents into cost;
    end if;
    if not found then
      raise exception 'Lot % has changed since it was read.', drawn ->> 'id';
    end if;

    taken_total := taken_total + (before - remaining);
    cost_total := cost_total + (before - remaining) * cost;
  end loop;

  -- Quantities are floats; the app rounds them to 8 places.
  if abs(taken_total - p_quantity) > 1e-8 then
    raise exception 'The lots add up to % shares, not %.', taken_total, p_quantity;
  end if;

  insert into sale (
    instrument_id, account_id, quantity, price_per_unit_cents, proceeds_cents,
    cost_basis_cents, realized_pnl_cents, sold_at
  )
  values (
    p_instrument_id, p_account_id, p_quantity, p_price_per_unit_cents, proceeds,
    round(cost_total), proceeds - round(cost_total), p_sold_at
  )
  returning id into sale_id;

  -- A position with no lots left is closed.
  delete from position p
  where p.instrument_id = p_instrument_id
    and not exists (select 1 from lot where lot.position_id = p.id);

  return sale_id;
end;
$$;

-- Functions are executable by everyone unless revoked: only a signed-in request may sell.
revoke execute on function record_sale(bigint, bigint, double precision, bigint, date, jsonb)
  from public, anon;
grant execute on function record_sale(bigint, bigint, double precision, bigint, date, jsonb)
  to authenticated;
