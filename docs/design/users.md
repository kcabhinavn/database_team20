# Users

RideSync has two kinds of people who open the app. Each one gets a different starting point and navigation, but the
screens underneath are shared and only scoped differently. There is no real login. A **View as** switch in the top bar
picks the user type, and in Rider mode a picker chooses which of the 1,000 seeded riders you are acting as.

## 1. Rider ("Heather, daily commuter")

Heather pays for rides from a prepaid wallet. She is usually on her phone and in a hurry, so every screen has to work on a
narrow screen and give a clear answer quickly.

**What she wants to do**

| Goal | Screen | Backed by |
|---|---|---|
| See how much money is in her wallet, all the time | Top bar + every rider screen | `riders.wallet_balance` |
| Find an available vehicle close to her, nearest first | Find a vehicle (map) | Workflow 3, `$geoNear` 5 km |
| Book a trip and know immediately whether it worked and what it cost | Book a trip | Workflow 1, `sp_atomic_booking` |
| If a booking fails, understand why in plain words and what to do next | Book a trip (failure states) | `p_status` mapped to messages |
| Follow her current trip as it moves REQUESTED → IN TRANSIT → COMPLETED | Book a trip / My trips | `fn_advance_trip_status` |
| Check her wallet history for a date range | My wallet | `wallet_audit_logs` |
| See what other riders say about a vehicle and what it offers | Reviews | Workflow 4 `$facet`, `VehicleMetadata` |

**What she does not want:** being charged twice, error codes, or losing what she typed when something goes wrong.

## 2. Fleet operations manager ("Arjun, ops lead")

Arjun runs the 500-vehicle fleet from a laptop. He works with large tables, compares numbers and investigates
problems: a rider disputing a charge, a vehicle with bad reviews, revenue dropping.

**What he wants to do**

| Goal | Screen | Backed by |
|---|---|---|
| Search and filter riders, vehicles and the 50,000 trips without waiting | Riders / Vehicles / Trips | paged SQL with indexes |
| Open one record and see everything about it | Rider, Vehicle and Trip detail | Postgres + Mongo per card |
| See fleet totals and know how fresh they are, and refresh them on demand | Overview | materialized view `vehicle_lifetime_stats` |
| Follow a vehicle's revenue trend and see which vehicles earn most | Overview | Workflow 2 window query (7-day moving average, `DENSE_RANK`) |
| Watch which vehicles are available around a busy area right now | Live map | Workflow 3 `$geoNear` + polling |
| Spot service problems: rating spread and the most common feedback tags | Reviews | Workflow 4 `$facet` |
| Check a vehicle's features and inspection history | Vehicle detail / Reviews | `VehicleMetadata` document |
| Resolve a wallet dispute by reading any rider's audit trail with a running balance | Wallet audit | `wallet_audit_logs` (read-only) |
| Move a stuck trip to its next status | Trip detail | `fn_advance_trip_status` |

**What he does not want:** pages that load the whole table, numbers with no "as of" time, or one failing data source blanking
the whole page.

A support or finance person who handles wallet disputes needs the same things as the ops manager, so they use Ops mode.

## Screens per user

| Screen | Route | Rider | Ops manager | Assignment screen |
|---|---|---|---|---|
| Find a vehicle / Live map | `/map` | ✓ ("Book" button on each result) | ✓ (monitoring) | 5. Map |
| Book a trip | `/book` | ✓ |  | 2. Transaction |
| My trips / Trips | `/trips`, `/trips/:id` | ✓ (own trips only) | ✓ (all trips) | 1. Browse |
| My wallet / Wallet audit | `/wallet` | ✓ (locked to self) | ✓ (any rider) | 3. Audit trail |
| Overview (analytics) | `/analytics` |  | ✓ | 4. Analytics |
| Riders | `/riders`, `/riders/:id` |  | ✓ | 1. Browse |
| Vehicles | `/vehicles`, `/vehicles/:id` |  | ✓ | 1. Browse + catalog |
| Reviews | `/reviews` | ✓ | ✓ | 6. Reviews |

## Key journeys (used in the demo)

1. **Rider, find then book.** Find a vehicle → choose the nearest one → **Book** opens the form with that vehicle filled in →
   the booking succeeds and shows the balance before and after plus the new audit row → My wallet shows the debit.
2. **Rider, blocked by the partial unique index.** Book again → "You already have a trip in progress" → move the trip to
   IN TRANSIT and then COMPLETED → book again, which now succeeds.
3. **Rider, insufficient balance.** Enter a fare larger than the balance → "Nothing was charged" message, and the balance
   is unchanged.
4. **Ops, revenue check.** Overview → refresh the fleet summary (the "last refreshed" time updates) → click a vehicle in
   the ranking → its 7-day trend appears → open the vehicle → catalog and reviews.
5. **Ops, dispute.** Wallet audit → pick the rider → limit to a date range → the running balance matches every recorded
   `balance_after`.
