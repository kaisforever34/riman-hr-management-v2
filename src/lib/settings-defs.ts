export type SettingGroup = 'company' | 'shift' | 'payroll' | 'leave' | 'lists' | 'policies'

export interface SettingDefinition {
  key: string
  group: SettingGroup
  fallback: number | string
  text?: boolean
  options?: string[]
  step?: number
  min?: number
  max?: number
  percent?: boolean
}

export const SETTING_GROUPS: SettingGroup[] = ['company', 'shift', 'payroll', 'leave', 'lists', 'policies']

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // Company identity
  { key: 'COMPANY_NAME', group: 'company', fallback: 'Riman HR', text: true },
  { key: 'COMPANY_NAME_AR', group: 'company', fallback: 'ريمان للموارد البشرية', text: true },
  { key: 'COMPANY_TAGLINE', group: 'company', fallback: 'Fashion Trading', text: true },
  { key: 'LOGO_LETTER', group: 'company', fallback: 'R', text: true },
  { key: 'CURRENCY', group: 'company', fallback: 'AED', text: true },
  { key: 'COMPANY_LOCATION', group: 'company', fallback: 'Dubai, UAE', text: true },
  { key: 'EMAIL_FROM_NAME', group: 'company', fallback: 'Riman HR', text: true },

  // Work shift & attendance
  { key: 'WORK_START_HOUR', group: 'shift', fallback: 11, step: 1, min: 0, max: 23 },
  { key: 'WORK_START_MINUTE', group: 'shift', fallback: 30, step: 5, min: 0, max: 59 },
  { key: 'WORK_END_HOUR', group: 'shift', fallback: 20, step: 1, min: 0, max: 23 },
  { key: 'WORK_END_MINUTE', group: 'shift', fallback: 30, step: 5, min: 0, max: 59 },
  { key: 'BREAK_START_HOUR', group: 'shift', fallback: 14, step: 1, min: 0, max: 23 },
  { key: 'BREAK_START_MINUTE', group: 'shift', fallback: 0, step: 5, min: 0, max: 59 },
  { key: 'BREAK_END_HOUR', group: 'shift', fallback: 14, step: 1, min: 0, max: 23 },
  { key: 'BREAK_END_MINUTE', group: 'shift', fallback: 30, step: 5, min: 0, max: 59 },
  { key: 'GRACE_PERIOD_MINUTES', group: 'shift', fallback: 5, step: 1, min: 0, max: 60 },
  { key: 'AUTO_CLOCKOUT_HOUR', group: 'shift', fallback: 21, step: 1, min: 0, max: 23 },
  { key: 'AUTO_CLOCKOUT_MINUTE', group: 'shift', fallback: 0, step: 5, min: 0, max: 59 },

  // Payroll & EOSB
  { key: 'GPSSA_EMPLOYEE_RATE', group: 'payroll', fallback: 5, step: 0.5, min: 0, max: 100, percent: true },
  { key: 'GPSSA_EMPLOYER_RATE', group: 'payroll', fallback: 12.5, step: 0.5, min: 0, max: 100, percent: true },
  { key: 'GPSSA_ELIGIBILITY', group: 'payroll', fallback: 'GCC_ONLY', text: true, options: ['ALL', 'GCC_ONLY'] },
  { key: 'DAILY_RATE_DIVISOR', group: 'payroll', fallback: 30, step: 1, min: 1, max: 365 },
  { key: 'HOURS_PER_WORKDAY', group: 'payroll', fallback: 9, step: 0.5, min: 1, max: 24 },
  { key: 'OT_PREMIUM_RATE', group: 'payroll', fallback: 25, step: 5, min: 0, max: 500, percent: true },
  { key: 'TRANSPORTATION_AMOUNT', group: 'payroll', fallback: 500, step: 10, min: 0, max: 100000 },
  { key: 'EOSB_CAP_MONTHS', group: 'payroll', fallback: 24, step: 1, min: 0, max: 60 },
  { key: 'EOSB_FIRST_TIER_YEARS', group: 'payroll', fallback: 5, step: 1, min: 0, max: 40 },
  { key: 'EOSB_FIRST_TIER_DAYS', group: 'payroll', fallback: 21, step: 1, min: 0, max: 365 },
  { key: 'EOSB_LATER_TIER_DAYS', group: 'payroll', fallback: 30, step: 1, min: 0, max: 365 },

  // Leave rules
  { key: 'MAX_CARRYOVER_DAYS', group: 'leave', fallback: 15, step: 1, min: 0, max: 365 },
  { key: 'MAX_CONSECUTIVE_LEAVE_DAYS', group: 'leave', fallback: 30, step: 1, min: 1, max: 365 },

  // Editable lists (comma-separated)
  { key: 'DEPARTMENTS', group: 'lists', fallback: 'HR, Finance, IT, Operations, Sales, Marketing, Legal, Executive', text: true },
  { key: 'NATIONALITIES', group: 'lists', fallback: 'AE, SA, EG, IN, PK, PH, BD, JO, LB, GB, US, CA', text: true },

  // Policies
  { key: 'COMPANY_WORK_WEEK', group: 'policies', fallback: '0,1,2,3,4', text: true },
  { key: 'PASSWORD_MIN_LENGTH', group: 'policies', fallback: 8, step: 1, min: 6, max: 64 },
  { key: 'MAX_LEAVE_ATTACHMENT_MB', group: 'policies', fallback: 5, step: 1, min: 1, max: 50 },
  { key: 'MAX_DOCUMENT_MB', group: 'policies', fallback: 10, step: 1, min: 1, max: 100 },
  { key: 'EXPIRY_WARNING_DAYS', group: 'policies', fallback: 30, step: 1, min: 1, max: 365 },
  { key: 'OVERTIME_MIN_MINUTES', group: 'policies', fallback: 15, step: 5, min: 0, max: 480 },
]

export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return SETTING_DEFINITIONS.find(d => d.key === key)
}

export function settingFallback(key: string): string {
  const def = getSettingDefinition(key)
  return def ? String(def.fallback) : ''
}
