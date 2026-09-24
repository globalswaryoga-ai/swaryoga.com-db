import crypto from 'node:crypto';
import { bunnyExecute, bunnyBatch } from '@/lib/bunnyDatabase';

export type BunnyOrder = Record<string, any> & { _id: string };

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const json = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback);
const parse = <T>(value: unknown, fallback: T): T => {
  try { return value ? JSON.parse(String(value)) as T : fallback; } catch { return fallback; }
};
const bool = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true';

function orderRowToObj(row: any): BunnyOrder {
  return {
    ...row,
    _id: String(row.id),
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentCreated: bool(row.enrollment_created),
    items: parse(row.items_json, []),
    total: row.total,
    status: row.status,
    paymentStatus: row.payment_status,
    seatInventoryAdjusted: bool(row.seat_inventory_adjusted),
    paymentMethod: row.payment_method,
    clientIp: row.client_ip,
    clientUserAgent: row.client_user_agent,
    payuTxnId: row.payu_txn_id,
    cashfreeOrderId: row.cashfree_order_id,
    cashfreePaymentSessionId: row.cashfree_payment_session_id,
    cashfreePaymentId: row.cashfree_payment_id,
    cashfreeOrderStatus: row.cashfree_order_status,
    transactionId: row.transaction_id,
    failureReason: row.failure_reason,
    workshopTimeSlot: parse(row.workshop_time_slot_json, null),
    shippingAddress: parse(row.shipping_address_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function initOrdersSchema() {
  await bunnyBatch([
    { sql: `CREATE TABLE IF NOT EXISTS orders_sql (
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
    )`, args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_sql_user_id ON orders_sql(user_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_sql_course_id ON orders_sql(course_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_sql_payu_txn_id ON orders_sql(payu_txn_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_sql_cashfree_order_id ON orders_sql(cashfree_order_id)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_orders_sql_created_at ON orders_sql(created_at)', args: [] }
  ]);
}

export async function getOrder(orderId: string): Promise<BunnyOrder | null> {
  await initOrdersSchema();
  const r = await bunnyExecute({ sql: 'SELECT * FROM orders_sql WHERE id = ?', args: [orderId] });
  return r.rows[0] ? orderRowToObj(r.rows[0]) : null;
}

export async function getOrderByCashfreeId(cashfreeOrderId: string): Promise<BunnyOrder | null> {
  await initOrdersSchema();
  const r = await bunnyExecute({ sql: 'SELECT * FROM orders_sql WHERE cashfree_order_id = ? LIMIT 1', args: [cashfreeOrderId] });
  return r.rows[0] ? orderRowToObj(r.rows[0]) : null;
}

export async function getOrdersByUser(userId: string): Promise<BunnyOrder[]> {
  await initOrdersSchema();
  const r = await bunnyExecute({ sql: 'SELECT * FROM orders_sql WHERE user_id = ? ORDER BY created_at DESC', args: [userId] });
  return r.rows.map(orderRowToObj);
}

export async function saveOrder(input: Record<string, any>, orderId = id()): Promise<BunnyOrder | null> {
  await initOrdersSchema();
  const timestamp = now();
  await bunnyExecute({
    sql: `INSERT INTO orders_sql (
      id, user_id, course_id, enrollment_created, items_json, total, status, payment_status,
      seat_inventory_adjusted, payment_method, client_ip, client_user_agent, payu_txn_id,
      cashfree_order_id, cashfree_payment_session_id, cashfree_payment_id, cashfree_order_status,
      transaction_id, failure_reason, workshop_time_slot_json, shipping_address_json, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      user_id=excluded.user_id,
      course_id=excluded.course_id,
      enrollment_created=excluded.enrollment_created,
      items_json=excluded.items_json,
      total=excluded.total,
      status=excluded.status,
      payment_status=excluded.payment_status,
      seat_inventory_adjusted=excluded.seat_inventory_adjusted,
      payment_method=excluded.payment_method,
      cashfree_order_id=excluded.cashfree_order_id,
      cashfree_payment_session_id=excluded.cashfree_payment_session_id,
      cashfree_payment_id=excluded.cashfree_payment_id,
      cashfree_order_status=excluded.cashfree_order_status,
      transaction_id=excluded.transaction_id,
      failure_reason=excluded.failure_reason,
      workshop_time_slot_json=excluded.workshop_time_slot_json,
      shipping_address_json=excluded.shipping_address_json,
      updated_at=excluded.updated_at`,
    args: [
      orderId,
      input.userId || null,
      input.courseId || null,
      input.enrollmentCreated ? 1 : 0,
      json(input.items, []),
      Number(input.total || 0),
      input.status || 'pending',
      input.paymentStatus || 'pending',
      input.seatInventoryAdjusted ? 1 : 0,
      input.paymentMethod || null,
      input.clientIp || null,
      input.clientUserAgent || null,
      input.payuTxnId || null,
      input.cashfreeOrderId || null,
      input.cashfreePaymentSessionId || null,
      input.cashfreePaymentId || null,
      input.cashfreeOrderStatus || null,
      input.transactionId || null,
      input.failureReason || null,
      json(input.workshopTimeSlot, null),
      json(input.shippingAddress, null),
      input.createdAt || timestamp,
      timestamp
    ]
  });
  return getOrder(orderId);
}

export async function updateOrderPaymentStatus(orderId: string, status: string, cashfreeData?: Record<string, any>) {
  await initOrdersSchema();
  const updates = ['payment_status = ?', 'updated_at = ?'];
  const args = [status, now()];
  
  if (cashfreeData) {
    if (cashfreeData.cashfreePaymentId) {
      updates.push('cashfree_payment_id = ?');
      args.push(cashfreeData.cashfreePaymentId);
    }
    if (cashfreeData.cashfreeOrderStatus) {
      updates.push('cashfree_order_status = ?');
      args.push(cashfreeData.cashfreeOrderStatus);
    }
    if (cashfreeData.transactionId) {
      updates.push('transaction_id = ?');
      args.push(cashfreeData.transactionId);
    }
  }
  
  args.push(orderId);
  
  await bunnyExecute({
    sql: `UPDATE orders_sql SET ${updates.join(', ')} WHERE id = ?`,
    args
  });
  
  return getOrder(orderId);
}
