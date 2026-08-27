const DAILY_RATE_DIVISOR = 30
const FIRST_TIER_YEARS = 5
const FIRST_TIER_DAYS_PER_YEAR = 21
const LATER_TIER_DAYS_PER_YEAR = 30
const DAYS_PER_YEAR = 365.25

export interface ComputeEosbInput {
  hireDate: Date
  terminationDate: Date
  basicSalary: number
  capMonths: number
}

export interface ComputeEosbResult {
  yearsOfService: number
  eosbAmount: number
}

export function computeEosb({ hireDate, terminationDate, basicSalary, capMonths }: ComputeEosbInput): ComputeEosbResult {
  const yearsOfService = (terminationDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * DAYS_PER_YEAR)
  const roundedYears = Math.round(yearsOfService * 100) / 100

  if (yearsOfService <= 0 || basicSalary <= 0) {
    return { yearsOfService: roundedYears, eosbAmount: 0 }
  }

  const dailyRate = basicSalary / DAILY_RATE_DIVISOR
  let eosbAmount: number
  if (yearsOfService <= FIRST_TIER_YEARS) {
    eosbAmount = dailyRate * FIRST_TIER_DAYS_PER_YEAR * yearsOfService
  } else {
    const firstTier = dailyRate * FIRST_TIER_DAYS_PER_YEAR * FIRST_TIER_YEARS
    const laterTier = dailyRate * LATER_TIER_DAYS_PER_YEAR * (yearsOfService - FIRST_TIER_YEARS)
    eosbAmount = firstTier + laterTier
  }

  const cap = basicSalary * capMonths
  if (eosbAmount > cap) eosbAmount = cap

  return { yearsOfService: roundedYears, eosbAmount: Math.round(eosbAmount * 100) / 100 }
}
