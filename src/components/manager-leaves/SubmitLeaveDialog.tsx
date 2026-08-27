'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@base-ui/react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { submitLeaveForEmployee } from '@/lib/actions/leave'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: { id: string; firstName: string; lastName: string }[]
  leaveTypes: { id: string; name: string }[]
  onSuccess: () => void
}

export default function SubmitLeaveDialog({ open, onOpenChange, employees, leaveTypes, onSuccess }: Props) {
  const [submitBusy, setSubmitBusy] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [halfDayPeriod, setHalfDayPeriod] = useState('')
  const [reason, setReason] = useState('')

  function reset() {
    setEmployeeId('')
    setLeaveTypeId('')
    setStartDate('')
    setEndDate('')
    setIsHalfDay(false)
    setHalfDayPeriod('')
    setReason('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
      toast.error('Please fill in required fields')
      return
    }
    setSubmitBusy(true)
    const fd = new FormData()
    fd.append('employeeId', employeeId)
    fd.append('leaveTypeId', leaveTypeId)
    fd.append('startDate', startDate)
    fd.append('endDate', endDate)
    fd.append('isHalfDay', String(isHalfDay))
    if (halfDayPeriod) fd.append('halfDayPeriod', halfDayPeriod)
    if (reason) fd.append('reason', reason)
    const res = await submitLeaveForEmployee(fd)
    setSubmitBusy(false)
    if ('error' in res) {
      toast.error(res.error)
      return
    }
    toast.success('Leave submitted successfully')
    reset()
    onSuccess()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => onOpenChange(isOpen)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold mb-4">Submit Leave for Employee</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Leave Type *</Label>
              <Select value={leaveTypeId} onValueChange={(v) => setLeaveTypeId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-statement-green"
              />
              <Label>Half Day</Label>
            </div>

            {isHalfDay && (
              <div className="space-y-2">
                <Label>Half Day Period</Label>
                <Select value={halfDayPeriod} onValueChange={(v) => setHalfDayPeriod(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason</Label>
              <textarea
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={submitBusy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitBusy} className="bg-statement-green text-white hover:bg-statement-green/90">
                {submitBusy ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
