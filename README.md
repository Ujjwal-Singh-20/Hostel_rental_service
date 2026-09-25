# HostelShare: Campus Peer-to-Peer Rental and Utility-Sharing Service

> A production-ready, privacy-first peer-to-peer equipment and utility sharing platform designed for university hostels.

---

## Architecture & Directory Layout

```
Hostel_rental_service/
├── backend/                  # FastAPI 0.111+ & SQLAlchemy 2.0 Backend
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py       # Phone OTP (mock 123456) + JWT generation
│   │   │   ├── users.py      # Profile onboarding & sanitized /u/:username
│   │   │   ├── items.py      # Item CRUD & filtered home feed
│   │   │   ├── rentals.py    # Dual-handshake state machine & reviews
│   │   │   └── chat.py       # In-app chat with mutual privacy shield
│   │   ├── models/           # User, Item, RentalRequest, Chat, Message, Review
│   │   ├── schemas/          # Pydantic schemas (with strict PublicProfileOut)
│   │   ├── core/
│   │   │   ├── config.py     # Settings (DATABASE_URL, JWT, CORS, Supabase)
│   │   │   ├── database.py   # Engine, SessionLocal, auto table creation
│   │   │   └── security.py   # JWT utils, EXIF stripper, Supabase Storage
│   │   └── main.py           # FastAPI app instance, CORS & static mounts
│   ├── scripts/
│   │   └── purge_ephemeral.py# Standalone SQLAlchemy script to drop expired chats
│   ├── tests/
│   │   └── test_flow.py      # Comprehensive automated lifecycle tests
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
├── frontend/                 # React 18 + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/       # Navbar, ItemCard, HandshakeModal, PhoneRevealBanner, ReviewModal
│   │   ├── pages/            # HomeFeed, ItemDetail, ProfilePage, ChatRoom, LoginModal, CreateListing, MyRentals
│   │   ├── services/         # Axios client with JWT interceptor & API endpoints
│   │   ├── App.jsx           # Routes and global auth state
│   │   ├── main.jsx          # React DOM entry
│   │   └── index.css         # Glassmorphic Tailwind styling
│   ├── vite.config.js        # Configured with host: 0.0.0.0 and vite-plugin-qrcode
│   ├── package.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── README.md
└── doc/                      # University Software Engineering Course Deliverables
    ├── SRS.md                # IEEE 830-compliant Software Requirements Specification
    ├── DATABASE_SCHEMA.md    # ERD (Mermaid) + Data dictionary with cascade specifications
    ├── STATE_MACHINE.md      # Dual-handshake state machine and flowchart specs
    └── API_SPECS.md          # REST API contracts, schemas, and sample cURLs
```

---

## Core Value Propositions & Business Logic

1. **Identity & Auth**:
   - Phone OTP verification (Mock dev test code: `123456`).
   - Profile creation: Display Name, unique `@username` (regex `^[a-zA-Z0-9_]{3,20}$`), and confidential Hostel Block / Wing.
   - Public profile (`/u/:username`): **Strict Privacy Shield** — never leaks phone number or room/hostel wing.

2. **Listings & Dynamic Feed**:
   - Category filtering (`Electronics`, `Tools`, `Academic`, `Daily Living`).
   - Free vs. Paid toggle (₹0 for free borrows).
   - Real-time search by title and description.

3. **Rental State Machine & Dual Handshake**:
   - `PENDING` $\to$ `ACCEPTED` $\to$ `ACTIVE` $\to$ `RETURNED` $\to$ `COMPLETED` (or `CANCELLED`).
   - **Handover Handshake**: Lender receives secret 4-digit PIN upon acceptance. Borrower inputs PIN upon meeting to transition to `ACTIVE`.
   - **Return Handshake**: Borrower receives secret 4-digit PIN during return. Lender inputs PIN upon inspecting item to transition to `RETURNED`.
   - **Trust Reviews**: Mandatory post-return 1-to-5 star ratings recalculating overall peer trust score.

4. **In-App Chat & Mutual Privacy Shield**:
   - Dedicated deal chat room opened automatically upon rental acceptance.
   - Masked phone numbers by default (`+91 ••••• ••123`).
   - One-tap "Share Phone Number" consent button; numbers are unmasked **if and only if both parties agree**.
   - Ephemeral auto-expiration: `return_time + 24 hours` (or `cancellation_time + 72 hours`).

5. **Storage & EXIF Stripping**:
   - Uploaded photos have all EXIF metadata (camera data, GPS coordinates, timestamps) stripped server-side using Pillow.
   - Uploads to Supabase Storage bucket `hostelshare-media` (`/avatars`, `/items`) with local static serving fallback.

6. **Instant Multi-Phone Testing on Local Wi-Fi**:
   - Running `npm run dev` displays an ASCII QR code in the terminal. Scan with your phone on the same Wi-Fi to test instantly.

---

## Quick Start Guide

### 1. Start the Backend Service

```bash
cd backend
# Optional: create and activate venv
pip install -r requirements.txt

# Run backend (auto-creates tables on first run)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Swagger UI will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Run Automated Verification Tests

```bash
cd backend
python tests/test_flow.py
```

### 3. Start the Frontend Web App

```bash
cd frontend
npm install
npm run dev
```
Scan the terminal QR code from your smartphone or visit [http://localhost:5173](http://localhost:5173).

### 4. Running the Ephemeral Chat Purge Script

```bash
cd backend
python scripts/purge_ephemeral.py
```
