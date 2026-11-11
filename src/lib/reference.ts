// Fixed reference data and option lists used by filters and forms.
import wpData from '../data/workPackages.json';
import phaseData from '../data/phases.json';
import { t } from '../i18n/en';
import type { Column, Country, DocStatus, DocType, EventType, Phase, WorkPackage } from '../types';

export const workPackages = wpData as WorkPackage[];
export const phases = phaseData as Phase[];

export const countries: Country[] = ['DK', 'SE', 'DE', 'PL', 'LT'];
export const columns: Column[] = ['idea', 'hypothesis', 'prototype', 'test', 'spread'];
export const docTypes: DocType[] = ['minutes', 'agenda', 'plan', 'report', 'guide', 'questionnaire', 'checklist', 'presentation', 'other'];
export const docStatuses: DocStatus[] = ['draft', 'review', 'approved'];
export const eventTypes: EventType[] = ['partner-meeting', 'workshop', 'study-visit', 'training', 'deadline'];
export const fileTypes = ['PDF', 'Word', 'Excel', 'PowerPoint'];
export const languages = ['en', 'da', 'sv', 'de', 'pl', 'lt'];

export interface Option {
  value: string;
  label: string;
}

export const wpOptions: Option[] = workPackages.map((w) => ({ value: w.id, label: `${w.id} ${w.name}` }));
export const wpShortOptions: Option[] = workPackages.map((w) => ({ value: w.id, label: w.id }));
export const countryOptions: Option[] = countries.map((c) => ({ value: c, label: t.countries[c] }));
export const phaseOptions: Option[] = phases.map((p) => ({ value: String(p.id), label: `${p.id}. ${p.name}` }));
export const columnOptions: Option[] = columns.map((c) => ({ value: c, label: t.columns[c] }));

export const phaseName = (id: number) => phases.find((p) => p.id === id)?.name ?? '';
export const wpName = (id: string) => workPackages.find((w) => w.id === id)?.name ?? '';
