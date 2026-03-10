import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// utility type for vote rows
interface VoteRow {
  movie: string;
  count: number;
}

export async function POST(request: NextRequest) {
  const { selectedMovies } = (await request.json()) as { selectedMovies: string[] };

  if (!selectedMovies || selectedMovies.length !== 3) {
    return NextResponse.json({ error: 'Please select exactly 3 movies' }, { status: 400 });
  }

  // update each selected movie in series (avoid complex builder types)
  for (const movie of selectedMovies) {
    // try to read existing count
    const { data, error } = await supabase
      .from('votes')
      .select('count')
      .eq('movie', movie)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      // existing row – increment
      const { error: updateErr } = await supabase
        .from('votes')
        .update({ count: (data as any).count + 1 })
        .eq('movie', movie);
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // no row yet – insert first vote
      const { error: insertErr } = await supabase.from('votes').insert({ movie, count: 1 });
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const { data, error } = await supabase.from('votes').select('movie,count');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const votes: Record<string, number> = {};
  const rows = (data ?? []) as VoteRow[];
  rows.forEach((row) => {
    votes[row.movie] = row.count;
  });

  return NextResponse.json(votes);
}
