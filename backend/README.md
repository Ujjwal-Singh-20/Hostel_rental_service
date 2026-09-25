# HostelShare - Backend Service

High-performance, privacy-first REST API built with FastAPI, SQLAlchemy, and Supabase PostgreSQL for peer-to-peer campus rentals.

---

## Features

- **Phone OTP Authentication**: Mock OTP provider configured for development (test code `123456`), issuing secure JWT tokens.
- **Strict Privacy Shield**: Sanitized public profiles (`/u/:username`) completely strip phone numbers, room numbers, and hostel wings at the database serialization level.
- **Dual-Handshake State Machine**:
  - `PENDING` $\to$ `ACCEPTED` $\to$ `ACTIVE` $\to$ `RETURNED` $\to$ `COMPLETED` (or `CANCELLED`).
  - **Handover PIN**: 4-digit code provided to Lender, entered by Borrower to activate the rental.
  - **Return PIN**: 4-digit code provided to Borrower, entered by Lender to mark the item returned.
  - **Mandatory Trust Reviews**: Post-return 1-5 star peer reviews recalculating trust scores.
- **Mutual Privacy Shield In-App Chat**:
  - Opens automatically upon rental acceptance.
  - Phone numbers are masked by default (`+91 ••••• ••123`).
  - Full phone numbers are revealed **if and only if both parties click 'Share Phone Number'**.
  - **Ephemeral Lifecycle**: Automatically sets expiration to `return_time + 24 hours` on completion or `cancellation_time + 72 hours` on cancellation.
- **Image Processing & Storage**:
  - Strips EXIF metadata (GPS coordinates, camera tags, timestamps) using Pillow.
  - Uploads to Supabase Storage bucket `hostelshare-media` (`/avatars`, `/items`) or falls back to local static serving.
- **Automated Ephemeral Purge**: Standalone SQLAlchemy script (`scripts/purge_ephemeral.py`) dropping expired chats and cascading to messages.

---

## Quickstart

### 1. Install Dependencies

Ensure Python 3.10+ is installed:

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` to configure your Supabase instance:

```ini
# Supabase PostgreSQL Connection String:
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Supabase Storage:
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_KEY=YOUR_SUPABASE_SERVICE_KEY
SUPABASE_BUCKET=hostelshare-media

# Auth & Network:
JWT_SECRET=supersecretjwtkey_change_me_in_production
ALLOWED_ORIGINS=*
DEV_MOCK_OTP=123456
HOST=0.0.0.0
PORT=8000
```

> **Note:** If `DATABASE_URL` is left empty, the server automatically defaults to `sqlite:///./hostelshare.db` for instant offline testing!

### 3. Run the Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **Root / Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **LAN Access**: `http://<YOUR_LAN_IP>:8000/docs`

### 4. Running the Ephemeral Chat Purge Script

To purge expired chats and their associated messages:

```bash
python scripts/purge_ephemeral.py
```
