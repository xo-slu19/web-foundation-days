# Photo App Scaling Plan

## 1. Introduction

This document explains how to scale a photo-sharing application to support 1 million daily active users. It estimates the traffic and storage requirements and proposes an architecture that can handle high volumes of photo uploads and feed views.

The design focuses on scalability, performance, reliability, and efficient storage. It uses object storage for photo files, a relational database for structured metadata, caching to improve read performance, and a message queue to process background tasks asynchronously.

## 2. Assumptions

The following assumptions are used for capacity planning:

- Total registered users: 1,000,000.
- Daily active users: 1,000,000.
- Photo uploads per day: 1,000,000.
- Feed views per day: 50,000,000.
- Peak traffic is five times the average traffic.
- Average original photo size: 2 MB.
- Average thumbnail size: 50 KB.
- Each uploaded photo produces one thumbnail.
- There are 86,400 seconds in a day.
- Storage estimates exclude database metadata, indexes, backups, replication, and temporary files.

These are planning estimates rather than exact predictions. Actual traffic and storage needs will depend on user behaviour, image sizes, retention policies, and application features.

## 3. Traffic Calculations

### 3.1 Photo Upload Requests

The application receives 1,000,000 photo uploads per day.

Average uploads per second:

1,000,000 / 86,400 = 11.57 uploads per second

Average upload rate: approximately 11.57 uploads per second.

Peak uploads per second:

11.57 × 5 = 57.85 uploads per second

Peak upload rate: approximately 58 uploads per second.

The upload service should therefore be designed to handle around 58 uploads per second during peak periods, with additional capacity for unexpected traffic spikes.

### 3.2 Feed Views

The application receives 50,000,000 feed views per day.

Average feed views per second:

50,000,000 / 86,400 = 578.70 feed views per second

Average feed-view rate: approximately 579 feed views per second.

Peak feed views per second:

578.70 × 5 = 2,893.52 feed views per second

Peak feed-view rate: approximately 2,894 feed views per second.

Feed traffic is substantially higher than upload traffic. The architecture should therefore optimize reading through caching, efficient database queries, and a content delivery network.

### 3.3 Read-to-Write Ratio

Daily feed views: 50,000,000.

Daily photo uploads: 1,000,000.

Read-to-write ratio:

50,000,000 / 1,000,000 = 50

The application has an estimated read-to-write ratio of 50:1.

This means that feed viewing is much more frequent than uploading. The architecture should prioritize fast reads while keeping uploads reliable and efficient.

## 4. Storage Calculations

### 4.1 Original Photo Storage

Assume each original photo has an average size of 2 MB.

Daily original photo storage:

1,000,000 × 2 MB = 2,000,000 MB

Using decimal storage units:

2,000,000 MB = 2 TB per day

Annual original photo storage:

2 TB × 365 = 730 TB per year

The application therefore needs approximately 2 TB per day and 730 TB per year for original photos.

### 4.2 Thumbnail Storage

Assume each thumbnail has an average size of 50 KB.

Daily thumbnail storage:

1,000,000 × 50 KB = 50,000,000 KB

Using decimal storage units:

50,000,000 KB = 50 GB per day

Annual thumbnail storage:

50 GB × 365 = 18,250 GB

18,250 GB = 18.25 TB per year

The application therefore needs approximately 50 GB per day and 18.25 TB per year for thumbnails.

### 4.3 Total Storage Requirements

Daily total:

Original photos: 2 TB

Thumbnails: 0.05 TB

Total: 2 + 0.05 = 2.05 TB per day

Annual total:

Original photos: 730 TB

Thumbnails: 18.25 TB

Total: 730 + 18.25 = 748.25 TB per year

| Storage category | Daily storage | Annual storage |
| --- | ---: | ---: |
| Original photos | 2 TB | 730 TB |
| Thumbnails | 50 GB | 18.25 TB |
| Total | 2.05 TB | 748.25 TB |

The estimated annual storage requirement is approximately 748.25 TB before accounting for replication, backups, metadata, and other overhead.

The system should use scalable object storage rather than relying on the relational database to store the image files themselves.

## 5. Proposed Architecture

The architecture separates the application API, structured data, image storage, caching, and background processing.

### 5.1 Text Architecture Diagram

