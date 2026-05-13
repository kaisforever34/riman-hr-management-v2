# Phase 5 — Document Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document storage for employee files (contracts, passports, visas, certificates) and company-wide documents (policies, forms, templates).

**Architecture:** EmployeeDocument + CompanyDocument models in Prisma; local filesystem storage mirroring the leave attachment pattern; server actions for upload/delete; manager UI with tabbed document management.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma v5, PostgreSQL, Tailwind v4, shadcn/ui base-nova, next-intl, Zod, lucide-react

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `prisma/schema.prisma` | Modify | Add `EmployeeDocument`, `CompanyDocument` models |
| `src/lib/document-upload.ts` | Create | File upload utility for documents |
| `src/lib/validations/document.ts` | Create | Zod schemas for document actions |
| `src/lib/actions/document.ts` | Create | Server actions (upload, delete) |
| `src/i18n/messages/en.json` | Modify | Add `documents` keys + `nav.documents` |
| `src/i18n/messages/ar.json` | Modify | Add `documents` keys + `nav.documents` |
| `src/app/[locale]/(hr)/manager/documents/page.tsx` | Create | Documents page server component |
| `src/app/[locale]/(hr)/manager/documents/documents-client.tsx` | Create | Documents client component with tabs |
| `src/components/layout/sidebar.tsx` | Modify | Enable documents sidebar link |

---

### Task 1: Add Document Models + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run migration

- [ ] **Step 1: Add EmployeeDocument and CompanyDocument models**

Add to `prisma/schema.prisma` after `model Payslip {` block and before `model AppSetting {`:

```prisma
model EmployeeDocument {
  id           String   @id @default(cuid())
  employeeId   String
  category     String
  fileName     String
  filePath     String
  fileSize     Int
  fileType     String
  notes        String?
  uploadedById String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  uploadedBy User     @relation(fields: [uploadedById], references: [id])
}

model CompanyDocument {
  id           String   @id @default(cuid())
  category     String
  title        String
  fileName     String
  filePath     String
  fileSize     Int
  fileType     String
  notes        String?
  uploadedById String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  uploadedBy User @relation(fields: [uploadedById], references: [id])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_document_models --create-only && npx prisma generate
```

Expected: Migration created and client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add EmployeeDocument and CompanyDocument models"
```

---

### Task 2: Upload Utility + Zod Validations

**Files:**
- Create: `src/lib/document-upload.ts`
- Create: `src/lib/validations/document.ts`

- [ ] **Step 1: Create document upload utility**

Create `src/lib/document-upload.ts`:

```typescript
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const BASE_DIR = join(process.cwd(), 'public', 'uploads', 'documents')
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

export async function uploadDocument(file: File, subDir: 'employees' | 'company'): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) return null
  if (file.size > MAX_SIZE) return null

  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const dir = join(BASE_DIR, subDir)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return `/uploads/documents/${subDir}/${filename}`
}
```

- [ ] **Step 2: Create Zod validation schemas**

Create `src/lib/validations/document.ts`:

```typescript
import { z } from 'zod'

export const uploadEmployeeDocumentSchema = z.object({
  employeeId: z.string().min(1),
  category: z.string().min(1),
  notes: z.string().optional(),
})

export const uploadCompanyDocumentSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
})

export const deleteDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['employee', 'company']),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/document-upload.ts src/lib/validations/document.ts
git commit -m "feat: add document upload utility and validation schemas"
```

---

### Task 3: Server Actions for Documents

**Files:**
- Create: `src/lib/actions/document.ts`

- [ ] **Step 1: Create document server actions**

Create `src/lib/actions/document.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { uploadEmployeeDocumentSchema, uploadCompanyDocumentSchema, deleteDocumentSchema } from '@/lib/validations/document'
import { uploadDocument } from '@/lib/document-upload'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function uploadEmployeeDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = uploadEmployeeDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'File is required' }

  const filePath = await uploadDocument(file, 'employees')
  if (!filePath) return { error: 'Invalid file (max 10MB, PDF/JPG/PNG/DOC/DOCX only)' }

  await db.employeeDocument.create({
    data: {
      employeeId: parsed.data.employeeId,
      category: parsed.data.category,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      notes: parsed.data.notes || null,
      uploadedById: session.user.id,
    },
  })

  revalidatePath('/manager/documents')
}

