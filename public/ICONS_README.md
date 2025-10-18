# Icons and Images Guide

This folder should contain the following files for proper SEO and PWA support:

## Required Files

### Favicon
- **favicon.ico** - 16x16, 32x32, 48x48 px ICO file
  - Place in `/public/favicon.ico`

### PNG Icons
- **icon.png** - 192x192 px PNG (for Android/PWA)
- **icon-512.png** - 512x512 px PNG (for Android/PWA)
- **apple-icon.png** - 180x180 px PNG (for iOS)

### Open Graph Image
- **og-image.png** - 1200x630 px PNG
  - Used for social media previews (Facebook, Twitter, LinkedIn)
  - Should showcase your brand/app

## How to Generate Icons

### Option 1: Using Favicon.io (Recommended)
1. Go to [favicon.io](https://favicon.io/)
2. Use "Text" option and enter "RT" or "RealTea"
3. Choose colors:
   - Background: `#4ade80` (green for dark theme)
   - Text color: `#0d0d0d` (dark)
4. Download and extract files
5. Copy files to `/public/`

### Option 2: Using Figma/Canva
1. Create a square design (512x512 px)
2. Add your logo/text
3. Export in multiple sizes:
   - 512x512 → `icon-512.png`
   - 192x192 → `icon.png`
   - 180x180 → `apple-icon.png`
   - 32x32 → convert to ICO → `favicon.ico`

### Option 3: Using ImageMagick (Command Line)
```bash
# Convert a logo to different sizes
convert logo.png -resize 192x192 public/icon.png
convert logo.png -resize 512x512 public/icon-512.png
convert logo.png -resize 180x180 public/apple-icon.png
convert logo.png -resize 32x32 public/favicon.ico
```

### Open Graph Image
1. Create a 1200x630 px image
2. Include:
   - App name "RealTea"
   - Tagline "Reality Deserves Receipts"
   - Visual elements (timeline graphic, etc.)
3. Save as `og-image.png` in `/public/`

## Quick Placeholder Icons

For testing, you can use this simple SVG as a base and convert it:

```svg
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#4ade80"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="#0d0d0d" text-anchor="middle" dominant-baseline="middle">RT</text>
</svg>
```

## Tools
- [Favicon.io](https://favicon.io/) - Free favicon generator
- [Real Favicon Generator](https://realfavicongenerator.net/) - Comprehensive favicon generator
- [Canva](https://canva.com) - Design icons visually
- [Figma](https://figma.com) - Professional design tool

## Verification

After adding icons, verify they work:
1. Build the project: `npm run build`
2. Check browser tab for favicon
3. Add to home screen on mobile to test PWA icon
4. Share a link on social media to test Open Graph image

