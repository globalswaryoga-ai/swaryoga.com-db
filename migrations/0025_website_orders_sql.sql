-- 0025_website_orders_sql.sql
-- Migration to create the Website Orders table in BunnyDB

CREATE TABLE IF NOT EXISTS orders_sql (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    course_id TEXT,
    enrollment_created INTEGER DEFAULT 0,
    items_json TEXT NOT NULL DEFAULT '[]',
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    seat_inventory_adjusted INTEGER DEFAULT 0,
    payment_method TEXT,
    client_ip TEXT,
    client_user_agent TEXT,
    payu_txn_id TEXT,
    cashfree_order_id TEXT,
    cashfree_payment_session_id TEXT,
    cashfree_payment_id TEXT,
    cashfree_order_status TEXT,
    transaction_id TEXT,
    failure_reason TEXT,
    workshop_time_slot_json TEXT,
    shipping_address_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_sql_user_id ON orders_sql(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_sql_course_id ON orders_sql(course_id);
CREATE INDEX IF NOT EXISTS idx_orders_sql_payu_txn_id ON orders_sql(payu_txn_id);
CREATE INDEX IF NOT EXISTS idx_orders_sql_cashfree_order_id ON orders_sql(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_sql_created_at ON orders_sql(created_at);
