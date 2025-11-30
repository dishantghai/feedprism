# F-010: Gmail OAuth Authentication & Multi-User Support

**Priority:** P2 (Do soon - next sprint)

## Problem
Currently, the app uses a hardcoded `token.json` file for Gmail API access, which means:
- Only one user (the developer) can use the app
- Users cannot log in with their own Gmail accounts
- Token management is manual and error-prone
- No proper user sessions or multi-user support
- Security risk: tokens stored in repository
- Cannot demo to others or deploy publicly

## Goal
- Implement **OAuth 2.0 authentication** flow for Gmail
- Allow **any user** to log in with their Gmail account
- **Securely store** user tokens in database (not files)
- Support **multiple users** with separate data isolation
- Provide **token refresh** mechanism for long-term access
- Add **logout** functionality
- Create a proper **login/signup flow** UI
- Enable **public deployment** without security concerns

---

## User Flow

### 1. First-Time User (Sign Up)

**Landing Page:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    🔷 FeedPrism                              │
│                                                              │
│         Your Email Intelligence Layer for Spayce             │
│                                                              │
│   Turn content-rich emails into searchable, organized        │
│   knowledge. Events, courses, blogs, and actions—all         │
│   in one place.                                              │
│                                                              │
│                                                              │
│              [🔐 Sign in with Google]                        │
│                                                              │
│                                                              │
│   By signing in, you agree to our Terms and Privacy Policy  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**OAuth Flow:**
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. User selects Gmail account
4. Google shows permission request:
   - Read emails
   - View email metadata
   - Access Gmail labels
5. User clicks "Allow"
6. Redirects back to app with authorization code
7. App exchanges code for access token + refresh token
8. App creates user account and stores tokens
9. User lands on dashboard

### 2. Returning User (Login)

**Login Flow:**
1. User visits app
2. Checks for existing session (cookie/JWT)
3. If no session: Shows landing page with "Sign in with Google"
4. If session exists but token expired: Auto-refresh token
5. If refresh fails: Prompt re-authentication
6. If session valid: Load dashboard

### 3. Logout

**Logout Flow:**
1. User clicks "Logout" in settings/profile menu
2. Confirmation modal: "Are you sure? Your data will remain saved."
3. User confirms
4. App revokes Google access token
5. Clears session cookie/JWT
6. Redirects to landing page

---

## Implementation Details

### Frontend Components

#### 1. LandingPage Component
```tsx
// src/pages/LandingPage.tsx
const LandingPage: React.FC = () => {
  const handleGoogleSignIn = () => {
    // Redirect to backend OAuth initiation endpoint
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="logo">🔷 FeedPrism</div>
        <h1>Your Email Intelligence Layer for Spayce</h1>
        <p>
          Turn content-rich emails into searchable, organized knowledge.
          Events, courses, blogs, and actions—all in one place.
        </p>
        <button 
          className="google-signin-btn"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Sign in with Google
        </button>
        <p className="terms">
          By signing in, you agree to our{' '}
          <a href="/terms">Terms</a> and{' '}
          <a href="/privacy">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};
```

#### 2. OAuthCallback Component
```tsx
// src/pages/OAuthCallback.tsx
const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setError('Authentication failed. Please try again.');
        return;
      }

      if (!code) {
        setError('No authorization code received.');
        return;
      }

      try {
        // Exchange code for tokens
        const response = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate');
        }

        const { user, token } = await response.json();
        
        // Store JWT token
        localStorage.setItem('auth_token', token);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="oauth-error">
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="oauth-loading">
      <div className="spinner" />
      <p>Completing sign in...</p>
    </div>
  );
};
```

#### 3. AuthContext (State Management)
```tsx
// src/contexts/AuthContext.tsx
interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (err) {
        localStorage.removeItem('auth_token');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => {
    window.location.href = '/api/auth/google';
  };

  const logout = async () => {
    const token = localStorage.getItem('auth_token');
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = '/';
  };

  const refreshToken = async () => {
    const token = localStorage.getItem('auth_token');
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const { token: newToken } = await response.json();
        localStorage.setItem('auth_token', newToken);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (err) {
      // Refresh failed, force re-login
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

#### 4. ProtectedRoute Component
```tsx
// src/components/ProtectedRoute.tsx
const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  return <>{children}</>;
};

