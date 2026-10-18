# TicketHub: Ticketing System Design

## 1. Requirements

### Functional requirements

1. Users can register, sign in, and view their account.
2. Users can browse and search concerts and events by name, date, venue, and location.
3. Users can view an event's seating map and see which seats are available, held, or sold.
4. A signed-in user can temporarily hold an available seat while completing checkout.
5. Users can pay for an order and receive a clear success or failure result.
6. A successful order produces tickets associated with the buyer and the purchased seats.
7. Users can view their orders and tickets.
8. Expired holds are released so that other users can buy those seats.
9. The system records order and payment status so that retries do not create duplicate purchases.

### Non-functional requirements

- **Speed:** Event pages and seat availability should load quickly under normal traffic. During a major sale, the system should remain responsive and provide clear waiting/loading feedback rather than timing out silently.
- **Correctness:** A seat must never be sold to two customers. Payment and ticket issuance must be consistent with the order state.
- **Fairness:** The sale should use a transparent queue or waiting room during extreme demand. Requests should be admitted in a controlled order, with rate limits and bot protection applied consistently. The system should not promise that every visitor can buy a ticket when demand exceeds supply.
- **Availability:** Browsing may remain available even if checkout is temporarily throttled. Failures must not mark a seat sold unless the purchase is confirmed.
- **Security:** Require authentication for holds, checkout, and ticket viewing; validate ownership; protect payment details by using a payment provider; and rate-limit suspicious traffic.
- **Scalability:** Add application instances and workers as traffic grows. Use caching for public event information, but do not rely on a cache as the final authority for seat ownership.
- **Recoverability and observability:** Log order-state changes, monitor queue depth and payment failures, and back up persistent data. Use idempotency keys for payment and order operations.

## 2. Traffic and Capacity Estimates

### Normal day

Given:
- 50,000 visitors per day.
- Each visitor views 10 pages.
- 5,000 tickets sold per day.
- 86,400 seconds per day.

Page views per day:

50,000 visitors × 10 pages = 500,000 page views/day

Average page views per second:

500,000 / 86,400 = 5.79 page views/second

For a simple baseline, assume each page view causes roughly one main API request. This is about 5.8 main requests/second on average. Real request volume will be higher if each page makes several API calls or loads many assets. If traffic peaks at five times the average, the baseline peak would be about 29 main requests/second.

Average tickets sold per second:

5,000 / 86,400 = 0.058 tickets/second

This daily average is useful for sizing long-term workload, but actual sales will be uneven and concentrated around popular events.

### Popular concert sale

Given:
- 200,000 people attempt to buy tickets in the first 10 minutes.
- The concert has 20,000 seats.
- 10 minutes = 600 seconds.

Average arrival rate during the sale:

200,000 / 600 = 333.3 people/second

The sale therefore averages about 333 buying attempts per second over the 10-minute window. The actual opening burst may be higher, so the design should support bursts above this average through a waiting room, admission controls, and load testing.

Maximum successful seat sales during the window:

20,000 / 600 = 33.3 seats/second

Demand compared with supply:

200,000 potential buyers / 20,000 seats = 10 potential buyers per seat

There are ten potential buyers for every seat. The system must handle many unsuccessful or waiting requests and must not allow the same seat to be sold twice. It should queue or throttle incoming users instead of letting all 200,000 clients compete directly against the database at once.

### Comparison

| Measure | Normal day | Popular concert sale |
|---|---:|---:|
| Visitors / buying attempts | 50,000 visitors/day | 200,000 attempts in 10 minutes |
| Page views / arrival estimate | 500,000 page views/day; 5.79/sec average | 333.3 buying attempts/sec average |
| Tickets / seats | 5,000 tickets/day | 20,000 seats available |
| Main challenge | Efficient browsing and routine checkout | Short, intense demand and strict seat correctness |

The big sale has an average buying-attempt rate of about 333/5.79 = 57.5 times the normal-day average page-view rate. These are not identical request types, so this ratio is a rough pressure comparison rather than a precise capacity multiplier. Checkout traffic is also more expensive than a simple page view because it involves seat locks, order writes, and payment-provider calls.

## 3. API Design

All endpoints return JSON. Authenticated endpoints require a valid session or access token. Error responses should use a consistent format, for example `{"error":{"code":"SEAT_UNAVAILABLE","message":"This seat is no longer available."}}`.

