# Ship Congo Commerce to Play Store & App Store

The web app is wrapped with **Capacitor 8** (`com.congocommerce.app` /
"Congo Commerce"). The native shells live in `android/` and `ios/`; the web
bundle in `dist/` is copied into both on every sync.

## Everyday workflow

```bash
npm run mobile:sync   # base44 build (injects prod app id) + copy into android/ + ios/
```

Re-run it after every web change before opening Android Studio / Xcode.
Regenerate icons only when the logo changes:

```bash
npm run mobile:assets  # re-renders assets/ from public/brand/logo-icon.svg
```

## What's already done

- `capacitor.config.ts` — app id, name, splash (dark `#07110D`), no mixed content.
- `android/` + `ios/` platforms added; `applicationId` and iOS bundle id are
  `com.congocommerce.app`, version `1.0 (code 1)`.
- 123 Android + 10 iOS icons/splashes generated from the brand logo.
- `index.html` has `viewport-fit=cover` (notch support).
- `public/manifest.json` now has real 192/512 + maskable PNGs (SVG-only icons
  are not installable).

## Android → Play Store (works on this Windows machine)

1. Install **Android Studio** (includes JDK 17 + SDK).
2. `npm run mobile:open:android`, let Gradle sync, Run on emulator/phone.
3. Release: **Build → Generate Signed Bundle/APK → Android App Bundle**.
   Create a new keystore once (`congo-commerce.keystore`) and back it up —
   losing it means you can never update the listing.
4. Bump versions in `android/app/build.gradle` for every release
   (`versionCode` +1, `versionName` e.g. `"1.1"`).
5. Upload the `.aab` in **Play Console** ($25 one-time account). First release
   must go through a closed test track before production.

## iOS → App Store (needs a Mac)

`ios/` is fully generated and synced, but Apple builds require macOS + Xcode —
this Windows machine cannot compile it. Options:

1. **Borrow/rent a Mac** (or MacStadium/AWS Mac): open
   `ios/App/App.xcworkspace`, set the Team in Signing & Capabilities, Product →
   Archive → Distribute to **App Store Connect** ($99/year Apple Developer).
2. **No Mac at all**: use a CI service (Codemagic, GitHub Actions macOS
   runner) that checks out this repo, runs `npm run mobile:sync`, and archives
   with your signing certificates.

Bump versions in Xcode (Target → General → Version/Build) per release.

## Store listings you'll prepare by hand

- Screenshots: 2+ phone screenshots per store (1080x2400 Android,
  1290x2796 iOS 6.7"), 7" tablet + feature graphic (1024x500) for Play.
- French description (the app is `lang: fr`), short + full text.
- Privacy policy URL (required by both stores) + data-safety form (Play) +
  App Privacy answers (Apple). The app uses location (delivery/maps), camera
  (product photos?) and mobile-money payments — declare all three.
- Content rating questionnaires on both consoles.

## Notes specific to this app

- **Payments:** physical-goods marketplace (mobile money, delivery) — exempt
  from Apple IAP / Google Play Billing. Keep selling physical goods only; the
  moment you sell digital content inside the app, both stores force their
  billing systems (15–30% cut).
- **Auth:** Base44 token auth lives in WebView localStorage — works as-is.
- **Never change** `applicationId` / bundle id after the first upload; the
  stores treat a new id as a different app and reviews/stats reset.
- **Publish the Base44 app first** (`base44 dashboard open`): the frontend
  boots by fetching hosted app settings, so the native build shows a login
  redirect until the first publish lands.
