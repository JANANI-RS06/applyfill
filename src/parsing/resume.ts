import {
  blankEducation,
  blankEmployment,
  emptyProfile,
  type Education,
  type Employment,
  type Profile,
} from "@/shared/schema";

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

const MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const DATE_RE = `(?:${MONTH_RE}\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const RANGE = new RegExp(`(${DATE_RE})\\s*(?:-|–|—|to|until)\\s*(${DATE_RE}|present|current|now|today)`, "i");

const SECTION = /^(?:(work|professional|relevant)?\s*(experience|employment( history)?|work history)|education( and training)?|academic background|(technical |core |key )?skills(?: and tools)?|technologies|summary|professional summary|profile|objective|about me|certifications?|licenses?|languages|projects|publications|awards|honors|interests|volunteer(ing)?( experience)?)\s*:?$/i;

const TITLE_WORDS = /\b(engineer|developer|manager|analyst|intern|designer|consultant|director|lead|scientist|assistant|specialist|architect|associate|officer|coordinator|administrator|founder|head|president|researcher|technician|representative|programmer|tester|teacher|instructor|tutor)\b/i;
const SCHOOL_WORDS = /\b(university|college|institute|school|academy|polytechnic)\b/i;
const DEGREE_WORDS = /\b(bachelor|master|doctor|ph\.?d|associate|mba|b\.?\s?s\.?c?|b\.?\s?a\.?|m\.?\s?s\.?c?|m\.?\s?a\.?|b\.?\s?tech|m\.?\s?tech|b\.?\s?eng|diploma)\b/i;

export function toYearMonth(raw: string): string {
  const s = raw.trim().toLowerCase();
  let m = new RegExp(`^(${MONTH_RE})\\s+(\\d{4})$`).exec(s);
  if (m) {
    const key = m[1]!.replace(".", "").slice(0, 4);
    const mm = MONTHS[key] ?? MONTHS[key.slice(0, 3)];
    return mm ? `${m[2]}-${mm}` : m[2]!;
  }
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[2]}-${m[1]!.padStart(2, "0")}`;
  m = /^(\d{4})$/.exec(s);
  return m ? m[1]! : "";
}

function lines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .replace(/[•●▪‣·]/g, "•")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const isBullet = (l: string) => /^[•*\-–]\s*/.test(l);

function splitSections(all: string[]): { head: string[]; sections: Map<string, string[]> } {
  const head: string[] = [];
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const l of all) {
    const bare = l.replace(/[:]$/, "");
    if (l.length <= 40 && SECTION.test(bare)) {
      const name = bare.toLowerCase();
      const key = /experience|employment|work history/.test(name)
        ? "experience"
        : /education|academic/.test(name)
          ? "education"
          : /skill|technolog/.test(name)
            ? "skills"
            : /summary|profile|objective|about/.test(name)
              ? "summary"
              : /certif|licen/.test(name)
                ? "certifications"
                : /language/.test(name)
                  ? "languages"
                  : "other:" + name;
      current = sections.get(key) ?? [];
      sections.set(key, current);
    } else if (current) current.push(l);
    else head.push(l);
  }
  return { head, sections };
}

function parseContact(head: string[], full: string, p: Profile) {
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(full);
  if (email) p.personal.email = email[0];

  const phone = /(\+\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/.exec(full);
  if (phone) {
    p.personal.phone = phone[2]!.replace(/[^\d]/g, "");
    if (phone[1]) p.personal.phoneCountryCode = phone[1].replace(/[^\d+]/g, "");
  }

  const li = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?/i.exec(full);
  if (li) p.personal.linkedin = withScheme(li[0]);
  const gh = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i.exec(full);
  if (gh) p.personal.github = withScheme(gh[0]);

  const urls = full.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|dev|me|net|org|co|app|tech)(?:\/[^\s,|]*)?/gi) ?? [];
  const other = urls.find(
    (u) => !/linkedin|github|@/i.test(u) && !email?.[0].toLowerCase().includes(u.toLowerCase()),
  );
  if (other) p.personal.website = withScheme(other);

  for (const l of head.slice(0, 8)) {
    const loc = /([A-Z][A-Za-z.\s]+),\s*([A-Z]{2})\b(?:\s+(\d{5}))?/.exec(l);
    if (loc && !/@|http/.test(loc[0])) {
      p.personal.city = loc[1]!.trim().split(/[|•·]/).pop()!.trim();
      p.personal.state = loc[2]!;
      if (loc[3]) p.personal.postalCode = loc[3];
      break;
    }
  }

  for (const l of head.slice(0, 5)) {
    if (/[@\d]|http|www\./i.test(l)) continue;
    const words = l.replace(/[,|•]/g, " ").split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z'’.-]+$/.test(w))) {
      p.personal.firstName = words[0]!;
      p.personal.lastName = words[words.length - 1]!;
      if (words.length > 2) p.personal.middleName = words.slice(1, -1).join(" ");
      break;
    }
  }
}

