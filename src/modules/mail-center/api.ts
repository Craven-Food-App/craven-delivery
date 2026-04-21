import { supabase } from "@/integrations/supabase/client";

const API_BASE = "/api/mail";

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, init?: RequestInit) {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init?.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const mailApi = {
  getMailboxes: () => request("/mailboxes"),
  getThreads: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    return request(`/threads?${params.toString()}`);
  },
  getThread: (threadId: string) => request(`/threads/${threadId}`),
  manualSync: (mailboxId: string) => request(`/mailboxes/${mailboxId}/manual-sync`, { method: "POST" }),
  reply: (threadId: string, payload: any) =>
    request(`/threads/${threadId}/reply`, { method: "POST", body: JSON.stringify(payload) }),
  forward: (threadId: string, payload: any) =>
    request(`/threads/${threadId}/forward`, { method: "POST", body: JSON.stringify(payload) }),
  assign: (threadId: string, payload: any) =>
    request(`/threads/${threadId}/assign`, { method: "POST", body: JSON.stringify(payload) }),
  note: (threadId: string, payload: any) =>
    request(`/threads/${threadId}/note`, { method: "POST", body: JSON.stringify(payload) }),
  archive: (threadId: string) => request(`/threads/${threadId}/archive`, { method: "POST" }),
  remove: (threadId: string) => request(`/threads/${threadId}/delete`, { method: "POST" }),
  markRead: (threadId: string) => request(`/threads/${threadId}/mark-read`, { method: "POST" }),
  markUnread: (threadId: string) => request(`/threads/${threadId}/mark-unread`, { method: "POST" }),
  getPermissions: (mailboxId: string) => request(`/mailboxes/${mailboxId}/permissions`),
  updatePermission: (mailboxId: string, payload: any) =>
    request(`/mailboxes/${mailboxId}/permissions`, { method: "POST", body: JSON.stringify(payload) }),
  getAttachmentDownloadUrl: (attachmentId: string) => request(`/attachments/${attachmentId}/download-url`),
  createMailbox: (payload: any) => request("/mailboxes", { method: "POST", body: JSON.stringify(payload) }),
  updateMailbox: (mailboxId: string, payload: any) =>
    request(`/mailboxes/${mailboxId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  testMailboxConnection: (mailboxId: string) => request(`/mailboxes/${mailboxId}/test-connection`, { method: "POST" }),
};
