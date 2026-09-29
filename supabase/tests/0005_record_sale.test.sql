begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- A test symbol held in two lots: 25 at US$82.60 and 15 at US$118.90. The local database may
-- hold seeded positions too, so everything below is scoped to this instrument.
insert into instrument (symbol, name, currency, kind) values ('ZZTEST', 'Test', 'USD', 'Stock');
insert into account (name, type) values ('Test broker', 'Broker');
insert into position (instrument_id, account_id)
select i.id, a.id from instrument i, account a
where i.symbol = 'ZZTEST' and a.name = 'Test broker';

create temporary view test_position as
select position.* from position join instrument i on i.id = instrument_id where i.symbol = 'ZZTEST';
create temporary view test_lot as
select lot.* from lot where position_id in (select id from position
  where instrument_id = (select id from instrument where symbol = 'ZZTEST'));
create temporary view test_sale as
select sale.* from sale join instrument i on i.id = instrument_id where i.symbol = 'ZZTEST';

insert into lot (position_id, quantity, cost_per_unit_cents, purchased_at)
select id, q, c, d::date from test_position,
  (values (25::double precision, 8260, '2024-08-07'), (15, 11890, '2025-04-22')) as l (q, c, d);

create temporary table ids as
select
  (select id from instrument where symbol = 'ZZTEST') as instrument_id,
  (select id from account where name = 'Test broker') as account_id,
  (select min(id) from test_lot) as first_lot,
  (select max(id) from test_lot) as second_lot;

-- A partial sale: 10 from the first lot.
select lives_ok(
  format(
    $$select record_sale(%s, %s, 10, 17840, '2026-09-24', '[{"id": %s, "quantity": 25, "remaining": 15}]')$$,
    instrument_id, account_id, first_lot
  ),
  'a partial sale records'
) from ids;
select is(
  (select quantity from test_lot where id = (select first_lot from ids)),
  15::double precision,
  'the lot it drew on is reduced'
);
select results_eq(
  'select quantity, price_per_unit_cents, proceeds_cents, cost_basis_cents, realized_pnl_cents, sold_at from test_sale',
  $$values (10::double precision, 17840::bigint, 178400::bigint, 82600::bigint, 95800::bigint, '2026-09-24'::date)$$,
  'the sale snapshots its cost basis and realised P&L'
);

-- A lot-spanning sale: the rest of the first lot and 5 of the second.
select lives_ok(
  format(
    $$select record_sale(%s, %s, 20, 18000, '2026-09-25',
      '[{"id": %s, "quantity": 15, "remaining": 0}, {"id": %s, "quantity": 15, "remaining": 10}]')$$,
    instrument_id, account_id, first_lot, second_lot
  ),
  'a lot-spanning sale records'
) from ids;
select is(
  (select count(*) from test_lot where id = (select first_lot from ids)),
  0::bigint,
  'an emptied lot is deleted'
);
select is(
  (select cost_basis_cents from test_sale where sold_at = '2026-09-25'),
  (15 * 8260 + 5 * 11890)::bigint,
  'the cost basis spans both lots'
);

-- A stale read: the second lot no longer holds 15.
select throws_ok(
  format(
    $$select record_sale(%s, %s, 5, 18000, '2026-09-26', '[{"id": %s, "quantity": 15, "remaining": 10}]')$$,
    instrument_id, account_id, second_lot
  ),
  'P0001', null,
  'a lot that changed since it was read refuses the sale'
) from ids;
select throws_ok(
  format(
    $$select record_sale(%s, %s, 6, 18000, '2026-09-26', '[{"id": %s, "quantity": 10, "remaining": 5}]')$$,
    instrument_id, account_id, second_lot
  ),
  'P0001', null,
  'lots that do not add up to the quantity refuse the sale'
) from ids;
select throws_ok(
  format(
    $$select record_sale(%s, %s, 0, 18000, '2026-09-26', '[]')$$,
    instrument_id, account_id
  ),
  'P0001', null,
  'a quantity of zero is refused'
) from ids;
select is(
  (select count(*) from test_sale),
  2::bigint,
  'a refused sale writes nothing'
);

-- A full close.
select lives_ok(
  format(
    $$select record_sale(%s, %s, 10, 19000, '2026-09-27', '[{"id": %s, "quantity": 10, "remaining": 0}]')$$,
    instrument_id, account_id, second_lot
  ),
  'selling the last shares records'
) from ids;
select is((select count(*) from test_lot), 0::bigint, 'no lots are left');
select is((select count(*) from test_position), 0::bigint, 'the position is closed');

select ok(
  not has_function_privilege('anon', 'record_sale(bigint, bigint, double precision, bigint, date, jsonb)', 'execute'),
  'anon cannot record a sale'
);

select * from finish();
rollback;
