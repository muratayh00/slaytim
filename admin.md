# admin.md

## Admin Panel Vision

This admin panel is not a simple back office.

It is a full **Admin, Analytics, Moderation, and Intelligence Center** for the platform.

The panel must help the team answer these questions instantly:

1. What is happening on the platform right now?
2. What are users clicking, liking, saving, and ignoring?
3. Where do users drop off in the product flow?
4. Which content performs well and which content is low quality?
5. Which users, creators, or actions are risky or suspicious?
6. Are uploads, conversions, notifications, and emails working properly?
7. What actions did admins take, when, and why?

The admin panel must support:
- platform management
- behavior analytics
- funnel analytics
- retention tracking
- content intelligence
- moderation intelligence
- system operations
- audit logging
- role-based access control

---

# 1. Core Principles

## 1.1 Role-based access
Not every admin can do everything.

Roles must be separated clearly.

Minimum roles:
- Super Admin
- Moderator
- Support Admin
- Analytics Viewer
- Operations Admin

## 1.2 Soft delete first
Content should not be permanently deleted by default.
Use soft delete + restore flow.

## 1.3 Audit everything
All important admin actions must be logged.

Examples:
- ban user
- mute user
- restore content
- delete content
- assign badge
- change role
- update system settings
- retry failed conversion
- manually mark report as resolved

## 1.4 Dashboard must drive decisions
Every page must help the team decide what to do next.

## 1.5 Security-first admin
Admin panel must be protected stronger than the normal app:
- strict RBAC
- admin-only routes
- short session lifetime
- optional 2FA
- rate limiting
- CSRF protection
- XSS-safe rendering
- CSP enabled
- re-auth for sensitive actions

---

# 2. Main Navigation

The left navigation menu should include:

1. Overview
2. Live Activity
3. Behavior Analytics
4. Funnels
5. Retention
6. Content Intelligence
7. Moderation Intelligence
8. Reports Queue
9. Users
10. Creators
11. Categories
12. Collections
13. System Ops
14. Upload & Conversion Jobs
15. Notifications
16. Email Center
17. Storage & Files
18. Audit Logs
19. Roles & Permissions
20. Settings

Top bar:
- global search
- quick date filter
- live alerts icon
- current environment badge
- admin account menu

---

# 3. Overview Page

## Purpose
Give the team a 15-second summary of platform health.

## KPI cards
- Daily Active Users
- Weekly Active Users
- Monthly Active Users
- New Signups
- Verified Email Rate
- First Engagement Rate
- First Upload Rate
- Save Rate
- Upload Conversion Success Rate
- Active Reports Count
- Failed Jobs Count
- Failed Email Count
- Orphan File Count
- Suspicious Users Count

## Charts
- DAU / WAU / MAU trend
- signup to first engagement funnel summary
- upload funnel summary
- top growing categories
- report spike timeline
- failed conversions trend
- failed email trend

## Widgets
- latest critical alerts
- latest moderator actions
- latest suspicious user activity
- top content today
- low-performing flow warnings

---

# 4. Live Activity Page

## Purpose
Show what is happening right now.

## Live feed
- new signup
- new upload
- conversion started
- conversion failed
- content published
- report submitted
- user banned
- comment spike
- failed login spike
- failed email
- queue delay alert

## Live counters
- users online
- uploads in progress
- conversions in progress
- pending reports
- failed jobs in last hour

## Actions
- inspect user
- inspect content
- open report
- retry failed job
- silence alert
- escalate incident

---

# 5. Behavior Analytics Page

## Purpose
Understand where users click, scroll, hesitate, and exit.

## Main metrics
- page views
- unique page viewers
- avg time on page
- scroll depth
- click-through rate
- exit rate
- bounce-like single-page behavior
- search usage rate
- search result click rate
- card impression to click rate

## Sections

### 5.1 Top Pages Table
Columns:
- Page
- Views
- Unique users
- Avg time
- Scroll depth
- Exit rate
- CTR
- Trend vs previous period

### 5.2 CTA Performance
Track:
- upload CTA clicks
- signup CTA clicks
- save CTA clicks
- follow CTA clicks
- slideo open CTA clicks

### 5.3 Search Behavior
Track:
- search_performed
- search_result_click
- zero-result searches
- most searched keywords
- most clicked search queries
- search abandonment rate

### 5.4 Discovery Surface Performance
Track:
- home feed card impressions
- home feed card clicks
- topic CTR
- slide CTR
- slideo CTR
- category CTR
- creator profile CTR

