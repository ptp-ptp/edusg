import React, { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { X } from "lucide-react";

export default function NotificationsDrawer({ open, onClose }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!open) return;
    fetchJson("/notifications")
      .then((res) => setNotifications(res.notifications || []))
      .catch(() => setNotifications([]));
  }, [open]);

  async function markRead(id) {
    await fetchJson(`/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[min(24rem,100vw)] bg-white p-4 shadow-2xl safe-top">
        <div className="flex items-center justify-between">
          <h2 className="font-black">Notifications</h2>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 space-y-2 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => markRead(n.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm ${n.read ? "opacity-60" : "border-teal/30 bg-teal/5"}`}
              >
                <div className="font-black">{n.title}</div>
                <p className="mt-1 text-slate-600">{n.body}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
