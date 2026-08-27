export const SETTING_DEFINITIONS: {
  key: string
  fallback: number
  step: number
  min: number
  max: number
  percent?: boolean
}[] = [
  { key: 'GPSSA_EMPLOYEE_RATE', fallback: 5, step: 0.5, min: 0, max: 100, percent: true },
  { key: 'GPSSA_EMPLOYER_RATE', fallback: 12.5, step: 0.5, min: 0, max: 100, percent: true },
  { key: 'EOSB_CAP_MONTHS', fallback: 24, step: 1, min: 0, max: 60 },
  { key: 'GRACE_PERIOD_MINUTES', fallback: 5, step: 1, min: 0, max: 60 },
  { key: 'AUTO_CLOCKOUT_HOUR', fallback: 21, step: 1, min: 0, max: 23 },
  { key: 'AUTO_CLOCKOUT_MINUTE', fallback: 0, step: 5, min: 0, max: 59 },
  { key: 'MAX_CARRYOVER_DAYS', fallback: 15, step: 1, min: 0, max: 365 },
  { key: 'MAX_CONSECUTIVE_LEAVE_DAYS', fallback: 30, step: 1, min: 1, max: 365 },
]
