# Render Deployment Configuration for Full-Stack App

## Web Service Settings
- **Repository**: https://github.com/ankushrana6395/aishield_india_app_V1.git
- **Branch**: main
- **Runtime**: Node
- **Build Command**: npm run build
- **Start Command**: npm start

## Environment Variables (Replace placeholders with production values)

```
NODE_ENV=production
CLIENT_URL=https://aishieldindia.onrender.com

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://ankushrana2623_db_user:Itj8Ss4sóWAJsZr2@cluster0.ec2f1es.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Security (Generate secure random strings)
JWT_SECRET=<INSERT-STRONG-32-CHAR-RANDOM-STRING>
SESSION_SECRET=<INSERT-STRONG-32-CHAR-RANDOM-STRING>

# Google OAuth (Production credentials required)
GOOGLE_CLIENT_ID=<INSERT-PRODUCTION-GOOGLE-CLIENT-ID>
GOOGLE_CLIENT_SECRET=<INSERT-PRODUCTION-GOOGLE-CLIENT-SECRET>
GOOGLE_CALLBACK_URL=https://aishieldindia.onrender.com/api/auth/google/callback

# Razorpay (Production - Live mode keys required)
RAZORPAY_KEY_ID=<INSERT-LIVE-RAZORPAY-KEY-ID>
RAZORPAY_KEY_SECRET=<INSERT-LIVE-RAZORPAY-KEY-SECRET>

# Admin Credentials (Production values required)
ADMIN_EMAIL=<INSERT-PRODUCTION-ADMIN-EMAIL>
ADMIN_PASSWORD=<INSERT-STRONG-ADMIN-PASSWORD>
```

## Deployment Steps

1. Create new Render Web Service
2. Connect GitHub repository
3. Copy environment variables above
4. Set build and start commands
5. Deploy
6. Test at your Render URL

## Production Credentials Needed

Before deploying, obtain:

1. **Google OAuth Production App**:
   - Console.cloud.google.com
   - Create OAuth 2.0 credentials
   - Set authorized domains

2. **Razorpay Live API Keys**:
   - Switch to live mode
   - Get production keys only

3. **Strong Random Secrets**:
   - Use password generator for JWT_SESSION

Local development: npm start (client) + npm run dev (root)
