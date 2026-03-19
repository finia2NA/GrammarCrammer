# Plan: Apple & Google OAuth Sign-In

> **Status: Deferred** — Postponed due to complexity around Apple Sign In on web (requires separate Services ID + server-side form_post callback). Pick up when ready to do a full native build.

## Context
The server already has fully working OAuth endpoints (`POST /auth/apple`, `POST /auth/google`) and the client already has `loginWithApple()` / `loginWithGoogle()` in `lib/api.ts`. Only the client UI and OAuth orchestration packages are missing.

**Platform strategy:**
| Platform | Apple | Google | Email/password |
|----------|-------|--------|----------------|
| iOS | ✅ native (required by App Store guideline 4.8 when offering any third-party login) | ✅ | ✅ |
| Web | ❌ skipped (needs Service ID — deferred) | ✅ | ✅ |

**Apple on web deferred**: Requires a separate Apple Services ID, private key, and server-side `form_post` callback. Not required by Apple for web. Users who sign in with Apple-only on iOS will need a "Set password" option in settings to access the web — that's a follow-up task (DB already supports it: `passwordHash` is nullable).

---

## Packages to Install (in `client/`)
```
pnpm add expo-apple-authentication expo-auth-session
```
- `expo-apple-authentication` — native iOS Sign In with Apple (Apple HIG-compliant button, uses native ASAuthorizationAppleIDProvider, no Service ID needed — uses Bundle ID as audience)
- `expo-auth-session` — OAuth2/OIDC redirect flow for Google on all platforms. `expo-web-browser` (already installed) satisfies the peer dep.

---

## Files to Modify / Create

### 1. `client/app.json`
Add `expo-apple-authentication` to plugins. This adds the `com.apple.developer.applesignin` entitlement during `expo prebuild` — without it, `signInAsync` throws `ERR_INVALID_OPERATION`.
```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", { ... }],
  "expo-apple-authentication"
]
```
Run `expo prebuild` + `expo run:ios` after this change.

### 2. Create `client/components/auth/AppleSignInButton.tsx` (fallback)
Shared props interface + no-op for non-iOS platforms:
```ts
export interface AppleSignInButtonProps {
  onSuccess: (identityToken: string) => void;
  onError: (err: Error) => void;
  disabled?: boolean;
}
export default function AppleSignInButton(_: AppleSignInButtonProps) { return null; }
```

### 3. Create `client/components/auth/AppleSignInButton.ios.tsx`
Native implementation. Follows the `PillDropdown.ios.tsx` platform-file pattern.
- Render `AppleAuthenticationButton` (type: SIGN_IN, style: BLACK in light / WHITE in dark via `useColorScheme()`, cornerRadius 12, height 50, full width)
- On press: `signInAsync({ requestedScopes: [EMAIL, FULL_NAME] })`
- Extract `credential.identityToken` → `onSuccess(token)`
- Swallow `ERR_REQUEST_CANCELED` silently (user tapped Cancel)
- Any other error → `onError(err)`

### 4. Create `client/components/auth/AppleSignInButton.web.tsx`
```ts
// TODO: Apple Sign In on web requires a Services ID + server-side form_post callback. Deferred.
import type { AppleSignInButtonProps } from './AppleSignInButton';
export default function AppleSignInButton(_: AppleSignInButtonProps) { return null; }
```

### 5. Create `client/components/auth/GoogleSignInButton.tsx` (all platforms, no split)
- `useAutoDiscovery('https://accounts.google.com')`
- `useAuthRequest`:
  - `clientId`: Web OAuth 2.0 client ID (browser flow on all platforms via expo-auth-session)
  - `redirectUri`: `makeRedirectUri({ scheme: 'grammarcrammer' })`
  - `responseType`: `ResponseType.IdToken`
  - `scopes`: `['openid', 'profile', 'email']`
- `useEffect` on `response`:
  - `'success'` → extract `response.params.id_token` → `onSuccess(idToken)`
  - `'error'` → `onError(...)`
  - `'cancel'` / `'dismiss'` → stop loading, no error
- Render a custom `TouchableOpacity` ("Continue with Google"), disabled while `loading || !request`

### 6. `client/app/onboarding.tsx`

**Expand `AccountCardProps`:**
```ts
onAppleSuccess: (identityToken: string) => void;
onGoogleSuccess: (idToken: string) => void;
onOAuthError: (err: Error) => void;
```

