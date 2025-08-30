import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Check if Upstash environment variables are available
const hasUpstashConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstashConfig ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

const HISTORY_KEY = 'bunch-of-magnets:query-history';

// Helper function to validate Redis connection
async function validateRedisConnection() {
  if (!redis) {
    console.warn('⚠️ Upstash Redis not configured - using fallback storage');
    return false;
  }
  
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.warn('⚠️ Upstash Redis connection failed:', error);
    return false;
  }
}

export async function GET() {
  try {
    console.log('📥 Fetching query history');
    
    if (!hasUpstashConfig) {
      console.log('ℹ️ Upstash Redis not configured - returning empty history');
      return NextResponse.json({ history: [] });
    }
    
    const isConnected = await validateRedisConnection();
    if (!isConnected) {
      console.log('ℹ️ Redis connection failed - returning empty history');
      return NextResponse.json({ history: [] });
    }
    
    const history = await redis!.get<string[]>(HISTORY_KEY) || [];
    console.log(`✅ Retrieved ${history.length} history items`);
    return NextResponse.json({ history });
  } catch (error) {
    console.error('❌ Failed to fetch query history:', error);
    // Return empty history instead of error to prevent app crashes
    return NextResponse.json({ history: [] });
  }
}

export async function POST(request: Request) {
  try {
    const { history } = await request.json();
    console.log('📤 Saving query history');
    
    if (!hasUpstashConfig) {
      console.log('ℹ️ Upstash Redis not configured - skipping save');
      return NextResponse.json({ success: true, message: 'Redis not configured' });
    }
    
    const isConnected = await validateRedisConnection();
    if (!isConnected) {
      console.log('ℹ️ Redis connection failed - skipping save');
      return NextResponse.json({ success: true, message: 'Redis connection failed' });
    }
    
    await redis!.set(HISTORY_KEY, history);
    console.log(`✅ Saved ${history.length} history items`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Failed to save query history:', error);
    // Return success to prevent app crashes, but log the error
    return NextResponse.json({ 
      success: true, 
      message: 'Failed to save to Redis, but operation completed' 
    });
  }
} 
