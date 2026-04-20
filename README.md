# POV QR Photo Challenge — Google Drive MVP

A full web app scaffold for a QR-based event photo collection experience.

## What this app does

- Lets you create an event from `/admin`
- Generates a join URL you can convert into a QR code
- Lets guests open `/join/[eventId]`
- Lets guests upload images from their phone or laptop
- Stores uploaded images in **your Google Drive** inside an event-specific folder
- Stores event metadata in `event.json` inside the same event folder

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Google Drive API via `googleapis`
- QR code generation via `qrcode`

## Architecture

This MVP treats Google Drive like:

- **object storage** for photos
- **metadata storage** for event configuration (`event.json`)

When you create an event, the backend creates a structure like this:

```txt
POV App/
  your-event-id/
    photos/
    metadata/
    event.json
```

Each guest upload is sent to the `photos/` folder.

## Important MVP limitation

This project is intentionally simple.

It does **not** use a traditional database.
That means:

- event metadata lives in Drive
- the public gallery is built by listing files in the event's `photos` folder
- there is no guest account system
- there is no strong write concurrency protection for richer metadata operations

For weddings, parties, and small-to-medium events, this is a good MVP.

---

## 1. Create a Google Cloud project

1. Open Google Cloud Console.
2. Create a project.
3. Enable the **Google Drive API**.
4. Configure the OAuth consent screen.
5. Create **OAuth 2.0 Client ID** credentials for a **Web application**.

### Recommended redirect URIs

For local development:

```txt
http://127.0.0.1:3000/oauth2callback
```

For production, add your deployed domain callback too if you want to reuse the same client:

```txt
https://your-domain.com/oauth2callback
```

> Note: this app does not use an in-app owner login flow yet. Instead, you generate a long-lived refresh token once and store it in environment variables.

---

## 2. Generate a refresh token

This project includes a helper script.

### Copy env file

```bash
cp .env.example .env.local
```

Fill in:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/oauth2callback`

Important: use the exact same redirect URI string everywhere (Google Cloud Console OAuth client + `.env.local` + refresh-token generation). `127.0.0.1` and `localhost` are treated as different values by Google.

Then run:

```bash
npm install
npm run get-refresh-token
```

What happens:

- the script prints a consent URL
- you open it in your browser
- Google redirects back to your local callback server
- the terminal prints `GOOGLE_REFRESH_TOKEN`

Copy that token into `.env.local`.

---

## 3. Configure environment variables

Use this as your `.env.local` template:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=change-me

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/oauth2callback
GOOGLE_REFRESH_TOKEN=...

# Optional
DRIVE_ROOT_FOLDER_ID=
```

### Optional: dedicated Drive folder

You can create a folder in Drive called `POV App` and place its folder ID in `DRIVE_ROOT_FOLDER_ID`.

If you leave it blank, the app will try to create or reuse a top-level `POV App` folder.

---

## 4. Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

Admin page:

```txt
http://localhost:3000/admin
```

---

## 5. How to use the app

### Create an event

1. Visit `/admin`
2. Enter the admin password
3. Fill out event title, date, prompts, and target photo count
4. Click **Create event**

The app will:

- create a new Drive folder for the event
- create `photos/`
- create `metadata/`
- create `event.json`
- generate the join URL
- render the QR code

### Share with guests

- print the QR code
- or send the join URL directly

Guests can upload images from their phone and the images will land in your Drive.

---

## 6. Deploy to Vercel

### A. Push the project to GitHub

```bash
git init
git add .
git commit -m "Initial POV app"
```

Push to GitHub.

### B. Import into Vercel

1. Create a new Vercel project from the repo.
2. Add the same environment variables from `.env.local` into Vercel project settings.
3. Set:

```txt
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

4. Deploy.

### C. Test production

- Open `/admin`
- create an event
- open the join page on your phone
- upload images
- confirm they appear in Google Drive

### D. Pre-deploy checklist

- confirm `GOOGLE_REDIRECT_URI` exactly matches one authorized redirect URI in Google Cloud
- confirm `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` belong to the same OAuth client that issued your refresh token
- confirm `GOOGLE_REFRESH_TOKEN` is present and not wrapped in quotes
- set `NEXT_PUBLIC_APP_URL` to your deployed URL (not localhost)
- verify all env vars in Vercel exactly mirror your local working values

---

## 7. Recommended production improvements

If you want to make this real-product ready, the next upgrades should be:

1. add a real database for event indexing and analytics
2. add rate limiting on uploads
3. compress images before upload
4. add image thumbnails and gallery previews
5. add host authentication instead of a shared admin password
6. add per-event secret tokens instead of public event IDs
7. add an event wall / slideshow view
8. add background jobs for AI curation

---

## 8. Project structure

```txt
app/
  admin/page.tsx              # host dashboard + QR output
  join/[eventId]/page.tsx     # guest page
  api/events/create/route.ts  # create event in Drive
  api/events/[eventId]/route.ts
  api/upload/route.ts         # upload image to Drive
components/
  ui.tsx
lib/
  google-drive.ts             # Drive API integration
  prompts.ts
  validators.ts
  types.ts
  utils.ts
tools/
  get-refresh-token.mjs
```

---

## 9. Security notes

This MVP uses:

- one admin password
- one owner Google Drive refresh token
- public join URLs

That is enough for a private MVP, but not enough for a fully hardened production app.

---

## 10. Troubleshooting

### `Missing environment variable`
Check `.env.local` and restart the dev server.

### `Invalid admin password`
Make sure the password entered on `/admin` matches `ADMIN_PASSWORD`.

### `Failed to create event`
Usually means one of these:

- Drive API is not enabled
- refresh token is invalid
- OAuth client credentials do not match the refresh token
- redirect URI used while generating the refresh token differs from your env value

### Upload succeeds locally but fails in production
Check that your production environment variables are set in Vercel exactly as in local.

---

## 11. Suggested next features

- camera capture directly in browser
- guest nicknames with local persistence
- host gallery wall
- event cover images
- event expiration / lock after wedding ends
- WhatsApp share link for guests
- guest leaderboard for most uploads

---

## 12. Notes for you

This project is intentionally optimized for **getting the experience live quickly**.

If you want the next version, the best upgrade path is:

- keep Drive for image storage
- add Postgres / Supabase for metadata
- add signed upload URLs or background processing
- add real auth for hosts
