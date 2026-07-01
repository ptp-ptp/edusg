import React, { useEffect, useState } from "react";
import { fetchJson } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import { ChildSwitcher, LoadingSkeleton } from "../../components/shared/DashboardWidgets";

const templates = [
  "Great job on your practice today!",
  "Keep up the streak — you can do it!",
  "Let's review fractions together tonight.",
  "I'm proud of your effort this week!"
];

export default function ParentMessages() {
  const { session } = useSession();
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson("/dashboard/parent")
      .then((res) => {
        setChildren(res.children);
        setActiveChildId(res.children[0]?.id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeChildId) return;
    fetchJson(`/dashboard/parent/${activeChildId}`).then((res) => setMessages(res.messages || []));
  }, [activeChildId]);

  async function send() {
    if (!text.trim() || !activeChildId) return;
    const result = await fetchJson("/messages", {
      method: "POST",
      body: JSON.stringify({ studentId: activeChildId, senderId: session.user.id, text })
    });
    setMessages(result.messages);
    setText("");
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6" data-testid="parent-messages">
      <div>
        <h1 className="text-2xl font-black">Messages</h1>
        <p className="mt-1 text-slate-500">Encourage your children</p>
      </div>
      <ChildSwitcher children={children} activeId={activeChildId} onChange={setActiveChildId} />
      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="font-black">{msg.senderName}</span>
              <span className="text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-slate-600">{msg.text}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button key={t} type="button" onClick={() => setText(t)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold">
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-3"
          placeholder="Write a message..."
        />
        <button type="button" onClick={send} className="rounded-lg bg-teal px-5 py-3 font-black text-white">
          Send
        </button>
      </div>
    </div>
  );
}
