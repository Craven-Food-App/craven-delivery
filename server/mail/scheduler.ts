import { supabaseAdmin } from "../supabase-admin.js";
import { syncMailbox } from "./service.js";

let timer: NodeJS.Timeout | null = null;

export function startMailSyncScheduler() {
  if (timer) return;
  const minutes = Math.min(5, Math.max(1, Number(process.env.MAIL_SYNC_INTERVAL_MINUTES || 3)));
  const intervalMs = minutes * 60 * 1000;

  timer = setInterval(async () => {
    try {
      const sb = supabaseAdmin();
      const { data: mailboxes, error } = await sb.from("mailboxes").select("id").eq("is_active", true);
      if (error || !mailboxes?.length) return;

      for (const mailbox of mailboxes) {
        try {
          await syncMailbox(mailbox.id);
        } catch (mailboxError) {
          console.error("[mail-scheduler] mailbox sync failed", mailbox.id, mailboxError);
        }
      }
    } catch (error) {
      console.error("[mail-scheduler] iteration failed", error);
    }
  }, intervalMs);
}
