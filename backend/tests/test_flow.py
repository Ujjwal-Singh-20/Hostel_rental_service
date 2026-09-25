import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_full_rental_lifecycle_and_privacy_shield():
    # 1. Login Lender
    r = client.post("/api/auth/send-otp", json={"phone_number": "+919876500001"})
    assert r.status_code == 200
    r = client.post("/api/auth/verify-otp", json={"phone_number": "+919876500001", "otp_code": "123456"})
    assert r.status_code == 200
    lender_token = r.json()["access_token"]
    lender_headers = {"Authorization": f"Bearer {lender_token}"}

    # Onboard Lender
    r = client.post("/api/users/onboard", headers=lender_headers, json={
        "display_name": "Rohan Verma",
        "username": "rohan_v",
        "hostel_block": "Wing A, Block 1, Room 101"
    })
    assert r.status_code == 200
    assert r.json()["username"] == "rohan_v"

    # 2. Login Borrower
    r = client.post("/api/auth/verify-otp", json={"phone_number": "+919876500002", "otp_code": "123456"})
    assert r.status_code == 200
    borrower_token = r.json()["access_token"]
    borrower_headers = {"Authorization": f"Bearer {borrower_token}"}

    # Onboard Borrower
    r = client.post("/api/users/onboard", headers=borrower_headers, json={
        "display_name": "Kavya Patel",
        "username": "kavya_p",
        "hostel_block": "Wing B, Block 3, Room 305"
    })
    assert r.status_code == 200

    # 3. VERIFY PRIVACY SHIELD on /u/:username
    # Public profile MUST NEVER contain phone or hostel_block
    r = client.get("/api/u/rohan_v")
    assert r.status_code == 200
    public_data = r.json()
    assert "phone_number" not in public_data
    assert "hostel_block" not in public_data
    assert public_data["username"] == "rohan_v"
    assert public_data["display_name"] == "Rohan Verma"

    # 4. Lender creates Item Listing
    r = client.post("/api/items", headers=lender_headers, json={
        "title": "Drill Machine Kit",
        "description": "Cordless 18V drill with bits",
        "category": "Tools",
        "daily_rate": 20.0
    })
    assert r.status_code == 201
    item_id = r.json()["id"]

    # Verify Item appears in Feed
    r = client.get("/api/items?category=Tools")
    assert r.status_code == 200
    items = r.json()
    assert any(it["id"] == item_id for it in items)

    # 5. Borrower submits Rental Request
    r = client.post("/api/rentals/request", headers=borrower_headers, json={
        "item_id": item_id,
        "note": "Need to hang a poster board."
    })
    assert r.status_code == 201
    rental_id = r.json()["id"]
    assert r.json()["status"] == "PENDING"

    # 6. Lender Accepts -> generates Handover PIN
    r = client.post(f"/api/rentals/{rental_id}/accept", headers=lender_headers)
    assert r.status_code == 200
    rental_accepted = r.json()
    assert rental_accepted["status"] == "ACCEPTED"
    handover_pin = rental_accepted["handover_pin"]
    assert handover_pin is not None
    assert len(handover_pin) == 4

    # Check Borrower view: Handover PIN is masked/null for borrower!
    r = client.get(f"/api/rentals/{rental_id}", headers=borrower_headers)
    assert r.status_code == 200
    assert r.json()["handover_pin"] is None

    # 7. Check Chat Room and Mutual Privacy Shield
    r = client.get(f"/api/chat/{rental_id}", headers=lender_headers)
    assert r.status_code == 200
    chat_data = r.json()
    assert chat_data["phone_privacy"]["is_revealed"] is False
    assert "•" in chat_data["phone_privacy"]["counterparty_phone"]

    # Lender sends a message
    r = client.post(f"/api/chat/{rental_id}/messages", headers=lender_headers, json={
        "content": "I am in room 101, meet me outside the wing!"
    })
    assert r.status_code == 201

    # Lender consents to share phone
    r = client.post(f"/api/chat/{rental_id}/share-phone", headers=lender_headers)
    assert r.status_code == 200
    # Still NOT revealed because borrower hasn't consented yet
    assert r.json()["phone_privacy"]["is_revealed"] is False

    # Borrower also consents to share phone -> NOW BOTH have consented!
    r = client.post(f"/api/chat/{rental_id}/share-phone", headers=borrower_headers)
    assert r.status_code == 200
    # Now it is revealed!
    assert r.json()["phone_privacy"]["is_revealed"] is True
    assert "+919876500001" in r.json()["phone_privacy"]["counterparty_phone"]

    # 8. Borrower enters Handover PIN -> transitions to ACTIVE
    # Test wrong PIN first:
    r = client.post(f"/api/rentals/{rental_id}/verify-handover", headers=borrower_headers, json={"pin": "0000"})
    assert r.status_code == 400

    # Submit correct PIN:
    r = client.post(f"/api/rentals/{rental_id}/verify-handover", headers=borrower_headers, json={"pin": handover_pin})
    assert r.status_code == 200
    active_rental = r.json()
    assert active_rental["status"] == "ACTIVE"
    return_pin = active_rental["return_pin"]
    assert return_pin is not None

    # 9. Lender enters Return PIN -> transitions to RETURNED
    r = client.post(f"/api/rentals/{rental_id}/verify-return", headers=lender_headers, json={"pin": return_pin})
    assert r.status_code == 200
    returned_rental = r.json()
    assert returned_rental["status"] == "RETURNED"

    # 10. Reviews & Trust Score Recalculation
    # Borrower reviews Lender (5 stars)
    r = client.post(f"/api/rentals/{rental_id}/review", headers=borrower_headers, json={
        "rating": 5,
        "comment": "Great tool, super friendly!"
    })
    assert r.status_code == 200

    # Lender reviews Borrower (5 stars)
    r = client.post(f"/api/rentals/{rental_id}/review", headers=lender_headers, json={
        "rating": 5,
        "comment": "Prompt return, very careful."
    })
    assert r.status_code == 200

    # Verify status is now COMPLETED
    r = client.get(f"/api/rentals/{rental_id}", headers=lender_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_health_check()
    test_full_rental_lifecycle_and_privacy_shield()
