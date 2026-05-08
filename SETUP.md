# JonArt Galleries — Backend Setup Guide
# Everything free. No credit card needed.

## STEP 1 — Supabase (Database + Storage)
1. Go to https://supabase.com and create a free account
2. Click "New Project" → name it "jonart-galleries"
3. Copy your Project URL and service_role key from:
   Settings > API > Project API keys
4. Go to SQL Editor → paste the entire schema.sql file → click Run
5. Go to Storage → create a new bucket called "reference-photos"
   → set it to Public

## STEP 2 — Resend (Email)
1. Go to https://resend.com and create a free account
2. Add and verify your domain (jonartgalleries.com) OR
   use the test address they give you while developing
3. Create an API Key → copy it

## STEP 3 — Run locally first
  git init
  git add .
  npm install
  cp .env.example .env
  # Fill in your .env values
  npm run dev
  # Test with: curl -X POST http://localhost:3000/api/newsletter \
  #   -H "Content-Type: application/json" \
  #   -d '{"email":"test@example.com"}'

## STEP 4 — Deploy backend FREE on Railway
1. Go to https://railway.app → sign in with GitHub
2. New Project → Deploy from GitHub repo
3. Select your backend folder/repo
4. Go to Variables → add all your .env values
5. Railway auto-detects Node.js and deploys
6. Copy your Railway URL (e.g. jonart-api.up.railway.app)

   ALTERNATIVELY use Render (https://render.com):
   New > Web Service > Connect GitHub > Free tier
   Build command: npm install
   Start command: npm start

## STEP 5 — Deploy frontend FREE on Vercel
1. Go to https://vercel.com → sign in with GitHub
2. Import your frontend folder
3. Add environment variable: VITE_API_URL = your Railway URL
4. Deploy → get your free .vercel.app domain

## STEP 6 — Connect frontend to backend
In your index.html, replace the form submit functions:

  async function submitCommission() {
    const formData = new FormData();
    formData.append('name', document.getElementById('cName').value);
    formData.append('email', document.getElementById('cEmail').value);
    formData.append('artwork_type', document.getElementById('cType').value);
    // ... other fields
    const files = document.getElementById('refFile').files;
    for (const f of files) formData.append('photos', f);

    const res = await fetch('https://YOUR-RAILWAY-URL/api/commission', {
      method: 'POST',
      body: formData   // no Content-Type header — multer handles it
    });
    const data = await res.json();
    if (data.success) { /* show success message */ }
  }

## FREE TIER LIMITS (all more than enough to start)

  Supabase Free:
  - 500MB database
  - 1GB file storage
  - 50,000 monthly active users
  - Unlimited API calls

  Railway Free (Hobby):
  - $5 free credit/month (enough for a small API)
  - Alternatively use Render free (sleeps after 15min inactivity)

  Resend Free:
  - 3,000 emails/month
  - 100/day

  Vercel Free:
  - Unlimited static site deployments
  - Custom domain support

## DATABASE ACCESS (Admin Dashboard)
Your Supabase dashboard IS your admin panel to start.
Go to: supabase.com > your project > Table Editor
You can view, filter, update all commissions, messages, orders.

When you're ready to build a proper admin panel later,
options include: AdminJS, Retool (free tier), or a custom React dashboard.

## FOLDER STRUCTURE
  jonart-galleries/
  ├── frontend/
  │   └── index.html          ← your website
  └── backend/
      ├── server.js           ← Express API
      ├── package.json
      ├── .env.example
      └── schema.sql          ← run in Supabase SQL editor
