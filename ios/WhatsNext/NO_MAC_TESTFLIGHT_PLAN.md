# No-Mac TestFlight Deployment Plan

## Situation

- No Mac available — Xcode cannot be run locally.
- Only device available: iPhone 14 Pro.
- GitHub Actions iOS Simulator Build is **green** (commit `1dae37d`).
- A simulator build confirms compilation. It does not produce a signed IPA.
- iPhone installation requires a **signed build** distributed through Apple's system.
- The PWA (`/src`) remains as a reference/demo implementation and is not deleted.

---

## Why TestFlight Is the Only Realistic Path

| Option | Requires Mac | Requires Apple Developer ($99/yr) | Works without Mac |
|--------|-------------|----------------------------------|-------------------|
| Xcode run on device (USB) | Yes | No (free provisioning) | No |
| Ad-hoc IPA sideload | Yes | Yes | No |
| AltStore / sideloading tools | Partially | No | Fragile, unsupported |
| **TestFlight** | **No (CI builds)** | **Yes** | **Yes** |
| App Store public release | No (CI builds) | Yes | Yes |

**Conclusion:** GitHub Actions can produce a signed IPA and upload it to App Store Connect without a Mac, but only if Apple Developer credentials are configured as GitHub secrets.

---

## Required Steps (in order)

### Step 1 — Join Apple Developer Program
- Go to: https://developer.apple.com/programs/
- Cost: USD 99 / year
- After enrollment, you receive a **Team ID** (10-character alphanumeric string)

### Step 2 — Register App ID in Apple Developer Portal
- Bundle ID: `com.todayone.whatsnext` (must match `project.yml`)
- Enable capabilities: App Groups
- Widget Extension Bundle ID: `com.todayone.whatsnext.widget`
- App Group: `group.com.todayone.whatsnext`

### Step 3 — Create App Record in App Store Connect
- Go to: https://appstoreconnect.apple.com
- New App → iOS → fill in display name, bundle ID, SKU, primary language
- This creates the slot where TestFlight builds are uploaded

### Step 4 — Create Distribution Certificate and Provisioning Profile
- In Apple Developer portal: create an **iOS Distribution** certificate
- Export it as a `.p12` file with a password
- Create an **App Store** provisioning profile for `com.todayone.whatsnext`
- Create a second profile for the widget extension `com.todayone.whatsnext.widget`
- Base64-encode both the `.p12` and the provisioning profile `.mobileprovision` files

### Step 5 — Create App Store Connect API Key
- In App Store Connect → Users and Access → Integrations → App Store Connect API
- Create a key with **Developer** role (sufficient for TestFlight uploads)
- Download the `.p8` file (downloadable only once)
- Note the **Key ID** and **Issuer ID**

### Step 6 — Add GitHub Secrets
- See the secrets table in the CI Workflow Scaffold section below

### Step 7 — Trigger the TestFlight Workflow
- In GitHub → Actions → `iOS TestFlight` → Run workflow (manual dispatch)
- The workflow archives, signs, and uploads the IPA to TestFlight

### Step 8 — Install on iPhone via TestFlight
- Install the TestFlight app from the App Store on iPhone
- Accept the TestFlight invitation email (or use the internal link)
- Install the build directly from TestFlight

---

## Current Build Status

| Check | Status |
|-------|--------|
| GitHub Actions iOS Simulator Build | Green (commit `1dae37d`) |
| Signed IPA | Not yet — requires Apple Developer credentials |
| TestFlight upload | Not yet |
| iPhone install | Not yet |
