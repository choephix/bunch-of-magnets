import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const HISTORY_KEY = 'bunch-of-magnets:query-history';

export async function GET() {
  try {
    console.log('📥 Fetching query history from Supabase');
    const { data, error } = await supabase
      .from('query_history')
      .select('history')
      .eq('id', 1)
      .single();
    if (error) throw error;
    const history = (data?.history as string[]) || [];
    return NextResponse.json({ history });
  } catch (error) {
    console.error('❌ Failed to fetch query history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { history } = await request.json();
    console.log('📤 Saving query history to Supabase');
    const { error } = await supabase
      .from('query_history')
      .upsert({ id: 1, history });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to save query history:', error);
    return NextResponse.json({ error: 'Failed to save history' }, { status: 500 });
  }
}
