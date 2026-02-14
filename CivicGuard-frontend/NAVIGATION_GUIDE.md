# CivicGuard - Complete Navigation Flow

## Project Structure & Navigation

### 1. Landing Page (`Pages/landing/landing.html`)
**Entry Point** - Main landing page with three primary navigation options:

- **Volunteer Login Button** → `Pages/volounteer/login/sign_in.html`
- **Verifier Mode Button** → `Pages/verifier/verifier_dashboard.html`
- **Admin Portal Button** → `Pages/admin/signin.html`

**Features:**
- Interactive buttons with hover effects
- Responsive design
- Direct navigation to all three user types

---

### 2. Volunteer Flow

#### 2.1 Sign In Page (`Pages/volounteer/login/sign_in.html`)
**Features:**
- Toggle between Login and Signup forms
- Form validation
- Loading states on submission
- Google Sign-In option (placeholder)
- Back to Home link

**Navigation:**
- Successful login → `Pages/volounteer/dashboard/dashboard.html`
- Signup tab → In-page toggle
- Back button → `Pages/landing/landing.html`

**Interactive Elements:**
- Email and password validation
- Error notifications
- Success notifications
- Form submission with loading state

#### 2.2 Volunteer Dashboard (`Pages/volounteer/dashboard/dashboard.html`)
**Features:**
- User welcome message (dynamic from localStorage)
- Document status cards
- Quick action buttons
- Recent activity timeline
- Logout functionality

**Navigation:**
- Upload Documents button → `Pages/volounteer/dashboard/doc_upload/gov.html`
- Show Digital ID button → `Pages/volounteer/dashboard/qr.html`
- Logout button → `Pages/volounteer/login/sign_in.html` (with confirmation)

**Interactive Elements:**
- Dynamic user name display
- Clickable document cards
- Notification system
- Logout confirmation dialog

---

### 3. Admin Flow

#### 3.1 Admin Sign In (`Pages/admin/signin.html`)
**Features:**
- Organization email and password fields
- Form validation
- Google Sign-In option (placeholder)
- Registration link

**Navigation:**
- Successful login → `Pages/admin/dashboard_admin.html`
- Register link → Placeholder for signup page

**Interactive Elements:**
- Form validation
- Loading states
- Success/error notifications
- Token storage in localStorage

#### 3.2 Admin Dashboard (`Pages/admin/dashboard_admin.html`)
**Features:**
- Sidebar navigation with active states
- Statistics cards
- Verification queue table
- Approve/Reject buttons with animations
- Search functionality
- Pagination controls
- Live activity feed

**Navigation:**
- Dashboard (active)
- Verifications
- Relief Users
- Audit Logs
- Settings

**Interactive Elements:**
- Sidebar navigation with active state highlighting
- Approve button → Processes verification, updates stats, removes row
- Reject button → Shows confirmation, processes rejection, removes row
- Search input → Filters verifications
- Filter/Sort buttons → Opens dropdown menus
- Pagination → Next/Previous page navigation
- Notification bell → Shows notifications panel

**Backend Integration Ready:**
- `/api/admin/verify/approve` - POST endpoint
- `/api/admin/verify/reject` - POST endpoint
- `/api/admin/verifications` - GET endpoint
- Authentication token from localStorage

---

### 4. Verifier Flow

#### 4.1 Verifier Dashboard (`Pages/verifier/verifier_dashboard.html`)
**Features:**
- Document type selection grid
- Role filter sidebar
- Selection queue panel
- Search functionality
- Multi-select document cards

**Navigation:**
- Back to Home → `Pages/landing/landing.html`
- Start Scanning button → `Pages/verifier/verifier_qr.html`

**Interactive Elements:**
- Document card selection (click to toggle)
- Visual feedback on selection (border color, checkmark)
- Selection queue updates in real-time
- Selection counter badge
- Clear selection button
- Role filter radio buttons
- Search input
- Sort dropdown

