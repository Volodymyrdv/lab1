import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface Lab2VoteRow {
  id: number;
  expert: string;
  first_choice: string;
  second_choice: string;
  third_choice: string;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const { expert, selectedHeuristics } = (await request.json()) as {
    expert: string;
    selectedHeuristics: string[];
  };

  const normalizedExpert = expert?.trim();

  if (!normalizedExpert) {
    return NextResponse.json({ error: 'Expert name is required' }, { status: 400 });
  }

  if (!selectedHeuristics || selectedHeuristics.length !== 3) {
    return NextResponse.json({ error: 'Please select exactly 3 heuristics' }, { status: 400 });
  }

  const uniqueHeuristics = new Set(selectedHeuristics);
  if (uniqueHeuristics.size !== 3) {
    return NextResponse.json({ error: 'Heuristics must be unique' }, { status: 400 });
  }

  const { error } = await supabase.from('lab2_votes').insert({
    expert: normalizedExpert,
    first_choice: selectedHeuristics[0],
    second_choice: selectedHeuristics[1],
    third_choice: selectedHeuristics[2]
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const { data, error } = await supabase
    .from('lab2_votes')
    .select('id, expert, first_choice, second_choice, third_choice, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []) as Lab2VoteRow[]);
}
