# Render Deployment Setup Guide

This guide will help you deploy your AI Shield Learning Platform to Render.

## 🔧 Prerequisites

1. Render.com account
2. GitHub repository with this project code
3. Production environment variables prepared

## 🚀 Quick Deployment

### Step 1: Prepare Environment Variables

Create a new service in Render and set these environment variables in the Environment settings:

```bash
# Production Environment
NODE_ENV=production

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/your-db-name

# Security Keys (CHANGE THESE!)
JWT_SECRET=your-production-jwt-secret-here-make-it-long-and-secure
SESSION_SECRET=your-production-session-secret-here-make-it-very-secure

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://your-render-app-url.onrender.com/api/auth/google/callback

# Razorpay (Production)
RAZORPAY_KEY_ID=your-production-razorpay-key
RAZORPAY_KEY_SECRET=your-production-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-production-webhook-secret

# Client URL
CLIENT_URL=https://your-render-app-url.onrender.com
```

### Step 2: Deploy on Render

1. Go to [Render.com](https://render.com)
2. Click "New+" and select "Web Service"
3. Connect your GitHub repository
4. Fill in the service details:
   - **Name**: `aishield-india-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### Step 3: Health Check

Your app should be accessible at your Render URL. Test the health endpoint:
```
https://your-app-name.onrender.com/api/health
```

## 🔍 Troubleshooting

### Port Binding Issues

If Render shows "Port scan timeout":

1. Ensure your `server-render.js` is configured correctly
2. Make sure `process.env.PORT` is used correctly
3. Check that the server is actually listening on the assigned port

### Database Connection

1. Verify your MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Ensure your connection string is correct
3. Check that user credentials in Atlas are correct

### Static Files

For production, the React build must be available:
```bash
npm run build
```
This creates `client/build` directory.

---

## 📝 Important Notes

- **Environment**: Development configs remain unchanged
- **Port**: Render automatically assigns port via `process.env.PORT`
- **Database**: Production database must be separate from development
- **Security**: Never commit production secrets to Git
- **Health Check**: `/api/health` endpoint is available for monitoring

---

## 🔄 Migration between environments

To migrate from local development to production:

1. Update all production environment variables in Render dashboard
2. Ensure database connection points to production MongoDB Atlas
3. Test all features (login, courses, payments) in production
4. Monitor logs via Render dashboard

---

## 📞 Support

If you encounter issues:
1. Check Render deployment logs
2. Verify environment variables are set correctly
3. Test with minimal configuration first
4. Use the health check endpoint for debugging
