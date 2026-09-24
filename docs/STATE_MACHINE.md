# Rental State Machine & Dual Handshake Protocol
## Technical Specification

**Author:** HostelShare Core Architecture Team  
**Specification Version:** 1.0  
**Scope:** Transactional Lifecycle, Cryptographic PIN Handshakes, Ephemeral Retention Policies  

---

## 1. State Machine Overview

The HostelShare transaction engine implements a finite state machine (FSM) designed to eliminate fraud, dispute ambiguity, and physical theft in campus environments. The core design principle is **Zero-Trust Physical Verification**: neither money nor status transitions can occur without reciprocal verification in the real world.

### 1.1 State Taxonomy

| State | Name | Description | Transitions Allowed To |
| :--- | :--- | :--- | :--- |
| **S0** | `PENDING` | Request initiated by borrower; awaiting lender approval | `ACCEPTED`, `CANCELLED` |
| **S1** | `ACCEPTED` | Lender approved; Handover PIN issued to Lender; Chat opened | `ACTIVE`, `CANCELLED` |
| **S2** | `ACTIVE` | Handover PIN verified; Item in borrower custody; Return PIN issued | `RETURNED` |
| **S3** | `RETURNED` | Return PIN verified; Item restored to lender; Chat countdown (24h) | `COMPLETED` |
| **S4** | `COMPLETED` | Both peer reviews submitted; Trust scores updated | Terminal |
| **S5** | `CANCELLED` | Deal aborted prior to physical handover; Chat countdown (72h) | Terminal |

---

