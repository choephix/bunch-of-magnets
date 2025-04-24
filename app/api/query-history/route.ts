import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const HISTORY_KEY = 'bunch-of-magnets:query-history';

export async function GET() {
  try {
    console.log('📥 Fetching query history from Upstash');
    const history = await redis.get<string[]>(HISTORY_KEY) || [];
    return NextResponse.json({ history });
  } catch (error) {
    console.error('❌ Failed to fetch query history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { history } = await request.json();
    console.log('📤 Saving query history to Upstash');
    await redis.set(HISTORY_KEY, history);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to save query history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
} 