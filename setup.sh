#!/bin/bash

echo "Setting up PenTest Learning Platform..."

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd client
npm install
cd ..

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env files (see README.md for details)"
echo "2. Run 'node scripts/init-admin.js' to create admin user"
echo "3. Start the development servers:"
echo "   - Backend: npm run dev"
echo "   - Frontend: cd client && npm start"
