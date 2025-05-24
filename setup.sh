#!/bin/bash

# Swedish Finance Simulator - Quick Setup Script
echo "🇸🇪 Setting up Swedish Finance Simulator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run initial build to verify everything works
echo "🔨 Running initial build test..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete! You can now:"
echo ""
echo "  Start development server:  npm run dev"
echo "  Build for production:      npm run build"
echo "  Deploy to GitHub Pages:    npm run deploy"
echo ""
echo "📖 For more info, see README.md"
echo ""
echo "🚀 Happy financial planning!"
