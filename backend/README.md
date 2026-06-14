# Learnshift Backend

Laravel 11 REST API backend for the Learnshift adaptive learning platform.

## Requirements

- PHP 8.2+
- Composer
- SQLite (included — no server needed for dev)

## Setup

```bash
# From the backend/ folder:
composer install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --port=8000
```

The API will be available at `http://localhost:8000/api`.

## Test Accounts

| Role    | Email                        | Password |
|---------|------------------------------|----------|
| Admin   | admin@learnshift.com         | password |
| Teacher | teacher@learnshift.com       | password |
| Parent  | parent@learnshift.com        | password |
| Student | emma@learnshift.com          | password |
| Student | liam@learnshift.com          | password |

## API Overview

### Auth
| Method | Endpoint           | Description              |
|--------|--------------------|--------------------------|
| POST   | /api/auth/login    | Login, returns token     |
| POST   | /api/auth/logout   | Revoke current token     |
| GET    | /api/auth/me       | Get authenticated user   |

### Student
| Method | Endpoint                              | Description                |
|--------|---------------------------------------|----------------------------|
| GET    | /api/student/dashboard                | Dashboard data             |
| GET    | /api/student/practice/{topic}/questions | Practice questions       |
| POST   | /api/student/practice/submit          | Submit practice attempt    |
| POST   | /api/student/diagnostic/start         | Start diagnostic quiz      |
| POST   | /api/student/diagnostic/submit        | Submit diagnostic results  |
| POST   | /api/student/chatbot/ask              | Ask AI chatbot             |
| POST   | /api/student/ask-teacher              | Anonymous question to teacher |

### Teacher
| Method | Endpoint                          | Description               |
|--------|-----------------------------------|---------------------------|
| GET    | /api/teacher/dashboard            | Dashboard stats           |
| GET    | /api/teacher/students             | List students             |
| GET    | /api/teacher/students/{id}        | Student profile detail    |
| POST   | /api/teacher/content              | Upload learning material  |
| GET    | /api/teacher/ai-logs              | View chatbot logs         |
| PATCH  | /api/teacher/ai-logs/{id}/status  | Flag/review/verify a log  |

### Admin
| Method | Endpoint                    | Description           |
|--------|-----------------------------|-----------------------|
| GET    | /api/admin/users            | List users            |
| POST   | /api/admin/users            | Create user           |
| POST   | /api/admin/users/bulk       | Bulk create accounts  |
| GET    | /api/admin/classes          | List classes          |
| POST   | /api/admin/classes          | Create class          |

### Parent
| Method | Endpoint                                | Description              |
|--------|-----------------------------------------|--------------------------|
| GET    | /api/parent/dashboard                   | Children overview        |
| POST   | /api/parent/link-child                  | Link child by code       |
| GET    | /api/parent/children/{id}/progress      | Child progress detail    |
| GET    | /api/parent/children/{id}/guided-sessions | Guided video sessions  |

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is returned from `POST /api/auth/login`.

## Database Schema

- `users` — all users with role enum (student/teacher/parent/admin)
- `subjects` — Math, Science, English, Filipino, AP, MAPEH
- `classes` — class sections linked to teacher + subject
- `class_student` — enrollment pivot
- `parent_child` — parent-child link pivot
- `quarters` — curriculum quarters (Q1–Q4)
- `topics` — skill tree nodes within quarters
- `lessons` — lessons within topics
- `student_profiles` — XP, streak, grade level
- `student_topic_progress` — per-topic mastery + status
- `student_subject_mastery` — overall subject mastery scores
- `questions` — practice/diagnostic questions
- `practice_attempts` — student attempt history
- `diagnostic_results` — diagnostic scores + study plans
- `learning_materials` — teacher-uploaded files
- `guided_sessions` — teacher video sessions
- `guided_session_views` — parent watch progress
- `chatbot_logs` — AI Q&A history with flag/review workflow
- `anonymous_questions` — student-to-teacher anonymous questions
- `activity_logs` — system audit trail
- `personal_access_tokens` — Sanctum API tokens
