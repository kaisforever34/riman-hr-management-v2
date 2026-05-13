# RIMAN HR MANAGEMENT – UI Screens & User Flows

## 1. Introduction

This document defines:
- Every key UI screen (for HR/Admin, Manager, Employee).
- The main user flows between screens.
- The main actions per screen.

Use this as:
- A Figma screen list + flow map.
- A routing spec for Next.js / React.
- A UX spec for implementation.

---

## 2. Role entry points

- `Auth_SignIn` → choose `Auth_Company_Selector` (if multi-tenant) → redirect to:
  - HR/Admin → `Dashboard_Home`
  - Manager → `Manager_Dashboard_Home`
  - Employee → `Employee_Dashboard_Home`

---

## 3. HR / Admin flows

### 3.1 HR dashboard → approvals

Screen: `Dashboard_Home`  
Flow:
- Click "Pending leave requests" card → `Leave_Requests_Home`
- Tap one request → `Leave_Requests_DetailView`
- Tap "Approve" or "Reject" → server updates → return to `Dashboard_Home` with updated KPIs.

Additional:
- `Dashboard_Team_Calendar` → `Leave_Requests_Calendar` → `Leave_Requests_DetailView`.

### 3.2 Add new employee

Screen: `Employees_List`  
Flow:
- Click "Add Employee" → `Employees_AddNew`
- Fill form:
  - Personal info.
  - Job details.
  - Bank details.
- Submit → `Employees_List` reloads + success toast.

Optional:
- Skip → `Employees_List`.

### 3.3 Attendance overview → detail

Screen: `Attendance_Home`  
Flow:
- Click "Calendar view" → `Attendance_Calendar`
- Click one day → `Attendance_DetailView`
- Change "Justified" or add notes → save → return with updated status.

Filter:
- `Attendance_Home` → `Attendance_Exceptions`.

### 3.4 Leave management flow

Screen: `Leave_Requests_Home`  
Flow:
- Filter by status → `Leave_Requests_List`
- Click one row → `Leave_Requests_DetailView`
- Approve/Reject → `Dashboard_Home`

Policy setup:
- `Leave_Policies_Config` → `Leave_Entitlement_Rules_UAE`.

### 3.5 Payroll generation

Screen: `Payroll_Home`  
Flow:
- Choose month → `Payroll_MonthSelector`
- Press "Generate Draft" → `Payroll_DraftView`
- Validate:
  - Attendance and leave data.
  - Totals.
- Press "Finalize Payroll" → `Payroll_Finalize_Confirmation` → `Payroll_History`
- Press "Export WPS" → `Payroll_WPS_Export` → show success or error.

Payslips:
- `Payroll_Payslip_List` → `Payroll_Payslip_Detailed` → PDF download.

### 3.6 Employee documents

Screen: `Documents_Home`  
Flow:
- Search employee → `Documents_Employee_File`
- Click "Upload" → `Documents_Upload_New`
- Upload file → `Documents_Employee_File` updated.

Expiry:
- `Documents_Expiry_Alerts` → highlight near‑expiry visas/passports.

---

## 4. Manager flows

### 4.1 Team dashboard → team leave

Screen: `Manager_Dashboard_Home`  
Flow:
- Click "Team attendance" → `Manager_Team_Attendance`
- Click "Team leave" → `Manager_Team_Leave` → `Manager_Team_Leave_Calendar`
- Approve/Reject → `Manager_Dashboard_Home`.

### 4.2 Performance cycle

Screen: `Manager_Performance_Team`  
Flow:
- Select employee → `Performance_Employee_Detail`
- Click "Evaluate" → `Performance_Employee_EvaluationForm`
- Submit → `Manager_Performance_Team`.

---

## 5. Employee self‑service flows

### 5.1 Employee dashboard → leave request

Screen: `Employee_Dashboard_Home`  
Flow:
- Click "Request Leave" → `Employee_Leave_Request_New`
- Choose:
  - `leave_type`
  - `start_date` and `end_date`
  - Half‑day toggle.
- System:
  - Shows `Employee_Leave_Request_New_BalancePreview`
  - Checks overlapping dates.
- Tap "Submit" → `Employee_Leave_Requests_List` → status = "Pending".

Status flow:
- `Employee_Leave_Requests_List` → `Employee_Leave_Requests_Calendar` → `Leave_Requests_DetailView` (HR side).

### 5.2 Sick leave / absence report

