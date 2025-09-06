const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);

// Create Express app
const app = express();
const PORT = process.env.PORT && !isNaN(parseInt(process.env.PORT)) ? parseInt(process.env.PORT) : 5000;
console.log('process.env.PORT:', process.env.PORT);
console.log('Parsed PORT value:', parseInt(process.env.PORT) || 'NaN');
console.log('Using PORT:', PORT);

// Security middleware disabled for lecture compatibility
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP completely for lecture content compatibility
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL, 'https://aishield-india-app-v1.onrender.com']
    : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));

// Configure CORS for static files and resources
app.use('/favicon.ico', cors({ origin: '*' }));
app.use('/favicon.*', cors({ origin: '*' }));
app.use('/robots.txt', cors({ origin: '*' }));
app.use('/manifest.json', cors({ origin: '*' }));
app.use('/static/', cors({ origin: '*' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Sessions for Passport
app.use(require('express-session')({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load passport configuration
require('./config/passport');

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/penetration-testing-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/content', require('./routes/content'));
app.use('/api/admin', require('./routes/admin'));

// Middleware function to selectively apply auth
const lectureMiddleware = (req, res, next) => {
  // Skip authentication for static HTML files and assets
  if (req.path.match(/\.(html|css|js|png|jpg|jpeg|gif|svg|ico)$/i)) {
    return next();
  }

  // For other requests (potentially future dynamic content), apply auth
  try {
    // Use auth middleware but handle it properly
    const auth = require('./middleware/auth');
    auth(req, res, (err) => {
      if (err || res.headersSent) return;
      const subscription = require('./middleware/subscription');
      subscription(req, res, next);
    });
  } catch (err) {
    // If auth fails, serve the file anyway (graceful fallback)
    console.log('Auth middleware error for lecture, serving statically:', req.path);
    next();
  }
};

// Serve lecture content with selective middleware (no CSP protection)
app.use('/lectures-no-csp',
  lectureMiddleware,
  express.static('client/public/lectures')
);

// Serve React frontend
if (process.env.NODE_ENV === 'production') {
  console.log('Checking for client build...');
  if (require('fs').existsSync('client/build/index.html')) {
    console.log('✅ Client build found, serving static files');
    app.use(express.static('client/build'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
    });
  } else {
    console.error('❌ Client build not found at client/build/index.html');
    // Fallback: serve a simple HTML page
    app.get('*', (req, res) => {
      res.send(`
        <html><body>
        <h1>App Loading...</h1>
        <p>Please wait while we build your application.</p>
        <p>If this persists, check the build logs.</p>
        </body></html>
      `);
    });
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