| Method and endpoint | Purpose | Typical success response |
|---|---|---|
| `GET /api/events?date=&q=&page=` | Browse and search public events with pagination | `200 OK` with event summaries |
| `GET /api/events/{eventId}` | View event details, venue, date, and sale status | `200 OK` with event details |
| `GET /api/events/{eventId}/seats` | View seat map and current availability | `200 OK` with seat IDs and statuses |
| `POST /api/events/{eventId}/holds` | Temporarily hold a requested seat for the signed-in user | `201 Created` with `holdId` and expiry time |
| `DELETE /api/holds/{holdId}` | Release a user's hold before it expires | `204 No Content` |
| `POST /api/orders` | Create an order from a valid hold and begin checkout; accept an idempotency key | `201 Created` with order ID and status |
| `POST /api/orders/{orderId}/payment` | Request payment confirmation through the payment provider | `200 OK` or `202 Accepted` with payment/order status |
| `GET /api/me/tickets` | List tickets belonging to the authenticated user | `200 OK` with tickets and order references |
| `GET /api/orders/{orderId}` | View an order owned by the authenticated user | `200 OK` with order and payment status |

Important API behaviour:
- Return `400 Bad Request` for invalid input, `401 Unauthorized` when not signed in, `403 Forbidden` for access to another user's resource, `404 Not Found` for missing events/orders, and `409 Conflict` when a seat is already held or sold.
- Seat-hold requests must be idempotent where possible and must return an explicit expiry time, such as a five-minute hold.
- Payment and order creation should accept an idempotency key so network retries do not create duplicate orders or charges.
- Do not trust seat availability displayed in a browser; recheck and reserve the seat atomically on the server.

## 4. Data Model

A relational database is appropriate because orders, users, seats, and payments require transactions and integrity constraints.

### Tables and relationships

#### `users`
- `id` — primary key
- `name` — required
- `email` — required and unique
- `created_at` — timestamp

One user can place many orders. A user can have many active or past holds.

#### `events`
- `id` — primary key
- `name` — required
- `venue` — required
- `starts_at` — event start timestamp
- `sale_opens_at` — ticket sale opening timestamp
- `status` — for example `scheduled`, `on_sale`, or `cancelled`

One event has many seats.

#### `seats`
- `id` — primary key
- `event_id` — foreign key to `events.id`
- `section` — venue section
- `row_label` — row name or number
- `seat_number` — seat identifier
- `status` — `available`, `held`, or `sold`
- `held_by_user_id` — nullable foreign key to `users.id`
- `hold_expires_at` — nullable timestamp
- `updated_at` — timestamp

Add a unique constraint on `(event_id, section, row_label, seat_number)` so the same physical seat is not entered twice for one event. The seat row is the authoritative inventory record for that event.

#### `orders`
- `id` — primary key
- `user_id` — foreign key to `users.id`
- `status` — `pending`, `paid`, `failed`, or `cancelled`
- `total_amount` — amount in the smallest currency unit (for example, cents)
- `currency` — currency code
- `idempotency_key` — unique key supplied for checkout retries
- `created_at` — timestamp
- `paid_at` — nullable timestamp

One user can have many orders. One order can contain one or more purchased seats.

#### `order_items`
- `id` — primary key
- `order_id` — foreign key to `orders.id`
- `seat_id` — foreign key to `seats.id`
- `price_amount` — price in the smallest currency unit at purchase time
- `created_at` — timestamp
- Unique constraint on `seat_id` to prevent a seat being included in more than one successful order item.

#### `payments`
- `id` — primary key
- `order_id` — foreign key to `orders.id`
- `provider_reference` — unique payment-provider reference
- `status` — `pending`, `succeeded`, or `failed`
- `amount` — amount in the smallest currency unit
- `created_at` — timestamp

An order can have payment attempts, while each provider reference must be unique. The application should verify payment-provider notifications and process them idempotently.

### Relationships

- `users 1 -> many orders`
- `events 1 -> many seats`
- `orders 1 -> many order_items`
- `seats 1 -> at most one order_item`
- `orders 1 -> many payment attempts`

### Example SQL schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    venue TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    sale_opens_at TEXT NOT NULL,
    status TEXT NOT NULL
        CHECK (status IN ('scheduled', 'on_sale', 'cancelled'))
);

