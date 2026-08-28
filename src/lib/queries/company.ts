import { getSettingValue, getListSetting, getIntListSetting } from '@/lib/queries/app-settings'

export interface CompanySettings {
  name: string
  nameAr: string
  tagline: string
  logoLetter: string
  currency: string
  location: string
  emailFromName: string
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const [name, nameAr, tagline, logoLetter, currency, location, emailFromName] = await Promise.all([
    getSettingValue('COMPANY_NAME'),
    getSettingValue('COMPANY_NAME_AR'),
    getSettingValue('COMPANY_TAGLINE'),
    getSettingValue('LOGO_LETTER'),
    getSettingValue('CURRENCY'),
    getSettingValue('COMPANY_LOCATION'),
    getSettingValue('EMAIL_FROM_NAME'),
  ])
  return {
    name,
    nameAr,
    tagline,
    logoLetter: (logoLetter.trim().charAt(0) || 'R').toUpperCase(),
    currency: currency.trim() || 'AED',
    location,
    emailFromName,
  }
}

export interface EmployeeFormLists {
  departments: string[]
  nationalities: string[]
  defaultWorkWeek: number[]
}

export async function getEmployeeFormLists(): Promise<EmployeeFormLists> {
  const [departments, nationalities, defaultWorkWeek] = await Promise.all([
    getListSetting('DEPARTMENTS'),
    getListSetting('NATIONALITIES'),
    getIntListSetting('COMPANY_WORK_WEEK'),
  ])
  return { departments, nationalities, defaultWorkWeek }
}