### 5.5 Heatmap / Replay Links
This page should include direct links or embeds to:
- click heatmaps
- scroll heatmaps
- session recordings
- rage clicks
- dead clicks
- excessive scroll sessions

---

# 6. Funnels Page

## Purpose
See where users drop off.

## Funnel list

### 6.1 Signup Funnel
- landing_view
- signup_started
- signup_completed
- email_verification_sent
- email_verified
- first_topic_view
- first_like_or_save
- return_in_7_days

### 6.2 Onboarding Funnel
- signup_completed
- profile_completed
- first_follow
- first_save
- first_comment
- first_collection_created

### 6.3 Upload Funnel
- upload_started
- file_uploaded
- conversion_started
- conversion_success
- thumbnail_generated
- publish_clicked
- publish_success

### 6.4 Slideo Funnel
- slideo_open
- 3_second_view
- second_slideo_open
- like_clicked_or_save_clicked
- related_content_click

### 6.5 Search Funnel
- search_performed
- search_results_shown
- search_result_click
- content_opened
- save_or_like

## Funnel table
Columns:
- Funnel name
- Total entrants
- Step 1 completion
- Step 2 completion
- Step 3 completion
- Final conversion
- Biggest drop-off step
- Trend

---

# 7. Retention Page

## Purpose
Measure whether users come back and find ongoing value.

## Key retention views
- Day 1 retention
- Day 7 retention
- Day 30 retention
- creator retention
- uploader retention
- saver retention
- commenter retention
- follower retention

## Cohorts
Break retention by:
- acquisition source
- category interest
- first action type
- device type
- country
- creator vs viewer
- users who saved in first session vs users who did not
- users who uploaded in first week vs users who did not

## Retention insights
Examples:
- users who save content on day 1 retain better
- users who follow creators retain better
- uploaders retain better than passive viewers

---

# 8. Content Intelligence Page

## Purpose
Measure quality, not just popularity.

## Content types
- Topic
- Slide
- Slideo
- Collection

## Metrics per content item
- impressions
- unique viewers
- clicks
- CTR
- avg dwell time
- save count
- save rate
- like count
- like rate
- comment count
- share count
- copy link count
- follow-after-view
- report count
- report rate
- hide/skip rate
- quick exit rate

## Quality Score
Build a weighted quality score.

Suggested formula:
- save = 5 points
- share = 4 points
- follow-after-view = 4 points
- comment = 3 points
- like = 1 point
- report = -5 points
- quick exit = -3 points

## Tables

### 8.1 Top Content Table
Columns:
- Content title
- Type
- Creator
- Category
- Impressions
- CTR
- Avg dwell time
- Save rate
- Report rate
- Quality score
- Trend

### 8.2 Underexposed High-Quality Content
Purpose:
Find content with low impressions but high quality score.

### 8.3 Overexposed Low-Quality Content
Purpose:
Find content that gets shown a lot but underperforms.

### 8.4 Thumbnail Performance
Track:
- thumbnail impressions
- thumbnail click-through
- thumbnail to open rate

---

# 9. Moderation Intelligence Page

## Purpose
Detect risk, abuse, and suspicious patterns early.

## Metrics
- reports per 1000 impressions
- reports per 100 uploads
- repeated offender count
- spam comment spikes
- failed login spikes
- suspicious account creation clusters
- same IP multi-account registrations
- repeated text spam detection
- mass follow / mass comment anomalies
- ban evasion signals

## Sections

### 9.1 Suspicious Users Table
Columns:
- User
- Signup date
- Last active
- Reports received
- Reports submitted
- Comments in last 24h
- Uploads in last 24h
- Risk score
- Flags
- Current status

### 9.2 Abuse Patterns
Examples:
- same IP -> many accounts
- same device fingerprint -> many accounts
- identical comments -> multiple targets
- sudden report bomb on one creator
- sudden failed logins on one account

### 9.3 Report Rate by Content
Columns:
- Content
- Creator
- Impressions
- Reports
- Report rate
- Hide actions
- Moderator status

---

# 10. Reports Queue Page

## Purpose
Handle reports operationally.

## Statuses
- New
- In Review
- Escalated
- Resolved
- Rejected

## Priorities
- Low
- Medium
- High
- Critical

## Report table columns
- Report ID
- Target type
- Target item
- Target owner
- Report reason
- Reporter count
- Last report time
- Priority
- Risk score
- Assigned moderator
- Status

## Report detail drawer
Must show:
- target content preview
- full report history
- similar past reports
- target user history
- previous moderator decisions
- related content from same creator
- quick moderation actions

