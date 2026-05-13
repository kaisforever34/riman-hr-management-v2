import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      dashboard: 'Dashboard', employees: 'Employees', myLeaves: 'My Leaves',
      leaveRequests: 'Leave Requests', attendance: 'Attendance',
      managerAttendance: 'Attendance Overview', payroll: 'Payroll',
      performance: 'Performance', documents: 'Documents', signOut: 'Sign Out',
    }
    return map[key] || key
  },
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/dashboard',
  useParams: () => ({ locale: 'en' }),
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))

import Sidebar from '../sidebar'

describe('Sidebar', () => {
  it('renders manager nav items', () => {
    render(<Sidebar role="MANAGER" />)
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Employees')).toBeDefined()
    expect(screen.getByText('Leave Requests')).toBeDefined()
    expect(screen.getByText('Attendance Overview')).toBeDefined()
    expect(screen.getByText('Payroll')).toBeDefined()
    expect(screen.getByText('Performance')).toBeDefined()
    expect(screen.getByText('Documents')).toBeDefined()
  })

  it('hides manager-only items from employees', () => {
    render(<Sidebar role="EMPLOYEE" />)
    expect(screen.getByText('My Leaves')).toBeDefined()
    expect(screen.getByText('Attendance')).toBeDefined()
    expect(screen.queryByText('Employees')).toBeNull()
    expect(screen.queryByText('Leave Requests')).toBeNull()
    expect(screen.queryByText('Payroll')).toBeNull()
    expect(screen.queryByText('Performance')).toBeNull()
  })

  it('renders sign out button', () => {
    render(<Sidebar role="MANAGER" />)
    expect(screen.getByText('Sign Out')).toBeDefined()
  })
})
