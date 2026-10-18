# SnapShare: Photo App Scaling Plan

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view a feed containing photos from people they follow.

The following facts and assumptions are used in this scaling plan:

- Registered users: 10 million.
- Daily active users: 10% of registered users.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Average thumbnail size: 50 KB.
- Each uploaded photo gets one thumbnail.
- A day has 86,400 seconds.
- A year has 365 days.
- All daily active users are assumed to perform their uploads and feed views within each 24-hour period.
- Storage estimates exclude database backups, logs, replicas, and other overhead.
- For the initial estimate, each photo and thumbnail is stored once; replication and backups would require additional capacity.

## 2. Traffic and Storage Estimates

### Daily Active Users

10% of 10 million registered users are active each day.

10,000,000 × 10% = 1,000,000 daily active users.

Therefore, SnapShare has approximately **1 million daily active users**.

### Photo Uploads Per Second

Each daily active user uploads one photo per day.

Daily uploads:

1,000,000 × 1 = 1,000,000 photos per day.

Average uploads per second:

1,000,000 ÷ 86,400 ≈ 11.57 uploads per second.

Therefore, SnapShare handles approximately **12 photo uploads per second on average**.

Actual traffic may be much higher during busy periods, so the system should be designed to handle traffic spikes.

### Feed Views Per Second

Each daily active user views 50 feed pages per day.

Daily feed views:

1,000,000 × 50 = 50,000,000 feed views per day.

Average feed views per second:

50,000,000 ÷ 86,400 ≈ 578.70 feed views per second.

Therefore, SnapShare handles approximately **579 feed views per second on average**.

This estimate counts each requested feed page as one feed view, not each individual photo displayed.

### Original Photo Storage Per Year

Each day, users upload 1 million original photos.

Each original photo is 2 MB.

Daily original photo storage:

1,000,000 × 2 MB = 2,000,000 MB per day.

This is approximately 2 TB per day using decimal units.

Yearly original photo storage:

2 TB × 365 = 730 TB per year.

Therefore, original photos require approximately **730 TB of additional storage per year**.

### Thumbnail Storage Per Year

Each photo also gets one 50 KB thumbnail.

Daily thumbnail storage:

1,000,000 × 50 KB = 50,000,000 KB per day.

This is approximately 50 GB per day using decimal units.

Yearly thumbnail storage:

50 GB × 365 = 18,250 GB per year.

This is approximately 18.25 TB per year.

Therefore, thumbnails require approximately **18.25 TB of additional storage per year**.

### Total Storage Per Year

Original photos: 730 TB.

Thumbnails: 18.25 TB.

Total:

730 TB + 18.25 TB = 748.25 TB per year.

Therefore, SnapShare needs approximately **748.25 TB of additional photo and thumbnail storage per year**, excluding backups, replication, and other overhead.

The estimates use decimal storage units: 1 TB = 1,000 GB and 1 GB = 1,000 MB.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system**.

The system receives approximately 579 feed views per second but only about 12 photo uploads per second on average.

Users view the feed far more frequently than they upload photos. Therefore, the architecture should prioritize fast feed delivery, caching, database read capacity, and efficient photo delivery through a CDN.

Uploads still require reliable storage and background processing, but reads are the more frequent operation.

## 4. Architecture Diagram

The following diagram shows how the main components work together.

```text
                         USERS
                    /             \
                   /               \
          Upload Photos          View Feed
                 |                    |
                 v                    v
          +-------------+      +-------------+
          | Load        |      |    CDN      |
          | Balancer    |      | Cached      |
          +-------------+      | Photos and  |
                 |              | Thumbnails   |
                 v              +-------------+
          +-------------+              |
          | App Servers |<-------------+
          +-------------+
             |    |    \
             |    |     \
             v    v      v
        +--------+  +-----------+  +----------------+
        | Cache  |  | Database  |  | Object Storage |
        |        |  | Primary   |  | Original Photos|
        +--------+  +-----------+  | & Thumbnails   |
                       |           +----------------+
                       v                    ^
                +--------------+             |
                | Read Replica |             |
                +--------------+             |
                                             |
          Upload Processing                  |
                                             |
          +-------------+                    |
          | Queue       |                    |
          +-------------+                    |
                 |                           |
                 v                           |
          +-------------+                    |
          | Thumbnail   |--------------------+
          | Worker      |
          +-------------+
```

The diagram is a simplified overview. The app servers coordinate requests, the database stores application metadata, and object storage holds the actual image files.

## 5. What Each Component Does

### 1. CDN (Content Delivery Network)

The CDN serves frequently requested photos and thumbnails from locations closer to users, reducing latency and the amount of traffic reaching the origin storage.

### 2. Load Balancer

The load balancer distributes incoming application requests across multiple app servers, helping prevent one server from becoming overloaded.

### 3. App Servers

