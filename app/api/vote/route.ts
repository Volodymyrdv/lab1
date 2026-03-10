import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  const { selectedMovies } = await request.json();

  if (!selectedMovies || selectedMovies.length !== 3) {
    return NextResponse.json({ error: 'Please select exactly 3 movies' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'data', 'votes.json');

  let votes = {};
  try {
    const data = await fs.readFile(filePath, 'utf8');
    votes = JSON.parse(data);
  } catch (error) {
    // file not exist or error, use empty
  }

  selectedMovies.forEach((movie: string) => {
    votes[movie] = (votes[movie] || 0) + 1;
  });

  await fs.writeFile(filePath, JSON.stringify(votes, null, 2));

  return NextResponse.json({ success: true });
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'votes.json');

  let votes = {};
  try {
    const data = await fs.readFile(filePath, 'utf8');
    votes = JSON.parse(data);
  } catch (error) {
    // file not exist or error, use empty
  }

  return NextResponse.json(votes);
}
