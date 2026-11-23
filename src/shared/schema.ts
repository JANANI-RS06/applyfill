import { z } from "zod";

const text = z.string().trim().default("");

export const monthYear = z
  .string()
  .trim()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, "Use YYYY or YYYY-MM")
  .default("");

export const employmentTypes = [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "freelance",
  "temporary",
  "",
] as const;

export const personalSchema = z.object({
  firstName: text,
  middleName: text,
  lastName: text,
  preferredName: text,
  email: text,
  phoneCountryCode: text,
  phone: text,
  address1: text,
  address2: text,
  city: text,
  state: text,
  postalCode: text,
  country: text,
  linkedin: text,
  github: text,
  portfolio: text,
  website: text,
});

export const employmentSchema = z.object({
  id: z.string(),
  company: text,
  title: text,
  employmentType: z.enum(employmentTypes).default(""),
  startDate: monthYear,
  endDate: monthYear,
  current: z.boolean().default(false),
  location: text,
  description: text,
});

export const educationSchema = z.object({
  id: z.string(),
  school: text,
  degree: text,
  field: text,
  startDate: monthYear,
  endDate: monthYear,
  current: z.boolean().default(false),
  gpa: text,
  location: text,
});

export const preferencesSchema = z.object({
  authorizedToWork: z.enum(["yes", "no", ""]).default(""),
  requiresSponsorship: z.enum(["yes", "no", ""]).default(""),
  willingToRelocate: z.enum(["yes", "no", ""]).default(""),
  over18: z.enum(["yes", "no", ""]).default(""),
  noticePeriod: text,
  salaryExpectation: text,
  availableStartDate: text,
  workAuthorizationNote: text,
  referral: text,
});

export const demographicsSchema = z.object({
  gender: text,
  ethnicity: text,
  veteranStatus: text,
  disabilityStatus: text,
  pronouns: text,
});

export const profileSchema = z.object({
  version: z.literal(1).default(1),
  personal: personalSchema.default(personalSchema.parse({})),
  employment: z.array(employmentSchema).default([]),
  education: z.array(educationSchema).default([]),
  skills: z.array(z.string().trim().min(1)).default([]),
  languages: z.array(z.string().trim().min(1)).default([]),
  certifications: z.array(z.string().trim().min(1)).default([]),
  summary: text,
  preferences: preferencesSchema.default(preferencesSchema.parse({})),
  demographics: demographicsSchema.default(demographicsSchema.parse({})),
});

export type Profile = z.infer<typeof profileSchema>;
export type Personal = z.infer<typeof personalSchema>;
export type Employment = z.infer<typeof employmentSchema>;
export type Education = z.infer<typeof educationSchema>;

export const emptyProfile = (): Profile => profileSchema.parse({});

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const blankEmployment = (): Employment =>
  employmentSchema.parse({ id: newId() });
export const blankEducation = (): Education =>
  educationSchema.parse({ id: newId() });

export const aiAnswerSchema = z.object({
  answer: z.string(),
  confident: z.boolean(),
  source: z.enum(["profile", "unknown"]),
});
export type AiAnswer = z.infer<typeof aiAnswerSchema>;
