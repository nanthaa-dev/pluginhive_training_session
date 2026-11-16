# Invalid-insert evidence

The following statements were run against the seeded PostgreSQL schema. Each
fails as intended; the constraint/index names shown identify the enforcing
database rule.

## 1. Unknown seller ID

```sql
INSERT INTO pickup_assignment.pickup_addresses
    (seller_id, label, address_line1, city, state_region, pincode)
VALUES
    (99, 'Invalid seller test', '1 Test Road', 'Pune', 'Maharashtra', '411001');
```

```text
ERROR:  insert or update on table "pickup_addresses" violates foreign key constraint "pickup_addresses_seller_id_fkey"
DETAIL:  Key (seller_id)=(99) is not present in table "sellers".
```

## 2. Five-digit pincode

```sql
INSERT INTO pickup_assignment.pickup_addresses
    (seller_id, label, address_line1, city, state_region, pincode)
SELECT seller_id, 'Invalid pincode test', '1 Test Road', 'Pune', 'Maharashtra', '41101'
FROM pickup_assignment.sellers
WHERE seller_name = 'Northstar Goods';
```

```text
ERROR:  new row for relation "pickup_addresses" violates check constraint "pickup_addresses_pincode_format_check"
DETAIL:  Failing row contains (10, 1, Invalid pincode test, 1 Test Road, Pune, Maharashtra, 41101, f).
```

## 3. Duplicate label for the same seller

```sql
INSERT INTO pickup_assignment.pickup_addresses
    (seller_id, label, address_line1, city, state_region, pincode)
SELECT seller_id, 'Main Warehouse', '99 Duplicate Road', 'Bengaluru', 'Karnataka', '560099'
FROM pickup_assignment.sellers
WHERE seller_name = 'Northstar Goods';
```

```text
ERROR:  duplicate key value violates unique constraint "pickup_addresses_seller_label_key"
DETAIL:  Key (seller_id, label)=(1, Main Warehouse) already exists.
```

## Stretch check: second default address

Attempting to insert another `is_default = true` address for Northstar Goods
also fails:

```sql
INSERT INTO pickup_assignment.pickup_addresses
    (seller_id, label, address_line1, city, state_region, pincode, is_default)
SELECT seller_id, 'Second Default Test', '99 Default Road', 'Bengaluru',
       'Karnataka', '560099', true
FROM pickup_assignment.sellers
WHERE seller_name = 'Northstar Goods';
```

```text
ERROR:  duplicate key value violates unique constraint "pickup_addresses_one_default_per_seller_idx"
DETAIL:  Key (seller_id)=(1) already exists.
```
