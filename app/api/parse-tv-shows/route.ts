import { createGroq } from '@ai-sdk/groq'
import { generateText, Message } from 'ai'
import { NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { unauthorizedIfAnonymous } from '@/app/lib/requireAuth'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const inputSchema = z.object({
  filenames: z.array(z.string()),
})

const SHOW_NAME_CACHE_LIMIT = 256
const showNameCache = new Map<string, string>()

const cacheSet = (filename: string, showName: string) => {
  if (showNameCache.has(filename)) showNameCache.delete(filename)
  showNameCache.set(filename, showName)
  if (showNameCache.size > SHOW_NAME_CACHE_LIMIT) {
    const oldest = showNameCache.keys().next().value
    if (oldest !== undefined) showNameCache.delete(oldest)
  }
}
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

export async function POST(req: Request) {
  const unauthorized = await unauthorizedIfAnonymous()
  if (unauthorized) return unauthorized

  const routeStart = performance.now()
  try {
    const { filenames } = inputSchema.parse(await req.json())

    console.log(
      `🎬 [parse-tv-shows] Start request for ${filenames.length} filename(s): ${filenames
        .slice(0, 3)
        .map((f) => `"${f}"`)
        .join(', ')}${filenames.length > 3 ? ` (+${filenames.length - 3} more)` : ''}`
    )

    if (filenames.length === 0) {
      return NextResponse.json({ showNames: [], metrics: { totalDurationMs: 0, cacheHits: 0 } })
    }

    const showNames = filenames.map((filename) => showNameCache.get(filename) ?? null)
    const uncachedIndexes = filenames
      .map((filename, index) => (showNames[index] == null ? index : -1))
      .filter((index) => index >= 0)
    const cacheHits = filenames.length - uncachedIndexes.length

    let aiDurationMs = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let tokensPerSecond: number | null = null

    if (uncachedIndexes.length > 0) {
      const uncachedFilenames = uncachedIndexes.map((index) => filenames[index])
      const aiStart = performance.now()
      console.log(
        `🤖 [parse-tv-shows:ai] Sending ${uncachedFilenames.length} item(s) to Groq (openai/gpt-oss-20b, ${exampleMessages.length} few-shot turns, ${cacheHits} cache hit(s))...`
      )

      const { text, usage } = await generateText({
        model: groq('openai/gpt-oss-20b'),
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
            content: uncachedFilenames.join('\n'),
          },
        ],
      })

      aiDurationMs = performance.now() - aiStart
      promptTokens = usage?.promptTokens ?? 0
      completionTokens = usage?.completionTokens ?? 0
      totalTokens = usage?.totalTokens ?? promptTokens + completionTokens
      if (completionTokens > 0 && aiDurationMs > 0) {
        tokensPerSecond = parseFloat((completionTokens / (aiDurationMs / 1000)).toFixed(1))
      }

      console.log(
        `✨ [parse-tv-shows:ai] Groq finished in ${aiDurationMs.toFixed(0)}ms | Tokens: ${promptTokens} in / ${completionTokens} out (${tokensPerSecond ?? 'N/A'} tok/s)`
      )

      const parsedLines = text
        .trimEnd()
        .split('\n')
        .map((line) => line.trim())

      if (parsedLines.length !== uncachedFilenames.length) {
        console.warn('⚠️ [parse-tv-shows:ai] Returned unexpected line count:', {
          expected: uncachedFilenames.length,
          actual: parsedLines.length,
        })
      }

      uncachedIndexes.forEach((filenameIndex, parsedIndex) => {
        const showName = parsedLines[parsedIndex] ?? ''
        showNames[filenameIndex] = showName
        if (showName) cacheSet(filenames[filenameIndex], showName)
      })
    }

    const resolvedShowNames = showNames.map((name) => name ?? '')
    const totalDurationMs = performance.now() - routeStart
    console.log(
      `🏁 [parse-tv-shows] Finished in ${totalDurationMs.toFixed(0)}ms | AI: ${aiDurationMs.toFixed(0)}ms | cacheHits: ${cacheHits} -> ${JSON.stringify(resolvedShowNames)}`
    )

    return NextResponse.json(
      {
        showNames: resolvedShowNames,
        metrics: {
          totalDurationMs: Math.round(totalDurationMs),
          aiDurationMs: Math.round(aiDurationMs),
          cacheHits,
          promptTokens,
          completionTokens,
          totalTokens,
          tokensPerSecond,
        },
      },
      {
        headers: {
          'Server-Timing': `ai;dur=${aiDurationMs.toFixed(1)}, total;dur=${totalDurationMs.toFixed(1)}`,
        },
      }
    )
  } catch (error) {
    const totalDurationMs = performance.now() - routeStart
    console.error(`🔴 [parse-tv-shows] Error after ${totalDurationMs.toFixed(0)}ms:`, error)
    const status = error instanceof ZodError ? 400 : 500
    return NextResponse.json(
      {
        error: 'Failed to parse TV show names',
        details: error instanceof Error ? error.message : String(error),
      },
      { status }
    )
  }
}
