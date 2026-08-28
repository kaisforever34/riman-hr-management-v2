import { describe, it, expect } from 'vitest'
import { employeeFormSchema } from '@/lib/validations/employee'
import { manualCheckInSchema, managerOverrideSchema } from '@/lib/validations/attendance'
import { submitLeaveSchema, approveLeaveSchema, rejectLeaveSchema, setAllocationSchema } from '@/lib/validations/leave'
import { createPayrollPeriodSchema, updateLateDeductionSchema } from '@/lib/validations/payroll'
import { uploadEmployeeDocumentSchema, uploadCompanyDocumentSchema, deleteDocumentSchema } from '@/lib/validations/document'
import { createReviewSchema, deleteReviewSchema, ratingSchema, goalSchema } from '@/lib/validations/performance'

describe('employeeFormSchema', () => {
  it('accepts valid employee data', () => {
    const result = employeeFormSchema.safeParse({
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed@test.com',
      password: 'password123',
      dateOfBirth: '1990-01-01',
      nationality: 'AE',
      employeeCode: 'EMP-001',
      jobTitle: 'Manager',
      department: 'Operations',
      hireDate: '2024-01-01',
      salary: '5000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = employeeFormSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('firstName')
      expect(result.error.flatten().fieldErrors).toHaveProperty('email')
    }
  })

  it('rejects invalid email', () => {
    const result = employeeFormSchema.safeParse({
      firstName: 'A', lastName: 'B', email: 'not-an-email',
      password: 'password123', dateOfBirth: '1990-01-01',
      nationality: 'AE', employeeCode: 'E1', jobTitle: 'T',
      department: 'Ops', hireDate: '2024-01-01', salary: '5000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password (configurable min length enforced in actions)', () => {
    const result = employeeFormSchema.safeParse({
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      password: '', dateOfBirth: '1990-01-01',
      nationality: 'AE', employeeCode: 'E1', jobTitle: 'T',
      department: 'Ops', hireDate: '2024-01-01', salary: '5000',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = employeeFormSchema.safeParse({
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      password: 'password123', dateOfBirth: '1990-01-01',
      nationality: 'AE', employeeCode: 'E1', jobTitle: 'T',
      department: 'Ops', hireDate: '2024-01-01', salary: '5000',
      phoneNumber: '+971501234567', maritalStatus: 'Married',
      bankName: 'ADCB', iban: 'AE123456', swift: 'ADCBaeae',
      emergencyContactName: 'Father', emergencyContactPhone: '+971501234568',
    })
    expect(result.success).toBe(true)
  })

  it('defaults role to EMPLOYEE', () => {
    const result = employeeFormSchema.parse({
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      password: 'password123', dateOfBirth: '1990-01-01',
      nationality: 'AE', employeeCode: 'E1', jobTitle: 'T',
      department: 'Ops', hireDate: '2024-01-01', salary: '5000',
    })
    expect(result.role).toBe('EMPLOYEE')
  })
})

describe('attendance schemas', () => {
  describe('manualCheckInSchema', () => {
    it('accepts valid input', () => {
      const result = manualCheckInSchema.safeParse({ checkIn: '09:00', note: 'Missed check-in' })
      expect(result.success).toBe(true)
    })

    it('rejects missing check-in', () => {
      const result = manualCheckInSchema.safeParse({ note: 'Reason' })
      expect(result.success).toBe(false)
    })

    it('rejects missing note', () => {
      const result = manualCheckInSchema.safeParse({ checkIn: '09:00' })
      expect(result.success).toBe(false)
    })
  })

  describe('managerOverrideSchema', () => {
    it('accepts minimal input', () => {
      const result = managerOverrideSchema.safeParse({ employeeId: 'e1', date: '2024-01-01' })
      expect(result.success).toBe(true)
    })

    it('accepts full input', () => {
      const result = managerOverrideSchema.safeParse({
        employeeId: 'e1', date: '2024-01-01',
        checkIn: '09:00', checkOut: '18:00',
        status: 'PRESENT', note: 'Override',
      })
      expect(result.success).toBe(true)
    })
  })
})

describe('leave schemas', () => {
  describe('submitLeaveSchema', () => {
    it('accepts valid full-day leave', () => {
      const result = submitLeaveSchema.safeParse({
        leaveTypeId: 'lt1', startDate: '2024-06-01', endDate: '2024-06-05',
        reason: 'Vacation',
      })
      expect(result.success).toBe(true)
    })

    it('accepts half-day leave', () => {
      const result = submitLeaveSchema.safeParse({
        leaveTypeId: 'lt1', startDate: '2024-06-01', endDate: '2024-06-01',
        isHalfDay: 'true', halfDayPeriod: 'MORNING', reason: 'Personal',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing reason', () => {
      const result = submitLeaveSchema.safeParse({
        leaveTypeId: 'lt1', startDate: '2024-06-01', endDate: '2024-06-05',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('approveLeaveSchema', () => {
    it('accepts valid id', () => {
      const result = approveLeaveSchema.safeParse({ id: 'abc123' })
      expect(result.success).toBe(true)
    })
  })

  describe('rejectLeaveSchema', () => {
    it('accepts valid rejection', () => {
      const result = rejectLeaveSchema.safeParse({ id: 'abc123', rejectReason: 'Not enough balance' })
      expect(result.success).toBe(true)
    })

    it('rejects missing reason', () => {
      const result = rejectLeaveSchema.safeParse({ id: 'abc123' })
      expect(result.success).toBe(false)
    })
  })

  describe('setAllocationSchema', () => {
    it('accepts valid allocation', () => {
      const result = setAllocationSchema.safeParse({ employeeId: 'e1', leaveTypeId: 'lt1', allocated: 30 })
      expect(result.success).toBe(true)
    })

    it('rejects negative allocation', () => {
      const result = setAllocationSchema.safeParse({ employeeId: 'e1', leaveTypeId: 'lt1', allocated: -5 })
      expect(result.success).toBe(false)
    })
  })
})

describe('payroll schemas', () => {
  describe('createPayrollPeriodSchema', () => {
    it('accepts valid month/year', () => {
      const result = createPayrollPeriodSchema.safeParse({ month: 3, year: 2024 })
      expect(result.success).toBe(true)
    })

    it('rejects invalid month', () => {
      expect(createPayrollPeriodSchema.safeParse({ month: 13, year: 2024 }).success).toBe(false)
      expect(createPayrollPeriodSchema.safeParse({ month: 0, year: 2024 }).success).toBe(false)
    })
  })

  describe('updateLateDeductionSchema', () => {
    it('accepts valid deduction', () => {
      const result = updateLateDeductionSchema.safeParse({ payslipId: 'p1', lateDeduction: 100 })
      expect(result.success).toBe(true)
    })

    it('rejects negative deduction', () => {
      const result = updateLateDeductionSchema.safeParse({ payslipId: 'p1', lateDeduction: -50 })
      expect(result.success).toBe(false)
    })
  })
})

describe('document schemas', () => {
  describe('uploadEmployeeDocumentSchema', () => {
    it('accepts valid input', () => {
      const result = uploadEmployeeDocumentSchema.safeParse({ employeeId: 'e1', category: 'CONTRACT' })
      expect(result.success).toBe(true)
    })

    it('accepts with notes', () => {
      const result = uploadEmployeeDocumentSchema.safeParse({ employeeId: 'e1', category: 'PASSPORT', notes: 'Copy' })
      expect(result.success).toBe(true)
    })

    it('rejects missing employeeId', () => {
      const result = uploadEmployeeDocumentSchema.safeParse({ category: 'CONTRACT' })
      expect(result.success).toBe(false)
    })
  })

  describe('uploadCompanyDocumentSchema', () => {
    it('accepts valid input', () => {
      const result = uploadCompanyDocumentSchema.safeParse({ category: 'POLICY', title: 'Code of Conduct' })
      expect(result.success).toBe(true)
    })

    it('rejects missing title', () => {
      const result = uploadCompanyDocumentSchema.safeParse({ category: 'POLICY' })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteDocumentSchema', () => {
    it('accepts employee type', () => {
      const result = deleteDocumentSchema.safeParse({ id: 'd1', type: 'employee' })
      expect(result.success).toBe(true)
    })

    it('accepts company type', () => {
      const result = deleteDocumentSchema.safeParse({ id: 'd1', type: 'company' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid type', () => {
      const result = deleteDocumentSchema.safeParse({ id: 'd1', type: 'invalid' })
      expect(result.success).toBe(false)
    })
  })
})

describe('performance schemas', () => {
  describe('ratingSchema', () => {
    it('accepts valid rating', () => {
      expect(ratingSchema.safeParse({ rating: 'EXCEEDS' }).success).toBe(true)
      expect(ratingSchema.safeParse({ rating: 'MEETS' }).success).toBe(true)
      expect(ratingSchema.safeParse({ rating: 'FAR_EXCEEDS' }).success).toBe(true)
      expect(ratingSchema.safeParse({ rating: 'BELOW_EXPECTATIONS' }).success).toBe(true)
      expect(ratingSchema.safeParse({ rating: 'NEEDS_IMPROVEMENT' }).success).toBe(true)
    })

    it('rejects invalid rating', () => {
      const result = ratingSchema.safeParse({ rating: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('accepts with criteriaId and comment', () => {
      const result = ratingSchema.safeParse({ criteriaId: 'c1', rating: 'MEETS', comment: 'Good work' })
      expect(result.success).toBe(true)
    })
  })

  describe('goalSchema', () => {
    it('accepts valid goal', () => {
      const result = goalSchema.safeParse({ description: 'Finish training' })
      expect(result.success).toBe(true)
    })

    it('accepts with target date', () => {
      const result = goalSchema.safeParse({ description: 'Finish training', targetDate: '2024-12-31' })
      expect(result.success).toBe(true)
    })

    it('rejects empty description', () => {
      const result = goalSchema.safeParse({ description: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('createReviewSchema', () => {
    it('accepts valid review', () => {
      const result = createReviewSchema.safeParse({
        employeeId: 'e1', year: 2024, quarter: 1,
        ratings: [{ criteriaId: 'c1', rating: 'MEETS' }],
        goals: [{ description: 'Improve sales' }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing ratings', () => {
      const result = createReviewSchema.safeParse({
        employeeId: 'e1', year: 2024, quarter: 1,
        ratings: [], goals: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid quarter', () => {
      const result = createReviewSchema.safeParse({
        employeeId: 'e1', year: 2024, quarter: 5,
        ratings: [{ criteriaId: 'c1', rating: 'MEETS' }],
        goals: [],
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional bonus recommendation', () => {
      const result = createReviewSchema.safeParse({
        employeeId: 'e1', year: 2024, quarter: 2,
        comments: 'Great quarter', bonusRecommendation: 500,
        ratings: [{ criteriaId: 'c1', rating: 'EXCEEDS', comment: 'Excellent' }],
        goals: [],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('deleteReviewSchema', () => {
    it('accepts valid id', () => {
      const result = deleteReviewSchema.safeParse({ id: 'r1' })
      expect(result.success).toBe(true)
    })
  })
})
