-- ShipHub pickup-address assignment
-- From the project root, after setting DATABASE_URL:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "Day 07/pickups.sql"
-- All objects are scoped to pickup_assignment; seed inserts are safe to rerun.

CREATE SCHEMA IF NOT EXISTS pickup_assignment;

CREATE TABLE IF NOT EXISTS pickup_assignment.sellers (
    seller_id bigint GENERATED ALWAYS AS IDENTITY,
    seller_name text NOT NULL,
    CONSTRAINT sellers_pkey PRIMARY KEY (seller_id),
    CONSTRAINT sellers_seller_name_key UNIQUE (seller_name),
    CONSTRAINT sellers_name_not_blank_check
        CHECK (length(btrim(seller_name)) > 0)
);

CREATE TABLE IF NOT EXISTS pickup_assignment.pickup_addresses (
    pickup_address_id bigint GENERATED ALWAYS AS IDENTITY,
    seller_id bigint NOT NULL,
    label text NOT NULL,
    address_line1 text NOT NULL,
    city text NOT NULL,
    state_region text NOT NULL,
    pincode varchar(6) NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    CONSTRAINT pickup_addresses_pkey PRIMARY KEY (pickup_address_id),
    CONSTRAINT pickup_addresses_seller_id_fkey
        FOREIGN KEY (seller_id)
        REFERENCES pickup_assignment.sellers (seller_id)
        ON DELETE CASCADE,
    CONSTRAINT pickup_addresses_seller_label_key UNIQUE (seller_id, label),
    CONSTRAINT pickup_addresses_label_not_blank_check
        CHECK (length(btrim(label)) > 0),
    CONSTRAINT pickup_addresses_address_not_blank_check
        CHECK (length(btrim(address_line1)) > 0),
    CONSTRAINT pickup_addresses_city_not_blank_check
        CHECK (length(btrim(city)) > 0),
    CONSTRAINT pickup_addresses_state_not_blank_check
        CHECK (length(btrim(state_region)) > 0),
    CONSTRAINT pickup_addresses_pincode_format_check
        CHECK (pincode ~ '^[0-9]{6}$')
);

CREATE TABLE IF NOT EXISTS pickup_assignment.carriers (
    carrier_id bigint GENERATED ALWAYS AS IDENTITY,
    carrier_name text NOT NULL,
    CONSTRAINT carriers_pkey PRIMARY KEY (carrier_id),
    CONSTRAINT carriers_carrier_name_key UNIQUE (carrier_name),
    CONSTRAINT carriers_name_not_blank_check
        CHECK (length(btrim(carrier_name)) > 0)
);

CREATE TABLE IF NOT EXISTS pickup_assignment.pickup_address_carriers (
    pickup_address_id bigint NOT NULL,
    carrier_id bigint NOT NULL,
    CONSTRAINT pickup_address_carriers_pkey
        PRIMARY KEY (pickup_address_id, carrier_id),
    CONSTRAINT pickup_address_carriers_pickup_address_id_fkey
        FOREIGN KEY (pickup_address_id)
        REFERENCES pickup_assignment.pickup_addresses (pickup_address_id)
        ON DELETE CASCADE,
    CONSTRAINT pickup_address_carriers_carrier_id_fkey
        FOREIGN KEY (carrier_id)
        REFERENCES pickup_assignment.carriers (carrier_id)
        ON DELETE CASCADE
);

-- A partial unique index enforces at most one default address per seller.
CREATE UNIQUE INDEX IF NOT EXISTS pickup_addresses_one_default_per_seller_idx
    ON pickup_assignment.pickup_addresses (seller_id)
    WHERE is_default;

INSERT INTO pickup_assignment.sellers (seller_name)
VALUES
    ('Northstar Goods'),
    ('Cedar & Clay Studio'),
    ('Beacon Outfitters'),
    ('New Seller Ltd')
ON CONFLICT (seller_name) DO NOTHING;

INSERT INTO pickup_assignment.carriers (carrier_name)
VALUES
    ('LocalCourier'),
    ('ParcelPro'),
    ('ShipFast')