## Available actions
- hide content
- soft delete content
- restore content
- warn user
- mute user
- ban user
- reject report
- escalate to super admin
- add internal note

---

# 11. Users Page

## Purpose
Manage users safely and quickly.

## User profile sections
- identity
- profile info
- account status
- email verification
- recent sessions
- content activity
- moderation history
- admin actions history
- risk signals

## User table columns
- User
- Email
- Signup date
- Email verified
- Last active
- Role
- Upload count
- Save count
- Report count
- Risk score
- Status

## Actions
- open profile
- warn
- mute
- ban
- unban
- force password reset
- verify email manually
- assign badge
- change role
- view audit history

---

# 12. Creators Page

## Purpose
Understand creator performance and moderation risk.

## Metrics
- uploads
- total impressions
- avg content quality score
- follower growth
- save rate
- report rate
- retention of followers
- top category
- last active

## Actions
- spotlight creator
- assign badge
- review content
- limit creator temporarily
- contact creator
- moderation review

---

# 13. Categories Page

## Purpose
Track which categories drive growth and engagement.

## Metrics
- views
- topic CTR
- average session depth
- save rate
- follow rate
- return rate
- top creators
- top content
- report rate

## Use cases
- identify growing categories
- identify dead categories
- boost strong categories
- review categories with abnormal report rates

---

# 14. Collections Page

## Purpose
Track collection behavior.

## Metrics
- collection created count
- items per collection
- public/private ratio
- collection view rate
- collection save rate
- collection share rate

## Tables
- top collections
- low-quality collections
- suspicious collection spam

---

# 15. Upload & Conversion Jobs Page

## Purpose
Control the file pipeline.

## Metrics
- upload_started
- upload_completed
- conversion_started
- conversion_success
- conversion_failed
- avg conversion time
- retry count
- thumbnail_generation_success
- queue length

## Job table columns
- Job ID
- File name
- File type
- User
- Started at
- Duration
- Status
- Error message
- Retry count

## Actions
- retry conversion
- mark resolved
- inspect file
- inspect logs
- delete orphan outputs

---

# 16. System Ops Page

## Purpose
Track system health.

## Sections
- job queue health
- storage growth
- orphan files
- email failures
- notification failures
- background worker status
- API error rate
- auth failures
- slow endpoints

## Metrics
- API latency
- error rate
- queue delay
- disk usage
- storage growth rate
- orphan file count
- failed jobs last 24h
- failed emails last 24h

---

# 17. Notifications Page

## Purpose
Manage in-app notification flow.

## Metrics
- notification_created
- notification_delivered
- notification_failed
- notification_clicked
- notification_read
- click-through rate

## Sections
- templates
- recent sends
- failure logs
- realtime delivery health

---

# 18. Email Center

## Purpose
Control email communication reliability.

## Sections
- password reset emails
- verification emails
- system emails
- failed sends
- delivery logs
- template management

## Metrics
- email_verification_sent
- email_verified
- password_reset_requested
- password_reset_completed
- email_send_success_rate
- email_failure_rate

## Actions
- resend email
- preview template
- disable broken template
- inspect SMTP health

---

# 19. Storage & Files Page

## Purpose
Prevent file chaos and wasted disk space.

## Metrics
- total storage used
- storage growth per day
- raw upload size
- generated PDF size
- thumbnail size
- orphan file count

## Sections
- orphan files table
- largest files
- files with missing thumbnails
- files with missing PDF conversions
- deleted content with remaining files

## Actions
- delete orphan files
- regenerate thumbnail
- regenerate PDF
- inspect file chain

---

# 20. Audit Logs Page

## Purpose
Record all sensitive admin operations.

## Must log
- actor admin
- action name
- target type
- target id
- previous value
- new value
- timestamp
- IP
- user agent
- reason / note
- result

## Audit log table columns
- Timestamp
- Admin
- Action
- Target type
- Target
- Result
- Reason
- IP

## Filters
- admin
- action
- target type
- target id
- date range
- success/failure

---

# 21. Roles & Permissions Page

## Roles

### Super Admin
Full access to everything.

### Moderator
Can review reports, hide content, mute users, add notes.
Cannot change global settings or grant roles.

### Support Admin
Can inspect users, resend email, help recover account, view history.
Cannot ban permanently unless explicitly allowed.

### Analytics Viewer
Read-only access to analytics pages.

### Operations Admin
Can inspect jobs, queues, storage, email health, retry conversions.

