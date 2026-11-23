import type { Profile, Employment, Education } from "@/shared/schema";
import type { Classification, DatePart } from "./classify";
import type { Field } from "./fields";
import { MONTHS, degreeVariants, stateVariants } from "./match";

export type Resolved =
  | { type: "text"; candidates: string[] }
  | { type: "check"; value: boolean }
  | { type: "file"; which: "resume" | "coverLetter" };

export interface SectionIndex {
  employment: number;
  education: number;
}

const yesNo = (v: string): string[] => (v === "yes" ? ["Yes"] : v === "no" ? ["No"] : []);

function datePieces(value: string): { y: string; m: string } | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  if (!m) return null;
  return { y: m[1]!, m: m[2] ?? "" };
}

export function formatDate(value: string, part: DatePart, f: Field): string[] {
  const d = datePieces(value);
  if (!d) return [];
  if (f.kind === "date") {
    if (f.inputType === "month") return d.m ? [`${d.y}-${d.m}`] : [];
    return [`${d.y}-${d.m || "01"}-01`];
  }
  if (part === "year") return [d.y];
  if (part === "month") {
    if (!d.m) return [];
    const n = Number(d.m);
    const name = MONTHS[n - 1]!;
    const cap = name[0]!.toUpperCase() + name.slice(1);
    return [cap, cap.slice(0, 3), String(n), d.m];
  }
  const ph = (f.placeholder + " " + f.label).toLowerCase();
  const cap = d.m ? MONTHS[Number(d.m) - 1]![0]!.toUpperCase() + MONTHS[Number(d.m) - 1]!.slice(1) : "";
  if (!d.m) return [d.y];
  if (/mm ?\/ ?dd ?\/ ?yyyy/.test(ph)) return [`${d.m}/01/${d.y}`];
  if (/dd ?\/ ?mm ?\/ ?yyyy/.test(ph)) return [`01/${d.m}/${d.y}`];
  if (/yyyy ?- ?mm/.test(ph)) return [`${d.y}-${d.m}`];
  if (/mm ?\/ ?yy(?!yy)/.test(ph)) return [`${d.m}/${d.y.slice(2)}`];
  if (/month.*year|mmmm|mmm/.test(ph)) return [`${cap} ${d.y}`, `${cap.slice(0, 3)} ${d.y}`];
  return [`${d.m}/${d.y}`, `${cap} ${d.y}`, `${d.y}-${d.m}`];
}

function nonEmpty(list: string[]): string[] {
  return list.map((s) => s.trim()).filter(Boolean);
}

