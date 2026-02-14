# CivicGuard - Quick Testing Guide

## 🚀 Start Here

1. Click **"Go Live"** in your IDE
2. Application opens at root → auto-redirects to landing page
3. Choose your user type to begin

---

## ✅ Feature 1: Login with Any Values

### Test Volunteer Login
1. Click **"Volunteer Login"** on landing page
2. Enter ANY email: `test@test.com` or `random`
3. Enter ANY password: `123` or `anything`
4. Click **"Volunteer Access"**
5. ✅ Should redirect to dashboard

### Test Volunteer Signup
1. Click **"Signup"** tab
2. Enter ANY name: `John Doe`
3. Enter ANY email: `john@test.com`
4. Enter ANY password: `123` (both fields)
5. Click **"Create Volunteer Account"**
6. ✅ Should redirect to dashboard

### Test Admin Login
1. Click **"Admin Portal"** on landing page
2. Enter ANY email: `admin@org.com`
3. Enter ANY password: `admin123`
4. Click **"Access Organization Portal"**
5. ✅ Should redirect to admin dashboard

**Expected Result**: All logins work without validation errors

---

## ✅ Feature 2: Role-Based Filtering

### Test Document Filtering
1. From landing page, click **"Verifier Mode"**
2. You'll see 7 document cards
3. In left sidebar, click **"Doctor"**
4. ✅ Only 2 cards visible: Medical License, Vaccination Record
5. Click **"Driver"**
6. ✅ Only 1 card visible: Commercial Driver Permit
7. Click **"Engineer"**
8. ✅ Only 1 card visible: Structural Safety Cert
9. Click **"Volunteer"**
10. ✅ Only 1 card visible: Volunteer Pass
11. Click **"All Roles"**
12. ✅ All 7 cards visible again

**Expected Result**: Cards filter smoothly with fade animation

---

## ✅ Feature 3: Live Camera Access

### Test QR Scanner Camera
1. From landing page, click **"Verifier Mode"**
2. National ID card is pre-selected (blue border)
3. Click **"Start Scanning"** button (bottom right)
4. Browser shows camera permission prompt
5. Click **"Allow"**
6. ✅ Live camera feed appears in scanner frame
7. ✅ Blue scan line animates across the frame
8. Click **"Switch Camera"** button
9. ✅ Camera switches (front ↔ back)
10. Click **"Back to Dashboard"**
11. ✅ Returns to document selection

**Expected Result**: Live video feed with animated scan line

### If Camera Doesn't Work
- Check browser permissions (Settings → Camera)
- Try different browser (Chrome recommended)
- Ensure HTTPS or localhost
- Check console for errors

---

## ✅ Feature 4: Direct Landing Access

### Test Root Access
1. Open `index.html` directly
2. ✅ Auto-redirects to landing page
3. Or use IDE "Go Live" feature
4. ✅ Opens landing page directly

**Expected Result**: No manual navigation needed

---

## 🎯 Complete Flow Tests

### Volunteer Journey
```
Landing → Volunteer Login (any credentials)
  ↓
Dashboard (shows welcome message)
  ↓
Click "Upload Documents" or "Show Digital ID"
  ↓
Click "Logout" → Returns to login
```

### Admin Journey
```
Landing → Admin Portal (any credentials)
  ↓
Admin Dashboard (verification table)
  ↓
Click "Approve" on any row
  ↓
Row animates green and disappears
  ↓
Stats update automatically
```

### Verifier Journey
```
Landing → Verifier Mode
  ↓
Filter by role (test each one)
  ↓
Select documents (click cards)
  ↓
Start Scanning → Camera activates
  ↓
Switch camera → Toggles front/back
  ↓
Back to Dashboard
```

---

## 📱 Mobile Testing

### Test on Mobile Device
1. Get your local IP address
2. Access: `http://YOUR_IP:PORT`
3. Test camera on mobile:
   - Front camera (selfie)
   - Back camera (environment)
   - Switch between them

---

## 🐛 Common Issues & Fixes

### Issue: Camera Permission Denied
**Fix**: 
- Go to browser settings
- Find site permissions
- Enable camera access
- Refresh page

### Issue: Filtering Not Working
**Fix**:
- Open browser console (F12)
- Check for JavaScript errors
- Refresh page
- Try different role

### Issue: Login Not Working
**Fix**:
- Any values should work
- Check browser console
- Clear localStorage
- Try again

### Issue: Page Not Loading
**Fix**:
- Check file paths
- Ensure all files in correct folders
- Use IDE "Go Live" feature
- Check console for 404 errors

---

## 🎨 Visual Indicators

### Login Success
- Green notification: "Login successful!"
- Redirects after 1 second
- Loading spinner on button

### Role Filter Active
- Selected role has blue background
- Filtered cards fade in/out
- Blue notification shows filter name

### Camera Active
- Live video feed visible
- Blue scan line animating
- Green notification: "Camera activated"

### Document Selected
- Blue border around card
- Checkmark in top-right
- Appears in selection queue (right panel)

---

## ⚡ Quick Test Checklist

- [ ] Root index.html redirects to landing
- [ ] Volunteer login with random values works
- [ ] Volunteer signup with random values works
- [ ] Admin login with random values works
- [ ] Doctor filter shows 2 cards
- [ ] Driver filter shows 1 card
- [ ] Engineer filter shows 1 card
- [ ] Volunteer filter shows 1 card
- [ ] All Roles shows 7 cards
- [ ] Camera activates on QR scanner page
- [ ] Switch camera button works
- [ ] Back navigation works everywhere
- [ ] Logout returns to login page

---

## 📊 Expected Behavior Summary

| Feature | Input | Expected Output |
|---------|-------|----------------|
| Volunteer Login | Any email/password | Redirect to dashboard |
| Admin Login | Any email/password | Redirect to admin dashboard |
| Doctor Filter | Click "Doctor" | Show 2 medical cards |
| Driver Filter | Click "Driver" | Show 1 driver card |
| Camera Access | Allow permission | Live video feed |
| Switch Camera | Click button | Toggle front/back |
| Document Select | Click card | Blue border + checkmark |
| Start Scanning | Click button | Navigate to QR scanner |

---

## 🎓 Pro Tips

1. **Test in Chrome first** - Best camera support
2. **Use localhost** - Camera works without HTTPS
3. **Check console** - Errors show there
4. **Clear localStorage** - Reset state if needed
5. **Test mobile** - Different camera behavior
6. **Try incognito** - Fresh permissions

---

## 📞 Need Help?

1. Open browser console (F12)
2. Look for red error messages
3. Check network tab for failed requests
4. Verify file paths are correct
5. Test in different browser

---

**Happy Testing! 🚀**
