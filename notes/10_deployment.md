# Deployment

## Packaging Stack
- `electron-vite` for app bundling
- `electron-builder` for installers and distributables

## Product Identity
- Product name: `ChatControl`
- App id: `com.chatcontrol.app`

## Output Targets
### macOS
- DMG artifact
- `notarize: false` in the current config
- `build/entitlements.mac.plist` is inherited during packaging

### Windows
- NSIS installer
- Executable name: `ChatControl`

### Linux
- AppImage
- `.deb`

## Packaging Notes
- `.env` files are excluded from packaged output
- OAuth credentials are resolved from the real runtime environment first; local `.env` fallback is only relevant when that file exists beside the development workspace/app path
- `better-sqlite3` is unpacked from ASAR
- `resources/**` is unpacked from ASAR
- npm native rebuild is enabled during packaging

## Release Checklist
1. Confirm `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present only in the release environment, not packaged assets.
3. Launch a build and test login, stream detection, overlay toggle, restore, and manual stop.
4. Validate the app user-data path is writable on the target OS.
5. For macOS release distribution, add signing and notarization before public shipping.

## Current Deployment Limits
- No auto-update pipeline
- No production signing/notarization automation yet
- No CI release workflow checked into this repository yet
