/**
 * Audio fingerprinting and identification using AcoustID
 *
 * This module uses the @unimusic/chromaprint WASM library to generate
 * real Chromaprint fingerprints compatible with AcoustID.
 */

// AcoustID API configuration
const ACOUSTID_API_URL = "https://api.acoustid.org/v2/lookup";
const ACOUSTID_CLIENT_ID = process.env.NEXT_PUBLIC_ACOUSTID_CLIENT_ID || "";

// Lazy-loaded chromaprint module
let chromaprintModule: typeof import("@unimusic/chromaprint") | null = null;

async function getChromaprintModule() {
  if (!chromaprintModule) {
    chromaprintModule = await import("@unimusic/chromaprint");
  }
  return chromaprintModule;
}

interface AcoustIDResult {
  status: "ok" | "error";
  results?: Array<{
    id: string;
    score: number;
    recordings?: Array<{
      id: string;
      title?: string;
      artists?: Array<{ name: string }>;
      releasegroups?: Array<{
        title?: string;
        type?: string;
        secondarytypes?: string[];
      }>;
    }>;
  }>;
  error?: {
    message: string;
  };
}

export interface IdentificationCandidate {
  title: string;
  artist: string;
  album: string;
  year: string;
  score: number;
  musicbrainzId?: string;
}

export interface IdentificationResult {
  success: boolean;
  candidates: IdentificationCandidate[];
  error?: string;
}

/**
 * Generate a real Chromaprint fingerprint using WASM
 */
async function generateChromaprint(
  arrayBuffer: ArrayBuffer
): Promise<{ fingerprint: string; duration: number }> {
  console.log("[Chromaprint] Loading module...");
  const chromaprint = await getChromaprintModule();
  console.log("[Chromaprint] Module loaded, keys:", Object.keys(chromaprint));

  // Get duration from audio
  console.log("[Chromaprint] Decoding audio, buffer size:", arrayBuffer.byteLength);
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  const duration = audioBuffer.duration;
  console.log("[Chromaprint] Audio decoded, duration:", duration, "sampleRate:", audioBuffer.sampleRate);
  audioContext.close();

  // Generate fingerprint using chromaprint WASM
  // processAudioFile returns an async generator, we just need the first result
  console.log("[Chromaprint] Generating fingerprint...");
  const generator = chromaprint.processAudioFile(arrayBuffer, {
    maxDuration: 120,
    chunkDuration: 0,
    algorithm: chromaprint.ChromaprintAlgorithm.Default,
    rawOutput: false,
    overlap: false,
  });

  const result = await generator.next();
  console.log("[Chromaprint] Generator result:", result);
  if (result.done || !result.value) {
    throw new Error("Failed to generate fingerprint");
  }

  console.log("[Chromaprint] Fingerprint generated, length:", result.value.length);
  return { fingerprint: result.value, duration };
}

/**
 * Query AcoustID API with a fingerprint
 * Note: This requires a valid client ID from https://acoustid.org/
 */
async function queryAcoustID(fingerprint: string, duration: number): Promise<AcoustIDResult> {
  console.log("[AcoustID API] Client ID configured:", !!ACOUSTID_CLIENT_ID, "ID:", ACOUSTID_CLIENT_ID?.substring(0, 4) + "...");

  if (!ACOUSTID_CLIENT_ID) {
    return {
      status: "error",
      error: { message: "AcoustID client ID not configured" },
    };
  }

  const params = new URLSearchParams({
    client: ACOUSTID_CLIENT_ID,
    fingerprint: fingerprint,
    duration: Math.round(duration).toString(),
    meta: "recordings+releasegroups+compress",
  });

  const url = `${ACOUSTID_API_URL}?${params}`;
  console.log("[AcoustID API] Request URL length:", url.length, "duration:", Math.round(duration));

  try {
    const response = await fetch(url);
    console.log("[AcoustID API] Response status:", response.status);
    if (!response.ok) {
      const text = await response.text();
      console.log("[AcoustID API] Error response:", text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const json = await response.json();
    console.log("[AcoustID API] Response:", JSON.stringify(json).substring(0, 500));
    return json;
  } catch (error) {
    console.error("[AcoustID API] Fetch error:", error);
    return {
      status: "error",
      error: { message: error instanceof Error ? error.message : "Network error" },
    };
  }
}

/**
 * Try to identify a song from an audio blob
 * Returns candidates sorted by confidence score
 */
export async function identifyAudio(blob: Blob): Promise<IdentificationResult> {
  console.log("[identifyAudio] Starting, blob size:", blob.size, "type:", blob.type);

  try {
    // Check if we have API key configured
    console.log("[identifyAudio] Checking API key...");
    if (!ACOUSTID_CLIENT_ID) {
      console.log("[identifyAudio] No API key configured!");
      return {
        success: false,
        candidates: [],
        error: "Audio identification not configured. Set NEXT_PUBLIC_ACOUSTID_CLIENT_ID in environment.",
      };
    }

    // Convert blob to ArrayBuffer
    console.log("[identifyAudio] Converting blob to ArrayBuffer...");
    const arrayBuffer = await blob.arrayBuffer();
    console.log("[identifyAudio] ArrayBuffer size:", arrayBuffer.byteLength);

    // Generate real Chromaprint fingerprint using WASM
    const { fingerprint, duration } = await generateChromaprint(arrayBuffer);

    // Query AcoustID
    const result = await queryAcoustID(fingerprint, duration);

    if (result.status === "error") {
      return {
        success: false,
        candidates: [],
        error: result.error?.message || "Unknown error",
      };
    }

    // Parse results into candidates
    const candidates: IdentificationCandidate[] = [];

    for (const match of result.results || []) {
      if (!match.recordings) continue;

      for (const recording of match.recordings) {
        const artist = recording.artists?.map((a) => a.name).join(", ") || "";
        const album = recording.releasegroups?.[0]?.title || "";

        candidates.push({
          title: recording.title || "Unknown Title",
          artist: artist || "Unknown Artist",
          album,
          year: "", // Would need additional MusicBrainz query for year
          score: match.score,
          musicbrainzId: recording.id,
        });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Deduplicate by title+artist
    const seen = new Set<string>();
    const uniqueCandidates = candidates.filter((c) => {
      const key = `${c.title.toLowerCase()}|${c.artist.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      success: uniqueCandidates.length > 0,
      candidates: uniqueCandidates.slice(0, 5), // Top 5 candidates
    };
  } catch (error) {
    return {
      success: false,
      candidates: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Alternative: Use ACRCloud or similar service for identification
 * This would require their API key but provides better accuracy
 */
export async function identifyWithACRCloud(
  blob: Blob,
  apiKey: string,
  apiSecret: string,
  host: string
): Promise<IdentificationResult> {
  // ACRCloud expects audio samples, not fingerprints
  // This is a placeholder for ACRCloud integration

  return {
    success: false,
    candidates: [],
    error: "ACRCloud integration not implemented",
  };
}
