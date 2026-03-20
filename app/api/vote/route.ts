import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface VoteRow {
  id: number;
  expert: string;
  first_place: string;
  second_place: string;
  third_place: string;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const { expert, selectedMovies } = (await request.json()) as {
    expert: string;
    selectedMovies: string[];
  };

  const normalizedExpert = expert?.trim();

  if (!normalizedExpert) {
    return NextResponse.json({ error: 'Expert name is required' }, { status: 400 });
  }

  if (!selectedMovies || selectedMovies.length !== 3) {
    return NextResponse.json({ error: 'Please select exactly 3 movies' }, { status: 400 });
  }

  const uniqueMovies = new Set(selectedMovies);
  if (uniqueMovies.size !== 3) {
    return NextResponse.json({ error: 'Movies must be unique' }, { status: 400 });
  }

  const { error } = await supabase.from('votes').insert({
    expert: normalizedExpert,
    first_place: selectedMovies[0],
    second_place: selectedMovies[1],
    third_place: selectedMovies[2]
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const { data, error } = await supabase
    .from('votes')
    .select('id, expert, first_place, second_place, third_place, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as VoteRow[]);
}