// Usage in App.tsx:
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/auth/callback" element={<OAuthCallback />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  {/* ... other protected routes */}
</Routes>
```

### Backend API

#### 1. OAuth Initiation Endpoint
```python
# app/api/auth.py
from fastapi import APIRouter, HTTPException, Response
from google_auth_oauthlib.flow import Flow
import os

router = APIRouter(prefix="/auth", tags=["auth"])

# OAuth configuration
SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

REDIRECT_URI = os.getenv('OAUTH_REDIRECT_URI', 'http://localhost:3000/auth/callback')

@router.get("/google")
async def google_auth_init():
    """
    Initiate Google OAuth flow.
    Redirects user to Google consent screen.
    """
    flow = Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',  # Request refresh token
        include_granted_scopes='true',
        prompt='consent'  # Force consent screen to get refresh token
    )
    
    # Store state in session for CSRF protection
    # (In production, use Redis or database)
    
    return Response(
        status_code=302,
        headers={'Location': authorization_url}
    )
```

#### 2. OAuth Callback Endpoint
```python
# app/api/auth.py (continued)
from app.services.auth_service import AuthService
from app.models.user import User
from datetime import datetime, timedelta
import jwt

@router.post("/callback")
async def google_auth_callback(code: str):
    """
    Handle OAuth callback.
    Exchange authorization code for tokens and create/update user.
    """
    try:
        # Exchange code for tokens
        flow = Flow.from_client_secrets_file(
            'credentials.json',
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        # Get user info from Google
        from googleapiclient.discovery import build
        oauth2_service = build('oauth2', 'v2', credentials=credentials)
        user_info = oauth2_service.userinfo().get().execute()
        
        # Create or update user in database
        auth_service = AuthService()
        user = await auth_service.create_or_update_user(
            google_id=user_info['id'],
            email=user_info['email'],
            name=user_info.get('name', ''),
            picture=user_info.get('picture', ''),
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expiry=credentials.expiry
        )
        
        # Generate JWT for session management
        jwt_token = create_jwt_token(user.id)
        
        return {
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'picture': user.picture
            },
            'token': jwt_token
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

def create_jwt_token(user_id: str) -> str:
    """Create JWT token for user session."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=30),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, os.getenv('JWT_SECRET'), algorithm='HS256')
```

#### 3. Get Current User Endpoint
```python
# app/api/auth.py (continued)
from fastapi import Depends
from app.dependencies import get_current_user

@router.get("/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'picture': user.picture
    }
```

#### 4. Logout Endpoint
```python
# app/api/auth.py (continued)
@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    """
    Logout user and revoke Google access token.
    """
    try:
        # Revoke Google access token
        from google.oauth2.credentials import Credentials
        import requests
        
        credentials = Credentials(token=user.access_token)
        requests.post(
            'https://oauth2.googleapis.com/revoke',
            params={'token': credentials.token},
            headers={'content-type': 'application/x-www-form-urlencoded'}
        )
        
        # Optional: Mark user session as logged out in database
        # (For JWT, just remove token on client side)
        
        return {'message': 'Logged out successfully'}
        
    except Exception as e:
        # Even if revocation fails, allow logout
        return {'message': 'Logged out (token revocation failed)'}
```

#### 5. Token Refresh Endpoint
```python
# app/api/auth.py (continued)
@router.post("/refresh")
async def refresh_access_token(user: User = Depends(get_current_user)):
    """
    Refresh expired Google access token using refresh token.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        
        credentials = Credentials(
            token=user.access_token,
            refresh_token=user.refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET')
        )
        
        # Refresh the token
        credentials.refresh(Request())
        
        # Update user's tokens in database
        auth_service = AuthService()
        await auth_service.update_user_tokens(
            user_id=user.id,
            access_token=credentials.token,
            token_expiry=credentials.expiry
        )
        
        # Generate new JWT
        new_jwt_token = create_jwt_token(user.id)
        
        return {'token': new_jwt_token}
        
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token refresh failed")
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User tokens table (encrypted)
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,      -- Encrypted
  refresh_token TEXT NOT NULL,     -- Encrypted
  token_expiry TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Update items table to associate with users
ALTER TABLE items 
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_items_user_id ON items(user_id);

-- Update user_saved_tags to reference users table
ALTER TABLE user_saved_tags
ADD CONSTRAINT fk_user_saved_tags_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Auth Service

```python
# app/services/auth_service.py
from app.models.user import User, UserToken
from app.database import get_db
from cryptography.fernet import Fernet
import os

class AuthService:
    def __init__(self):
        # Encryption key for tokens (store in env)
        self.cipher = Fernet(os.getenv('ENCRYPTION_KEY').encode())
    
    async def create_or_update_user(
        self,
        google_id: str,
        email: str,
        name: str,
        picture: str,
        access_token: str,
        refresh_token: str,
        token_expiry
    ) -> User:
        """
        Create new user or update existing user with new tokens.
        """
        db = get_db()
        
        # Check if user exists
        user = await db.fetch_one(
            "SELECT * FROM users WHERE google_id = $1",
            google_id
        )
        
        if user:
            # Update existing user
            await db.execute(
                """
                UPDATE users 
                SET email = $1, name = $2, picture = $3, updated_at = NOW()
                WHERE google_id = $4
                """,
                email, name, picture, google_id
            )
            user_id = user['id']
        else:
            # Create new user
            user_id = await db.fetch_val(
                """
                INSERT INTO users (google_id, email, name, picture)
                VALUES ($1, $2, $3, $4)
                RETURNING id
                """,
                google_id, email, name, picture
            )
        
        # Encrypt and store tokens
        encrypted_access = self.cipher.encrypt(access_token.encode()).decode()
        encrypted_refresh = self.cipher.encrypt(refresh_token.encode()).decode()
        
        await db.execute(
            """
            INSERT INTO user_tokens (user_id, access_token, refresh_token, token_expiry)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                access_token = $2,
                refresh_token = $3,
                token_expiry = $4,
                updated_at = NOW()
            """,
            user_id, encrypted_access, encrypted_refresh, token_expiry
        )
        
        return User(
            id=user_id,
            google_id=google_id,
            email=email,
            name=name,
            picture=picture
        )
    
    async def get_user_credentials(self, user_id: str):
        """
        Get decrypted credentials for a user.
        """
        db = get_db()
        
        tokens = await db.fetch_one(
            "SELECT access_token, refresh_token, token_expiry FROM user_tokens WHERE user_id = $1",
            user_id
        )
        
        if not tokens:
            return None
        
        # Decrypt tokens
        access_token = self.cipher.decrypt(tokens['access_token'].encode()).decode()
        refresh_token = self.cipher.decrypt(tokens['refresh_token'].encode()).decode()
        
        from google.oauth2.credentials import Credentials
        
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET')
        )
```

### Dependency Injection

```python
# app/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, os.getenv('JWT_SECRET'), algorithms=['HS256'])
        user_id = payload.get('user_id')
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Fetch user from database
        db = get_db()
        user = await db.fetch_one(
            "SELECT * FROM users WHERE id = $1",
            user_id
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return User(**user)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
```

---

## Environment Variables

```bash
# .env
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT
JWT_SECRET=your_random_secret_key_here

# Token encryption
ENCRYPTION_KEY=your_fernet_encryption_key_here

# Production
# OAUTH_REDIRECT_URI=https://feedprism.app/auth/callback
```

---

## Security Considerations

### 1. Token Storage
- **Access tokens:** Encrypted in database using Fernet
- **Refresh tokens:** Encrypted in database
- **JWT tokens:** Stored in localStorage (client-side)
- **Never** commit tokens to repository

### 2. CSRF Protection
- Use `state` parameter in OAuth flow
- Validate state on callback

### 3. Token Expiry
- Access tokens expire after 1 hour (Google default)
- Refresh tokens used to get new access tokens
- JWT tokens expire after 30 days
- Auto-refresh before expiry

### 4. Scope Minimization
- Only request necessary Gmail scopes
- `gmail.readonly` (not `gmail.modify`)
- User info scopes for profile

### 5. HTTPS Only
- Production must use HTTPS
- Secure cookies with `httpOnly`, `secure`, `sameSite`

---

## Acceptance Criteria

### OAuth Flow
- [ ] "Sign in with Google" button on landing page
- [ ] Redirects to Google OAuth consent screen
- [ ] User can select Gmail account
- [ ] Shows correct permission scopes
- [ ] Handles "Allow" and creates user account
- [ ] Handles "Deny" and shows error message
- [ ] Redirects to dashboard on success

### User Management
- [ ] New user account created on first sign-in
- [ ] Existing user updated on subsequent sign-ins
- [ ] User profile shows name, email, picture
- [ ] Tokens stored encrypted in database
- [ ] User data isolated by user_id

### Session Management
- [ ] JWT token generated on login
- [ ] Token stored in localStorage
- [ ] Token sent in Authorization header
- [ ] Token validated on protected routes
- [ ] Expired tokens trigger re-authentication

### Token Refresh
- [ ] Refresh token stored securely
- [ ] Access token auto-refreshed before expiry
- [ ] Refresh failures trigger re-login
- [ ] User not interrupted during refresh

### Logout
- [ ] Logout button in settings/profile menu
- [ ] Confirmation modal before logout
- [ ] Google access token revoked
- [ ] JWT token removed from localStorage
- [ ] Redirects to landing page

### Security
- [ ] Tokens encrypted in database
- [ ] No tokens in repository or logs
- [ ] CSRF protection with state parameter
- [ ] HTTPS enforced in production
- [ ] Secure cookie settings

### Multi-User Support
- [ ] Each user sees only their own data
- [ ] Items filtered by user_id
- [ ] Saved tags scoped to user
- [ ] No data leakage between users

### Error Handling
- [ ] OAuth errors shown to user
- [ ] Network errors handled gracefully
- [ ] Token refresh failures trigger re-login
- [ ] User-friendly error messages

---

## Implementation Phases

### Phase 1: Core OAuth (P2 - Next Sprint)
- [ ] Google OAuth setup (credentials.json)
- [ ] Landing page with "Sign in with Google"
- [ ] OAuth initiation endpoint
- [ ] OAuth callback endpoint
- [ ] User creation in database
- [ ] JWT token generation
- [ ] Basic session management

### Phase 2: Token Management
- [ ] Token encryption in database
- [ ] Refresh token flow
- [ ] Auto-refresh before expiry
- [ ] Logout with token revocation
- [ ] Protected routes

### Phase 3: Multi-User Support
- [ ] User data isolation (user_id filtering)
- [ ] Update all queries to filter by user
- [ ] User profile page
- [ ] Settings page

### Phase 4: Polish & Security
- [ ] CSRF protection
- [ ] Error handling improvements
- [ ] Loading states
- [ ] Production deployment config
- [ ] Security audit

---

## Metrics to Track

- **Adoption:** # of users who sign up
- **Retention:** % of users who return after 7 days
- **Auth Success Rate:** % of successful OAuth flows
- **Token Refresh Rate:** # of token refreshes per day
- **Errors:** OAuth errors, token refresh failures

---

## Related Work

- **F-008:** Source Email Modal (uses user's Gmail credentials)
- **F-007:** Filter by Sender (user-specific senders)
- **F-006:** Saved Tags (user-specific saved tags)
- **Phase 1:** Email ingestion (now per-user)

---

## Migration Plan (Existing Data)

If there's existing data from the single-user setup:

1. **Create default user** for existing data
2. **Assign all items** to default user
3. **Migrate token.json** to database (encrypted)
4. **Test** that default user can access all old data
5. **Deploy** new OAuth flow for new users

```sql
-- Migration script
INSERT INTO users (id, google_id, email, name)
VALUES (
  'default-user-id',
  'existing-google-id',
  'your-email@gmail.com',
  'Default User'
);

UPDATE items SET user_id = 'default-user-id' WHERE user_id IS NULL;
UPDATE user_saved_tags SET user_id = 'default-user-id' WHERE user_id IS NULL;
```

---

## Testing Checklist

- [ ] Test OAuth flow with new Google account
- [ ] Test OAuth flow with existing account
- [ ] Test "Deny" permission scenario
- [ ] Test token refresh after 1 hour
- [ ] Test logout and re-login
- [ ] Test multiple users simultaneously
- [ ] Test data isolation between users
- [ ] Test expired JWT token
- [ ] Test network failures during OAuth
- [ ] Test production deployment

---

## Documentation Needed

- [ ] Setup guide for Google OAuth credentials
- [ ] Environment variables documentation
- [ ] User guide for sign-in/sign-out
- [ ] Developer guide for adding protected routes
- [ ] Security best practices