App servers handle application logic, authenticate users, process upload requests, retrieve feed information, and coordinate access to the database, cache, queue, and object storage.

### 4. Cache

The cache stores frequently requested information, such as feed results and photo metadata, reducing repeated database queries and improving response times.

### 5. Primary Database

The primary database stores structured information such as users, follow relationships, photo metadata, and feed-related records, and handles writes to this data.

### 6. Database Read Replica

The read replica receives replicated database changes from the primary database and serves suitable read queries, reducing read pressure on the primary database.

### 7. Object Storage

Object storage holds the original photos and generated thumbnails, providing durable and scalable storage without placing large image files directly in the relational database.

### 8. Queue

The queue stores thumbnail-generation jobs so that uploads can be accepted without requiring thumbnail processing to finish before the user receives a response.

### 9. Thumbnail Worker

The thumbnail worker consumes jobs from the queue, generates a 50 KB thumbnail from each original photo, and saves the thumbnail to object storage.

## 6. Step-by-Step Photo Upload Flow

1. A user selects a photo in the SnapShare application and submits the upload request.

2. The load balancer forwards the request to an available app server.

3. The app server authenticates the user and validates the upload, including its file type and size.

4. The app server stores the original photo in object storage and obtains its storage key or URL.

5. The app server saves the photo metadata in the primary database, including the user ID, storage key, upload time, and processing status.

6. The app server places a thumbnail-generation job on the queue.

7. The app server responds to the user that the photo has been accepted. The thumbnail does not need to be ready before this response.

8. A thumbnail worker retrieves the job from the queue and reads the original photo from object storage.

9. The worker generates the thumbnail and saves it to object storage.

10. The worker updates the photo's processing status or metadata in the database so the application knows that the thumbnail is ready.

11. When users view their feeds, the app servers retrieve feed information and photo metadata from the cache or an appropriate database, then return the feed response.

12. The browser or application loads the original photos or thumbnails through the CDN, which can serve cached image files without repeatedly accessing object storage.

The upload process and thumbnail generation are separated so that slower image processing does not unnecessarily delay the upload response.

## 7. Trade-Offs

### Trade-Off 1: Faster Uploads vs. Immediate Thumbnail Availability

Using a queue and background worker allows the app to confirm uploads quickly because the user does not need to wait for thumbnail generation.

However, the thumbnail may not be immediately available after the upload. The application must show a processing state or temporarily use the original photo until the thumbnail is ready.

### Trade-Off 2: Cache Performance vs. Data Freshness

Caching feed results and metadata reduces database load and improves response times.

However, cached data can become stale when users upload new photos, change follow relationships, or delete content. The application needs a cache expiration or invalidation strategy.

### Trade-Off 3: Read Replicas vs. Strongly Consistent Reads

Read replicas reduce pressure on the primary database and improve read capacity.

However, replication can introduce a delay before newly written data appears on the replica. Recently updated information may not be immediately visible when read from the replica.

### Trade-Off 4: CDN Performance vs. Content Invalidation

A CDN makes photo delivery faster and reduces repeated requests to object storage.

However, cached photos may remain available after an image is updated or deleted until the cached version expires or is invalidated. Private photos also require appropriate access controls so unauthorized users cannot retrieve them.

### Trade-Off 5: Storage Durability vs. Storage Cost

Object storage can hold hundreds of terabytes of photos without requiring the application database to store the image files themselves.

However, retaining every original and thumbnail increases storage costs over time. Replication, backups, and additional image sizes increase the total cost further.

## 8. Scaling Strategy

SnapShare should scale gradually as usage grows.

- **Scale app servers horizontally:** Add more application instances behind the load balancer when request volume increases.
- **Use the CDN effectively:** Cache thumbnails and public photos to reduce origin traffic and improve global delivery speed.
- **Optimize the cache:** Cache frequently accessed feed data and metadata while using appropriate expiration and invalidation rules.
- **Scale database reads:** Use read replicas and suitable indexes for common queries, such as retrieving a user's feed.
- **Use object storage:** Keep original photos and thumbnails outside the main database to handle growing media storage efficiently.
- **Scale thumbnail workers:** Add more workers when the queue backlog grows, allowing image processing to catch up with uploads.
- **Monitor traffic and capacity:** Track upload rates, feed latency, database load, cache hit rate, queue backlog, and storage growth.
- **Plan for traffic spikes:** Provision sufficient capacity for peak traffic rather than relying only on average request rates.

## Conclusion

SnapShare has approximately 1 million daily active users, 12 photo uploads per second on average, and 579 feed views per second on average. It adds approximately 748.25 TB of original photo and thumbnail storage per year, before replication and backups.

Because SnapShare is read-heavy, it should prioritize fast feed delivery through a CDN and cache, use read replicas to reduce database read pressure, store photos in object storage, and process thumbnails asynchronously through a queue and background workers.
