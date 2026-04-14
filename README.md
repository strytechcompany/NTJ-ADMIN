# NTJ-ADMIN Dashboard

NTJ-ADMIN is a comprehensive mobile and backend administration suite designed for The Curated Ledger (NTJ Chitfund) application. It features a complete system for overseeing and managing Gold and Silver tier chits, tracking members, assigning manual plans, handling online/offline payments, and processing pending user verifications securely.

## System Architecture

This workspace contains two integrated subsystems:

- `admin-backend`: A Node.js and Express RESTful API handling authentication, real-time data lookups, and transaction recording with a connected MongoDB instance.
- `admin-mobile`: A React Native (Expo) frontend providing administrators with a secure, highly-polished mobile dashboard layout to review chit statistics, member requests, and issue manually triggered transactions.

## Features

* **Role-Based Workspaces**: Distinct separated admin dashboards depending on the oversight tier (Gold vs Silver).
* **Live Dashboards**: See up-to-date daily revenue flows, active user plans, total users, and global live metal rates.
* **Member Directory**: Review member details, ID cards, specific assigned savings plans, and KYC status.
* **Manual Entry Controls**: Directly trigger user creation, associate users with chit plans, and capture manual vault payments bridging offline activity to the digital ledger.
* **Digital Queue Management**: Approve, reject, and securely audit chit applications from the mobile request queue interface, with real-time sync with user-facing databases.

## Local Setup

### Backend Configuration
1. Navigate into `admin-backend`.
2. Duplicate `.env.example` as `.env`.
3. Set `MONGO_URI` to link to your primary MongoDB database. Ensure `JWT_SECRET` is securely populated.
4. Run `npm install` followed by `npm run dev` to boot the admin instance.

### Mobile App Configuration
1. Navigate to `admin-mobile`.
2. Ensure you have the `.env` configured inside this folder with `EXPO_PUBLIC_API_URL` matching your local or hosted backend.
3. Run `npm install` and start the server with `npm start` or `npx expo start`.
