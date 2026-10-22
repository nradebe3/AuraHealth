# Aura Health - Windows Installation and Friend Testing Guide

This project connects to the **existing Aura Health Supabase database**. You do not need to install PostgreSQL, create a Supabase account/project, run SQL migrations, or rebuild the database.

## 1. Install the software (clean Windows 10/11)

Install these three applications:

1. **Node.js LTS (includes npm):** https://nodejs.org/en/download
   - Download the Windows installer and accept the default options.
   - Close and reopen PowerShell after installing.
3. **Google Chrome:** https://www.google.com/chrome/
   - Use Chrome to test the browser version of Aura Health.

No Android Studio, PostgreSQL, or Supabase CLI installation is needed for browser testing.

## 2. Extract the project

1. Download the supplied Aura Health ZIP file.
2. Create the folder `C:\Projects` if it does not exist.
3. Extract the ZIP so that the file `package.json` is located at:
   `C:\Projects\AuraHealth\package.json`

## 3. Verify Node.js and npm

Open **Windows PowerShell** (Start menu) and enter:

```powershell
node --version
npm --version
```

Both commands should print a version number. If Windows says a command is not recognized, restart PowerShell or reinstall Node.js LTS.

## 4. Open the project in VS Code (optional but recommended)

In PowerShell:

```powershell
cd C:\Projects\AuraHealth
code .
```

If `code .` is not recognized, open VS Code manually and select **File > Open Folder**, then choose `C:\Projects\AuraHealth_Friend_Testing`.

You can run the remaining commands in PowerShell or VS Code's **Terminal > New Terminal**.

## 5. Install dependencies

From the folder containing `package.json`, run:

```powershell
npm ci
```

Wait until installation finishes. If the lockfile causes an error, try `npm install` instead.

## 6. Start Aura Health in Chrome

Run:

```powershell
npx expo start --web
```

Wait for Expo to bundle the app. Chrome may open automatically; otherwise open the local address shown in the terminal, commonly `http://localhost:8081`.

If the terminal asks to install an Expo web dependency, follow its prompt and then restart the command.

## 7. Log in and test

Use a **test account provided by the project owner**. Do not register or use real patients for testing unless the project owner has explicitly arranged an appropriate authorized test process.

Suggested checks:
- Login and logout
- Patient profile and facility directory
- Appointment booking, rescheduling and cancellation
- Clinician triage and Save Triage Record
- Medical history and queue views
- Role-based access controls

All testers use the **same hosted Supabase backend**. Changes made by one tester may affect other testers.

## 8. Stop or restart the app

Press **Ctrl + C** in the terminal to stop Expo.

To restart:

```powershell
cd C:\Projects\AuraHealth
npx expo start --web
```

To clear Expo's cache after a code change:

```powershell
npx expo start -c --web
```

## Troubleshooting

**`node` or `npm` is not recognized:** Restart PowerShell; check the Node.js installation.

**PowerShell says `npm.ps1` cannot be loaded:** Try `npm.cmd ci` and `npx.cmd expo start --web` instead of changing system-wide execution policies.

**`npm ci` fails because of the lockfile:** Run `npm install` and retry.

**Expo shows a bundling error:** Copy the full error text and send it to the project owner.

**Login fails:** Verify your assigned test email/password with the project owner; do not create a new Supabase project.

**The app loads but data cannot be saved:** Record the error displayed on screen and the steps you followed.

## What is included and excluded

Included: Expo application screens, shared components, TypeScript config, assets, package manifest and lockfile, and public Supabase client configuration.

The included public Supabase URL and anon key allow the client to connect to the existing project. 
