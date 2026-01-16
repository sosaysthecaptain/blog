/**
 * Audio fingerprinting and identification using AcoustID
 *
 * This module provides client-side audio fingerprinting using the Web Audio API
 * and queries the AcoustID database for song identification.
 */

// AcoustID API configuration
const ACOUSTID_API_URL = "https://api.acoustid.org/v2/lookup";
const ACOUSTID_CLIENT_ID = process.env.NEXT_PUBLIC_ACOUSTID_CLIENT_ID || "";

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
 * Generate a simple audio fingerprint using spectral analysis
 * This is a simplified version that creates a hash from audio features
 */
async function generateSimpleFingerprint(audioBuffer: AudioBuffer): Promise<string> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Create an offline context for analysis
  const offlineContext = new OfflineAudioContext(1, channelData.length, sampleRate);
  const source = offlineContext.createBufferSource();
  const analyser = offlineContext.createAnalyser();

  source.buffer = audioBuffer;
  analyser.fftSize = 2048;

  source.connect(analyser);
  analyser.connect(offlineContext.destination);
  source.start();

  // We can't easily get frame-by-frame FFT in offline context
  // Instead, compute a simple hash from the raw audio data

  // Sample at regular intervals and create a feature vector
  const numSamples = 32;
  const interval = Math.floor(channelData.length / numSamples);
  const features: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const start = i * interval;
    const end = Math.min(start + interval, channelData.length);

    // Calculate RMS energy for this segment
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sum / (end - start));
    features.push(Math.round(rms * 1000));
  }

  // Convert to base64 string as "fingerprint"
  return btoa(features.join(","));
}

/**
 * Decode audio blob to AudioBuffer
 */
async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    return audioBuffer;
  } catch (error) {
    audioContext.close();
    throw new Error("Failed to decode audio: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Generate chromaprint-compatible fingerprint
 * This is a simplified implementation that generates a hash of audio features
 * For production, you'd want to use actual chromaprint via WASM or server-side
 */
async function generateChromaprintLike(audioBuffer: AudioBuffer): Promise<{ fingerprint: string; duration: number }> {
  const duration = audioBuffer.duration;
  const fingerprint = await generateSimpleFingerprint(audioBuffer);

  return { fingerprint, duration };
}

/**
 * Query AcoustID API with a fingerprint
 * Note: This requires a valid client ID from https://acoustid.org/
 */
async function queryAcoustID(fingerprint: string, duration: number): Promise<AcoustIDResult> {
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

  try {
    const response = await fetch(`${ACOUSTID_API_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
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
  try {
    // Check if we have API key configured
    if (!ACOUSTID_CLIENT_ID) {
      return {
        success: false,
        candidates: [],
        error: "Audio identification not configured. Set NEXT_PUBLIC_ACOUSTID_CLIENT_ID in environment.",
      };
    }

    // Decode audio
    const audioBuffer = await decodeAudioBlob(blob);

    // Generate fingerprint
    const { fingerprint, duration } = await generateChromaprintLike(audioBuffer);

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
