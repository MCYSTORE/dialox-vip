import { NextResponse } from 'next/server';
import { HistoryEntry } from '@/lib/types';

// Mock history data - in production this would come from a database
const mockHistory: HistoryEntry[] = [];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockHistory,
    cached: false,
  });
}
