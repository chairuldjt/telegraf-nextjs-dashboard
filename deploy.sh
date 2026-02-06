#!/bin/bash

# Configuration
APP_NAME="telegraf-dashboard"
PORT=3010

echo "🚀 Starting Deployment Process for $APP_NAME..."

# 1. Pull latest code
echo "📦 Pulling latest changes from Git..."
git pull origin master

# 2. Install dependencies
echo "📥 Installing dependencies..."
npm install

# 3. Build the application
echo "🏗️ Building the application..."
npm run build

# 4. Check if pm2 is installed
if command -v pm2 &> /dev/null
then
    echo "🔄 Restarting application with PM2..."
    pm2 restart $APP_NAME || pm2 start npm --name "$APP_NAME" -- start -- -p $PORT
else
    echo "⚠️ PM2 not found. Starting with npm..."
    echo "💡 Consider installing PM2 for better process management: npm install -g pm2"
    npm run start
fi

echo "✅ Deployment completed successfully!"
echo "🌐 App is running on http://localhost:$PORT"