## Permissions matrix
Each route and action must map to explicit permission keys.

Examples:
- users.view
- users.mute
- users.ban
- content.hide
- content.restore
- reports.review
- reports.resolve
- analytics.view
- ops.retry_job
- settings.edit
- roles.manage
- audit.view

---

# 22. Settings Page

## Sections
- general platform settings
- upload limits
- conversion settings
- thumbnail settings
- moderation thresholds
- report reasons
- risk scoring rules
- email settings
- notification settings
- feature flags
- analytics settings

## Important settings
- max upload size
- allowed file types
- auto-hide threshold
- spam threshold
- report escalation threshold
- retention window defaults
- alert thresholds
- email resend cooldown
- CSP config status

---

# 23. Event Taxonomy

## Discovery events
- page_view
- topic_impression
- topic_click
- slide_impression
- slide_open
- slideo_impression
- slideo_open
- category_view
- creator_profile_view
- search_performed
- search_result_click

## Engagement events
- like_clicked
- save_clicked
- comment_started
- comment_submitted
- share_clicked
- copy_link_clicked
- follow_user_clicked
- follow_category_clicked
- collection_created
- collection_item_added

## Upload events
- upload_started
- file_uploaded
- conversion_started
- conversion_success
- conversion_failed
- thumbnail_generated
- publish_clicked
- publish_success

## Auth events
- signup_started
- signup_completed
- login_success
- login_failed
- email_verification_sent
- email_verified
- password_reset_requested
- password_reset_completed

## Moderation events
- report_opened
- report_submitted
- block_user
- mute_user
- ban_user
- warning_sent
- content_hidden
- content_restored

## Ops events
- email_send_failed
- email_send_success
- notification_failed
- queue_delay_detected
- orphan_file_detected
- job_retried

---

# 24. Event Properties

Use these properties whenever possible:
- user_id
- anonymous_id
- session_id
- topic_id
- slide_id
- slideo_id
- content_type
- creator_id
- category_id
- collection_id
- source_page
- referrer
- utm_source
- utm_medium
- utm_campaign
- device_type
- browser
- country
- position_in_feed
- experiment_variant
- dwell_time
- report_reason
- risk_score

---

# 25. Alerts System

The panel must have active alerts, not just passive charts.

## Alert examples
- failed login spike
- report spike
- conversion_failed spike
- email failure spike
- queue delay above threshold
- orphan files growth spike
- sudden drop in signup completion
- sudden drop in upload conversion success
- abnormal spam comment pattern
- one creator receiving unusual number of reports

## Alert severity
- info
- warning
- critical

## Alert actions
- inspect
- assign
- acknowledge
- silence temporarily
- escalate

---

# 26. Recommended First Release Scope

If building MVP first, ship these pages first:
1. Overview
2. Reports Queue
3. Users
4. Content Intelligence
5. Moderation Intelligence
6. Upload & Conversion Jobs
7. Audit Logs
8. Settings

Then add:
- Behavior Analytics
- Funnels
- Retention
- Session Replay
- Email Center
- Storage & Files

---

# 27. UX Rules

## Tables
- sortable
- filterable
- exportable
- sticky headers
- saved views
- quick date presets

## Detail views
Use right-side drawers for fast inspection instead of always navigating away.

## Bulk actions
Support:
- bulk hide
- bulk restore
- bulk tag
- bulk assign
- bulk warn

## Confirmation flows
Sensitive actions require:
- clear warning
- reason field
- re-auth for highest risk actions

---

# 28. Non-Negotiable Security Requirements

- strict RBAC on every endpoint
- deny-by-default permissions
- all admin actions logged
- CSP enabled
- all user content sanitized before render
- rate limit sensitive admin actions
- short admin sessions
- re-auth for critical actions
- protect against CSRF
- soft delete before hard delete
- secure audit trail

---

# 29. North Star and Key Product Metrics

## Suggested north star
Weekly Engaged Users

Definition:
users who perform at least one meaningful action in a week:
- save
- like
- comment
- follow
- upload
- collection create

## Secondary metrics
- first-week retention
- save rate per 100 impressions
- upload completion rate
- creator retention
- report rate per 1000 impressions
- quality score by category

---

# 30. Final Goal

This admin panel must not act like a passive dashboard.

It must act like a **decision engine**.

After opening the panel, the team should immediately know:
- what is growing
- what is broken
- what users like
- where users drop off
- what content is valuable
- which creators deserve attention
- which users or patterns are risky
- what admins changed
- what must be fixed today