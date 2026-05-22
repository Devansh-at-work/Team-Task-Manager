# Team Task Manager

A full-stack MERN web app for creating projects, managing team members, assigning tasks, and tracking progress with Admin/Member role-based access.

## Features

- Signup and login with JWT authentication
- Project creation and member management
- Admin-only project and task management
- Task assignment, priority, due dates, and status updates
- Dashboard stats for totals, progress, completion, and overdue work
- MongoDB relationships with Mongoose validation
- Railway-ready build and start scripts

## Tech Stack

- React + Vite
- Express.js
- MongoDB + Mongoose
- JWT + bcrypt

## Local Setup

```bash
npm run install:all
copy server\.env.example server\.env
npm run dev
```

Set `MONGODB_URI` and `JWT_SECRET` in `server/.env`.

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Railway Deployment

1. Push this project to GitHub.
2. Create a Railway project from the GitHub repository.
3. Add a MongoDB service or provide your own MongoDB Atlas URL.
4. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
5. Railway will run:
   - Build: `npm run build`
   - Start: `npm start`

The Express server serves the built React app in production.