export async function uploadCompanyDoc(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = uploadCompanyDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { error: 'File is required' }

  const filePath = await uploadDocument(file, 'company')
  if (!filePath) return { error: 'Invalid file (max 10MB, PDF/JPG/PNG/DOC/DOCX only)' }

  await db.companyDocument.create({
    data: {
      category: parsed.data.category,
      title: parsed.data.title,
      fileName: file.name,
      filePath,
      fileSize: file.size,
      fileType: file.type,
      notes: parsed.data.notes || null,
      uploadedById: session.user.id,
    },
  })

  revalidatePath('/manager/documents')
}

export async function deleteDocument(formData: FormData) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return { error: 'Unauthorized' }

  const parsed = deleteDocumentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid request' }

  const { id, type } = parsed.data
  const doc = type === 'employee'
    ? await db.employeeDocument.findUnique({ where: { id } })
    : await db.companyDocument.findUnique({ where: { id } })

  if (!doc) return { error: 'Document not found' }

  try {
    const fullPath = join(process.cwd(), 'public', doc.filePath)
    await unlink(fullPath)
  } catch {
    // File may not exist on disk — still remove DB record
  }

  if (type === 'employee') {
    await db.employeeDocument.delete({ where: { id } })
  } else {
    await db.companyDocument.delete({ where: { id } })
  }

  revalidatePath('/manager/documents')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/document.ts
git commit -m "feat: add document server actions"
```

---

### Task 4: i18n Keys for Documents

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/ar.json`

- [ ] **Step 1: Add documents keys to en.json**

Add `documents` to the nav block:

```json
  "nav": {
    "dashboard": "Dashboard",
    "employees": "Employees",
    "leaveRequests": "Leave Requests",
    "myLeaves": "My Leaves",
    "attendance": "Attendance",
    "managerAttendance": "Attendance Overview",
    "payroll": "Payroll",
    "documents": "Documents",
    "signOut": "Sign Out"
  },
```

Add after the `managerPayroll` block:

```json
  "documents": {
    "title": "Documents",
    "employeeDocuments": "Employee Documents",
    "companyDocuments": "Company Documents",
    "selectEmployee": "Select Employee",
    "allEmployees": "All Employees",
    "upload": "Upload",
    "uploadEmployee": "Upload Employee Document",
    "uploadCompany": "Upload Company Document",
    "category": "Category",
    "fileName": "File Name",
    "fileSize": "Size",
    "uploadedAt": "Uploaded",
    "notes": "Notes",
    "title_label": "Title",
    "noDocuments": "No documents yet",
    "noDocumentsDesc": "Upload your first document to get started.",
    "categories": {
      "CONTRACT": "Contract",
      "PASSPORT": "Passport",
      "VISA": "Visa",
      "ID_CARD": "ID Card",
      "CERTIFICATE": "Certificate",
      "EDUCATION": "Education",
      "MEDICAL": "Medical",
      "OTHER": "Other",
      "POLICY": "Policy",
      "FORM": "Form",
      "TEMPLATE": "Template",
      "REPORT": "Report"
    },
    "deleteConfirm": "Are you sure you want to delete this document?",
    "delete": "Delete",
    "cancel": "Cancel",
    "success": {
      "uploaded": "Document uploaded successfully",
      "deleted": "Document deleted"
    },
    "errors": {
      "uploadFailed": "Failed to upload document",
      "deleteFailed": "Failed to delete document",
      "fileRequired": "File is required",
      "invalidFile": "Invalid file (max 10MB, PDF/JPG/PNG/DOC/DOCX only)"
    }
  },
```

- [ ] **Step 2: Add Arabic keys to ar.json**

Update the nav block:

