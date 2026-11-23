import { signature, type Field } from "./fields";

export type DatePart = "full" | "month" | "year";

export interface Classification {
  key: string;
  part: DatePart;
  confidence: number;
}

type Rule = [key: string, test: RegExp, exclude?: RegExp];

const AUTOCOMPLETE: Record<string, string> = {
  "given-name": "personal.firstName",
  "additional-name": "personal.middleName",
  "family-name": "personal.lastName",
  name: "personal.fullName",
  nickname: "personal.preferredName",
  email: "personal.email",
  tel: "personal.phone",
  "tel-national": "personal.phone",
  "tel-country-code": "personal.phoneCountryCode",
  "address-line1": "personal.address1",
  "street-address": "personal.address1",
  "address-line2": "personal.address2",
  "address-level2": "personal.city",
  "address-level1": "personal.state",
  "postal-code": "personal.postalCode",
  country: "personal.country",
  "country-name": "personal.country",
  url: "personal.website",
  organization: "employment.company",
  "organization-title": "employment.title",
};

const GLOBAL_RULES: Rule[] = [
  ["file.resume", /\b(resume|résumé|cv|curriculum vitae)\b/, /cover letter/],
  ["file.coverLetter", /cover letter/],
  ["personal.linkedin", /linked ?in/],
  ["personal.github", /git ?hub/],
  ["personal.portfolio", /portfolio|behance|dribbble/],
  ["personal.website", /\b(personal )?(website|web site|homepage|blog)\b|other url|\burl\b|\blink\b/],
  ["personal.email", /e ?mail/, /confirm|verify|re ?enter|retype/],
  ["personal.phoneCountryCode", /(phone|mobile|tel).*(country|code|prefix)|country (calling )?code|dial(ing)? code/],
  ["personal.phone", /\b(phone|mobile|cell|telephone|tel)\b/],
  ["personal.address2", /address (line )?2|apartment|apt\b|suite|unit\b|address 2/],
  ["personal.address1", /street|address (line )?1|\baddress\b/, /e ?mail|ip address|web/],
  ["personal.postalCode", /zip|postal|post code|postcode/],
  ["personal.city", /\bcity\b|\btown\b|municipality/, /employer|company|school/],
  ["personal.state", /\bstate\b|province|region|prefecture/, /united state|status|employer|school/],
  ["personal.country", /\bcountry\b|nationality/, /code|phone|school/],
  ["personal.preferredName", /preferred (first )?name|nick ?name|goes by|name you (go|prefer)/],
  ["personal.firstName", /first name|given name|forename|\bfname\b|first$/],
  ["personal.middleName", /middle (name|initial)|additional name/],
  ["personal.lastName", /last name|family name|surname|\blname\b|last$/],
  ["personal.fullName", /(full|legal|your) name|^name\b|\bname$/, /company|employer|school|university|college|organi[sz]ation|reference|manager|supervisor|institution|user ?name|file/],

  ["pref.authorizedToWork", /(legally )?(authori[sz]ed|eligible|permitted|right|legal right) to work|work authori[sz]ation|work permit/, /sponsor/],
  ["pref.requiresSponsorship", /sponsor|visa/],
  ["pref.willingToRelocate", /relocat/],
  ["pref.over18", /(18|eighteen) years|at least 18|legal age/],
  ["pref.noticePeriod", /notice period|how soon can you start|time to join/],
  ["pref.salary", /salary|compensation|pay expectation|desired pay|expected pay|ctc/],
  ["pref.startDate", /(available|earliest|desired|preferred|when can you).*(start|join)|availability date|date available/],
  ["pref.referral", /how did you (hear|find)|referral|referred by|source/],

  ["demo.gender", /\bgender\b|\bsex\b/],
  ["demo.pronouns", /pronoun/],
  ["demo.ethnicity", /ethnic|\brace\b|racial/],
  ["demo.veteran", /veteran|military/],
  ["demo.disability", /disabilit/],

  ["other.summary", /(about|tell us about) (yourself|you)|professional summary|bio\b|introduce yourself|personal statement/],
  ["other.skills", /\bskills?\b/],
  ["other.languages", /\blanguages?\b/],
  ["other.certifications", /certif|licen[sc]e/],
];

const EMPLOYMENT_RULES: Rule[] = [
  ["employment.current", /currently (work|employed)|i (currently )?work here|present(ly)?\b|current (job|role|position)/],
  ["employment.company", /company|employer|organi[sz]ation|business name/, /school|university|college/],
  ["employment.title", /job title|position|\btitle\b|\brole\b/, /school|degree/],
  ["employment.employmentType", /employment type|job type|contract type/],
  ["employment.location", /location|\bcity\b/],
  ["employment.description", /description|responsibilit|duties|summary|achievements|details/],
];

