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

// Security middleware
app.use(helmet());
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

// Serve lecture content (protected)
app.use('/lectures', require('./middleware/auth'), require('./middleware/subscription'), express.static('client/public/lectures'));

// Serve React frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
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