```json
  "nav": {
    "dashboard": "لوحة التحكم",
    "employees": "الموظفين",
    "leaveRequests": "طلبات الإجازات",
    "myLeaves": "إجازاتي",
    "attendance": "الحضور",
    "managerAttendance": "نظرة عامة على الحضور",
    "payroll": "الرواتب",
    "documents": "المستندات",
    "signOut": "تسجيل الخروج"
  },
```

Add after the `managerPayroll` block:

```json
  "documents": {
    "title": "المستندات",
    "employeeDocuments": "مستندات الموظفين",
    "companyDocuments": "مستندات الشركة",
    "selectEmployee": "اختر الموظف",
    "allEmployees": "جميع الموظفين",
    "upload": "رفع",
    "uploadEmployee": "رفع مستند موظف",
    "uploadCompany": "رفع مستند شركة",
    "category": "التصنيف",
    "fileName": "اسم الملف",
    "fileSize": "الحجم",
    "uploadedAt": "تاريخ الرفع",
    "notes": "ملاحظات",
    "title_label": "العنوان",
    "noDocuments": "لا توجد مستندات بعد",
    "noDocumentsDesc": "قم برفع أول مستند للبدء.",
    "categories": {
      "CONTRACT": "عقد",
      "PASSPORT": "جواز سفر",
      "VISA": "فيزا",
      "ID_CARD": "بطاقة هوية",
      "CERTIFICATE": "شهادة",
      "EDUCATION": "مؤهل دراسي",
      "MEDICAL": "طبي",
      "OTHER": "أخرى",
      "POLICY": "سياسة",
      "FORM": "نموذج",
      "TEMPLATE": "قالب",
      "REPORT": "تقرير"
    },
    "deleteConfirm": "هل أنت متأكد من حذف هذا المستند؟",
    "delete": "حذف",
    "cancel": "إلغاء",
    "success": {
      "uploaded": "تم رفع المستند بنجاح",
      "deleted": "تم حذف المستند"
    },
    "errors": {
      "uploadFailed": "فشل رفع المستند",
      "deleteFailed": "فشل حذف المستند",
      "fileRequired": "الملف مطلوب",
      "invalidFile": "ملف غير صالح (الحد الأقصى 10 ميجابايت، PDF/JPG/PNG/DOC/DOCX فقط)"
    }
  },
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: add documents i18n keys for EN and AR"
```

---

### Task 5: Documents Page (Server + Client)

**Files:**
- Create: `src/app/[locale]/(hr)/manager/documents/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/documents/documents-client.tsx`

- [ ] **Step 1: Create server component**

Create `src/app/[locale]/(hr)/manager/documents/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DocumentsClient } from './documents-client'
import { getAllActiveEmployees } from '@/lib/queries/attendance'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MANAGER') return null

  const [employeeDocs, companyDocs, employees] = await Promise.all([
    db.employeeDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { firstName: true, lastName: true } } },
    }),
    db.companyDocument.findMany({ orderBy: { createdAt: 'desc' } }),
    getAllActiveEmployees(),
  ])

  return (
    <DocumentsClient
      employeeDocs={employeeDocs.map(d => ({
        id: d.id,
        employeeId: d.employeeId,
        employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
        category: d.category,
        fileName: d.fileName,
        filePath: d.filePath,
        fileSize: d.fileSize,
        fileType: d.fileType,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      }))}
      companyDocs={companyDocs.map(d => ({
        id: d.id,
        category: d.category,
        title: d.title,
        fileName: d.fileName,
        filePath: d.filePath,
        fileSize: d.fileSize,
        fileType: d.fileType,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      }))}
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
    />
  )
}
```

- [ ] **Step 2: Create client component**