CREATE TABLE seats (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    section TEXT NOT NULL,
    row_label TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'held', 'sold')),
    held_by_user_id INTEGER REFERENCES users(id),
    hold_expires_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, section, row_label, seat_number)
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TEXT
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    seat_id INTEGER NOT NULL UNIQUE REFERENCES seats(id),
    price_amount INTEGER NOT NULL CHECK (price_amount >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    provider_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL
        CHECK (status IN ('pending', 'succeeded', 'failed')),
    amount INTEGER NOT NULL CHECK (amount >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_status_start
    ON events(status, starts_at);

CREATE INDEX idx_seats_event_status
    ON seats(event_id, status);

CREATE INDEX idx_orders_user_created
    ON orders(user_id, created_at);
```

The unique constraint on `order_items.seat_id` is a final database-level safeguard against placing the same seat into multiple orders. The seat hold still needs transactional logic because a temporary hold is not the same thing as a completed sale. In a production schema, constraints and state transitions should be designed carefully for the chosen database and cancellation policy.

## 5. Preventing Double-Booking

**The database, not the browser or cache, is the final authority for seat ownership.** A seat shown as available can be taken by another buyer before the first buyer clicks it, so the server must reserve it atomically.

### Seat-hold process

1. The user selects a seat and sends `POST /api/events/{eventId}/holds`.
2. The application starts a database transaction and locks the selected seat row, or uses an atomic conditional update.
3. The application checks that the seat is available, or that an earlier hold has expired.
4. If available, the application changes its state to `held`, records the holding user's ID, and sets an expiry time, for example five minutes from now.
5. The transaction commits. Only then does the API report that the hold succeeded.
6. If another buyer already holds or bought the seat, the update affects no row or the lock reveals the changed state. The API returns `409 Conflict` and asks the user to choose another seat.
7. If the user completes payment in time, the system verifies the payment and changes the seat to `sold` as part of a database transaction that also marks the order paid and records the order item.
8. If the hold expires or payment fails, the system releases the hold safely, provided the seat has not already been sold.

An atomic conditional update can be used for the core reservation step, conceptually:

```sql
UPDATE seats
SET status = 'held',
    held_by_user_id = :user_id,
    hold_expires_at = :expiry,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :seat_id
  AND status = 'available';
```

The application must check the number of rows affected. Exactly one changed row means the hold was acquired; zero means the seat was not available under this condition. Expired holds must be released or handled in the same atomic condition/transaction rather than assumed to be available based only on a stale page.

For a multi-seat hold, reserve all requested seats in one transaction and roll back the entire operation if any seat cannot be acquired, so the user is not left with a partial hold unless partial booking is an explicit product feature.

### Payment and ticket correctness

- Do not keep a database transaction open while waiting for a slow external payment provider.
- Use a short-lived seat hold while the payment provider is contacted.
- Use an idempotency key for checkout and verify payment-provider callbacks.
- After confirmed payment, perform a short transaction that verifies the hold still belongs to the buyer and has not been sold, marks the order paid, marks the seat sold, and creates the order item/ticket record.
- Handle duplicate payment notifications idempotently. A repeated callback must not issue another ticket or charge the customer twice.
- If payment succeeds but the application cannot finalize the order immediately, reconcile the payment and order states rather than releasing the seat blindly.
- The unique `order_items.seat_id` constraint provides an additional guard against duplicate sales, while row locking or conditional updates coordinate simultaneous attempts.

A queue or cache alone cannot prevent double-booking. The protection comes from atomic database operations, transactions, constraints, and carefully managed order/payment state transitions.

## 6. Architecture

### Architecture diagram

```text
                         +----------------------+
                         |     Web / Mobile     |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   DNS / CDN / WAF    |
                         | Static Content,      |
                         | Bot and DDoS Filters |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Waiting Room / Queue |
                         | Admission and Rate   |
                         | Limits for Big Sales |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |    Load Balancer     |
                         +----------+-----------+
                                    |
                      +-------------+-------------+
                      |                           |
                      v                           v
             +----------------+          +----------------+
             | App Server 1   |          | App Server 2   |
             | API / Business |          | API / Business |
             | Logic          |          | Logic          |
             +--------+-------+          +--------+-------+
                      |                           |
                      +-------------+-------------+
                                    |
                                    v
                         +----------------------+
                         | Relational Database |
                         | Transactions, Seat   |
                         | Locks, Constraints   |
                         +----------+-----------+
                                    |
                     +--------------+--------------+
                     |                             |
                     v                             v
          +----------------------+      +----------------------+
          | Background Workers   |<-----| Durable Job Queue    |
          | Hold Cleanup, Email, |      | Notifications and     |
          | Order Reconciliation |      | Async Work            |
          +----------------------+      +----------------------+

       +-------------------+       +----------------------+
       | Cache             |       | Payment Provider     |
       | Public Event Data |       | External Payment     |
       | Not Seat Authority|       | Processing            |
       +-------------------+       +----------------------+
```

The cache and payment provider are separate services called by the application where needed; they are shown separately to emphasize that the cache is not authoritative for seat ownership and payment processing is an external dependency.

### Component explanations

- **Web/mobile client:** Lets customers browse events, select seats, pay, and retrieve tickets.
- **DNS/CDN/WAF:** Directs traffic, serves cacheable public assets, and filters common malicious or automated traffic.
- **Waiting room:** Admits users to a high-demand sale at a controlled rate, helping protect application servers and the database.
- **Load balancer:** Routes requests across healthy application instances and stops sending traffic to unhealthy instances.
- **Application servers:** Validate users and requests, implement business rules, coordinate seat holds, create orders, and communicate with the database and payment provider.
- **Relational database:** Stores events, users, seats, orders, and payment records; transactions and constraints enforce seat correctness.
- **Cache:** Speeds up public event pages and other safe-to-cache data, but is never the final authority for seat availability or purchase success.
- **Durable job queue:** Holds asynchronous jobs so email delivery, expired-hold cleanup, and reconciliation work do not block customer requests.
- **Background workers:** Process queued jobs, retry transient failures, and perform cleanup and reconciliation.
- **Payment provider:** Securely processes payments and sends confirmation results that the application verifies before issuing tickets.

### How the architecture handles a big sale

The waiting room controls the number of users allowed to reach checkout at once. Rate limits and bot protection reduce abusive traffic, while multiple stateless application servers can scale horizontally behind the load balancer.

Public event details can be cached, which reduces database reads. Seat availability may be cached briefly for display, but every hold request must still be checked atomically against the database. The database serializes competing attempts for the same seat through row locks or conditional updates, and uniqueness constraints provide an additional safeguard.

Payment calls are made outside long-running database transactions. The application holds a seat for a limited period and finalizes the order after verified payment. Background workers handle email and cleanup tasks so these jobs do not slow the purchase path.

The system should be load-tested at and above the estimated 333 buying attempts per second, including a larger initial burst. Monitoring should track waiting-room depth, API latency, database lock waits, failed holds, payment errors, and queue backlog. If the database approaches its safe capacity, admission can be slowed rather than allowing uncontrolled contention to cause failures.

## 7. Trade-Offs

### Trade-off 1: Fairness versus Immediate Access

A waiting room adds a step and means users may wait before they can browse or buy. However, allowing all 200,000 users to hit checkout simultaneously can overload the service and produce an unpredictable experience.

**Decision:** Use a transparent waiting room during major sales, with a documented admission policy, clear progress/status updates, rate limits, and protections against repeated queue jumping. This trades immediate access for a more stable and fair process. Fairness rules should be published and consistently enforced.

### Trade-off 2: Strict Seat Correctness versus Maximum Throughput

Database locks and transactions can limit throughput when many buyers compete for the same seats. Relaxing those controls could improve apparent speed but risks selling one seat twice.

**Decision:** Prioritize correctness for inventory writes. Use atomic seat holds, short transactions, indexes, and controlled admission to reduce contention. Scale read traffic separately with caching, while keeping the primary database authoritative for seat reservations and sales.

### Trade-off 3: Seat-Hold Duration versus Seat Availability

Long holds give customers more time to pay but leave inventory unavailable to other buyers. Very short holds release inventory quickly but may cause legitimate customers to lose seats while completing checkout.

**Decision:** Start with a clearly communicated short hold, such as five minutes, and monitor checkout completion and expiry rates. Expired holds must be released safely, and payment finalization must handle race conditions correctly.

### Trade-off 4: Availability versus Strong Consistency

Replicas and caches can increase read capacity, but they may return stale availability information. Using the primary database for every read improves consistency but may create unnecessary load.

**Decision:** Use caches and replicas for public event information and suitable browsing queries. Route seat holds and purchase finalization through authoritative transactional database operations. A stale seat map may briefly be displayed, but it must never authorize a sale.

## 8. Conclusion

TicketHub must support routine browsing and sales while remaining correct and fair during a high-demand concert release. On a normal day, the baseline is about 5.8 page views per second and 5,000 ticket sales across the day. During the example big sale, 200,000 buying attempts arrive over ten minutes—about 333 attempts per second on average—for only 20,000 seats.

A waiting room, load-balanced application servers, caching for public data, a relational database with transactions and constraints, and background workers help the service scale. Most importantly, seat holds and completed sales are coordinated by atomic database operations, not by a browser display or cache. This ensures that competing buyers cannot successfully purchase the same seat.
