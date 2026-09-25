#!/usr/bin/env python3
"""
HostelShare - Ephemeral Chat Retention Purge Script
---------------------------------------------------
Queries the database for chats where `expires_at` is set and is in the past
(`expires_at <= now()`).
Deletes expired chats. Due to `ON DELETE CASCADE` on `Message.chat_id`,
all associated messages are purged automatically by the database engine.

Can be run locally, via cron job, or as a background scheduled worker.
"""

import sys
import os
from datetime import datetime

# Add backend directory to sys.path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal
from app.models.chat import Chat, Message

def purge_expired_chats():
    db = SessionLocal()
    now = datetime.utcnow()
    print(f"[{now.isoformat()}] Starting HostelShare ephemeral chat purge...")

    try:
        # Find chats that have reached or passed their expiration time
        expired_chats = db.query(Chat).filter(
            Chat.expires_at.isnot(None),
            Chat.expires_at <= now
        ).all()

        count = len(expired_chats)
        if count == 0:
            print(f"[{datetime.utcnow().isoformat()}] No expired chats found. Database is clean.")
            return 0

        print(f"Found {count} expired chat room(s) to purge.")

        total_messages_purged = 0
        for chat in expired_chats:
            msg_count = db.query(Message).filter(Message.chat_id == chat.id).count()
            total_messages_purged += msg_count
            print(f"  -> Purging Chat ID #{chat.id} (Rental #{chat.rental_id}, expired at {chat.expires_at}, {msg_count} messages)")
            db.delete(chat)

        db.commit()
        print(f"[{datetime.utcnow().isoformat()}] Successfully purged {count} expired chat(s) and {total_messages_purged} message(s).")
        return count
    except Exception as e:
        db.rollback()
        print(f"ERROR during ephemeral purge: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    purge_expired_chats()
