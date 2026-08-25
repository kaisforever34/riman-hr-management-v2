'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { uploadEmployeeDoc, uploadCompanyDoc, deleteDocument } from '@/lib/actions/document'
import { cn } from '@/lib/utils'
import { Upload, Trash2, Download } from 'lucide-react'

interface EmployeeDocData {
  id: string
  employeeId: string
  employeeName: string
  category: string
  fileName: string
  fileSize: number
  fileType: string
  notes: string | null
  createdAt: string
}

interface CompanyDocData {
  id: string
  category: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  notes: string | null
  createdAt: string
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  employeeDocs: EmployeeDocData[]
  companyDocs: CompanyDocData[]
  employees: EmployeeData[]
}

const EMP_CATEGORIES = ['CONTRACT', 'PASSPORT', 'VISA', 'ID_CARD', 'CERTIFICATE', 'EDUCATION', 'MEDICAL', 'OTHER']
const COMP_CATEGORIES = ['POLICY', 'FORM', 'TEMPLATE', 'REPORT', 'OTHER']

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsClient({ employeeDocs, companyDocs, employees }: Props) {
  const t = useTranslations('documents')
  const [tab, setTab] = useState<'employee' | 'company'>('employee')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [message, setMessage] = useState('')

  const filteredDocs = tab === 'employee'
    ? employeeDocs.filter(d => !selectedEmployee || d.employeeId === selectedEmployee)
    : companyDocs

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage('')
    const form = new FormData(e.currentTarget)
    const result = tab === 'employee'
      ? await uploadEmployeeDoc(form)
      : await uploadCompanyDoc(form)
    if (result?.error) {
      setMessage(result.error)
    } else {
      setMessage(t('success.uploaded'))
      setShowUpload(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const form = new FormData()
    form.set('id', id)
    form.set('type', tab === 'employee' ? 'employee' : 'company')
    const result = await deleteDocument(form)
    if (result?.error) setMessage(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="me-2 h-4 w-4" />
          {t('upload')}
        </Button>
      </div>

      {message && (
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') || message.includes('error') ? 'bg-destructive/10 text-destructive' : 'bg-statement-green/10 text-statement-green')}>
          {message}
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-[rgba(255,255,255,0.05)] p-1">
        <button
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === 'employee' ? 'bg-[#0D1028] shadow' : 'hover:text-[#E0E6F4]')}
          onClick={() => setTab('employee')}
        >
          {t('employeeDocuments')}
        </button>
        <button
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === 'company' ? 'bg-[#0D1028] shadow' : 'hover:text-[#E0E6F4]')}
          onClick={() => setTab('company')}
        >
          {t('companyDocuments')}
        </button>
      </div>

      {tab === 'employee' && (
        <select
          className="w-full max-w-xs rounded border bg-[#0D1028] px-3 py-2 text-sm"
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)}
        >
          <option value="">{t('allEmployees')}</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
          ))}
        </select>
      )}

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>{tab === 'employee' ? t('uploadEmployee') : t('uploadCompany')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-3">
              {tab === 'employee' && (
                <div>
                  <label className="text-xs font-medium text-[#8B93A8]">{t('selectEmployee')}</label>
                  <select name="employeeId" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" required>
                    <option value="">{t('selectEmployee')}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              {tab === 'company' && (
                <div>
                  <label className="text-xs font-medium text-[#8B93A8]">{t('title_label')}</label>
                  <input name="title" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" required />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('category')}</label>
                <select name="category" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" required>
                  <option value="">{t('category')}</option>
                  {(tab === 'employee' ? EMP_CATEGORIES : COMP_CATEGORIES).map(c => (
                    <option key={c} value={c}>{t(`categories.${c}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('fileName')}</label>
                <input name="file" type="file" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-[#8B93A8]">{t('notes')}</label>
                <input name="notes" className="w-full rounded border bg-[#0D1028] px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button type="submit"><Upload className="me-2 h-4 w-4" />{t('upload')}</Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>{t('cancel')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  {tab === 'employee' && <th className="px-4 py-3 text-start font-medium">{t('selectEmployee')}</th>}
                  {tab === 'company' && <th className="px-4 py-3 text-start font-medium">{t('title_label')}</th>}
                  <th className="px-4 py-3 text-start font-medium">{t('category')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('fileName')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('fileSize')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('uploadedAt')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#8B93A8]">{t('noDocuments')}</td>
                  </tr>
                ) : filteredDocs.map(doc => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.05)]">
                    {tab === 'employee' && <td className="px-4 py-3">{(doc as EmployeeDocData).employeeName}</td>}
                    {tab === 'company' && <td className="px-4 py-3">{(doc as CompanyDocData).title}</td>}
                    <td className="px-4 py-3">{t(`categories.${doc.category}`)}</td>
                    <td className="px-4 py-3">{doc.fileName}</td>
                    <td className="px-4 py-3">{formatSize(doc.fileSize)}</td>
                    <td className="px-4 py-3">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <a href={`/api/documents/${doc.id}?type=${tab === 'employee' ? 'employee' : 'company'}`} target="_blank" download>
                          <Button variant="ghost" size="sm"><Download className="h-3 w-3" /></Button>
                        </a>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
