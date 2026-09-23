# HostelShare - Frontend Web Application

High-performance, mobile-responsive React web application built with Vite and Tailwind CSS for peer-to-peer campus rentals.

---

## Features

- **Local Wi-Fi Multi-Phone Testing**:
  - Configured with `vite-plugin-qrcode` and `server: { host: "0.0.0.0", port: 5173 }`.
  - When started, an **ASCII QR Code** displays directly in your terminal.
  - Scan the QR code with any smartphone connected to the same campus Wi-Fi router to instantly test.
- **Mutual Privacy Shield**:
  - Masked phone numbers in deal chat headers (`+91 ••••• ••123`).
  - One-tap mutual consent toggle reveals full contact details only when both parties click "Share Phone Number".
- **Dual-Handshake State Machine UI**:
  - Live state tracking (`PENDING` $\to$ `ACCEPTED` $\to$ `ACTIVE` $\to$ `RETURNED` $\to$ `COMPLETED`).
  - Interactive PIN modal for displaying secret 4-digit codes and submitting verification.
- **1-to-5 Star Peer Reviews**:
  - Interactive star rating and feedback modal after item return.
- **Sanitized Public Profiles (`/u/:username`)**:
  - Public view strictly concealing phone numbers and room/hostel wing locations.

---

## Setup & Running Locally

### 1. Install Node Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your backend.
- For local machine testing: `VITE_API_BASE_URL=http://localhost:8000`
- For multi-phone Wi-Fi testing: Set to your computer's local LAN IP (e.g. `VITE_API_BASE_URL=http://192.168.1.15:8000`)

### 3. Start Development Server with QR Code

```bash
npm run dev
```

The terminal will print:
```
  VITE v5.2.13  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.15:5173/

  [ASCII QR CODE WILL BE DISPLAYED HERE]
```

### 4. Build for Production Bundle

```bash
npm run build
```
