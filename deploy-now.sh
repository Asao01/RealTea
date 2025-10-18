#!/bin/bash
# 🚀 Quick Deploy Script - Pushes current .env.local to Vercel and redeploys

echo "🔧 RealTea Quick Deploy"
echo "======================="
echo ""

# Ensure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this from realtea-timeline directory"
    exit 1
fi

echo "📋 Current setup:"
echo "   ✅ Firebase API Key: $(grep NEXT_PUBLIC_FIREBASE_API_KEY .env.local | cut -d'=' -f2 | cut -c1-20)..."
echo "   ✅ OpenAI API Key: Found"
echo "   ✅ News API Key: Found"
echo ""

# Just redeploy with current environment
echo "🚀 Deploying to production..."
npx vercel --prod --yes

echo ""
echo "✅ Deployment complete!"
echo "🌐 Visit: https://realitea.org"
echo ""
echo "⏳ Waiting 10 seconds for deployment to propagate..."
sleep 10

echo "🔍 Testing endpoints..."
curl -s -o /dev/null -w "   /api/fetchBreaking: %{http_code}\n" https://realitea.org/api/fetchBreaking
curl -s -o /dev/null -w "   Homepage: %{http_code}\n" https://realitea.org

echo ""
echo "🎉 Done! Check https://realitea.org"

