# 💰 10 Crore Target Tracker & Consistency Todo List

A premium, money-themed Full-Stack Personal Task & Sales Consistency Tracker. This application is optimized to run locally (double-click launch) or hosted on Vercel/Render, keeping you motivated to hit your financial milestone over a 365-day countdown.

---

## ✨ Key Features

- **🎯 Target Tracking**: Counts down from 365 days (10 Crore Rupees milestone) with a Hinglish motivation banner: `X aur bache hai, is bar to kar hi le. dekh.`
- **🔒 Basic Auth & Data Isolation**: Secure email/password signup/login. All user targets, countdown milestones, tasks, and history details are fully isolated per user.
- **📞 Permanent Sales Calls Widget**: An interactive sales call counter containing motivational hooks:
  - *"koi sales call pe gali nahi deta lekin paise nahi kamaoge to sb denge. kr lo 10-20 call."*
  - *"kuch nahi rakha ijjat me utar jane de. besharam ban ja."*
- **🔄 Midnight Rollover Reset**: At exactly 12:00 AM (midnight), the app:
  1. Evaluates your daily progress (Green: Perfect, Yellow: Progress, Red: Failed).
  2. Commits performance statistics to the database.
  3. Clears temporary daily tasks and resets the sales call counter to `0` for a fresh start.
- **📊 Consistency Heatmap**: Renders a gorgeous 365-day contribution grid (similar to GitHub's commit graph) highlighting your daily performances over the entire target challenge.
- **🛡️ Admin dashboard**: Making `singhaditya4333@gmail.com` the Admin. Admin receives instant notification logs of any new user signups and can browse all registered user emails.
- **🎨 Premium Visual Theme**: Rich money-green gradient design, glassmorphism containers, custom gold countdown displays, and interactive animations.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JS, Google Fonts, Lucide Icons
- **Backend**: Node.js, Express, Mongoose, JWT, BcryptJS, Dotenv
- **Database**: MongoDB Atlas

---

## 🚀 Local Setup & Quick Start

1. **Prerequisites**: Make sure you have [Node.js](https://nodejs.org/) installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Variables**:
   Create a `.env` file in the root folder (pre-configured local `.env` is already created for you):
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_secret_key
   ```
4. **Launch Server**:
   - Simply double-click **`start.bat`** (Windows).
   - Or run:
     ```bash
     npm run dev
     ```
5. **Open Browser**: Open Google Chrome and go to **[http://localhost:3000](http://localhost:3000)**.

---

## 🌐 Cloud Deployment

Refer to the step-by-step **[deployment_guide.md](./deployment_guide.md)** to host your tracker online:
* **Vercel** configuration is pre-configured via the root `vercel.json` file.
* **Render** can easily deploy the Node/Express backend on its free tier.
