# SnapShare Photo App: Scaling Plan

## 1. Overview

SnapShare is a photo-sharing application where users upload photos and view photos in their feeds.

The system currently has 10 million registered users. As the application grows, it must handle photo uploads, feed requests, image storage, and image delivery without becoming slow or unreliable.

This document estimates the expected workload and proposes a scalable architecture that supports high traffic, efficient image delivery, and reliable photo processing.

## 2. Assumptions

The following assumptions are used for the calculations:

- Registered users: 10,000,000
- Daily active users (DAU): 10% of registered users
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- Average original photo size: 2 MB
- Average thumbnail size: 50 KB
- Each uploaded photo produces one thumbnail.
- Each feed page request is counted as one feed view.
- A peak traffic factor of 5x is used to estimate busy periods.
- A year is assumed to have 365 days.
- Storage estimates use decimal units: 1 TB = 1,000,000 MB.
- Storage estimates do not include backups, replicas, metadata, or additional overhead.
- The system stores original photos and thumbnails in object storage rather than directly in database tables.

These are planning estimates, not exact predictions. Actual traffic and storage requirements should be measured as the application grows.

## 3. Traffic and Storage Estimates

### 3.1 Daily Active Users

10% of registered users are expected to use SnapShare each day.

Calculation:

10,000,000 × 10% = 1,000,000 daily active users

**Estimated daily active users: 1,000,000**

### 3.2 Photo Uploads Per Day

Each daily active user uploads one photo per day.

Calculation:

1,000,000 users × 1 photo = 1,000,000 photo uploads per day

**Estimated uploads: 1,000,000 photos per day**

### 3.3 Average Upload Requests Per Second

There are 86,400 seconds in a day.

Calculation:

1,000,000 ÷ 86,400 = 11.57 uploads per second

**Average upload rate: approximately 12 uploads per second**

### 3.4 Peak Upload Requests Per Second

Traffic is not evenly distributed throughout the day. More users may upload photos during busy periods.

Using a 5x peak traffic factor:

11.57 × 5 = 57.85 uploads per second

**Estimated peak upload rate: approximately 58 uploads per second**

The upload system should be designed to handle at least this estimated peak, with additional capacity available for unexpected traffic spikes.

### 3.5 Feed Views Per Day

Each daily active user views 50 feed pages per day.

Calculation:

1,000,000 users × 50 feed pages = 50,000,000 feed views per day

**Estimated feed views: 50 million per day**

### 3.6 Average Feed Requests Per Second

Calculation:

50,000,000 ÷ 86,400 = 578.70 feed requests per second

**Average feed request rate: approximately 579 requests per second**

This estimate counts one request per feed page. A real application may generate additional requests for images, comments, likes, and other content.

### 3.7 Peak Feed Requests Per Second

Using a 5x peak traffic factor:

578.70 × 5 = 2,893.5 requests per second

**Estimated peak feed request rate: approximately 2,894 requests per second**

The application servers, database, cache, and image delivery infrastructure must be designed to support this level of traffic.

### 3.8 Original Photo Storage Per Day

Each of the 1,000,000 daily uploads produces an original photo averaging 2 MB.

Calculation:

1,000,000 × 2 MB = 2,000,000 MB per day

2,000,000 MB ÷ 1,000,000 = 2 TB per day

**Original photo storage: approximately 2 TB per day**

### 3.9 Thumbnail Storage Per Day

Each photo also produces one thumbnail averaging 50 KB.

Using 1 MB = 1,000 KB:

50 KB = 0.05 MB

Calculation:

1,000,000 × 0.05 MB = 50,000 MB per day

50,000 MB ÷ 1,000,000 = 0.05 TB per day

**Thumbnail storage: approximately 0.05 TB (50 GB) per day**

### 3.10 Total Storage Per Day

Original photos: 2 TB per day

Thumbnails: 0.05 TB per day

Calculation:

2 TB + 0.05 TB = 2.05 TB per day

**Total new image storage: approximately 2.05 TB per day**

### 3.11 Storage Required Per Year

Original photos:

2 TB × 365 days = 730 TB per year

Thumbnails:

0.05 TB × 365 days = 18.25 TB per year

Total:

730 TB + 18.25 TB = 748.25 TB per year

**Estimated yearly image storage: approximately 748.25 TB**

This estimate includes only original photos and thumbnails. Actual storage requirements will be higher after accounting for backups, replication, metadata, temporary files, and operational overhead.

The storage system must also account for the fact that previously uploaded photos remain stored in addition to newly uploaded photos.

### 3.12 Summary of Estimates

| Metric | Average or Total Estimate | Peak Estimate |
|---|---:|---:|
| Registered users | 10,000,000 | — |
| Daily active users | 1,000,000 | — |
| Photo uploads per day | 1,000,000 | — |
| Photo uploads per second | 11.57 | 57.85 |
| Feed views per day | 50,000,000 | — |
| Feed requests per second | 578.70 | 2,893.5 |
| Original photo storage per day | 2 TB | — |
| Thumbnail storage per day | 50 GB | — |
| Total image storage per day | 2.05 TB | — |
| Original photo storage per year | 730 TB | — |
| Thumbnail storage per year | 18.25 TB | — |
| Total image storage per year | 748.25 TB | — |

The peak estimates use a 5x traffic factor. The storage estimates assume the same number of uploads each day throughout the year.

## 4. Is the System Read-Heavy or Write-Heavy?

SnapShare is primarily a **read-heavy system**.

Each daily active user uploads one photo but views 50 feed pages.

The estimated daily operations are:

- Photo uploads: 1 million per day
- Feed views: 50 million per day

Calculation:

50,000,000 ÷ 1,000,000 = 50

This means the system receives approximately 50 feed requests for every photo upload.

Feed requests are therefore much more frequent than photo uploads. The architecture should prioritize fast reads, efficient caching, and reliable image delivery.

The system must still support substantial write traffic because it receives approximately 1 million photo uploads daily and creates metadata records and thumbnails for those photos.

## 5. Proposed Architecture

The system will use a layered architecture with separate services for handling requests, storing metadata, storing images, and processing uploaded photos.

### Architecture Diagram

```text
                        +----------------------+
                        |      Web / Mobile    |
                        |        Clients       |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        |      DNS Service     |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        |          CDN         |
                        |  Cached Images and   |
                        |   Static Resources   |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        |    Load Balancer     |
                        +----------+-----------+
                                   |
                  +----------------+----------------+
                  |                |                |
                  v                v                v
          +---------------+ +---------------+ +---------------+
          | App Server 1  | | App Server 2  | | App Server 3  |
          | API Requests  | | API Requests  | | API Requests  |
          +-------+-------+ +-------+-------+ +-------+-------+
                  |                 |                 |
                  +-----------------+-----------------+
                                    |
                    +---------------+---------------+
                    |               |               |
                    v               v               v
             +-------------+ +-------------+ +----------------+
             | Cache       | | Primary DB  | | Object Storage |
             |             | | Metadata    | | Original Photos|
             | Feed Data   | | and Users   | | and Thumbnails |
             +-------------+ +------+------+ +----------------+
                                    |
                                    v
                            +---------------+
                            | Read Replica  |
                            | Read Queries  |
                            +---------------+

Photo Upload Processing:

     App Server
         |
         v
   +-------------+
   | Message     |
   | Queue       |
   +------+------+
          |
          v
   +-------------+
   | Thumbnail   |
   | Workers     |
   +------+------+
          |
          v
   +----------------+
   | Object Storage |
   | Save Thumbnail |
   +----------------+
          |
          v
   +----------------+
   | Update Image   |
   | Metadata       |
   +----------------+