function withScheme(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^www\./i, "www.")}`;
}

function parseExperience(sec: string[]): Employment[] {
  const jobs: Employment[] = [];
  let cur: Employment | null = null;
  let desc: string[] = [];
  const flush = () => {
    if (cur) {
      cur.description = desc.join("\n");
      if (cur.company || cur.title) jobs.push(cur);
    }
    desc = [];
  };

  sec.forEach((l, i) => {
    const m = RANGE.exec(l);
    if (m && !isBullet(l)) {
      flush();
      cur = blankEmployment();
      cur.startDate = toYearMonth(m[1]!);
      const endRaw = m[2]!;
      if (/present|current|now|today/i.test(endRaw)) cur.current = true;
      else cur.endDate = toYearMonth(endRaw);
      const rest = l.replace(RANGE, "").replace(/[|,–—-]\s*$/, "").replace(/^\s*[|,–—-]\s*/, "").trim();
      let parts = rest.split(/\s+[|–—-]\s+|\s{2,}|\s+at\s+|,\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) {
        const prev = sec[i - 1];
        if (prev && !isBullet(prev) && !RANGE.test(prev) && prev.length < 90) {
          parts = [prev, ...parts].filter(Boolean);
        }
      }
      assignJob(cur, parts);
      const locMatch = /([A-Z][a-zA-Z .]+,\s*[A-Z]{2})\b/.exec(l);
      if (locMatch && !cur.company.includes(locMatch[1]!)) cur.location = locMatch[1]!;
      return;
    }
    if (cur && isBullet(l)) desc.push(l.replace(/^[•*\-–]\s*/, ""));
    else if (cur && desc.length) desc[desc.length - 1] += " " + l;
  });
  flush();
  return jobs;
}

function assignJob(job: Employment, parts: string[]) {
  if (parts.length === 1) {
    if (TITLE_WORDS.test(parts[0]!)) job.title = parts[0]!;
    else job.company = parts[0]!;
    return;
  }
  const titleIdx = parts.findIndex((x) => TITLE_WORDS.test(x));
  if (titleIdx >= 0) {
    job.title = parts[titleIdx]!;
    job.company = parts.find((_, i) => i !== titleIdx) ?? "";
  } else {
    job.company = parts[0] ?? "";
    job.title = parts[1] ?? "";
  }
  job.company = job.company.replace(/,\s*[A-Z]{2}$/, "").trim();
}

function parseEducation(sec: string[]): Education[] {
  const out: Education[] = [];
  let cur: Education | null = null;
  const push = () => {
    if (cur && cur.school) out.push(cur);
    cur = null;
  };
  for (const l of sec) {
    if (isBullet(l)) continue;
    const gpa = /gpa[:\s]*([0-4](?:\.\d{1,2})?)/i.exec(l);
    if (SCHOOL_WORDS.test(l)) {
      push();
      cur = blankEducation();
      const years = l.match(/\b(19|20)\d{2}\b/g);
      cur.school = l
        .replace(new RegExp(`(${DATE_RE})\\s*(?:-|–|—|to)\\s*(${DATE_RE}|present)`, "i"), "")
        .replace(/\b(19|20)\d{2}\b/g, "")
        .replace(/[|,–—-]\s*([A-Z][a-zA-Z .]+,\s*[A-Z]{2})?\s*$/, "")
        .replace(/\s+[|–—-]\s*$/, "")
        .trim();
      if (years?.length) cur.endDate = years[years.length - 1]!;
      if (years && years.length > 1) cur.startDate = years[0]!;
    }
    if (!cur) continue;
    if (DEGREE_WORDS.test(l)) {
      const cleaned = l.replace(/\b(19|20)\d{2}\b/g, "").replace(/gpa.*$/i, "").replace(/[|,–—-]\s*$/, "").trim();
      const m = /^(.*?)(?:\s+(?:in|of)\s+|,\s+|\s+[-–]\s+)(.+)$/i.exec(cleaned);
      if (m && /(bachelor|master|doctor|associate|b\.?s|b\.?a|m\.?s|m\.?a|ph\.?d)/i.test(m[1]!)) {
        cur.degree = m[1]!.trim();
        cur.field = m[2]!.trim();
      } else {
        cur.degree = cleaned;
      }
      const years = l.match(/\b(19|20)\d{2}\b/g);
      if (years?.length && !cur.endDate) cur.endDate = years[years.length - 1]!;
    }
    if (gpa) cur.gpa = gpa[1]!;
  }
  push();
  return out;
}

function parseList(sec: string[]): string[] {
  const items = sec
    .flatMap((l) => l.replace(/^[•*\-–]\s*/, "").replace(/^[A-Za-z &/]{2,30}:\s*/, "").split(/[,;|•]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40);
  return [...new Set(items)];
}

export function parseResumeText(text: string): Profile {
  const p = emptyProfile();
  const all = lines(text);
  const { head, sections } = splitSections(all);
  parseContact(head, all.join("\n"), p);
  p.employment = parseExperience(sections.get("experience") ?? []);
  p.education = parseEducation(sections.get("education") ?? []);
  p.skills = parseList(sections.get("skills") ?? []);
  p.certifications = parseList(sections.get("certifications") ?? []);
  p.languages = parseList(sections.get("languages") ?? []);
  p.summary = (sections.get("summary") ?? []).join(" ").slice(0, 800);
  return p;
}

export function mergeProfiles(base: Profile, incoming: Profile, mode: "fill" | "replace"): Profile {
  if (mode === "replace") return incoming;
  const out: Profile = structuredClone(base);
  for (const k of Object.keys(incoming.personal) as (keyof Profile["personal"])[]) {
    if (!out.personal[k] && incoming.personal[k]) out.personal[k] = incoming.personal[k];
  }
  if (!out.employment.length) out.employment = incoming.employment;
  if (!out.education.length) out.education = incoming.education;
  if (!out.skills.length) out.skills = incoming.skills;
  if (!out.languages.length) out.languages = incoming.languages;
  if (!out.certifications.length) out.certifications = incoming.certifications;
  if (!out.summary) out.summary = incoming.summary;
  return out;
}
