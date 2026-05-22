# Team Task Manager

A full-stack MERN web app for creating projects, managing team members, assigning tasks, and tracking progress with Admin/Member role-based access.

## Features

- Signup and login with JWT authentication
- Project creation and member management
- Admin-only project and task management
- Task assignment, priority, due dates, and status updates
- Dashboard stats for totals, progress, completion, and overdue work
# Team Task Manager

Team Task Manager is a full-stack MERN web app that lets teams create projects, manage members, assign tasks, and track delivery with role-based access (Admin / Member).

## Assignment Summary

Build a web app where users can create projects, assign tasks, and track progress with role-based access. The app includes:

- Authentication (signup/login with JWT)
- Project and team management (Admin can add members)
- Task creation, assignment, priority, due dates and status updates
- Dashboard showing tasks, status breakdown, and overdue items
- REST APIs with persistent database (MongoDB) and validations
- Role-based access control enforced server-side
- Deployment to Railway (app must be live)

## Demo & Submission

- Live URL: PLACEHOLDER_LIVE_URL
- GitHub repo: PLACEHOLDER_GITHUB_URL
- Demo video (2–5 minutes): PLACEHOLDER_DEMO_VIDEO_URL

Include the above links in your submission when ready.

## Features

- Signup / Login (JWT)
- Create, edit and list projects
- Project membership with roles (Admin / Member)
- Create, assign, update and delete tasks
- Task filters, statuses and priority
- Dashboard with counts and upcoming/overdue tasks

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt

## Quick Local Setup

1. Install dependencies for both server and client:

```bash
npm run install:all
```

2. Copy environment example and set secrets:

```bash
copy server\.env.example server\.env
```

Edit `server/.env` and set `MONGODB_URI` and `JWT_SECRET`.

3. Run in development (concurrently starts both client and server):

```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Railway Deployment (production)

1. Push the repository to GitHub.
2. Create a new Railway project and connect the GitHub repo.
3. Add a MongoDB plugin or set `MONGODB_URI` to your Atlas connection string.
4. Set environment variables in Railway: `MONGODB_URI`, `JWT_SECRET`, and `NODE_ENV=production`.
5. Railway build command: `npm run build` (root `package.json` handles server+client build).
6. Railway start command: `npm start`.

Note: The Express server serves the built React app from `client/dist` when `NODE_ENV=production`.

## API Overview

- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — get JWT
- `GET /api/auth/me` — current user (requires Authorization header)
- `GET /api/projects` — list projects for user
- `POST /api/projects` — create project (authenticated)
- `GET /api/projects/:id` — project details + tasks (requires membership)
- `POST /api/projects/:id/members` — add member (Admin only)
- `GET /api/tasks` — tasks across user's projects
- `POST /api/tasks/project/:projectId` — create task (Admin only)
- `PATCH /api/tasks/:id` — update task (Admin or assignee for status)

## Environment Variables

Create `server/.env` with at least:

- `PORT` (optional, defaults to 5000)
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing tokens
- `CLIENT_ORIGIN` — allowed CORS origin for dev (default http://localhost:5173)

## Notes for Reviewers

- The app enforces role-based access server-side. Admin-only routes are protected by middleware.
- Input validation uses `zod` for request schemas.

## Next steps / TODO

- Add CI/CD link (Railway) in this README once deployed and replace the placeholder links above.
- Record and attach a 2–5 minute demo video showcasing signup, creating a project, adding a member, creating and updating tasks, and the dashboard.
