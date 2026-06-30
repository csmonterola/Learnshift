# Learnshift Project Requirements

## 1. Project Overview
Learnshift is an AI-powered personalized learning platform for students, teachers, parents, and administrators. The system combines a React frontend with a Laravel backend to support learning workflows, role-based dashboards, AI-assisted practice, and content management.

## 2. Functional Requirements

### 2.1 Authentication and Authorization
- Users must be able to sign in and sign out securely.
- The system must support role-based access for:
  - Student
  - Teacher
  - Parent
  - Admin
- Protected routes must require authenticated access and enforce role-based permissions.
- The system must support API token authentication using Sanctum.

### 2.2 Student Features
- Students must be able to view a personalized dashboard.
- Students must be able to access assigned classes and learning topics.
- Students must be able to view lessons and related learning materials.
- Students must be able to generate practice questions and submit answers.
- Students must be able to start and submit diagnostic assessments.
- Students must be able to ask an AI chatbot learning questions.
- Students must be able to ask anonymous questions to teachers.
- Students must be able to view learning progress and mastery history.

### 2.3 Teacher Features
- Teachers must be able to view a dashboard with teaching-related insights.
- Teachers must be able to manage classes and enroll students.
- Teachers must be able to create and manage topics and lessons.
- Teachers must be able to upload learning materials and links.
- Teachers must be able to review AI-generated logs and monitor student interactions.
- Teachers must be able to view student progress and class activity.

### 2.4 Parent Features
- Parents must be able to link to their child accounts.
- Parents must be able to view child progress and learning activity.
- Parents must be able to view guided sessions and related learning materials.
- Parents must be able to communicate with the platform through the parent portal.

### 2.5 Admin Features
- Admins must be able to manage users and roles.
- Admins must be able to create and manage classes.
- Admins must be able to review system activity logs.
- Admins must be able to oversee platform-wide usage and content.

### 2.6 Content and Curriculum
- The platform must support curriculum structure by subject, quarter, topic, and lesson.
- The system must allow lesson material upload and retrieval.
- The system must support skill-tree and mastery-based progression.

### 2.7 Messaging and Communication
- Users must be able to view conversations and send messages.
- The system must support unread message tracking.

### 2.8 Settings and Profile Management
- Users must be able to update personal information.
- Users must be able to change passwords.
- Users must be able to manage notification and display preferences.
- Users must be able to delete their account, if supported by policy.

## 3. Non-Functional Requirements

### 3.1 Technology Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS.
- Backend: Laravel 11 with RESTful API routes.
- Authentication: Laravel Sanctum.
- Database: PostgreSQL/Supabase-compatible database.
- File storage: S3-compatible object storage.

### 3.2 Environment Requirements
- Node.js 18+ and npm are required for frontend development.
- PHP 8.2+ and Composer are required for backend development.
- The local frontend should run on port 5173.
- The local backend API should run on port 8000.

### 3.3 Security Requirements
- All passwords must be securely hashed.
- Authentication must use secure session/token handling.
- CSRF protection must be enforced for state-changing requests in the web/API flow.
- Role-based access control must be enforced on protected endpoints.
- Input validation must be implemented for all user-submitted data.

### 3.4 Performance Requirements
- Core pages and dashboard data should load promptly under normal usage.
- AI-heavy operations should be processed asynchronously where possible.
- Large file uploads and content processing should not block the main user experience.

### 3.5 Reliability and Maintainability
- The codebase should be structured to support future feature expansion.
- The system should support automated tests for key authentication and API flows.
- Configuration should be environment-based and easy to deploy.

## 4. Assumptions
- The project is currently being developed as a web application.
- Local development uses a frontend dev server and a Laravel backend server.
- Some AI-powered workflows depend on external services and background processing.

## 5. Suggested Development Checklist
- Install and configure frontend dependencies.
- Install and configure backend dependencies.
- Set up the database and run migrations/seeding.
- Verify authentication and role-based access.
- Test student, teacher, parent, and admin workflows.
- Validate AI-driven features and file uploads.
