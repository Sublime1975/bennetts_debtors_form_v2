# Bennett's Engineering — Debtors Application Form (Version 2)

Version 2 of the Bennett's Engineering debtor application form (July 2026 design-tool export).

This keeps the **custom UI** and submits to **Firebase** (Firestore + Storage). Email alerts use **Resend free** (3,000 emails/month, 100/day) via Cloud Functions.

## Stack choice

| Piece | Choice | Cost at low volume |
|--------|--------|--------------------|
| Form UI | This wizard (unchanged look) | — |
| Data | Cloud Firestore | ~$0 (free tier) |
| Uploads | Firebase Storage | ~$0 (5 GB free) |
| Mail | **Resend free** | $0 |

## Quick setup

### 1. Firebase project
1. Create a Firebase project (Blaze pay-as-you-go is fine — free quotas still apply; set a budget alert).
2. Enable **Firestore** and **Storage**.
3. Add a **Web app** and copy the config into `public/firebase-config.js`.
4. Deploy rules:
   ```bash
   npx -y firebase-tools@latest login
   npx -y firebase-tools@latest use YOUR_PROJECT_ID
   npx -y firebase-tools@latest deploy --only firestore:rules,storage
   ```

### 2. Resend (best free mail)
1. Sign up at [resend.com](https://resend.com) (free).
2. Create an API key.
3. For production, verify your domain and set `FROM_EMAIL`. While testing you can use `onboarding@resend.dev` (Resend only delivers to your own signup email).
4. Install function deps and set secrets:
   ```bash
   cd functions && npm install && cd ..
   npx -y firebase-tools@latest functions:secrets:set RESEND_API_KEY
   npx -y firebase-tools@latest functions:config:set  # or use params:
   # Prefer params at deploy time:
   npx -y firebase-tools@latest deploy --only functions \
     --set-env-vars NOTIFY_EMAIL=accounts@yourcompany.co.za,FROM_EMAIL="Bennett's Engineering <onboarding@resend.dev>"
   ```
   With Functions v2 `defineString`, set params in Firebase Console → Functions → Parameters, or:
   ```bash
   npx -y firebase-tools@latest functions:secrets:set RESEND_API_KEY
   ```
   and create `.env` for params in `functions/` (not committed):
   ```
   NOTIFY_EMAIL=accounts@yourcompany.co.za
   FROM_EMAIL=Bennett's Engineering <onboarding@resend.dev>
   ```

### 3. Run the form locally
```bash
python3 -m http.server 8765
# open http://127.0.0.1:8765/Debtors%20Application.dc.html
```

Without real Firebase keys, Submit still shows the confirmation screen (design preview). With keys filled in, Submit uploads files and writes `applications/{BE-…}` — the function emails your inbox.

## Contents

- `Debtors Application.dc.html` — wizard UI + Firebase submit hook
- `public/firebase-config.js` — web config (edit me)
- `public/firebase-submit.js` — Storage uploads + Firestore write
- `firestore.rules` / `storage.rules` — create/upload only from the form
- `functions/` — Resend notification on new application
- `*.dc.html` — field components
- `scripts/edge-case-validation-test.mjs` — validation edge-case suite

Original React repo: [bennetts_debtors_form](https://github.com/Sublime1975/bennetts_debtors_form).
