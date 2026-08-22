export function isApprover(role: string | null | undefined): boolean {
  return role === 'MANAGER' || role === 'HR_ADMIN'
}