const EDUCATION_RULES: Rule[] = [
  ["education.current", /currently (study|studying|enrolled|attend)/],
  ["education.school", /school|university|college|institution/],
  ["education.degree", /degree|qualification|level of education|education level/],
  ["education.field", /major|field of study|discipline|concentration|area of study|specialization/],
  ["education.gpa", /\bgpa\b|grade point|cgpa|grades?\b/],
  ["education.location", /location|\bcity\b/],
];

const DATE_WORDS = /\b(start|from|begin|end|until|through|graduat\w*|completion|finish)\b/;
const EDU_WORDS = /education|school|university|college|degree|academic|institution|graduat/;
const EMP_WORDS = /employ|experience|work history|job|company|employer|position|career/;

function datePart(sig: string, f: Field): DatePart {
  if (f.kind === "date") return "full";
  if (/\bmonth\b|\bmm\b/.test(sig) && !/year|yyyy/.test(sig)) return "month";
  if (/\byear\b|\byyyy\b/.test(sig) && !/month|mm\b/.test(sig)) return "year";
  return "full";
}

function matchRules(sig: string, rules: Rule[]): string | null {
  for (const [key, test, exclude] of rules) {
    if (test.test(sig) && !(exclude && exclude.test(sig))) return key;
  }
  return null;
}

export function sectionOf(sig: string, labelOnly: string): "education" | "employment" | null {
  const own = labelOnly.toLowerCase();
  if (EDU_WORDS.test(own) && !EMP_WORDS.test(own)) return "education";
  if (EMP_WORDS.test(own) && !EDU_WORDS.test(own)) return "employment";
  if (EDU_WORDS.test(sig) && !EMP_WORDS.test(sig)) return "education";
  if (EMP_WORDS.test(sig) && !EDU_WORDS.test(sig)) return "employment";
  return null;
}

export function classify(f: Field): Classification | null {
  const sig = signature(f);

  if (f.autocomplete) {
    const tokens = f.autocomplete.toLowerCase().split(/\s+/);
    const hit = AUTOCOMPLETE[tokens[tokens.length - 1] ?? ""];
    if (hit) return { key: hit, part: "full", confidence: 0.95 };
  }

  if (f.kind === "file") {
    const k = matchRules(sig, GLOBAL_RULES.filter(([key]) => key.startsWith("file.")));
    return k ? { key: k, part: "full", confidence: 0.9 } : null;
  }

  const labelSig = (f.label + " " + f.name + " " + f.attrId + " " + f.placeholder).toLowerCase();
  const section = sectionOf(sig, labelSig);

  const shortLabel = f.label.toLowerCase().trim();
  const dateish =
    f.kind === "date" ||
    (DATE_WORDS.test(labelSig) && /\b(date|month|year|period)\b|graduat/.test(labelSig)) ||
    /^(from|to|start|end|until)$/.test(shortLabel);
  if (dateish) {
    const isEnd = /\b(end|to|until|through|graduat|completion|finish)/.test(labelSig) && !/start|begin/.test(labelSig);
    const isStart = /\b(start|from|begin)/.test(labelSig);
    if ((isEnd || isStart) && !/available|earliest|desired|preferred/.test(labelSig)) {
      const sec = section ?? "employment";
      return {
        key: `${sec}.${isEnd ? "endDate" : "startDate"}`,
        part: datePart(labelSig, f),
        confidence: 0.8,
      };
    }
  }

  const prefer = section === "education" ? EDUCATION_RULES : section === "employment" ? EMPLOYMENT_RULES : null;
  if (prefer) {
    const k = matchRules(labelSig, prefer);
    if (k) return { key: k, part: "full", confidence: 0.8 };
  }

  const g = matchRules(labelSig, GLOBAL_RULES) ?? matchRules(sig, GLOBAL_RULES);
  if (g) return { key: g, part: "full", confidence: 0.75 };

  const eduFallback = matchRules(labelSig, EDUCATION_RULES.slice(1, 4));
  if (eduFallback && section !== "employment") return { key: eduFallback, part: "full", confidence: 0.6 };
  const empFallback = matchRules(labelSig, EMPLOYMENT_RULES.slice(0, 4));
  if (empFallback && section !== "education") return { key: empFallback, part: "full", confidence: 0.6 };

  return null;
}
