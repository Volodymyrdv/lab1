# Movie Voting App (Next.js + Supabase)

This small Next.js project lets users vote for their top 3 movies from a list of 20. Each
submission is stored as a separate Supabase row with the expert name plus first, second,
and third place selections.

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
     id bigint generated always as identity primary key,
     expert text not null,
     first_place text not null,
     second_place text not null,
     third_place text not null,
     created_at timestamptz not null default now()
   );
   ```

   Alternatively use the table editor UI.

5. **Start the development server**:
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
> 🔐 **Security note:** Never commit your `SUPABASE_ANON_KEY` or `.env.local` to git.

---

## 🧱 Code structure highlights

- `app/api/vote/route.ts` – API route that stores each expert vote as one row in the
  `votes` table via `lib/supabase.ts`.
- `lib/supabase.ts` – Supabase client helper using `SUPABASE_URL` and
  `SUPABASE_ANON_KEY`.
- `app/page.tsx` – front‑end for entering an expert name, selecting movies, and
  submitting votes.
- `app/admin/page.tsx` – simple admin panel showing submitted expert rows.

---

Enjoy! 🎬
