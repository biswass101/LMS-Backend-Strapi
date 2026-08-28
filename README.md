# LearnHub — Backend

Strapi v5 backend / CMS for the LearnHub Learning Management System. Built for the Junior Software Engineer project round.

**Live URL:** _[add Railway URL here]_  
**Frontend URL:** _[add Vercel URL here]_

---

## Tech Stack

- **CMS:** Strapi v5
- **Language:** TypeScript
- **Database:** PostgreSQL (local dev) / Neon (production)
- **Auth:** Strapi Users & Permissions plugin (JWT)
- **Hosting:** Railway

---

## Features Completed

### Core
- **Authentication** — Register/login via Strapi Users & Permissions. JWT issued on login, required for all protected endpoints.
- **Role-based access control** — Four custom roles: `admin`, `content-manager`, `instructor`, `student`. API permissions are configured per role in Strapi — the backend rejects unauthorized requests regardless of what the frontend shows.
- **Course Management** — Full CRUD for courses. Content Manager can manage all; Instructors are scoped to their own via `instructor` field ownership check.
- **Lesson Management** — Lessons belong to a course. Supports text content and video URL fields. Permission-gated per the matrix.
- **Enrollment** — Students create enrollment records linking themselves to a course. Enrolled courses are queried by filtering on the current user.

### Differentiator
- **Progress Tracking** — `progress` collection stores `(student, course, lesson, completed)` records. Frontend calls POST to mark a lesson done; GET returns completed lesson IDs to calculate percentage. Scoped strictly to the requesting user.
- **Quiz with Auto-grading** — `quiz` and `question` collections hold MCQs with correct answers. On submission, `quiz-attempt` stores the student's answers and computed score. Score is calculated server-side by comparing answers to `correctAnswer` fields.
- **Admin Panel data** — Stats endpoints aggregate user counts per role, total courses, total enrollments — served to the admin dashboard.
- **Blog** — `blog-post` collection with `draft`/`published` state (Strapi Draft & Publish). Only published posts are returned on public endpoints. Content Manager scoped to their own posts; Admin has full access.

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Fill in DATABASE_* and secret keys (see below)

# 3. Start development server
npm run develop
```

Strapi admin panel at `http://localhost:1337/admin`.  
API at `http://localhost:1337/api`.

### Environment Variables

| Variable | Description |
|---|---|
| `HOST` | Server host (default `0.0.0.0`) |
| `PORT` | Server port (default `1337`) |
| `APP_KEYS` | Comma-separated random keys for Strapi |
| `API_TOKEN_SALT` | Salt for API token hashing |
| `ADMIN_JWT_SECRET` | Secret for admin panel JWTs |
| `JWT_SECRET` | Secret for user JWTs |
| `TRANSFER_TOKEN_SALT` | Salt for transfer tokens |
| `ENCRYPTION_KEY` | Encryption key |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_HOST` | DB host |
| `DATABASE_PORT` | DB port |
| `DATABASE_NAME` | DB name |
| `DATABASE_USERNAME` | DB user |
| `DATABASE_PASSWORD` | DB password |
| `DATABASE_SSL` | `false` for local, `true` for Neon/production |

---

## API Collections

| Collection | Description |
|---|---|
| `course` | Courses with title, description, thumbnail, instructor relation |
| `lesson` | Lessons with title, content (text or video URL), course relation |
| `enrollment` | Student ↔ course enrollment records |
| `progress` | Per-student, per-lesson completion records |
| `quiz` | MCQ quizzes linked to a course |
| `question` | Questions with options and correct answer |
| `quiz-attempt` | Stores student answers and computed score |
| `blog-post` | Blog posts with draft/published state |

---

## Deployment (Railway)

1. Push backend to a GitHub repo.
2. Create a new Railway project, connect the repo.
3. Add all environment variables from the table above under Railway's Variables tab.
4. Set `DATABASE_*` variables to point to Neon (production connection string).
5. Railway auto-detects Node.js and runs `npm run start`.
