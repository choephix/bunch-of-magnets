import { createGroq } from '@ai-sdk/groq'
import { generateText, Message } from 'ai'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

const CACHE_PREFIX = 'bunch-of-magnets:tv-show-name:'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

const inputSchema = z.object({
  filenames: z.array(z.string()),
})

const examples = `
Input: "The.Mandalorian.S03E01.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv"
Output: "The Mandalorian"

Input: Star.Trek.Strange.New.Worlds.S02E04.720p.AMZN.WEB-DL.DDP5.1.H.264-NTG.mkv
Output: "Star Trek - Strange New Worlds"

Input: The.Boys.S03E01.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv
Output: "The Boys"

Input: The.Witcher.Blood.Origin.S01E02.1080p.WEBRip.x265-RARBG.mp4
Output: "The Witcher - Blood Origin"

Input: The.Lord.of.the.Rings.The.Rings.of.Power.S01E07.720p.AMZN.WEB-DL.DDP5.1.H264-FLUX.mkv
Output: "The Lord of the Rings - The Rings of Power"

Input: Battlestar.Galactica.2004.S02E03.1080p.BluRay.x264-ROVERS.mkv
Output: "Battlestar Galactica (2004)"

Input: The.Expanse.S06E01.1080p.WEB-DL.DDP5.1.H.264-NTb.mkv
Output: "The Expanse"

Input: Brooklyn.Nine-Nine.S03E08.720p.HDTV.x264-KILLERS.mkv
Output: "Brooklyn Nine-Nine"

Input: [RELEASEGROUP].Vikings.S04E20.1080p.BluRay.x265.HEVC.AAC-XYZ.mkv
Output: Vikings

Input: Sense8.S01E12.2160p.NF.WEBRip.x265-HDR.DDP5.1-TEPES.mkv
Output: Sense8

Input: Tom.Clancys.Jack.Ryan.S04E06.1080p.AMZN.WEBRip.DDP5.1.x264-NTb.mkv
Output: Tom Clancy's Jack Ryan

Input: Breaking Bad S05E14 1080p WEB-DL AAC2.0 H264.mkv
Output: Breaking Bad

Input: Rick_and_Morty_S03E01_720p_HDTV_x264.mkv
Output: Rick and Morty

Input: Peaky-Blinders-S02E03-720p-HDTV-x264-TLA.mkv
Output: Peaky Blinders

Input: Better_Call.Saul_S04E05_1080p_AMZN_WEBRip_DDP5.1.x264-NTb.mkv
Output: Better Call Saul

Input: American Crime Story The People vs OJ Simpson S01E03 1080p HDTV x264.mkv
Output: American Crime Story - The People vs OJ Simpson

Input: Law.&.Order.Special.Victims.Unit_S24E08.720p.HDTV.x265.mkv
Output: Law & Order - Special Victims Unit

Input: Archer_(2009)_S11E08_720p_WEB-DL_DD5.1_H264.mkv
Output: Archer (2009)

Input: X-Files.S10E01.1080p.WEB-DL.DD5.1.H264-RARBG.mkv
Output: X-Files

Input: Its Always Sunny in Philadelphia S14E07 720p HDTV x264.mkv
Output: It's Always Sunny in Philadelphia

Input: Narcos Mexico S02E10 2160p NF WEB-DL DD5.1 Atmos.mkv
Output: Narcos - Mexico

Input: Marvels Agents_of S.H.I.E.L.D. S07E01 720p HDTV AAC x264.mkv
Output: Marvels Agents of S.H.I.E.L.D.

Input: The Twilight Zone (2019) S02E03 720p WEBRip DD5.1 x264.mkv
Output: The Twilight Zone (2019)

Input: 9-1-1.Lone_Star.S02E07.720p.HDTV.x264.mkv
Output: 9-1-1 Lone Star

Input: [Netflix] Dark S03E08 2160p WEBRip DDP5.1 Atmos x265.mkv
Output: Dark

Input: Sherlock_S01E01_1080p_HDTV_x264.mkv
Output: Sherlock
`

