# AIShield India Mobile App

## Description
This is the mobile application for AIShield India, a comprehensive platform focused on cybersecurity education. Built as a companion to the web application, this React Native app provides seamless access to courses, lectures, and subscription management on mobile devices.

## Features
- **User Authentication**: Secure login and registration with JWT tokens
- **Course Management**: Browse, enroll, and track progress in cybersecurity courses
- **Lecture Viewing**: Interactive lecture content with multimedia support
- **Subscription System**: Manage premium subscriptions and access levels
- **Payment Integration**: Secure in-app payments for courses and subscriptions
- **Offline Support**: Download content for offline viewing
- **Push Notifications**: Get updates on new courses and subscription changes
- **Profile Management**: Update user information and preferences

## Tech Stack
- **Frontend**: React Native
- **State Management**: Context API / Redux
- **Navigation**: React Navigation
- **API Client**: Axios
- **Backend Integration**: REST APIs from Node.js/Express server
- **Database**: MongoDB (via backend)

## Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager
- React Native CLI
- For iOS development: Xcode 12+ (macOS only)
- For Android development: Android Studio with Android SDK

## Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd mobile
npm install
```

### 2. iOS Setup
```bash
cd ios
pod install
cd ..
```

### 3. Android Setup
- Ensure Android SDK is properly configured
- Create local.properties file with SDK path if needed

### 4. Environment Configuration
Create a `.env` file in the root directory:
```
API_BASE_URL=https://your-backend-api.com
PAYMENT_GATEWAY_KEY=your_payment_key
```

## Running the App

### Development
```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator/device
npm run android
```

### Production Builds
```bash
# iOS release
npm run build:ios

# Android release
npm run build:android
```

## Project Structure
```
mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens/pages
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API services and utilities
│   ├── contexts/       # React contexts for state management
│   └── utils/          # Helper functions
├── assets/             # Images, fonts, and other assets
├── config/             # Configuration files
└── __tests__/          # Test files
```

## API Integration
The mobile app integrates with the existing web app backend through REST APIs:
- Authentication endpoints (`/auth`)
- Course management (`/courses`)
- Lecture content (`/content`)
- Payment processing (`/payment`)
- Subscription management (`/subscription`)

## Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:e2e
```

## Deployment
- **iOS**: Build and submit to App Store Connect
- **Android**: Build APK/AAB and upload to Google Play Console

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## Security
- All API calls use HTTPS
- Sensitive data is encrypted
- Authentication tokens are securely stored
- Payment information is handled through secure gateways

## Support
For support and questions:
- Email: support@aishieldindia.com
- Documentation: [Web App Docs](https://docs.aishieldindia.com)

## License
This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.