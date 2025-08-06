# SommSnap Website

This directory contains the complete website for SommSnap, including all required pages for App Store submission.

## Files

- `index.html` - Main landing page
- `privacy.html` - Privacy Policy (required by Apple)
- `terms.html` - Terms of Service (required by Apple)
- `support.html` - Support page (required by Apple)
- `style.css` - Shared styles for all pages
- `app-ads.txt` - App ads configuration (empty, as app doesn't use ads)

## Deployment Options

### Option 1: GitHub Pages (Free)
1. Push this website directory to a GitHub repository
2. Go to Settings → Pages
3. Select source: Deploy from a branch
4. Select branch: main, folder: /website
5. Your site will be available at: `https://[username].github.io/[repo-name]`

### Option 2: Replit (Free with custom domain)
1. Create new Replit with HTML/CSS/JS template
2. Copy all files to Replit
3. Run the repl
4. Use the provided URL or add custom domain

### Option 3: Netlify (Free)
1. Create account at netlify.com
2. Drag and drop the website folder
3. Site will be instantly deployed
4. Can add custom domain

### Option 4: Vercel (Free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in this directory
3. Follow prompts to deploy

## App Store Connect URLs

Use these URLs in your App Store submission:
- **Support URL:** `[your-domain]/support.html`
- **Privacy Policy URL:** `[your-domain]/privacy.html`
- **Marketing URL:** `[your-domain]` (optional)

## Updates Needed

Before deploying, update:
1. Email address in privacy.html and support.html
2. Physical address in privacy.html
3. App Store download link in index.html (once app is live)
4. Add screenshots to an assets folder if desired

## Local Testing

To test locally:
1. Open terminal in this directory
2. Run: `python -m http.server 8000` (Python 3) or `python -m SimpleHTTPServer 8000` (Python 2)
3. Open browser to: `http://localhost:8000`