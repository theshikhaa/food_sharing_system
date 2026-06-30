# FoodShare

FoodShare is a food-sharing web app built with Node.js, Express, MongoDB, and EJS. It lets users sign up, log in, choose a role, and then use the app as either a donor or a recipient.

## What It Does

- User registration and login with JWT cookies
- Role selection after login: donor or recipient
- Donor dashboard, donation posting, donation history, requests, and profile pages
- Recipient dashboard, browse page, saved items, request pages, and profile pages
- MongoDB-backed user and donation data
- Server-rendered pages with Express and EJS
- Static prototype pages are also present in `frontend/`, but the working app is served from `src/server.js`

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- EJS templates
- JWT authentication
- bcrypt for password hashing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
```

3. Start the app:
```bash
npm run dev
```

4. Open the app in your browser:
```text
http://localhost:3000
```

## Notes

- Passwords must be at least 6 characters.
- MongoDB Atlas connection strings should live in `.env`, not in the README.
- The app expects a valid JWT secret and a working MongoDB connection before login and registration will work.

## Scripts

- `npm run dev` starts the development server
- `npm start` starts the app in production mode
- `npm test` runs tests