export function resolveValue(
  c: Classification,
  f: Field,
  profile: Profile,
  idx: SectionIndex,
): Resolved | null {
  const [group, name] = c.key.split(".") as [string, string];
  const p = profile.personal;
  const pref = profile.preferences;
  const demo = profile.demographics;

  if (group === "file") {
    return { type: "file", which: name === "coverLetter" ? "coverLetter" : "resume" };
  }

  if (group === "personal") {
    const map: Record<string, string> = {
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      preferredName: p.preferredName || p.firstName,
      email: p.email,
      phone: p.phone,
      phoneCountryCode: p.phoneCountryCode,
      address1: p.address1,
      address2: p.address2,
      postalCode: p.postalCode,
      city: p.city,
      linkedin: p.linkedin,
      github: p.github,
      portfolio: p.portfolio || p.website,
      website: p.website || p.portfolio,
    };
    if (name === "fullName") {
      return textOrNull([[p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ")]);
    }
    if (name === "state") return textOrNull(stateVariants(p.state));
    if (name === "country") return textOrNull(countryVariants(p.country));
    if (name === "phoneCountryCode") {
      const v = p.phoneCountryCode;
      return textOrNull(v ? [v, v.startsWith("+") ? v : `+${v}`] : []);
    }
    return textOrNull([map[name] ?? ""]);
  }

  if (group === "employment") {
    const job: Employment | undefined = profile.employment[idx.employment];
    if (!job) return null;
    if (name === "current") return { type: "check", value: job.current };
    if (name === "endDate" && job.current) return null;
    if (name === "startDate" || name === "endDate") {
      const v = name === "startDate" ? job.startDate : job.endDate;
      return textOrNull(formatDate(v, c.part, f));
    }
    const map: Record<string, string> = {
      company: job.company,
      title: job.title,
      location: job.location,
      description: job.description,
    };
    if (name === "employmentType") return textOrNull(job.employmentType ? [job.employmentType.replace("-", " "), job.employmentType] : []);
    return textOrNull([map[name] ?? ""]);
  }

  if (group === "education") {
    const ed: Education | undefined = profile.education[idx.education];
    if (!ed) return null;
    if (name === "current") return { type: "check", value: ed.current };
    if (name === "endDate" && ed.current) return null;
    if (name === "startDate" || name === "endDate") {
      const v = name === "startDate" ? ed.startDate : ed.endDate;
      return textOrNull(formatDate(v, c.part, f));
    }
    if (name === "degree") return textOrNull(ed.degree ? degreeVariants(ed.degree) : []);
    const map: Record<string, string> = {
      school: ed.school,
      field: ed.field,
      gpa: ed.gpa,
      location: ed.location,
    };
    return textOrNull([map[name] ?? ""]);
  }

  if (group === "pref") {
    switch (name) {
      case "authorizedToWork": return textOrNull(yesNo(pref.authorizedToWork));
      case "requiresSponsorship": return textOrNull(yesNo(pref.requiresSponsorship));
      case "willingToRelocate": return textOrNull(yesNo(pref.willingToRelocate));
      case "over18": return textOrNull(yesNo(pref.over18));
      case "noticePeriod": return textOrNull([pref.noticePeriod]);
      case "salary": return textOrNull([pref.salaryExpectation]);
      case "startDate": return textOrNull([pref.availableStartDate]);
      case "referral": return textOrNull([pref.referral]);
    }
  }

  if (group === "demo") {
    const map: Record<string, string> = {
      gender: demo.gender,
      ethnicity: demo.ethnicity,
      veteran: demo.veteranStatus,
      disability: demo.disabilityStatus,
      pronouns: demo.pronouns,
    };
    return textOrNull([map[name] ?? ""]);
  }

  if (group === "other") {
    switch (name) {
      case "summary": return textOrNull([profile.summary]);
      case "skills": return textOrNull([profile.skills.join(", ")]);
      case "languages": return textOrNull([profile.languages.join(", ")]);
      case "certifications": return textOrNull([profile.certifications.join(", ")]);
    }
  }
  return null;
}

function textOrNull(c: string[]): Resolved | null {
  const candidates = nonEmpty(c);
  return candidates.length ? { type: "text", candidates } : null;
}

function countryVariants(country: string): string[] {
  const n = country.trim().toLowerCase();
  if (["us", "usa", "u.s.", "u.s.a.", "united states", "united states of america"].includes(n)) {
    return [country, "United States", "United States of America", "USA", "US"];
  }
  if (["uk", "united kingdom", "great britain"].includes(n)) {
    return [country, "United Kingdom", "UK", "Great Britain"];
  }
  return [country];
}

export function assignSections(
  fields: { f: Field; c: Classification | null }[],
): Map<string, SectionIndex> {
  const result = new Map<string, SectionIndex>();
  const idx: SectionIndex = { employment: 0, education: 0 };
  const seen: Record<"employment" | "education", Set<string>> = {
    employment: new Set(),
    education: new Set(),
  };
  for (const { f, c } of fields) {
    if (!c) continue;
    const [group] = c.key.split(".");
    if (group === "employment" || group === "education") {
      const token = `${c.key}:${c.part}`;
      if (seen[group].has(token)) {
        idx[group] += 1;
        seen[group] = new Set();
      }
      seen[group].add(token);
      result.set(f.id, { ...idx });
    }
  }
  return result;
}