const exampleMessages = examples
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => {
    if (line.startsWith('Input:')) {
      return {
        role: 'user' as const,
        content: line.replace('Input:', '').trim(),
      }
    } else if (line.startsWith('Output:')) {
      return {
        role: 'assistant' as const,
        content: line.replace('Output:', '').trim(),
      }
    }
    return ''
  })
  .filter(Boolean) as Message[]

const cacheKeyFor = (filename: string) => `${CACHE_PREFIX}${filename}`

const readCache = async (filenames: string[]): Promise<Map<string, string>> => {
  const result = new Map<string, string>()
  if (!redis || filenames.length === 0) return result

  try {
    const keys = filenames.map(cacheKeyFor)
    const cached = (await redis.mget<(string | null)[]>(...keys)) ?? []
    cached.forEach((value, idx) => {
      if (typeof value === 'string' && value.length > 0) {
        result.set(filenames[idx], value)
      }
    })
    if (result.size > 0) {
      console.log(`💾 Cache hit for ${result.size}/${filenames.length} TV name(s)`)
    }
  } catch (error) {
    console.warn('⚠️ Failed to read TV-show name cache:', error)
  }
  return result
}

const writeCache = async (entries: Map<string, string>) => {
  if (!redis || entries.size === 0) return
  try {
    const pipe = redis.pipeline()
    for (const [filename, name] of entries) {
      pipe.set(cacheKeyFor(filename), name, { ex: CACHE_TTL_SECONDS })
    }
    await pipe.exec()
  } catch (error) {
    console.warn('⚠️ Failed to write TV-show name cache:', error)
  }
}

export async function POST(req: Request) {
  try {
    const { filenames } = inputSchema.parse(await req.json())

    if (filenames.length === 0) {
      return new Response(JSON.stringify({ showNames: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const cached = await readCache(filenames)
    const missing = filenames.filter((f) => !cached.has(f))

    let freshResults: string[] = []
    if (missing.length > 0) {
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        system: `You are a TV show name parser. Your task is to extract the full TV show name from torrent filenames.
        Follow these rules:
        1. Remove all quality indicators (720p, 1080p, 4K, etc.)
        2. Remove all season/episode information (S01E01, S1E1, etc.)
        3. Remove all release group names and tags
        4. Remove all file extensions
        5. Keep only the main show name
        6. Return the show name in a clean, standardized format
        7. Overall use your intuition to determine the correct show name
        8. Replace colons etc with dashes, to ensure valid folder name for the show
        9. Output exactly one show name per input line, in the same order, with no extra commentary

        Small note: Sometimes it may be a movie. That's fine. Just return the name.
        `,
        messages: [
          ...exampleMessages,
          {
            role: 'user',
            content: missing.join('\n'),
          },
        ],
      })

      freshResults = text
        .trimEnd()
        .split('\n')
        .map((s) => s.trim())

      const canIndexSafely = freshResults.length === missing.length
      if (!canIndexSafely) {
        console.warn('⚠️ TV parser returned unexpected line count:', {
          expected: missing.length,
          actual: freshResults.length,
        })
      }

      // Only cache when model output can be safely paired with input lines.
      const toCache = new Map<string, string>()
      if (canIndexSafely) {
        missing.forEach((filename, idx) => {
          const value = freshResults[idx]
          if (value) toCache.set(filename, value)
        })
      }
      void writeCache(toCache)
    }

    // Reconstruct response in original input order.
    const freshByFilename = new Map<string, string>()
    missing.forEach((filename, idx) => {
      const value = freshResults[idx]
      if (value) freshByFilename.set(filename, value)
    })

    const showNames = filenames.map((filename) => {
      return cached.get(filename) ?? freshByFilename.get(filename) ?? ''
    })

    return new Response(JSON.stringify({ showNames }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('🔴 Error parsing TV show names:', error)
    return new Response(JSON.stringify({ error: 'Failed to parse TV show names' }), {
      status: 400,
    })
  }
}
