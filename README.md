# CampusConnekt - NUST Resource and Event Platform

CampusConnekt is a full-stack campus platform for managing societies, events, academic resources, notifications, and admin workflows. It is built with a React frontend, an Express backend, MySQL and MongoDB for data storage.

## Tech Stack

- Frontend: React, Vite, React Router, Axios, Tailwind CSS, React Hot Toast
- Backend: Node.js, Express.js, JWT, Multer, Nodemailer, Helmet, CORS, Morgan
- Primary Database: MySQL via `mysql2`
- Secondary Database: MongoDB via Mongoose

## Core Features

### Authentication and User Accounts
- User registration and login
- Email verification
- Forgot password and reset password flow
- JWT-based authentication
- Profile management
- Avatar upload
- Security questions and audit logs

### Societies
- Create and manage societies
- Join and leave societies
- Society approval workflow
- Member role management
- Society announcements
- Society dashboard for admins

### Events
- Create, edit, and delete events
- Event thumbnails and categories
- Event registration and cancellation
- Capacity and registration deadlines
- Event approval workflow
- Event reviews and ratings

### Resources
- Upload academic resources
- Approve or reject resources
- Download resources
- Resource requests and responses
- Resource ratings and download tracking

### Notifications
- User notifications
- Mark as read and mark all as read
- Notification types for events, resources, societies, and admin alerts

### Admin Panel
- Manage users and roles
- Approve or reject societies, events, and resources
- Audit logs and user activity
- Global notifications
- Reported issue tracking and resolution

## Project Structure

```text
backend/
  server.js
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    sync/
    utils/
  scripts/
  uploads/
frontend/
  src/
    components/
    context/
    pages/
database/
```

## Environment Variables

### Backend
Create a `backend/.env` file using the values from `backend/.env.example`.

```env
DB_HOST=[YOUR_PLANETSCALE_HOST]
DB_USER=[YOUR_PLANETSCALE_USERNAME]
DB_PASSWORD=[YOUR_PLANETSCALE_PASSWORD]
DB_NAME=campus_connekt

MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@[CLUSTER].mongodb.net/?appName=CampusConnekt

JWT_SECRET=[GENERATE_NEW_32_CHARACTER_SECRET]
JWT_EXPIRE=7d

PORT=5000
FRONTEND_URL=https://[YOUR_VERCEL_FRONTEND_URL]

ADMIN_EMAIL=[YOUR_ADMIN_EMAIL]
ADMIN_PASSWORD=[CREATE_STRONG_PASSWORD]

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=[YOUR_EMAIL_OR_API_KEY]
EMAIL_PASS=[YOUR_APP_PASSWORD_OR_API_KEY]
EMAIL_FROM=[YOUR_SENDER_EMAIL]
```

### Frontend
Create a `frontend/.env` file using the values from `frontend/.env.example`.

```env
VITE_API_URL=https://[YOUR_RENDER_BACKEND_URL]
```

## Local Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

### 1. Backend on Render
- Set the build/start command to use `npm start`
- Add all backend environment variables in the Render dashboard
- Point `FRONTEND_URL` to your Vercel domain
- Point `MONGODB_URI` to your MongoDB Atlas cluster
- Point MySQL variables to your PlanetScale database

### 2. Frontend on Vercel
- Set `VITE_API_URL` to your Render backend URL
- Deploy the `frontend` folder as the project root

### 3. MySQL on PlanetScale
- Create a new database and user
- Copy the connection details into backend environment variables
- Run any database initialization scripts you need before launch

### 4. MongoDB on Atlas
- Create a cluster and database user
- Allow access from your backend host or use a broad deployment-safe rule
- Copy the Atlas connection string into `MONGODB_URI`

## Important Notes

- Do not commit any `.env` file to GitHub
- Keep file uploads secure and consider cloud storage for production
- Update CORS and frontend URLs for production domains only
- Use strong, unique secrets for JWT, admin credentials, and database passwords

## API Overview

The backend exposes route groups for:
- Authentication
- Events
- Resources
- Societies
- Dashboard
- Notifications
- Admin management