ON CONFLICT (carrier_name) DO NOTHING;

INSERT INTO pickup_assignment.pickup_addresses
    (seller_id, label, address_line1, city, state_region, pincode, is_default)
SELECT s.seller_id, seed.label, seed.address_line1, seed.city,
       seed.state_region, seed.pincode, seed.is_default
FROM (VALUES
    ('Northstar Goods', 'Main Warehouse', '12 Industrial Estate',
        'Bengaluru', 'Karnataka', '560001', true),
    ('Northstar Goods', 'Retail Shop', '8 Market Road',
        'Bengaluru', 'Karnataka', '560002', false),
    ('Cedar & Clay Studio', 'Studio', '24 Artisans Lane',
        'Mumbai', 'Maharashtra', '400001', true),
    ('Beacon Outfitters', 'Warehouse', '5 Central Avenue',
        'New Delhi', 'Delhi', '110001', true)
) AS seed(seller_name, label, address_line1, city, state_region, pincode, is_default)
JOIN pickup_assignment.sellers AS s
    ON s.seller_name = seed.seller_name
ON CONFLICT ON CONSTRAINT pickup_addresses_seller_label_key DO NOTHING;

INSERT INTO pickup_assignment.pickup_address_carriers
    (pickup_address_id, carrier_id)
SELECT pa.pickup_address_id, c.carrier_id
FROM (VALUES
    ('Northstar Goods', 'Main Warehouse', 'ShipFast'),
    ('Northstar Goods', 'Main Warehouse', 'ParcelPro'),
    ('Northstar Goods', 'Retail Shop', 'ParcelPro'),
    ('Cedar & Clay Studio', 'Studio', 'ShipFast'),
    ('Cedar & Clay Studio', 'Studio', 'LocalCourier')
) AS seed(seller_name, label, carrier_name)
JOIN pickup_assignment.sellers AS s
    ON s.seller_name = seed.seller_name
JOIN pickup_assignment.pickup_addresses AS pa
    ON pa.seller_id = s.seller_id
   AND pa.label = seed.label
JOIN pickup_assignment.carriers AS c
    ON c.carrier_name = seed.carrier_name
ON CONFLICT DO NOTHING;

-- Query 1: every seller and pickup-address count.
-- Predicted rows: 4. Actual rows: 4.
SELECT s.seller_id, s.seller_name, count(pa.pickup_address_id)::integer AS pickup_address_count
FROM pickup_assignment.sellers AS s
LEFT JOIN pickup_assignment.pickup_addresses AS pa
    ON pa.seller_id = s.seller_id
GROUP BY s.seller_id, s.seller_name
ORDER BY s.seller_name;

-- Query 2: sellers without pickup addresses.
-- Predicted rows: 1. Actual rows: 1.
SELECT s.seller_id, s.seller_name
FROM pickup_assignment.sellers AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM pickup_assignment.pickup_addresses AS pa
    WHERE pa.seller_id = s.seller_id
)
ORDER BY s.seller_name;

-- Query 3: sellers with two or more pickup addresses.
-- Predicted rows: 1. Actual rows: 1.
SELECT s.seller_id, s.seller_name, count(*)::integer AS pickup_address_count
FROM pickup_assignment.sellers AS s
JOIN pickup_assignment.pickup_addresses AS pa
    ON pa.seller_id = s.seller_id
GROUP BY s.seller_id, s.seller_name
HAVING count(*) >= 2
ORDER BY s.seller_name;

-- Query 4: pickup addresses, seller names, and supported carrier counts.
-- Predicted rows: 4. Actual rows: 4.
SELECT pa.pickup_address_id, s.seller_name, pa.label,
       count(pac.carrier_id)::integer AS carrier_count
FROM pickup_assignment.pickup_addresses AS pa
JOIN pickup_assignment.sellers AS s
    ON s.seller_id = pa.seller_id
LEFT JOIN pickup_assignment.pickup_address_carriers AS pac
    ON pac.pickup_address_id = pa.pickup_address_id
GROUP BY pa.pickup_address_id, s.seller_name, pa.label
ORDER BY s.seller_name, pa.label;