Create `src/app/[locale]/(hr)/manager/documents/documents-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { uploadEmployeeDoc, uploadCompanyDoc, deleteDocument } from '@/lib/actions/document'
import { cn } from '@/lib/utils'
import { Upload, Trash2, FileText, Download } from 'lucide-react'

interface EmployeeDocData {
  id: string
  employeeId: string
  employeeName: string
  category: string
  fileName: string
  filePath: string
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
  filePath: string
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
  const [uploadData, setUploadData] = useState({
    employeeId: '',
    category: '',
    notes: '',
    title: '',
  })

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
        <div className={cn('rounded-md p-3 text-sm', message.includes('Failed') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
          {message}
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === 'employee' ? 'bg-white shadow' : 'hover:text-zinc-900')}
          onClick={() => setTab('employee')}
        >
          {t('employeeDocuments')}
        </button>
        <button
          className={cn('flex-1 rounded-md px-3 py-2 text-sm font-medium transition', tab === 'company' ? 'bg-white shadow' : 'hover:text-zinc-900')}
          onClick={() => setTab('company')}
        >
          {t('companyDocuments')}
        </button>
      </div>

      {tab === 'employee' && (
        <select
          className="w-full max-w-xs rounded border px-3 py-2 text-sm"
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
                  <label className="text-xs font-medium text-zinc-500">{t('selectEmployee')}</label>
                  <select name="employeeId" className="w-full rounded border px-3 py-2 text-sm" required>
                    <option value="">{t('selectEmployee')}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                    ))}
                  </select>
                </div>
              )}
              {tab === 'company' && (
                <div>
                  <label className="text-xs font-medium text-zinc-500">{t('title_label')}</label>
                  <input name="title" className="w-full rounded border px-3 py-2 text-sm" required />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-zinc-500">{t('category')}</label>
                <select name="category" className="w-full rounded border px-3 py-2 text-sm" required>
                  <option value="">{t('category')}</option>
                  {(tab === 'employee' ? EMP_CATEGORIES : COMP_CATEGORIES).map(c => (
                    <option key={c} value={c}>{t(`categories.${c}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">{t('fileName')}</label>
                <input name="file" type="file" className="w-full rounded border px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">{t('notes')}</label>
                <input name="notes" className="w-full rounded border px-3 py-2 text-sm" />
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
                <tr className="border-b bg-zinc-50">
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
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">{t('noDocuments')}</td>
                  </tr>
                ) : filteredDocs.map(doc => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-zinc-50">
                    {tab === 'employee' && <td className="px-4 py-3">{(doc as EmployeeDocData).employeeName}</td>}
                    {tab === 'company' && <td className="px-4 py-3">{(doc as CompanyDocData).title}</td>}
                    <td className="px-4 py-3">{t(`categories.${doc.category}`)}</td>
                    <td className="px-4 py-3">{doc.fileName}</td>
                    <td className="px-4 py-3">{formatSize(doc.fileSize)}</td>
                    <td className="px-4 py-3">{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <a href={doc.filePath} target="_blank" download>
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
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(hr)/manager/documents/"
git commit -m "feat: add documents management page with tabs"
```

---

### Task 6: Sidebar Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Enable documents sidebar link**

In `src/components/layout/sidebar.tsx`, change:

```typescript
    { href: '/documents', icon: FolderOpen, label: 'documents', show: false },
```

To:

```typescript
    { href: '/manager/documents', icon: FolderOpen, label: 'documents', show: role === 'MANAGER' },
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: enable documents sidebar link for manager"
```

---

## Self-Review

### Spec Coverage
- **EmployeeDocument model** → Task 1
- **CompanyDocument model** → Task 1
- **Upload utility (local filesystem)** → Task 2
- **Upload validation (size, type)** → Task 2
- **Upload server action** → Task 3
- **Delete server action** → Task 3
- **i18n** → Task 4
- **Documents page with tabs** → Task 5 (client + server)
- **Employee filter dropdown** → Task 5
- **Category display via i18n** → Task 4
- **Sidebar** → Task 6

### Placeholder Check
- All code blocks complete. No TBD or TODO.

### Type Consistency
- `EmployeeDocument` and `CompanyDocument` field names match between Prisma schema, upload utility, schemas, actions, and UI
- `employeeDocs`/`companyDocs` data shapes consistent between server and client

### Notes
- `getAllActiveEmployees` is reused from `src/lib/queries/attendance.ts` — already available
- Delete action handles file system cleanup gracefully (ignores if file already missing from disk)
