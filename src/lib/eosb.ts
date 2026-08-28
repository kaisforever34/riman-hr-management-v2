const DEFAULT_DAILY_RATE_DIVISOR = 30
const DEFAULT_FIRST_TIER_YEARS = 5
const DEFAULT_FIRST_TIER_DAYS_PER_YEAR = 21
const DEFAULT_LATER_TIER_DAYS_PER_YEAR = 30
const DAYS_PER_YEAR = 365.25

export interface ComputeEosbInput {
  hireDate: Date
  terminationDate: Date
  basicSalary: number
  capMonths: number
  dailyRateDivisor?: number
  firstTierYears?: number
  firstTierDaysPerYear?: number
  laterTierDaysPerYear?: number
}

export interface ComputeEosbResult {
  yearsOfService: number
  eosbAmount: number
}

export function computeEosb({
  hireDate,
  terminationDate,
  basicSalary,
  capMonths,
  dailyRateDivisor = DEFAULT_DAILY_RATE_DIVISOR,
  firstTierYears = DEFAULT_FIRST_TIER_YEARS,
  firstTierDaysPerYear = DEFAULT_FIRST_TIER_DAYS_PER_YEAR,
  laterTierDaysPerYear = DEFAULT_LATER_TIER_DAYS_PER_YEAR,
}: ComputeEosbInput): ComputeEosbResult {
  const yearsOfService = (terminationDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * DAYS_PER_YEAR)
  const roundedYears = Math.round(yearsOfService * 100) / 100

  if (yearsOfService <= 0 || basicSalary <= 0 || capMonths <= 0) {
    return { yearsOfService: roundedYears, eosbAmount: 0 }
  }

  const divisor = dailyRateDivisor > 0 ? dailyRateDivisor : DEFAULT_DAILY_RATE_DIVISOR
  const dailyRate = basicSalary / divisor
  let eosbAmount: number
  if (yearsOfService <= firstTierYears) {
    eosbAmount = dailyRate * firstTierDaysPerYear * yearsOfService
  } else {
    const firstTier = dailyRate * firstTierDaysPerYear * firstTierYears
    const laterTier = dailyRate * laterTierDaysPerYear * (yearsOfService - firstTierYears)
    eosbAmount = firstTier + laterTier
  }

  const cap = basicSalary * capMonths * yearsOfService
  if (eosbAmount > cap) eosbAmount = cap

  return { yearsOfService: roundedYears, eosbAmount: Math.round(eosbAmount * 100) / 100 }
}
