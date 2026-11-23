import type { ReactNode } from "react";
import {
  blankEducation,
  blankEmployment,
  employmentTypes,
  type Education,
  type Employment,
  type Profile,
} from "@/shared/schema";
import { Check, Field, Section, Select, TextArea, YES_NO } from "@/ui/components";

type Props = { profile: Profile; onChange: (p: Profile) => void };

const ET = employmentTypes.map((t) => ({ value: t, label: t ? t.replace("-", " ") : "Not set" }));

function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`grid gap-3 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>{children}</div>;
}

const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

function RowActions({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-1">
      <button className="btn-ghost !px-2" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
      <button className="btn-ghost !px-2" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
      <button className="btn-ghost !px-2" onClick={onRemove} aria-label="Remove">Remove</button>
    </div>
  );
}

const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function ProfileEditor({ profile, onChange }: Props) {
  const p = profile.personal;
  const setP = (k: keyof Profile["personal"]) => (v: string) =>
    onChange({ ...profile, personal: { ...p, [k]: v } });
  const setPref = (k: keyof Profile["preferences"]) => (v: string) =>
    onChange({ ...profile, preferences: { ...profile.preferences, [k]: v } as Profile["preferences"] });
  const setDemo = (k: keyof Profile["demographics"]) => (v: string) =>
    onChange({ ...profile, demographics: { ...profile.demographics, [k]: v } });

  const updJob = (i: number, patch: Partial<Employment>) =>
    onChange({ ...profile, employment: profile.employment.map((j, x) => (x === i ? { ...j, ...patch } : j)) });
  const updEdu = (i: number, patch: Partial<Education>) =>
    onChange({ ...profile, education: profile.education.map((e, x) => (x === i ? { ...e, ...patch } : e)) });

  return (
    <div className="space-y-4">
      <Section title="Personal information">
        <Grid cols={3}>
          <Field label="First name" value={p.firstName} onChange={setP("firstName")} />
          <Field label="Middle name" value={p.middleName} onChange={setP("middleName")} />
          <Field label="Last name" value={p.lastName} onChange={setP("lastName")} />
          <Field label="Preferred name" value={p.preferredName} onChange={setP("preferredName")} />
          <Field label="Email" type="email" value={p.email} onChange={setP("email")} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Code" value={p.phoneCountryCode} placeholder="+1" onChange={setP("phoneCountryCode")} />
            <Field className="col-span-2" label="Phone" type="tel" value={p.phone} onChange={setP("phone")} />
          </div>
          <Field label="Address line 1" value={p.address1} onChange={setP("address1")} />
          <Field label="Address line 2" value={p.address2} onChange={setP("address2")} />
          <Field label="City" value={p.city} onChange={setP("city")} />
          <Field label="State or region" value={p.state} onChange={setP("state")} />
          <Field label="Postal code" value={p.postalCode} onChange={setP("postalCode")} />
          <Field label="Country" value={p.country} onChange={setP("country")} />
          <Field label="LinkedIn" value={p.linkedin} onChange={setP("linkedin")} />
          <Field label="GitHub" value={p.github} onChange={setP("github")} />
          <Field label="Portfolio" value={p.portfolio} onChange={setP("portfolio")} />
          <Field label="Personal website" value={p.website} onChange={setP("website")} />
        </Grid>
      </Section>

      <Section
        title="Employment history"
        action={
          <button className="btn-ghost" onClick={() => onChange({ ...profile, employment: [...profile.employment, blankEmployment()] })}>
            Add job
          </button>
        }
      >
        {profile.employment.length === 0 && <p className="text-sm text-gray-500">No jobs yet.</p>}
        <div className="space-y-4">
          {profile.employment.map((j, i) => (
            <div key={j.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex justify-end">
                <RowActions
                  i={i}
                  n={profile.employment.length}
                  onMove={(d) => onChange({ ...profile, employment: move(profile.employment, i, i + d) })}
                  onRemove={() => onChange({ ...profile, employment: profile.employment.filter((_, x) => x !== i) })}
                />
              </div>
              <Grid>
                <Field label="Company" value={j.company} onChange={(v) => updJob(i, { company: v })} />
                <Field label="Job title" value={j.title} onChange={(v) => updJob(i, { title: v })} />
                <Select label="Employment type" value={j.employmentType} options={ET} onChange={(v) => updJob(i, { employmentType: v as Employment["employmentType"] })} />
                <Field label="Location" value={j.location} onChange={(v) => updJob(i, { location: v })} />
                <Field label="Start (YYYY-MM)" value={j.startDate} placeholder="2021-06" onChange={(v) => updJob(i, { startDate: v })} />
                <Field label="End (YYYY-MM)" value={j.endDate} placeholder="2023-08" onChange={(v) => updJob(i, { endDate: v })} />
              </Grid>
              <div className="mt-3 space-y-3">
                <Check label="I currently work here" checked={j.current} onChange={(v) => updJob(i, { current: v, endDate: v ? "" : j.endDate })} />
                <TextArea label="Description" value={j.description} onChange={(v) => updJob(i, { description: v })} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Education"
        action={
          <button className="btn-ghost" onClick={() => onChange({ ...profile, education: [...profile.education, blankEducation()] })}>
            Add school
          </button>
        }
      >
        {profile.education.length === 0 && <p className="text-sm text-gray-500">No schools yet.</p>}
        <div className="space-y-4">
          {profile.education.map((e, i) => (
            <div key={e.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex justify-end">
                <RowActions
                  i={i}
                  n={profile.education.length}
                  onMove={(d) => onChange({ ...profile, education: move(profile.education, i, i + d) })}
                  onRemove={() => onChange({ ...profile, education: profile.education.filter((_, x) => x !== i) })}
                />
              </div>
              <Grid>
                <Field label="School" value={e.school} onChange={(v) => updEdu(i, { school: v })} />
                <Field label="Degree" value={e.degree} onChange={(v) => updEdu(i, { degree: v })} />
                <Field label="Field of study" value={e.field} onChange={(v) => updEdu(i, { field: v })} />
                <Field label="GPA" value={e.gpa} onChange={(v) => updEdu(i, { gpa: v })} />
                <Field label="Start (YYYY or YYYY-MM)" value={e.startDate} onChange={(v) => updEdu(i, { startDate: v })} />
                <Field label="End (YYYY or YYYY-MM)" value={e.endDate} onChange={(v) => updEdu(i, { endDate: v })} />
              </Grid>
              <div className="mt-3">
                <Check label="Currently enrolled" checked={e.current} onChange={(v) => updEdu(i, { current: v, endDate: v ? "" : e.endDate })} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Skills and summary">
        <div className="space-y-3">
          <Field label="Skills (comma separated)" value={profile.skills.join(", ")} onChange={(v) => onChange({ ...profile, skills: csv(v) })} />
          <Field label="Languages (comma separated)" value={profile.languages.join(", ")} onChange={(v) => onChange({ ...profile, languages: csv(v) })} />
          <Field label="Certifications (comma separated)" value={profile.certifications.join(", ")} onChange={(v) => onChange({ ...profile, certifications: csv(v) })} />
          <TextArea label="Professional summary" rows={4} value={profile.summary} onChange={(v) => onChange({ ...profile, summary: v })} />
        </div>
      </Section>

      <Section title="Work preferences">
        <Grid>
          <Select label="Authorized to work" value={profile.preferences.authorizedToWork} options={YES_NO} onChange={setPref("authorizedToWork")} />
          <Select label="Requires sponsorship" value={profile.preferences.requiresSponsorship} options={YES_NO} onChange={setPref("requiresSponsorship")} />
          <Select label="Willing to relocate" value={profile.preferences.willingToRelocate} options={YES_NO} onChange={setPref("willingToRelocate")} />
          <Select label="At least 18 years old" value={profile.preferences.over18} options={YES_NO} onChange={setPref("over18")} />
          <Field label="Notice period" value={profile.preferences.noticePeriod} onChange={setPref("noticePeriod")} />
          <Field label="Salary expectation" value={profile.preferences.salaryExpectation} onChange={setPref("salaryExpectation")} />
          <Field label="Available start date" value={profile.preferences.availableStartDate} onChange={setPref("availableStartDate")} />
          <Field label="How you usually hear about roles" value={profile.preferences.referral} onChange={setPref("referral")} />
        </Grid>
      </Section>

      <Section title="Voluntary self-identification">
        <p className="mb-3 text-xs text-gray-500">
          Filled only when you provide a value. Use the exact wording the forms show, such as "Decline to self identify".
        </p>
        <Grid>
          <Field label="Gender" value={profile.demographics.gender} onChange={setDemo("gender")} />
          <Field label="Pronouns" value={profile.demographics.pronouns} onChange={setDemo("pronouns")} />
          <Field label="Race or ethnicity" value={profile.demographics.ethnicity} onChange={setDemo("ethnicity")} />
          <Field label="Veteran status" value={profile.demographics.veteranStatus} onChange={setDemo("veteranStatus")} />
          <Field label="Disability status" value={profile.demographics.disabilityStatus} onChange={setDemo("disabilityStatus")} />
        </Grid>
      </Section>
    </div>
  );
}
