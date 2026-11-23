const CSS = `
:host { all: initial; }
.wrap { position: fixed; right: 16px; bottom: 16px; z-index: 2147483646; font: 13px/1.3 system-ui, -apple-system, sans-serif; }
button { all: unset; box-sizing: border-box; cursor: pointer; background: #1d4ed8; color: #fff; padding: 8px 14px; border-radius: 999px; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
button:hover { background: #1e40af; }
button:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
button[disabled] { opacity: .7; cursor: default; }
.msg { margin-bottom: 6px; background: #111827; color: #f9fafb; padding: 6px 10px; border-radius: 8px; max-width: 240px; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
.close { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; padding: 0; text-align: center; line-height: 18px; background: #374151; font-size: 12px; display: none; }
.wrap:hover .close { display: block; }
`;

export interface Chip {
  setBusy(on: boolean): void;
  say(text: string, ms?: number): void;
  destroy(): void;
}

export function mountChip(onClick: () => void, onDismiss: () => void): Chip {
  const host = document.createElement("div");
  host.setAttribute("data-applyfill", "");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style><div class="wrap"><div class="msg" hidden role="status"></div><button type="button" class="fill">Fill application</button><button type="button" class="close" aria-label="Hide">×</button></div>`;
  const btn = root.querySelector<HTMLButtonElement>(".fill")!;
  const msg = root.querySelector<HTMLElement>(".msg")!;
  const close = root.querySelector<HTMLButtonElement>(".close")!;
  let timer: number | undefined;
  btn.addEventListener("click", onClick);
  close.addEventListener("click", () => {
    host.remove();
    onDismiss();
  });
  document.documentElement.appendChild(host);
  return {
    setBusy(on) {
      btn.disabled = on;
      btn.textContent = on ? "Filling..." : "Fill application";
    },
    say(text, ms = 5000) {
      msg.textContent = text;
      msg.hidden = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (msg.hidden = true), ms);
    },
    destroy() {
      host.remove();
    },
  };
}