Screen: `Employee_Leave_Home`  
Flow:
- Click "Report Absence" → `Employee_Leave_Request_Sick_Absence`
- Choose:
  - Reason = Sick.
  - Dates.
- Upload medical certificate (optional).
- Submit → `Employee_Leave_Requests_List` → status = "Pending".

Return flow:
- `Employee_Leave_Requests_Calendar`.

### 5.3 Attendance clock‑in / clock‑out

Screen: `Employee_Attendance_Home`  
Flow:
- Tap "Clock In" → `Employee_Attendance_ClockIn`
- System records time → return to `Employee_Attendance_Home` with updated status.

End of day:
- `Employee_Attendance_Home` → `Employee_Attendance_ClockOut` → record `clock_out`.

View:
- `Employee_Attendance_Calendar` → `Employee_Attendance_List`.

### 5.4 View payslips

Screen: `Employee_Payroll_Home`  
Flow:
- List of `Employee_Payroll_List`
- Click one month → `Employee_Payroll_Detail`
- Click "Download PDF" → browser download.

Return:
- `Employee_Payroll_List`.

### 5.5 Update profile

Screen: `Employee_Profile_Home`  
Flow:
- Edit → `Employee_Profile_Edit_Personal`
- Save → return to `Employee_Profile_Home`.

Bank details:
- `Employee_Profile_Home` → `Employee_Profile_Edit_Bank` → submit.

Emergency contact:
- `Employee_Profile_Home` → `Employee_Profile_Edit_Emergency` → submit.

### 5.6 Upload documents

Screen: `Employee_Documents_Home`  
Flow:
- Click "Upload Document" → `Employee_Documents_Upload`
- Choose file and type → `Employee_Documents_MyFiles`.

Return:
- `Employee_Documents_Home`.

### 5.7 Notifications

Screen: `Employee_Notifications_List`  
Flow:
- Tap one notification → `Employee_Dashboard_Home` or relevant detail screen.

Dismiss:
- Swipe or "Mark as read" → `Employee_Notifications_List`.

---

## 6. Empty states navigation

Wherever relevant, add:

- `Empty_States_NoEmployees` → CTA "Add Employee".
- `Empty_States_NoLeaves` → CTA "Request Leave".
- `Empty_States_NoAttendance` → CTA "Start using Attendance".
- `Empty_States_NoPayroll` → CTA "Generate Payroll".
- `Empty_States_NoDocuments` → CTA "Upload Documents".

Each empty state → generic CTA → target screen above.

---

## 7. Error states navigation

- `Errors_Network` → offer "Retry" → back to previous screen.
- `Errors_Unauthorized` → back to `Auth_SignIn`.
- `Errors_InvalidLeaveBalance` → `Employee_Leave_Request_New` with help text.
- `Errors_OverlappingLeave` → `Employee_Leave_Request_New` with overlap warning.
- `Errors_PayrollFailure` → `Payroll_DraftView` or `Payroll_Home` with details.

Status screens:
- `Status_Leave_Pending` → `Employee_Leave_Requests_List`.
- `Status_Leave_Approved` → `Employee_Leave_Requests_List`.
- `Status_Leave_Rejected` → `Employee_Leave_Requests_List`.

---

## 8. RTL / Arabic screen variants

For each screen, keep:

- Same logic and flow.
- Same screen name + `_ar` suffix.

Example:
- `Employee_Dashboard_Home` ↔ `Employee_Dashboard_Home_ar`
- `Employee_Leave_Request_New` ↔ `Employee_Leave_Request_New_ar`

RTL behavior:
- Mirrored layout.
- Arabic text direction.
- Date picker and form fields aligned right‑to‑left.

---

## 9. Mobile‑specific flows

On mobile (bottom nav):

- `Employee_Dashboard_Home` → bottom tabs:
  - Dashboard.
  - Leave.
  - Attendance.
  - Payroll.
  - Profile.
  - Notifications.

- Quick action:
  - Floating button on `Employee_Dashboard_Home` → `Employee_Leave_Request_New`.

---

## 10. Production UX checklist per screen

For **every screen** above, ensure:
- Clear title/header.
- One primary CTA.
- One/two secondary CTAs.
- Loading state (skeleton loader).
- Empty state (no data).
- Error state (validation).
- Localization (English + Arabic).
- Accessibility (labeled inputs, keyboard‑friendly).

---

End of flow‑only MD file.