```text
                         +----------------------+
                         |        Users         |
                         | Web and Mobile Apps  |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         DNS          |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |         CDN          |
                         | Static Assets and    |
                         | Cached Image Delivery|
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   Load Balancer      |
                         +----------+-----------+
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
          +--------------------+          +--------------------+
          |   App Server 1     |          |   App Server 2     |
          | API and Validation |          | API and Validation |
          +---------+----------+          +---------+----------+
                    |                               |
                    +---------------+---------------+
                                    |
                                    v
                         +----------------------+
                         |    Cache Layer       |
                         | Feed and Metadata    |
                         +----------+-----------+
                                    |
                           Cache Miss / Write
                                    |
                                    v
                         +----------------------+
                         |   Primary Database   |
                         | Users, Posts, and    |
                         | Photo Metadata       |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   Read Replica       |
                         | Additional Reads     |
                         +----------------------+

      Photo Upload Path
      -----------------

      +--------------------+
      | Client Upload      |
      +---------+----------+
                |
                v
      +--------------------+
      | App Server         |
      | Validate Request   |
      +---------+----------+
                |
                v
      +--------------------+
      | Object Storage     |
      | Original Photo     |
      +---------+----------+
                |
                v
      +--------------------+
      | Primary Database   |
      | Save Photo Metadata|
      +---------+----------+
                |
                v
      +--------------------+
      | Durable Message    |
      | Queue              |
      +---------+----------+
                |
                v
      +--------------------+
      | Background Worker  |
      | Create Thumbnail   |
      +---------+----------+
                |
                v
      +--------------------+
      | Object Storage     |
      | Thumbnail          |
      +--------------------+
```

The diagram represents the main components and logical request flows. In production, API requests and image delivery can follow separate paths. The CDN serves cached static assets and images, while dynamic API requests are routed to application servers through the load balancer.

The cache is checked for eligible feed or metadata requests. A cache miss results in a database read, while a write updates the database and triggers the necessary cache invalidation or refresh.

## 6. Component Definitions

### 6.1 Client

The client is the web or mobile application that allows users to upload photos, view feeds, and interact with content.

### 6.2 DNS

DNS translates the application's domain name into the appropriate network destination so that clients can reach the service.

### 6.3 Content Delivery Network (CDN)

The CDN caches and delivers static assets and image files from locations closer to users, reducing latency and the amount of traffic reaching the origin infrastructure.

### 6.4 Load Balancer

The load balancer distributes incoming API requests across multiple healthy application servers to improve availability and prevent one server from receiving all the traffic.

### 6.5 Application Servers

Application servers handle authentication, request validation, business logic, database operations, and communication with object storage and the message queue.

### 6.6 Cache Layer

The cache stores frequently requested feed data and metadata so that repeated requests can be served faster without querying the database every time.

### 6.7 Primary Database

The primary relational database stores structured information such as users, photo records, captions, ownership, timestamps, and references to image files.

### 6.8 Read Replica

A read replica receives replicated database changes and handles suitable read queries, reducing read pressure on the primary database.

### 6.9 Object Storage

Object storage stores original photo files and generated thumbnails separately from the relational database, allowing image storage to scale independently.

### 6.10 Message Queue

The message queue holds background jobs, such as thumbnail generation, so that the application can process them asynchronously instead of making users wait for every task to finish.

### 6.11 Background Workers

Background workers consume queued jobs and perform tasks such as resizing photos, generating thumbnails, validating image formats, and processing image metadata.

## 7. Why Photos Belong in Object Storage

A relational database is useful for structured and related information, but it is not the best primary storage location for hundreds of terabytes of image files.

The database should store photo metadata, including:

- Photo ID.
- User ID.
- Caption.
- Upload timestamp.
- Object storage key or image URL.
- Thumbnail storage key or URL.
- Processing status.

The actual original photo and thumbnail files should be stored in object storage.

### 7.1 Preventing Database Table Bloat

If the application stores every image as a large binary object in its relational database, the database tables and associated storage structures can grow rapidly.

With an estimated 2 TB of original photos uploaded each day, storing all image binaries inside the database would create substantial storage and operational pressure.

Large image data can increase backup sizes, lengthen restore operations, consume database storage and I/O capacity, and make database maintenance more expensive. It can also cause image delivery workloads to compete with important operations such as retrieving user information or saving photo metadata.

Object storage avoids this problem by keeping the large binary files outside the relational database.

The database stores small records and references to those files, while object storage handles the image content itself.

This separation provides several benefits:

- **Smaller database records:** The database stores metadata and object keys rather than the full image binaries.
- **Independent scaling:** Image storage can grow without requiring the relational database to expand at the same rate.
- **More efficient database operations:** Database resources remain available for queries and transactions involving structured data.
- **Better image delivery:** Images can be delivered through a CDN backed by object storage.
- **Simpler storage management:** Image lifecycle, retention, and archival policies can be managed separately from database records.

Object storage does not eliminate the need for database backups or consistency management. The system must still ensure that metadata points to valid objects and that deletion and retention processes handle both records and files correctly.

## 8. Photo Upload Lifecycle

