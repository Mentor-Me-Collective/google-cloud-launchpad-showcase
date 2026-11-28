"use client";

import { useCallback, useEffect, useState } from "react";

interface Item {
  id: string;
  text: string;
  at: string;
  read: boolean;
}

/** In-app notifications only. No email or SMS. */
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) setItems(((await res.json()) as { notifications: Item[] }).notifications);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  const unread = items.filter((i) => !i.read).length;
  return (
    <section aria-label="Notifications" style={{ margin: "8px 0" }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Notifications{unread > 0 ? ` (${unread} new)` : ""}
      </button>
      {open && (
        <div role="region" aria-live="polite">
          {items.length === 0 ? (
            <p>No notifications.</p>
          ) : (
            <>
              <ul style={{ paddingLeft: 18 }}>
                {items.map((i) => (
                  <li key={i.id} style={{ fontWeight: i.read ? "normal" : 600 }}>
                    {i.text}
                  </li>
                ))}
              </ul>
              {unread > 0 && (
                <button type="button" onClick={markAll}>
                  Mark all as read
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