## 2. State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING: Borrower submits rental request\n(dates, note)
    
    PENDING --> CANCELLED: Either party cancels\n(no penalties)
    PENDING --> ACCEPTED: Lender accepts\n[System generates Handover PIN for Lender]\n[Item status = 'rented']\n[Chat room opened]
    
    ACCEPTED --> CANCELLED: Either party cancels\n[Chat expires in 72h]\n[Item status = 'available']
    
    ACCEPTED --> ACTIVE: Handover Handshake Verified\n(Borrower enters Lender's 4-digit PIN)\n[System generates Return PIN for Borrower]
    
    ACTIVE --> RETURNED: Return Handshake Verified\n(Lender enters Borrower's 4-digit PIN)\n[Item status = 'available']\n[Chat expires in 24h]
    
    RETURNED --> COMPLETED: Review Protocol Satisfied\n(Both Lender & Borrower submit 1-5★)\n[Recalculate Trust Ratings]\n[Increment completed_rentals count]
    
    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 3. The Dual Handshake Verification Protocol

### 3.1 Phase 1: Handover Handshake (Lender $\to$ Borrower)

```mermaid
sequenceDiagram
    autonumber
    actor Lender as Lender (Item Owner)
    participant Server as HostelShare API
    actor Borrower as Borrower (Renter)

    Note over Borrower,Lender: Initial Status: PENDING
    Lender->>Server: POST /rentals/{id}/accept
    Server->>Server: Generate Cryptographic 4-digit PIN (e.g., "7841")
    Server->>Server: Set status = ACCEPTED
    Server-->>Lender: Return handover_pin: "7841"
    Server-->>Borrower: Notification: Deal Accepted (handover_pin is NULL)

    Note over Lender,Borrower: In-Person Physical Handover at Hostel
    Lender->>Borrower: Inspects item and verbally communicates "7841"
    Borrower->>Server: POST /rentals/{id}/verify-handover { pin: "7841" }
    
    alt PIN matches
        Server->>Server: Set status = ACTIVE
        Server->>Server: Generate Cryptographic 4-digit Return PIN (e.g., "3194")
        Server-->>Borrower: Return success (return_pin: "3194")
        Server-->>Lender: Notification: Item is now ACTIVE
    else PIN mismatch
        Server-->>Borrower: 400 Bad Request: Incorrect Handover PIN
    end
```

#### Invariants & Security Rules:
- **PIN Isolation**: The `handover_pin` is stored in the database but **only serialized in responses to the Lender**. The Borrower's API response has `handover_pin = null`.
- **Physical Proximity Assurance**: The borrower cannot obtain the PIN without physically meeting the lender and inspecting the item in person.
- **Atomic Activation**: The transition to `ACTIVE` marks the exact legal custody transfer.

---

### 3.2 Phase 2: Return Handshake (Borrower $\to$ Lender)

```mermaid
sequenceDiagram
    autonumber
    actor Borrower as Borrower (Renter)
    participant Server as HostelShare API
    actor Lender as Lender (Item Owner)

    Note over Borrower,Lender: Item In-Use: ACTIVE
    Note over Borrower: Borrower has Return PIN (e.g., "3194")
    Note over Lender: Lender return_pin is NULL

    Note over Borrower,Lender: In-Person Physical Return at Hostel
    Borrower->>Lender: Hands over item and verbally communicates "3194"
    Lender->>Server: POST /rentals/{id}/verify-return { pin: "3194" }
    
    alt PIN matches
        Server->>Server: Set status = RETURNED
        Server->>Server: Set Item status = 'available'
        Server->>Server: Set Chat expires_at = now() + 24 hours
        Server-->>Lender: Return success (Status: RETURNED)
        Server-->>Borrower: Notification: Item safely returned
    else PIN mismatch
        Server-->>Lender: 400 Bad Request: Incorrect Return PIN
    end
```

#### Invariants & Security Rules:
- **Role Inversion**: During return, the direction of trust inverts. The Borrower holds the secret `return_pin`. The Lender must enter it to acknowledge receipt of the undamaged item.
- **Automatic Item Relisting**: Item availability is automatically restored from `'rented'` to `'available'`.
- **Chat Retention Clock Starts**: The chat room's `expires_at` is stamped with $\text{now} + 24\text{ hours}$.

---

## 4. Post-Return Review Protocol & Trust Engine

### 4.1 Peer Review Submission
Once a rental enters `RETURNED` status, both parties are invited to evaluate their counterparty:
- Rating: Integer $\in [1, 5]$
- Optional written comment

### 4.2 Mathematical Trust Score Recalculation
Let $U$ be the user being reviewed (reviewee). Let $\mathcal{R}_U = \{r_1, r_2, \dots, r_k\}$ be all previously received star ratings, and $r_{\text{new}}$ be the newly submitted rating.

$$\text{Trust Rating}(U) = \frac{\sum_{i=1}^{k} r_i + r_{\text{new}}}{k + 1}$$

The result is rounded to 2 decimal places and updated immediately in `users.trust_rating`.

### 4.3 Completion Convergence
- After both Lender and Borrower have submitted their reviews:
  1. Transaction status transitions to `COMPLETED`.
  2. The timestamp `completed_at` is recorded.
  3. `users.completed_rentals` is incremented by 1 for both users.

---

## 5. Ephemeral Retention & Deletion Timeline

```mermaid
gantt
    title Deal Lifespan & Ephemeral Chat Retention Policy
    dateFormat  X
    axisFormat %s

    section Active Deal
    Pending to Accepted      :active, 0, 50
    Handover to Return (Active) :crit, 50, 150
    
    section Completed Deal
    Item Returned            :done, 150, 151
    Reviews & Completion     :done, 151, 160
    Chat Retention Window (24h) :active, 150, 250
    Purge Expired Chat Script:milestone, 250, 250

    section Cancelled Deal
    Deal Cancelled           :crit, 50, 51
    Chat Retention Window (72h) :active, 50, 220
    Purge Expired Chat Script:milestone, 220, 220
```

- **Completed Transactions**: Deal chat expires at $\text{returned\_at} + 24\text{ hours}$. This allows students to coordinate post-return item recovery (e.g. forgotten cables or left-behind items).
- **Cancelled Transactions**: Deal chat expires at $\text{cancelled\_at} + 72\text{ hours}$. This preserves dispute communication logs for 3 days before automated purge.
- **Purge Execution**: Standalone scheduled task `purge_ephemeral.py` issues:
  ```sql
  DELETE FROM chats WHERE expires_at IS NOT NULL AND expires_at <= NOW();
  ```
  Cascading delete cleans all child rows in `messages`.
