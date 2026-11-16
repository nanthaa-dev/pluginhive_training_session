# Decision record: pickup-address storage

**Status:** Accepted  
**Decision:** Store sellers, pickup addresses, carrier availability, and their
relationships in PostgreSQL.

## Context

ShipHub sellers can own zero or more pickup addresses. Address labels must be
unique per seller, addresses must reference a real seller, and each seller may
have no more than one default pickup address. Carrier availability is shared
across addresses. These are relational integrity rules and the assignment
requires reliable counts and joins. The existing ShipHub order service uses
MongoDB; this decision covers pickup-address data and does not migrate orders.

## Reasons

PostgreSQL models seller-to-address as one-to-many and carrier availability as
many-to-many. Foreign keys, unique and check constraints, and a partial unique
index enforce the rules at the data boundary, including for concurrent writes
and clients other than the API. Transactions protect multi-row changes, while
joins and grouping make the requested seller and carrier counts direct and
consistent.

## Costs and trade-offs

The relational design needs joins, migrations, and PostgreSQL operations in
addition to the existing MongoDB service. Schema changes require deliberate
migrations, and writes spanning pickup data and MongoDB orders would not share
a single transaction. These costs are acceptable because pickup data is
structured and its cross-record rules are important.

## Rejected alternatives

- **Embed addresses and carriers in MongoDB seller documents:** convenient for
  reading a whole seller, but embedded address labels and default-address
  uniqueness require application-level checks; competing writes can violate
  those rules without careful atomic update logic. Shared carrier records also
  become duplicated.
- **Keep a flat relational table:** repeats seller/address/carrier attributes
  and introduces update, insert, and delete anomalies, in addition to
  unreliable counts.
- **Keep all data in MongoDB for stack uniformity:** avoids operating another
  database but gives up PostgreSQL's native foreign keys and straightforward
  relational constraints for this workload.
