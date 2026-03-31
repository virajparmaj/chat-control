# Security Sweep and Remediation Report (2026-03-31)

## Scope
- Workspace: `/Users/veerr_89/Work`
- Host sweep (accessible paths): `/Users/veerr_89` excluding protected folders where access is denied by macOS privacy controls
- Indicators checked:
  - `plain-crypto-js@4.2.1`
  - `axios@1.14.1`
  - `axios@0.30.4`
  - `sfrclak.com`
  - `142.11.206.73`
  - `/Library/Caches/com.apple.act.mond`
  - `/tmp/ld.py`

## Results
- No matches found for the malicious packages/versions in scanned manifests and lockfiles.
- No matches found for IOC network indicators in `/Users/veerr_89/Work`.
- IOC artifact files were not present:
  - missing: `/Library/Caches/com.apple.act.mond`
  - missing: `/tmp/ld.py`
- Global npm tree check:
  - `axios@1.13.6` detected under `/opt/homebrew/lib` (safe versus reported malicious versions)
  - no `plain-crypto-js` detected
- npm cache checks:
  - no cached entries for `plain-crypto-js`, `axios@1.14.1`, or `axios@0.30.4`

## Per-Path Findings (Node Repos in `/Users/veerr_89/Work`)
- `/Users/veerr_89/Work/stolen/claude-ecc-setup/repos/everything-claude-code` → clean
- `/Users/veerr_89/Work/stolen/claude-ecc-setup/repos/everything-claude-code/.opencode` → clean
- `/Users/veerr_89/Work/stolen/whatsapp-message-scheduler` → clean
- `/Users/veerr_89/Work/tools/chat-control` → clean
- `/Users/veerr_89/Work/tools/locked-in` → clean
- `/Users/veerr_89/Work/tools/pix-shift` → clean
- `/Users/veerr_89/Work/tools/snapback-app` → clean
- `/Users/veerr_89/Work/tools/what-time` → clean
- `/Users/veerr_89/Work/website/all-things-pdf` → clean
- `/Users/veerr_89/Work/website/anti-re-edit` → clean
- `/Users/veerr_89/Work/website/back-pack` → clean
- `/Users/veerr_89/Work/website/campus-connect-hub` → clean
- `/Users/veerr_89/Work/website/haveaenikeday` → clean
- `/Users/veerr_89/Work/website/heic-to-jpg-pro` → clean
- `/Users/veerr_89/Work/website/hooked-harmony-studio` → clean
- `/Users/veerr_89/Work/website/illini-drive-hub` → clean
- `/Users/veerr_89/Work/website/mann-ke-bachhe` → clean
- `/Users/veerr_89/Work/website/prerana-arch-folio` → clean
- `/Users/veerr_89/Work/website/risk-stability-insights` → clean
- `/Users/veerr_89/Work/website/scrap-core-defender` → clean
- `/Users/veerr_89/Work/website/smart-stock-insights` → clean
- `/Users/veerr_89/Work/website/snapback-memories` → clean
- `/Users/veerr_89/Work/website/turbine-nox-wise` → clean
- `/Users/veerr_89/Work/website/upskin-survey` → clean

## CI/CD Hardening Applied
- Updated GitHub workflows to enforce script-blocked dependency installs:
  - `/Users/veerr_89/Work/website/back-pack/.github/workflows/ci.yml`
  - `/Users/veerr_89/Work/stolen/claude-ecc-setup/repos/everything-claude-code/.github/workflows/ci.yml`
  - `/Users/veerr_89/Work/stolen/claude-ecc-setup/repos/everything-claude-code/.github/workflows/reusable-test.yml`
  - `/Users/veerr_89/Work/stolen/claude-ecc-setup/repos/everything-claude-code/.github/workflows/maintenance.yml`
- Install commands changed to `--ignore-scripts` equivalents for `npm`, `pnpm`, `yarn`, and `bun` where applicable.

## Validation
- Post-change workflow scan: no plain install commands remain in the modified workflow files without `--ignore-scripts`.
- Local install/build/test validation:
  - `back-pack`: `npm ci --ignore-scripts` succeeded; `npm run build` succeeded.
  - `everything-claude-code`: `npm ci --ignore-scripts` succeeded; `npm test -- --runInBand` succeeded with full pass.

## Notes
- `npm config get ignore-scripts` is still `false` globally on this machine. CI is now hardened in the modified workflows regardless of local npm defaults.
- macOS denied access to a few privacy-protected directories during host scan (`Documents`, media libraries, etc.). For full host coverage, run the same scan from a terminal with Full Disk Access enabled.