**Update `AccountCard` body** — insert above the Email label:
```
[AppleSignInButton onSuccess=onAppleSuccess onError=onOAuthError disabled=loading]
[GoogleSignInButton onSuccess=onGoogleSuccess onError=onOAuthError disabled=loading]
─── or ───          ← View/Text divider
Email field
Password field
...
```
Divider: `<View className="flex-row items-center my-5"><View className="flex-1 border-b border-border" /><Text className="text-muted-foreground text-xs mx-3">or</Text><View className="flex-1 border-b border-border" /></View>`

**Add OAuth handlers to `Onboarding`:**
```ts
async function handleAppleSignIn(identityToken: string) {
  setError(null); setLoading(true);
  try {
    const result = await loginWithApple(identityToken);
    await setAuthToken(result.token);
    goToStep(4); // hardcoded: always go to API key step
  } catch (e) { setError(e instanceof Error ? e.message : 'Apple sign-in failed.'); }
  finally { setLoading(false); }
}

async function handleGoogleSignIn(idToken: string) {
  setError(null); setLoading(true);
  try {
    const result = await loginWithGoogle(idToken);
    await setAuthToken(result.token);
    goToStep(4);
  } catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed.'); }
  finally { setLoading(false); }
}
```

**Update carousel array entry** (line ~315):
```ts
<AccountCard
  {...existingProps}
  onAppleSuccess={handleAppleSignIn}
  onGoogleSuccess={handleGoogleSignIn}
  onOAuthError={(e) => setError(e.message)}
/>
```

**Add imports:**
```ts
import AppleSignInButton from '@/components/auth/AppleSignInButton';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
// loginWithApple and loginWithGoogle already in api.ts, add to existing import
```

---

## Server `.env` Requirements

| Var | Value | How to get it |
|-----|-------|---------------|
| `APPLE_CLIENT_ID` | `com.finite.grammarcrammer` | Already your Bundle ID — no extra setup needed |
| `GOOGLE_CLIENT_ID` | Web OAuth 2.0 client ID | Google Cloud Console (see below) |

**Getting `GOOGLE_CLIENT_ID`:**
1. Google Cloud Console → APIs & Services → OAuth consent screen → External → scopes: `openid`, `email`, `profile`
2. Credentials → Create OAuth Client ID → **Web application**
3. Authorized redirect URIs: `grammarcrammer://` and `https://auth.expo.io/@<your-expo-username>/grammarcrammer`
4. Copy the client ID → both `server/.env` (`GOOGLE_CLIENT_ID=...`) and `GoogleSignInButton.tsx` (`const GOOGLE_CLIENT_ID = '...'`)

---

## Dev Limitations
- `expo-apple-authentication` **does not work in Expo Go** — requires `expo prebuild` + `expo run:ios`
- Google (`expo-auth-session`) **works in Expo Go** — test Google first before doing the native build
- Apple Sign In works on iOS Simulator (Xcode 11.2+): Settings → [Apple ID] on the simulator

---

## Follow-up Task (not in this plan)
Add a **"Set password" option in Settings** so Apple-only users can set a password and access the web. The server User model already supports this (`passwordHash` is nullable, multiple auth methods can coexist).

---

## Verification

**Google (Expo Go, fast):**
1. Set `GOOGLE_CLIENT_ID` in `server/.env`
2. `expo start` in `client/` → open in Expo Go
3. Onboarding → account step → tap "Continue with Google"
4. System browser opens Google consent → redirect back
5. API key screen appears (`goToStep(4)`)
6. `npx prisma studio` in `server/` → User row has `googleId` set

**Apple (dev build):**
1. `expo prebuild && expo run:ios` in `client/`
2. Onboarding → account step → tap Apple button
3. Native system sheet appears → authenticate
4. API key screen appears
5. Server logs: `POST /auth/apple 200`
6. Prisma Studio → User row has `appleId` set

**Error cases:**
- Cancel on Apple sheet → `ERR_REQUEST_CANCELED` swallowed → no error shown
- Cancel on Google browser → `response.type === 'cancel'` → loading stops, no error
- Server rejects token → error text appears below the buttons
- `loading=true`: all buttons disabled (social + email/password submit)
- Carousel height: `AccountCard` grows naturally, `onPanelLayout` handles the updated height automatically
