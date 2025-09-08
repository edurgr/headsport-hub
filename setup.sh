#!/bin/bash

echo "🚀 HEAD Hub Platform Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your Supabase credentials."
    echo ""
    echo "⚠️  IMPORTANT: You need to edit .env file with your actual values:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
else
    echo "✅ .env file already exists"
fi

# Install app dependencies
echo ""
echo "📦 Installing app dependencies..."
cd app
npm install
cd ..

echo ""
echo "🎯 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Set up your Supabase database using database-schema.sql"
echo "2. Import CSV data: cd app && npm run import"
echo "3. Create test invitations: cd app && npm run test:invite:create"
echo "4. Start the app: cd app && npm run dev"
echo ""
echo "Happy coding! 🎉"
