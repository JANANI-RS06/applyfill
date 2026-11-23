import {
  db,
  loadProfile,
  loadSettings,
  rememberAnswer,
} from "@/shared/db";
import type { FillData, FillReport, Reply, ToBackground } from "@/shared/messages";
import { toBase64 } from "@/shared/messages";
import { ask, getStatus, loadModel, unloadModel } from "./llm";

type TabReports = Record<string, FillReport>;

async function handle(msg: ToBackground, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case "fill:data": {
      const data: FillData = {
        profile: await loadProfile(),
        settings: await loadSettings(),
        answers: await db.answers.toArray(),
        hasResume: !!(await db.resume.get("resume")),
      };
      return data;
    }
    case "fill:resume": {
      const r = await db.resume.get("resume");
      return r ? { name: r.name, type: r.type, data: toBase64(r.data) } : null;
    }
    case "answer:remember":
      await rememberAnswer(msg.question, msg.answer, msg.options);
      return true;
    case "ai:ask":
      return ask(msg.request);
    case "ai:status":
      return getStatus();
    case "ai:load":
      loadModel().catch(() => undefined);
      return getStatus();
    case "ai:unload":
      await unloadModel();
      return getStatus();
    case "report:update": {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return false;
      const key = `report:${tabId}`;
      const stored = (await chrome.storage.session.get(key))[key] as TabReports | undefined;
      const frames = stored ?? {};
      frames[String(sender.frameId ?? 0)] = msg.report;
      await chrome.storage.session.set({ [key]: frames });
      return true;
    }
    case "report:get": {
      const key = `report:${msg.tabId}`;
      return ((await chrome.storage.session.get(key))[key] as TabReports | undefined) ?? {};
    }
  }
}

chrome.runtime.onMessage.addListener((msg: ToBackground, sender, sendResponse) => {
  handle(msg, sender)
    .then((data) => sendResponse({ ok: true, data } satisfies Reply<unknown>))
    .catch((e: unknown) =>
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) } satisfies Reply<unknown>),
    );
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill-page") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) {
    await chrome.storage.session.remove(`report:${tab.id}`);
    chrome.tabs.sendMessage(tab.id, { type: "fill" }).catch(() => undefined);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(`report:${tabId}`);
});
