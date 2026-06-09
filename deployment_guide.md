# Deployment Guide

Here is how you can deploy your Target Tracker web app to **Render** or **Vercel** for free.

---

## Prerequisites
1. Initialize a git repository in your project directory:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   ```
2. Push your project to a GitHub repository.

---

## Option 1: Deploying to Render (Recommended for full servers)

Render will host your Express server and serve the frontend statically.

1. **Sign Up / Log In**: Go to [Render](https://render.com/) and connect your GitHub account.
2. **Create New Service**: Click **New +** and select **Web Service**.
3. **Connect Repository**: Select your GitHub repository.
4. **Configure Settings**:
   - **Name**: `money-todo-tracker` (or anything you like)
   - **Region**: Choose the closest one to you
   - **Branch**: `main` (or `master`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Select the **Free** plan.
5. **Click Deploy**: Render will build and deploy your Express backend. Your web app will be live on a `https://your-app-name.onrender.com` URL.

---

## Option 2: Deploying to Vercel

We have already added the necessary `vercel.json` configuration to package your Express server as a Vercel Serverless Function.

1. **Install Vercel CLI** (Optional, or connect via Vercel Dashboard):
   - Go to [Vercel](https://vercel.com/) and log in with GitHub.
   - Click **Add New...** -> **Project**.
   - Select your connected GitHub repository and click **Import**.
2. **Framework Preset**: Leave as **Other**.
3. **Root Directory**: `./`
4. **Deploy**: Click **Deploy**. Vercel will automatically read `vercel.json` and deploy both your frontend files and Express API serverless functions.
