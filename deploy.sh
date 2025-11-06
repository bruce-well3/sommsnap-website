#!/bin/bash

# Deploy SommSnap website to GitHub Pages
# Repository: https://github.com/bruce-well3/sommsnap-website

echo "🚀 Deploying SommSnap website to GitHub Pages..."

# Navigate to website directory
cd "$(dirname "$0")"

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git remote add origin https://github.com/bruce-well3/sommsnap-website.git
fi

# Stage all website files
echo "📦 Staging files..."
git add index.html style.css privacy.html terms.html support.html app-ads.txt CNAME README.md
git add favicons_set/
git add background.png
git add admin-dashboard/

# Show what will be committed
echo "📋 Files to be committed:"
git status --short

# Commit changes
echo "💾 Committing changes..."
git commit -m "Update website: Add Wine AI branding, new features, pricing, and How It Works section

- Updated branding to 'SommSnap Wine AI'
- Added 8 new feature descriptions (4 scan types, achievements, companions, tracking)
- Updated pricing plans with accurate scan limits (15-1500 scans)
- Added 'How It Works' section with 4-step process
- Enhanced hero section with scan type badges
- Improved CSS styling and mobile responsiveness"

# Push to GitHub
echo "🌐 Pushing to GitHub Pages..."
git push -u origin main || git push -u origin master

echo "✅ Deployment complete!"
echo "🌍 Your website will be live at: https://bruce-well3.github.io/sommsnap-website"
echo "   (or your custom domain if configured)"
