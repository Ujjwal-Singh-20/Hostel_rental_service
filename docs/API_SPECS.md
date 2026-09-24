# HostelShare REST API Specification & Endpoint Contracts
## OpenAPI / Swagger Specification Reference

**Base URL:** `http://localhost:8000/api` (or `http://<LAN_IP>:8000/api`)  
**Specification Version:** 1.0.0  
**Authentication Scheme:** HTTP Bearer Header (`Authorization: Bearer <JWT_TOKEN>`)  
**Data Exchange Format:** `application/json`  

---

## 1. Authentication Endpoints

### 1.1 Request OTP Code
`POST /api/auth/send-otp`  
Initiates phone number verification by dispatching a 6-digit OTP.

#### Request Body
```json
{
  "phone_number": "+919876543210"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Verification code sent to +919876543210",
  "dev_mock_otp": "123456"
}
```

#### Error Responses
- `400 Bad Request`: `{"detail": "Please provide a valid phone number with country code."}`

---

### 1.2 Verify OTP & Issue Token
`POST /api/auth/verify-otp`  
Verifies OTP code, provisions new user account shell if first login, and returns JWT access token.

#### Request Body
```json
{
  "phone_number": "+919876543210",
  "otp_code": "123456"
}
```

#### Response (`200 OK`)
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "is_onboarded": false,
  "user": {
    "id": 1,
    "phone_number": "+919876543210",
    "display_name": null,
    "username": null,
    "hostel_block": null,
    "avatar_url": null,
    "trust_rating": 5.0,
    "completed_rentals": 0,
    "is_onboarded": false,
    "created_at": "2026-09-23T12:00:00"
  }
}
```

---

## 2. User Profile & Privacy Shield Endpoints

### 2.1 Complete Onboarding
`POST /api/users/onboard` *(Authenticated)*  
Finalizes account setup with required display name, unique `@username`, and hostel block.

#### Request Body
```json
{
  "display_name": "Aarav Sharma",
  "username": "aarav_s",
  "hostel_block": "Wing C, Block 2, Room 304",
  "avatar_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/avatars/abc.jpg"
}
```

#### Response (`200 OK`)
```json
{
  "id": 1,
  "phone_number": "+919876543210",
  "display_name": "Aarav Sharma",
  "username": "aarav_s",
  "hostel_block": "Wing C, Block 2, Room 304",
  "avatar_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/avatars/abc.jpg",
  "trust_rating": 5.0,
  "completed_rentals": 0,
  "is_onboarded": true,
  "created_at": "2026-09-23T12:00:00"
}
```

#### Error Responses
- `400 Bad Request`: `{"detail": "Username must be 3-20 characters and contain only alphanumeric characters or underscores."}`
- `409 Conflict`: `{"detail": "Username @aarav_s is already taken by another student."}`

---

### 2.2 Public Profile (Strict Privacy Shield)
`GET /api/u/{username}` *(Public)*  
Returns public profile metrics and active listings.

> **CRITICAL PRIVACY INVARIANT:** Never returns `phone_number` or `hostel_block`.

#### Response (`200 OK`)
```json
{
  "id": 1,
  "username": "aarav_s",
  "display_name": "Aarav Sharma",
  "avatar_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/avatars/abc.jpg",
  "trust_rating": 4.9,
  "completed_rentals": 14,
  "active_listings": [
    {
      "id": 10,
      "title": "Bosch Electric Drill Kit",
      "category": "Tools",
      "daily_rate": 30.0,
      "status": "available",
      "image_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/items/drill.jpg"
    }
  ]
}
```

---

## 3. Items & Feed Endpoints

### 3.1 Fetch Feed Items
`GET /api/items` *(Public)*  
Retrieves paginated listings matching query filters.

#### Query Parameters
- `category` *(string, optional)*: Filter by `Electronics`, `Tools`, `Academic`, `Daily Living`.
- `free_only` *(bool, optional)*: Filter for `daily_rate == 0.0`.
- `status` *(string, optional, default: `available`)*: `available`, `rented`, `all`.
- `search` *(string, optional)*: Full-text search term in title or description.
- `limit` *(int, default: 50)*
- `offset` *(int, default: 0)*

#### Response (`200 OK`)
```json
[
  {
    "id": 1,
    "lender_id": 1,
    "title": "Casio Scientific Calculator FX-991CW",
    "description": "Essential for Engineering Mathematics & Circuit Analysis.",
    "category": "Academic",
    "daily_rate": 0.0,
    "status": "available",
    "image_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/items/casio.jpg",
    "created_at": "2026-09-23T12:00:00",
    "lender": {
      "id": 1,
      "username": "aarav_s",
      "display_name": "Aarav Sharma",
      "avatar_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/avatars/abc.jpg",
      "trust_rating": 4.9,
      "completed_rentals": 14
    }
  }
]
```

---

### 3.2 Create Listing
`POST /api/items` *(Authenticated)*  
Creates a new listing.

#### Request Body
```json
{
  "title": "Soldering Iron Station 60W with Flux",
  "description": "Temperature controlled, includes stand and desoldering pump.",
  "category": "Tools",
  "daily_rate": 15.0,
  "image_url": "https://xyz.supabase.co/storage/v1/object/public/hostelshare-media/items/soldering.jpg"
}
```

---

## 4. Rental State Machine & Handshake Endpoints

### 4.1 Initiate Rental Request
`POST /api/rentals/request` *(Authenticated - Borrower)*

#### Request Body
```json
{
  "item_id": 1,
  "start_date": "2026-09-24T10:00:00Z",
  "end_date": "2026-09-26T10:00:00Z",
  "note": "Need this for my semester lab exam on Friday morning!"
}
```

---

### 4.2 Accept Rental Request (Issues Handover PIN)
`POST /api/rentals/{rental_id}/accept` *(Authenticated - Lender)*  
Transitions state `PENDING` $\to$ `ACCEPTED`. Generates 4-digit `handover_pin` returned to Lender.

#### Response (`200 OK`)
```json
{
  "id": 101,
  "status": "ACCEPTED",
  "handover_pin": "5928",
  "return_pin": null,
  "is_lender": true,
  "chat_id": 42
}
```

---

### 4.3 Verify Handover PIN (Handover Handshake)
`POST /api/rentals/{rental_id}/verify-handover` *(Authenticated - Borrower)*  
Borrower enters Lender's 4-digit PIN upon physical item handover. Transitions state `ACCEPTED` $\to$ `ACTIVE`.

#### Request Body
```json
{
  "pin": "5928"
}
```

#### Response (`200 OK`)
```json
{
  "id": 101,
  "status": "ACTIVE",
  "handover_pin": null,
  "return_pin": "8412",
  "is_borrower": true
}
```

---

### 4.4 Verify Return PIN (Return Handshake)
`POST /api/rentals/{rental_id}/verify-return` *(Authenticated - Lender)*  
Lender enters Borrower's 4-digit PIN upon receiving item back. Transitions state `ACTIVE` $\to$ `RETURNED`.

#### Request Body
```json
{
  "pin": "8412"
}
```

#### Response (`200 OK`)
```json
{
  "id": 101,
  "status": "RETURNED",
  "is_lender": true
}
```

---

### 4.5 Submit Post-Return Review
`POST /api/rentals/{rental_id}/review` *(Authenticated)*  
Submits mandatory 1-5 star review. Transitions deal to `COMPLETED` once both parties review.

#### Request Body
```json
{
  "rating": 5,
  "comment": "Returned punctually and in immaculate condition. Highly recommended peer!"
}
```

---

## 5. Chat & Mutual Phone Reveal Endpoints

### 5.1 Fetch Chat Messages & Privacy State
`GET /api/chat/{rental_id}` *(Authenticated - Participant)*

#### Response (`200 OK`)
```json
{
  "id": 42,
  "rental_id": 101,
  "rental_status": "ACTIVE",
  "item_title": "Casio Scientific Calculator FX-991CW",
  "counterparty_name": "Aarav Sharma",
  "counterparty_avatar": "https://xyz.supabase.co/...",
  "lender_shared_phone": true,
  "borrower_shared_phone": false,
  "expires_at": null,
  "phone_privacy": {
    "is_revealed": false,
    "lender_consented": true,
    "borrower_consented": false,
    "counterparty_phone": "+91 ••••• ••210"
  },
  "messages": [
    {
      "id": 1,
      "chat_id": 42,
      "sender_id": 1,
      "sender_name": "Aarav Sharma",
      "content": "Hey! I can meet you in the Block 2 common room at 5 PM.",
      "created_at": "2026-09-23T14:30:00"
    }
  ]
}
```

---

### 5.2 Toggle Phone Sharing Consent
`POST /api/chat/{rental_id}/share-phone` *(Authenticated - Participant)*  
Toggles current user's consent. When both agree, unmasked phone is returned in `phone_privacy.counterparty_phone`.

---

## 6. Sample cURL Workflow

```bash
# 1. Send OTP
curl -X POST http://localhost:8000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919876543210"}'

# 2. Verify OTP & Obtain Token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919876543210", "otp_code": "123456"}' | jq -r .access_token)

# 3. Complete Onboarding
curl -X POST http://localhost:8000/api/users/onboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Aarav", "username": "aarav", "hostel_block": "Wing C"}'

# 4. View Sanitized Public Profile
curl -X GET http://localhost:8000/api/u/aarav
```