**State Management:**
- Selected documents stored in array
- Selection persisted to localStorage before scanning
- Dynamic UI updates on selection changes

#### 4.2 QR Scanner (`Pages/verifier/verifier_qr.html`)
**Features:**
- Live QR code scanning interface
- Animated scan line
- Camera controls
- Issue reporting

**Navigation:**
- Back to Dashboard button → `Pages/verifier/verifier_dashboard.html`

**Interactive Elements:**
- Back button
- Switch camera button
- Report issue button
- Loads selected documents from localStorage

---

## Key Interactive Features Across All Pages

### 1. Form Handling
- Real-time validation
- Loading states during submission
- Success/error notifications
- Password confirmation matching
- Email format validation

### 2. Navigation System
- `navigateTo(path)` function for all page transitions
- Relative path handling
- State preservation via localStorage
- Back navigation support

### 3. Authentication Flow
- Token storage in localStorage
- User data persistence
- Logout functionality with confirmation
- Session management ready for backend

### 4. Notification System
- Toast notifications for all actions
- Color-coded by type (success/error/info)
- Auto-dismiss after 3 seconds
- Smooth fade-out animation

### 5. State Management
- localStorage for user tokens
- localStorage for user names
- localStorage for selected documents (verifier)
- Session persistence across page reloads

---

## Backend Integration Points

### Volunteer Endpoints
- `POST /api/volunteer/login` - Login authentication
- `POST /api/volunteer/signup` - New user registration
- `GET /api/volunteer/profile` - User profile data
- `POST /api/volunteer/documents` - Document upload

### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/verifications` - Get pending verifications
- `POST /api/admin/verify/approve` - Approve verification
- `POST /api/admin/verify/reject` - Reject verification
- `GET /api/admin/stats` - Dashboard statistics

### Verifier Endpoints
- `POST /api/verifier/scan` - Process QR code scan
- `GET /api/verifier/documents` - Get document types
- `POST /api/verifier/verify` - Verify scanned credentials

---

## LocalStorage Keys Used

- `volunteerToken` - Volunteer authentication token
- `volunteerName` - Volunteer display name
- `adminAuthToken` - Admin authentication token
- `adminName` - Admin display name
- `selectedDocuments` - Verifier selected document types (JSON array)

---

## Testing the Navigation Flow

### Complete User Journey - Volunteer
1. Start at `Pages/landing/landing.html`
2. Click "Volunteer Login"
3. Enter credentials and click login
4. View dashboard with personalized greeting
5. Click "Upload Documents" or "Show Digital ID"
6. Click "Logout" to return to login

### Complete User Journey - Admin
1. Start at `Pages/landing/landing.html`
2. Click "Admin Portal"
3. Enter admin credentials
4. View verification dashboard
5. Click "Approve" or "Reject" on verification requests
6. See real-time updates to statistics

### Complete User Journey - Verifier
1. Start at `Pages/landing/landing.html`
2. Click "Verifier Mode"
3. Select document types from grid
4. View selection in queue panel
5. Click "Start Scanning"
6. Use QR scanner interface
7. Click "Back to Dashboard" to select different documents

---

## Notes for Developers

1. All navigation uses relative paths - works from any directory structure
2. Forms have validation and prevent empty submissions
3. Loading states prevent double-submission
4. All interactive elements have hover states
5. Notifications auto-dismiss but can be styled further
6. Backend API calls are stubbed with TODO comments
7. Demo mode allows testing without backend (uses setTimeout)
8. All pages are responsive and mobile-friendly
9. Dark mode is default across all pages
10. Material Icons used consistently throughout

---

## Future Enhancements

- Add forgot password functionality
- Implement actual QR code scanning library
- Add document upload pages
- Create admin user management pages
- Add audit log viewing
- Implement real-time notifications via WebSocket
- Add offline mode support
- Implement biometric authentication
- Add multi-language support
- Create onboarding tutorials
