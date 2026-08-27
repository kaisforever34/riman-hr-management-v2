import { z } from 'zod'

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.string().optional(),
  nationality: z.string().min(1, 'Required'),
  maritalStatus: z.string().optional(),
  employeeCode: z.string().min(1, 'Required').max(20),
  jobTitle: z.string().min(1, 'Required').max(100),
  department: z.string().min(1, 'Required'),
  hireDate: z.string().min(1, 'Required'),
  salary: z.string().min(1, 'Required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
  basicSalary: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
  housingAllowance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
  transportAllowance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
  otherAllowances: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid format').optional().or(z.literal('')),
  role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  workWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Select at least one day').default([0, 1, 2, 3, 4]),
  contractType: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  probationEndDate: z.string().optional(),
  visaExpiryDate: z.string().optional(),
  iqamaNumber: z.string().optional(),
  iqamaExpiryDate: z.string().optional(),
})

export type EmployeeFormData = z.infer<typeof employeeFormSchema>

/** Subset of employeeFormSchema for updating existing employees.
 *  Email, password, employeeCode, hireDate, and role are intentionally excluded
 *  — they are managed through separate flows.
 *  managerId is added here since it's only used during updates, not creation. */
export const updateEmployeeSchema = employeeFormSchema.omit({
  email: true,
  password: true,
  employeeCode: true,
  hireDate: true,
  role: true,
}).extend({
  managerId: z.string().optional(),
})

export type UpdateEmployeeData = z.infer<typeof updateEmployeeSchema>

export const departments = ['HR', 'Finance', 'IT', 'Operations', 'Sales', 'Marketing', 'Legal', 'Executive'] as const

export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'] as const

export const genders = ['Male', 'Female'] as const

export const contractTypes = ['FIXED_TERM', 'INDEFINITE', 'PROBATION'] as const

export const countries = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
] as const
