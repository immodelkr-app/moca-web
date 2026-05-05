---
name: capacitor-native-patterns
description: Expert patterns for integrating native device features (Biometrics, Secure Storage, Camera) in Capacitor applications. Focuses on high-reliability bridges between Web and Native environments.
---

# Capacitor Native Patterns

You are an expert Capacitor Mobile Developer. Your goal is to bridge the gap between web code and native device capabilities with high reliability and security.

## Core Philosophy

1. **Environment Awareness**: Always check if the app is running in a Native vs. Web environment before calling plugins.
2. **Graceful Degradation**: Provide fallback UI (e.g., password login) if a native feature (e.g., FaceID) is unavailable or fails.
3. **Security First**: Never store sensitive credentials in `localStorage`. Use `Native Storage` or `Keychain/Keystore` via plugins.

## 1. Biometric Authentication Pattern

**Plugin**: `capacitor-native-biometric`

### Verification Workflow
1. **Check Availability**: Verify if the hardware exists and is enrolled.
2. **Execute Biometric**: Prompt the system dialog.
3. **Secure Retrieval**: If successful, retrieve the stored secret (Custom Token/Password) from the native keychain.

```javascript
import { NativeBiometric } from 'capacitor-native-biometric';

async function performBiometricLogin() {
  const result = await NativeBiometric.isAvailable();
  if (!result.isAvailable) return { error: 'Not available' };

  try {
    const verified = await NativeBiometric.verifyIdentity({
      reason: "Please verify your identity to log in",
      title: "Log In",
      subtitle: "Biometric Verification",
      description: "Use your fingerprint or FaceID",
    });

    // Retrieve secret stored during registration
    const credentials = await NativeBiometric.getCredentials({
      server: "immoca.kr"
    });
    
    return { success: true, token: credentials.password };
  } catch (err) {
    return { error: err.message };
  }
}
```

## 2. Environment & Platform Detection

Always use `@capacitor/core` to detect the platform.

```javascript
import { Capcitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform(); // true for iOS/Android
const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

// Pattern: Conditional logic
if (isNative) {
  // Use Native Biometrics
} else {
  // Use WebAuthn Passkeys or standard Login
}
```

## 3. High-Reliability Native Storage

Avoid `localStorage` for critical app state. Use `@capacitor/preferences`.

- **Web**: Persistent via IndexedDB/LocalStorage.
- **Native**: Persistent via `SharedPreferences` (Android) and `UserDefaults` (iOS).

```javascript
import { Preferences } from '@capacitor/preferences';

const setAuthStatus = async (status) => {
  await Preferences.set({ key: 'auth_status', value: status });
};
```

## 4. Troubleshooting & Best Practices

- **WebView Sync**: Remember that `npx cap sync` is required after every `npm run build` to reflect web changes in the native app.
- **Android Permissions**: Ensure `AndroidManifest.xml` includes necessary permissions (e.g., `USE_BIOMETRIC`).
- **iOS Info.plist**: Always provide a usage description (e.g., `NSFaceIDUsageDescription`) or the app will crash.
- **Console Debugging**: Use `adb logcat` (Android) or `Xcode Logs` (iOS) to see errors that don't appear in the browser console.

## 5. Deployment Checklist

- [ ] Version bump in `package.json`, `android/app/build.gradle`, and `Info.plist`.
- [ ] Asset sync: `npm run build && npx cap sync`.
- [ ] Permission check: Verify all `plist` and `xml` entries for new plugins.
- [ ] Edge-to-Edge: Ensure Android 15+ compatibility in `MainActivity.java`.
