# Movie Voting App (Next.js + Supabase)

This small Next.js project lets users vote for their top 3 movies from a list of 20. Votes
are stored in a Supabase (Postgres) table instead of a local JSON file, making it suitable
for development and deployment.

---

## 🛠️ Local Setup

1. **Clone the repo** and install dependencies:

   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://app.supabase.com and note the:
   - **URL** (e.g. `https://xxxx.supabase.co`)
   - **anon** key (client-side API key)

3. **Add the env vars** to `.env.local` at the repo root:

   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=ey...
   ```

   > `.env.local` is gitignored by default.

4. **Create the `votes` table** in Supabase SQL editor:

   ```sql
   create table votes (
     movie text primary key,
     count bigint not null default 0
   );
   ```

   Alternatively use the table editor UI.

5. (Optional) **Migrate existing data** from `data/votes.json` if present:

   ```bash
   npm run migrate
   ```

   The script reads the JSON file and upserts each movie/count into Supabase.

6. **Start the development server**:
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to try it out.

---

## 📦 Deployment (Vercel / other hosts)

- Push your repo to GitHub, GitLab, etc.
- Connect the repository in Vercel (or your preferred host) and set the **environment
  variables** in the project settings:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Build command is `npm run build` (handled automatically).
- You can optionally run `npm run migrate` in a one‑off deployment if you need to
  populate the database with existing votes before going live.

> 🔐 **Security note:** Never commit your `SUPABASE_ANON_KEY` or `.env.local` to git.

---

## 🧱 Code structure highlights

- `app/api/vote/route.ts` – API route that reads/writes the `votes` table via
  `lib/supabase.ts`.
- `lib/supabase.ts` – Supabase client helper using `SUPABASE_URL` and
  `SUPABASE_ANON_KEY`.
- `app/page.tsx` – front‑end for selecting movies and submitting votes.
- `app/admin/page.tsx` – simple admin panel showing live counts (no auth). It
  still calls the same `/api/vote` endpoints.
- `scripts/migrate.ts` – helper to migrate existing JSON data (run with
  `npm run migrate`).

---

Enjoy! 🎬
