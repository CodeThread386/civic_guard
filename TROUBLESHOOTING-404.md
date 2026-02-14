# Fix 404 errors (layout.css, page.js, main-app.js)

If you see 404 errors for `/_next/static/...` files:

## Step 1: Stop everything
- Close all terminals running `npm run dev`
- Close the Cursor IDE browser preview if open
- Press `Ctrl+C` in any terminal running the app

## Step 2: Clean and restart
```powershell
cd c:\Users\sarth\Desktop\sarthak\repos\CivicGuard
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

Or run:
```powershell
npm run dev:clean
```

## Step 3: In your browser
1. **Clear site data**: Open DevTools (F12) → Application tab → Storage → "Clear site data"
2. **Hard refresh**: `Ctrl + Shift + R` or `Ctrl + F5`
3. **Or use Incognito**: `Ctrl + Shift + N` (Chrome) → go to `http://localhost:3000`

## Step 4: Verify URL
Use exactly: **http://localhost:3000** (not 127.0.0.1 or another port)

## If still broken
- Disable browser extensions (especially ad blockers, privacy tools)
- Try a different browser (Edge, Firefox)
- Check Windows Firewall isn't blocking Node
