import type { Reply, ToBackground } from "@/shared/messages";

export function send<T>(msg: ToBackground): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (reply: Reply<T> | undefined) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (!reply) return reject(new Error("no reply"));
        if (reply.ok) resolve(reply.data);
        else reject(new Error(reply.error));
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