The upload process should keep the initial response fast while ensuring that the original photo is safely stored and background processing can be retried.

### Step 1: The User Selects a Photo

The user selects a photo in the web or mobile application and starts the upload.

The client sends the file and any associated metadata, such as a caption, to the upload API.

### Step 2: The Application Validates the Request

The application server authenticates the user and validates the upload request.

Validation includes checking file size, supported file types, user permissions, and applicable upload limits.

The system should also apply appropriate security checks to uploaded files.

### Step 3: The Original Photo Is Stored

The application uploads the original image to object storage.

The storage service returns an object key or another reference that allows the image to be retrieved later.

The application should not treat an upload as complete until the original object has been stored successfully.

### Step 4: Photo Metadata Is Saved

The application saves a database record containing the photo's owner, caption, timestamps, object key, and processing status.

The record can indicate that the photo is awaiting thumbnail generation.

The database transaction should commit successfully before the API reports that the photo has been created.

### Step 5: A Background Job Is Queued

The system submits a thumbnail-generation job to a durable message queue.

The job contains the photo ID and the information needed by the worker to retrieve the original image.

Where reliable delivery is required, a transactional outbox can be used: the application writes an outbox event in the same database transaction as the photo metadata, and a separate publisher delivers that event to the queue.

This approach reduces the risk of saving the photo record successfully but losing the corresponding background job if the application fails between the two operations.

### Step 6: The API Responds to the User

After the original photo and required metadata have been stored successfully, the API returns a successful creation response, such as HTTP 201 Created.

The response can include the photo ID, metadata, and processing status.

Thumbnail generation does not need to finish before this response is returned.

### Step 7: A Worker Generates the Thumbnail

A background worker receives the queued job, retrieves the original image from object storage, and generates a smaller thumbnail.

The worker then saves the thumbnail in object storage and updates the photo metadata to indicate that processing has completed.

### Step 8: The Image Becomes Available for Delivery

The application can serve the original image and thumbnail through the CDN.

The CDN can cache eligible images to reduce repeated requests to object storage and improve delivery speed for users in different locations.

If a thumbnail has not yet been generated, the application can display a placeholder or indicate that processing is still underway.

### Why Use a Message Queue for Thumbnail Generation?

Generating thumbnails can require CPU, memory, and image-processing time.

If the application generates every thumbnail synchronously before responding to an upload, users must wait for the original upload, database operations, and image processing to finish.

That increases response latency and ties up application servers with work that does not need to happen during the initial request.

A message queue allows the application to save the original photo and its metadata, queue the thumbnail task, and respond without waiting for thumbnail generation to finish.

Workers process jobs separately and can be scaled horizontally when the queue grows.

The queue also supports retries when a worker encounters a temporary error. Failed jobs can eventually be moved to a dead-letter queue for investigation rather than being retried forever.

This design keeps the upload response fast while making background processing more resilient.

## 9. Feed Reading Flow

Feed viewing is the application's dominant workload, with an estimated 50 million feed views per day and approximately 2,894 feed views per second at the assumed five-times peak.

The read path should minimize database work and image-delivery latency.

### Step 1: The Client Requests the Feed

The client sends an authenticated request to the feed API.

The application validates the user's identity and permissions before returning private or user-specific information.

### Step 2: The Application Checks the Cache

The application checks whether the requested feed data or metadata is available in the cache.

The cache key must include the relevant user and query information so that one user's private feed is never returned to another user.

### Step 3: A Cache Hit Returns the Result

If valid cached data exists, the application returns it without querying the database.

Frequently requested data can therefore be served with lower latency and reduced database load.

### Step 4: A Cache Miss Queries the Database

If the data is not cached or the cached entry has expired, the application queries the database.

A read replica can handle suitable queries when slightly stale results are acceptable.

The primary database should be used when the request requires read-after-write consistency or when the replica's replication delay could produce an incorrect result.

The application can cache the resulting feed data for future requests, subject to the required freshness and privacy rules.

### Step 5: Images Are Delivered Through the CDN

The feed response contains image references rather than the complete image files.

The client retrieves the images and thumbnails through the CDN.

If an image is cached at the CDN edge, it can be delivered without another request to the origin object storage. If it is not cached, the CDN retrieves it from the origin and may cache it according to the configured caching policy.

Pagination should be used to avoid loading an unnecessarily large feed in a single request.

## 10. Architectural Trade-Offs

### Trade-Off 1: Cache Performance Versus Data Freshness

Caching improves response times and reduces database load, which is important when feed views greatly outnumber uploads.

However, cached data can become stale when a user uploads a new photo, changes a caption, or deletes content.

