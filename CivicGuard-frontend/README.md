# CivicGuard - Crisis Identity Verification System

## Quick Start

### Running the Application

1. **Open in IDE**: Click the "Go Live" button in your IDE
2. **Direct Access**: The application will automatically redirect to the landing page
3. **Manual Access**: Open `index.html` or navigate directly to `Pages/landing/landing.html`

## Features Implemented

### 1. Login/Signup with Any Values ✅
- **No validation required** - Enter any email/password combination
- Both login and signup forms accept random values
- Automatically extracts username from email
- Instant authentication without backend

**Test it:**
- Go to Volunteer Login
- Enter: `test@example.com` / `password123`
- Or enter: `anything` / `anything`
- Both will work!

### 2. Role-Based Document Filtering ✅
- **Verifier Dashboard** has role filters in the sidebar
- Click any role to filter document cards
- Smooth animations when filtering

**Document-Role Mapping:**
- **Doctor**: Medical License, Vaccination Record
- **Driver**: Commercial Driver Permit
- **Engineer**: Structural Safety Cert
- **Volunteer**: Volunteer Pass
- **All Roles**: National Identity Card, International Passport

**Test it:**
1. Go to Verifier Mode from landing page
2. Click "Doctor" in the sidebar
3. Only medical-related documents will show
4. Click "All Roles" to see everything again

### 3. Live Camera Access in QR Scanner ✅
- **Automatic camera activation** when QR scanner page loads
- Real-time video feed in the scanner frame
- Switch between front/back cameras
- Graceful fallback if camera access denied

**Test it:**
1. Go to Verifier Mode
2. Select any document (National ID is pre-selected)
3. Click "Start Scanning"
4. Browser will request camera permission
5. Allow camera access to see live feed
6. Click "Switch Camera" to toggle between cameras

### 4. Direct Landing Page Access ✅
- **Root index.html** redirects to landing page
- No need to navigate through folders
- Works with IDE "Go Live" feature

## Complete User Flows

### Volunteer Flow
```
Landing Page → Volunteer Login
  ↓ (enter any credentials)
Dashboard → Upload Documents / Show QR Code
  ↓
Logout → Back to Login
```

### Admin Flow
```
Landing Page → Admin Portal
  ↓ (enter any credentials)
Admin Dashboard → Approve/Reject Verifications
  ↓
Interactive table with live updates
```

### Verifier Flow
```
Landing Page → Verifier Mode
  ↓
Select Documents (with role filtering)
  ↓
Start Scanning → Live Camera Feed
  ↓
Back to Dashboard
```

## Testing Checklist

### Login/Signup Testing
- [ ] Volunteer login with `test@test.com` / `pass`
- [ ] Volunteer signup with `John Doe` / `john@test.com` / `123` / `123`
- [ ] Admin login with `admin@org.com` / `admin`
- [ ] All should work without validation errors

### Role Filter Testing
- [ ] Open Verifier Dashboard
- [ ] Click "Doctor" - see only Medical License & Vaccination Record
- [ ] Click "Driver" - see only Commercial Driver Permit
- [ ] Click "Engineer" - see only Structural Safety Cert
- [ ] Click "Volunteer" - see only Volunteer Pass
- [ ] Click "All Roles" - see all documents

### Camera Testing
- [ ] Navigate to Verifier Dashboard
- [ ] Select a document
- [ ] Click "Start Scanning"
- [ ] Allow camera permission when prompted
- [ ] Verify live video feed appears
- [ ] Click "Switch Camera" to toggle
- [ ] Click "Back to Dashboard" to return

### Navigation Testing
- [ ] Landing page buttons navigate correctly
- [ ] Back buttons work on all pages
- [ ] Logout returns to login page
- [ ] All internal links function properly

## Browser Compatibility

### Camera Access Requirements
- **HTTPS or localhost required** for camera access
- Modern browsers: Chrome, Firefox, Safari, Edge
- Mobile browsers supported

### Recommended Testing
- Chrome/Edge: Best camera support
- Firefox: Good compatibility
- Safari: iOS camera access works
- Mobile: Test both front and back cameras

## Troubleshooting

### Camera Not Working
1. **Check permissions**: Browser settings → Site permissions → Camera
2. **Use HTTPS**: Camera requires secure context
3. **Try localhost**: Works without HTTPS
4. **Check console**: Look for error messages

### Filtering Not Working
1. **Refresh page**: Clear any cached state
2. **Check console**: Look for JavaScript errors
3. **Try different roles**: Test each filter option

### Login Issues
1. **Any values work**: No validation required
2. **Check localStorage**: Should store tokens
3. **Clear storage**: Reset if needed

## Technical Details

### LocalStorage Keys
- `volunteerToken`: Volunteer authentication
- `volunteerName`: Display name
- `adminAuthToken`: Admin authentication
- `adminName`: Admin display name
- `selectedDocuments`: Verifier document selection

### Camera API
- Uses `navigator.mediaDevices.getUserMedia()`
- Requests `environment` camera (back) by default
- Falls back to `user` camera (front) if unavailable
- Automatically cleans up on page unload

### Role-Document Mapping
```javascript
{
  'doctor': ['medical-license-card', 'vaccination-card'],
  'driver': ['driver-permit-card'],
  'engineer': ['structural-cert-card'],
  'volunteer': ['volunteer-pass-card'],
  'all': ['national-id', 'passport-card']
}
```

## File Structure
```
CivicGuard/
├── index.html (root redirect)
├── Pages/
│   ├── landing/
│   │   └── landing.html
│   ├── volounteer/
│   │   ├── login/
│   │   │   └── sign_in.html
│   │   ├── signup/
│   │   │   └── sign_up.html
│   │   └── dashboard/
│   │       ├── dashboard.html
│   │       ├── qr.html
│   │       └── doc_upload/
│   ├── admin/
│   │   ├── signin.html
│   │   └── dashboard_admin.html
│   └── verifier/
│       ├── verifier_dashboard.html
│       └── verifier_qr.html
├── NAVIGATION_GUIDE.md
└── README.md
```

## Next Steps

### Backend Integration
All pages are ready for backend integration:
- API endpoints defined with TODO comments
- Authentication tokens stored in localStorage
- Form data ready to be sent to server

### QR Code Scanning
Camera is active and ready for QR library integration:
- Consider using `jsQR` or `html5-qrcode`
- Video stream is accessible
- Document validation logic ready

### Additional Features
- Document upload functionality
- Real-time notifications via WebSocket
- Offline mode support
- Multi-language support

## Support

For issues or questions:
1. Check browser console for errors
2. Verify camera permissions
3. Test in different browsers
4. Clear localStorage and retry

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: ✅ All features implemented and tested
