# Phase 5 — Document Management Design

**Date:** 2026-05-14
**Project:** Riman HR Management — Riman Fashion
**Phase:** 5 of 6 (Document Management)

---

**Riman Fashion**  
Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792

---

## Overview

Document storage for employee files (contracts, passports, visas, certificates) and company-wide documents (policies, forms, templates). Upload via browser, stored on local filesystem. Manager manages all documents.

## Roles & Permissions

| Feature | MANAGER | EMPLOYEE | HR_ADMIN |
|---------|---------|----------|----------|
| View employee documents | ✅ | ❌ | ❌ |
| Upload employee documents | ✅ | ❌ | ❌ |
| Delete employee documents | ✅ | ❌ | ❌ |
| View company documents | ✅ | ❌ | ❌ |
| Upload company documents | ✅ | ❌ | ❌ |
| Delete company documents | ✅ | ❌ | ❌ |
| Download documents | ✅ | ❌ | ❌ |

Employee self-service document access is deferred.

## Database Schema

### EmployeeDocument
- `id` String @id @default(cuid())
- `employeeId` String (FK → Employee)
- `category` String — CONTRACT | PASSPORT | VISA | ID_CARD | CERTIFICATE | EDUCATION | MEDICAL | OTHER
- `fileName` String (original filename)
- `filePath` String (server path)
- `fileSize` Int (bytes)
- `fileType` String (MIME type)
- `notes` String?
- `uploadedById` String (FK → User)
- Timestamps
- Cascade delete with Employee

### CompanyDocument
- `id` String @id @default(cuid())
- `category` String — POLICY | FORM | TEMPLATE | REPORT | OTHER
- `title` String
- `fileName` String (original filename)
- `filePath` String (server path)
- `fileSize` Int (bytes)
- `fileType` String (MIME type)
- `notes` String?
- `uploadedById` String (FK → User)
- Timestamps

## Storage

Files stored in:
- Employee docs: `public/uploads/documents/employees/`
- Company docs: `public/uploads/documents/company/`

Same pattern as existing `src/lib/upload.ts`. Max file size: 10MB. Allowed types: PDF, JPG, PNG, DOC, DOCX.

## Routes

### Manager routes
- `GET /[locale]/manager/documents` — Tabs: Employee Documents | Company Documents
- Employee Documents tab: select employee → see their documents → upload new
- Company Documents tab: see all company docs → upload new

## Upload Flow

1. Manager clicks "Upload" → file picker dialog
2. For employee docs: selects employee + category + file
3. For company docs: selects category + title + file
4. File validated (type, size) → saved to disk → DB record created
5. Table refreshes

## Validation

- File size ≤ 10MB
- Allowed types: PDF, JPG, PNG, DOC, DOCX
- Required: file, category, employee (for employee docs), title (for company docs)
- Only MANAGER role can access

## i18n Keys

New translation keys under `documents` namespace — following existing patterns.

## Out of Scope (Phase 5)

- Employee self-service upload/view
- Document expiration tracking
- Version history
- Cloud storage
- Digital signatures
- Watermarking
- Bulk upload
- Document templates/generation

---

**Riman Fashion** — Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE  
Phone: +971 508084592 | +971 553730792