A short cache lifetime can improve freshness but may increase database traffic. A longer cache lifetime improves cache efficiency but can delay updates becoming visible.

**Decision:** Use caching for frequently accessed feed data and metadata, with appropriate expiration and invalidation rules. Invalidate or refresh relevant entries after writes. Private feed caches must be scoped to the correct user, and deleted or access-restricted content must not remain visible through stale cache entries.

### Trade-Off 2: Fast Upload Responses Versus Immediate Thumbnail Availability

Generating thumbnails synchronously makes the thumbnail available before the upload response returns, but increases the time the user waits and the amount of work performed during the request.

Asynchronous thumbnail generation makes uploads faster, but the thumbnail may not be ready immediately after the original photo is uploaded.

**Decision:** Store the original image and required metadata first, then queue thumbnail generation as a background job. Return a successful creation response after the required persistence steps complete. Show a placeholder or processing status until the thumbnail is ready.

### Trade-Off 3: Read Replicas Versus Strong Read-After-Write Consistency

Read replicas allow more database reads to be served without placing all read traffic on the primary database.

However, replication is not always instantaneous. A newly uploaded photo may not immediately appear in a query sent to a lagging replica.

**Decision:** Route suitable feed reads to replicas, but use the primary database or another consistency-aware strategy when users need to see their own recent changes immediately. Monitor replica lag and avoid routing consistency-sensitive requests to a replica that is too far behind.

### Trade-Off 4: More Resilience Versus More Operational Complexity

Multiple application servers, database replicas, caches, queues, and workers can improve availability and scalability.

However, these components introduce additional infrastructure, monitoring, failure modes, and operational cost.

**Decision:** Add redundancy to critical components and monitor them carefully. Use managed services where appropriate, automate recovery procedures, and introduce additional complexity when the expected reliability and performance benefits justify it.

## 11. Reliability and Failure Handling

The architecture must handle individual component failures without causing the entire service to become unavailable.

### Application Servers and Load Balancer

Run multiple application server instances across suitable failure boundaries.

Health checks should allow the load balancer to stop sending requests to unhealthy instances. New instances should be replaceable without requiring the entire application to go offline.

### Database Availability

Use automated backups and a tested database recovery process.

A read replica can help with read scaling and may be used for failover if the database setup supports it. Failover procedures must account for replication lag, connection recovery, and the possibility of losing recent writes.

A replica is not a substitute for a backup because accidental deletions or corrupted data may also be replicated.

Define recovery point objectives (RPO) and recovery time objectives (RTO), and test restoring backups rather than assuming that successful backup jobs guarantee recoverability.

### Cache Failures

The application should be able to fall back to the database when the cache is unavailable.

However, sending all cached traffic directly to the database during a cache outage can overload the database. Use timeouts, circuit breakers, request limits, and other protective measures to reduce the risk of a cascading failure.

### Queue and Worker Failures

Use a durable queue that retains jobs until they are processed or explicitly handled.

Workers should retry temporary failures with backoff and should process jobs idempotently so that a repeated job does not create duplicate or inconsistent results.

Jobs that repeatedly fail should be moved to a dead-letter queue for investigation. Monitor queue depth, job age, failure rate, and worker health so that a growing backlog can be detected and additional workers can be started when needed.

### Object Storage Failures

Use object storage durability and availability features appropriate to the service's requirements.

Monitor upload failures and ensure that metadata is not marked as successfully stored when the original file upload has failed.

Because the database and object storage are separate systems, implement cleanup and reconciliation procedures to detect orphaned objects or database records that reference missing files.

### Monitoring and Alerting

Monitor at least the following:

- API request rate and error rate.
- Average and high-percentile response latency.
- Upload success and failure rates.
- Cache hit rate and cache errors.
- Database query latency and connection usage.
- Database replication lag.
- Object storage errors.
- Queue depth and oldest-job age.
- Worker failures and retry counts.
- Storage growth and remaining capacity.

Monitoring and alerts help the team identify capacity problems and failures before they significantly affect users.

## 12. Conclusion

The proposed architecture is designed to support 1 million daily active users with an estimated 1 million photo uploads and 50 million feed views per day.

The capacity calculations indicate approximately 58 peak uploads per second and 2,894 peak feed views per second under the five-times peak assumption.

The estimated storage requirement is 2.05 TB per day, or approximately 748.25 TB per year for original photos and thumbnails.

The architecture addresses these demands by separating image files from relational metadata, using a CDN to deliver images efficiently, applying caching to reduce repeated database reads, distributing API traffic across multiple application servers, and using a durable message queue for background thumbnail generation.

These choices balance performance, scalability, reliability, and operational complexity. The architecture should be validated with load testing, monitoring, and realistic workload measurements as the application grows.
