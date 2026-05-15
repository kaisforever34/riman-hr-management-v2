# Surveys & Feedback — Design Spec + Implementation Plan

## Data Model

4 new Prisma models: Survey, SurveyQuestion, SurveyAssignment, SurveyResponse.

**Survey:** id, title, description?, isAnonymous (default false), isActive (default true), dueDate?, createdById → User, createdAt, updatedAt
**SurveyQuestion:** id, surveyId → Survey, type (RATING|MULTIPLE_CHOICE|TEXT), question (String), options (Json?), order (Int)
**SurveyAssignment:** id, surveyId → Survey, employeeId → Employee, status (PENDING|COMPLETED, default PENDING), completedAt?
**SurveyResponse:** id, questionId → SurveyQuestion, assignmentId?, value (Json)

## Routes

- `/manager/surveys` — list all surveys, create button
- `/manager/surveys/new` — create survey, add questions, assign employees
- `/manager/surveys/[id]` — view results, aggregate scores
- `/[locale]/surveys` — employee: list assigned surveys
- `/[locale]/surveys/[id]` — employee: fill survey

## Implementation Tasks

### Task 1: Add Prisma models + migration
### Task 2: Create server actions (createSurvey, getSurveys, getSurveyResults, getMySurveys, submitResponse)
### Task 3: Create manager survey list page
### Task 4: Create manager new survey page
### Task 5: Create manager survey results page
### Task 6: Create employee surveys page + fill survey page
### Task 7: Add sidebar nav + i18n
### Task 8: Build verification
