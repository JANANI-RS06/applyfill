import { scanFields, type Field } from "@/content/fields";

export function mount(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

export function scan(html: string): Field[] {
  mount(html);
  return scanFields(document);
}
