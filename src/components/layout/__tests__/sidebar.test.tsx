import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      dashboard: 'Dashboard', employees: 'Employees',
      leaveRequests: 'Leave Requests', attendance: 'Attendance',
      managerAttendance: 'Attendance Overview', payroll: 'Payroll',
      performance: 'Performance', documents: 'Documents', signOut: 'Sign Out',
      collapse: 'Collapse', directory: 'Directory', notifications: 'Notifications',
      onboarding: 'Onboarding', analytics: 'Analytics',
      surveys: 'Surveys', assets: 'Assets', expenses: 'Expenses',
      openMenu: 'Open navigation menu', closeMenu: 'Close navigation menu',
      expandSidebar: 'Expand sidebar', collapseSidebar: 'Collapse sidebar',
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
    expect(screen.getByText('Directory')).toBeDefined()
    expect(screen.getByText('Notifications')).toBeDefined()
    expect(screen.getByText('Onboarding')).toBeDefined()
  })

  it('renders HR admin nav items', () => {
    render(<Sidebar role="HR_ADMIN" />)
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Employees')).toBeDefined()
    expect(screen.getByText('Payroll')).toBeDefined()
    expect(screen.getByText('Performance')).toBeDefined()
    expect(screen.getByText('Documents')).toBeDefined()
    expect(screen.getByText('Directory')).toBeDefined()
  })

  it('shows sign out button', () => {
    render(<Sidebar role="MANAGER" />)
    expect(screen.getByText('Sign Out')).toBeDefined()
  })
})
