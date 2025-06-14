Fast UI/logic testing (no native): npx expo start. Runs in Expo Go (not for notification testing)
Full feature testing with native: npx expo start --dev-client (Requires dev build already installed)
Build new dev client app: eas build --profile development. Takes longer, needed only if native code changed.
