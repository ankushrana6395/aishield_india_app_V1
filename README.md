# PenTest Learning Platform

A secure, subscription-based online learning platform for web application penetration testing.

## Features

- User authentication (register/login)
- Razorpay payment integration for course subscription
- Protected HTML lecture content access
- Progress tracking for completed lectures
- Admin panel for content management
- Responsive UI with Material-UI components

## Tech Stack

- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Payment Gateway**: Razorpay
- **Authentication**: JWT

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Razorpay account for payment processing

## Setup Instructions

### 1. Backend Setup

1. Install backend dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLIENT_URL=http://localhost:3000
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=your_admin_password
   ```

3. Initialize the admin user:
   ```bash
   node scripts/init-admin.js
   ```

### 2. Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `client` directory:
   ```env
   REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

### 3. Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
.
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # React components
│       ├── contexts/       # React contexts
│       └── ...
├── models/                 # Mongoose models
├── routes/                 # Express routes
├── middleware/             # Express middleware
├── scripts/                # Utility scripts
├── server side/            # HTML lecture files
├── server.js              # Express server entry point
└── ...
```

## Security Features

- JWT-based authentication
- Protected lecture content delivery
- Role-based access control (user vs admin)
- Rate limiting
- Helmet.js for HTTP headers security
- Environment variables for secrets

## Admin Features

- User management
- Subscription management
- Lecture file upload/delete
- Subscriber list view

## Deployment

### Backend Deployment

1. Set environment variables on your hosting platform
2. Deploy the backend to platforms like:
   - Render
   - Railway
   - Heroku
   - DigitalOcean App Platform

### Frontend Deployment

1. Build the React app:
   ```bash
   cd client
   npm run build
   ```

2. Deploy the build folder to platforms like:
   - Vercel
   - Netlify
   - GitHub Pages

## Razorpay Integration

1. Create a Razorpay account at https://razorpay.com
2. Obtain your API keys from the dashboard
3. Update the `.env` files with your keys
4. Test payments using Razorpay's test mode

## Lecture Content Management

1. Place your HTML lecture files in the `server side` directory
2. The platform will automatically list all HTML files
3. Admins can upload additional lectures through the admin panel
4. Only authenticated and subscribed users can access lectures

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License.
