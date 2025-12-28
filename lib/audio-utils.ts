/**
 * Audio utilities for compression and processing
 */

interface CompressionOptions {
  targetBitrate?: number // in kbps
  sampleRate?: number
  channels?: number
}

const DEFAULT_OPTIONS: CompressionOptions = {
  targetBitrate: 128,
  sampleRate: 44100,
  channels: 1, // Mono for voice
}

/**
 * Compress audio blob to a smaller format using Web Audio API
 * This re-encodes the audio at a lower bitrate
 */
export async function compressAudio(
  audioBlob: Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    // Decode the audio
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new AudioContext({ sampleRate: opts.sampleRate })
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      opts.channels || 1,
      audioBuffer.length,
      opts.sampleRate || 44100
    )

    // Create source and connect
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineContext.destination)
    source.start()

    // Render the audio
    const renderedBuffer = await offlineContext.startRendering()

    // Convert to WAV (more universally supported)
    const wavBlob = audioBufferToWav(renderedBuffer)

    await audioContext.close()

    return wavBlob
  } catch (error) {
    console.error('Audio compression failed, returning original:', error)
    return audioBlob
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const dataLength = buffer.length * blockAlign
  const bufferLength = 44 + dataLength

  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // Write audio data
  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Get audio duration from a blob
 */
export async function getAudioDuration(audioBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.src = URL.createObjectURL(audioBlob)

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src)
      resolve(audio.duration)
    }

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src)
      reject(new Error('Failed to load audio'))
    }
  })
}

/**
 * Check if audio blob is too large and needs compression
 */
export function needsCompression(audioBlob: Blob, maxSizeBytes: number = 5 * 1024 * 1024): boolean {
  return audioBlob.size > maxSizeBytes
}

/**
 * Get estimated bitrate of audio
 */
export async function getEstimatedBitrate(audioBlob: Blob): Promise<number> {
  const duration = await getAudioDuration(audioBlob)
  if (duration === 0) return 0
  return Math.round((audioBlob.size * 8) / duration / 1000) // kbps
}

/**
 * Create a visual waveform data from audio blob
 */
export async function generateWaveformData(
  audioBlob: Blob,
  samples: number = 100
): Promise<number[]> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const rawData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(rawData.length / samples)
    const filteredData: number[] = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[i * blockSize + j])
      }
      filteredData.push(sum / blockSize)
    }

    // Normalize
    const max = Math.max(...filteredData)
    const normalized = filteredData.map(v => (max > 0 ? v / max : 0))

    await audioContext.close()

    return normalized
  } catch (error) {
    console.error('Failed to generate waveform:', error)
    return Array(samples).fill(0.5)
  }
}

/**
 * Apply noise reduction to audio (basic high-pass filter)
 */
export async function applyNoiseReduction(audioBlob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    )

    // Create source
    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    // High-pass filter to reduce low-frequency noise
    const highPass = offlineContext.createBiquadFilter()
    highPass.type = 'highpass'
    highPass.frequency.value = 80 // Cut frequencies below 80Hz
    highPass.Q.value = 0.7

    // Connect chain
    source.connect(highPass)
    highPass.connect(offlineContext.destination)
    source.start()

    const renderedBuffer = await offlineContext.startRendering()
    const wavBlob = audioBufferToWav(renderedBuffer)

    await audioContext.close()

    return wavBlob
  } catch (error) {
    console.error('Noise reduction failed:', error)
    return audioBlob
  }
}
