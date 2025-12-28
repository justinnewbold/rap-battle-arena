import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalTrackPublication,
  ConnectionState,
  createLocalAudioTrack,
} from 'livekit-client'

// LiveKit configuration
// Set these in your environment variables
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''

export interface LiveKitConfig {
  url: string
  token: string
}

export interface ParticipantInfo {
  identity: string
  isSpeaking: boolean
  audioLevel: number
  isMuted: boolean
}

export type LiveKitEventHandler = {
  onConnected?: () => void
  onDisconnected?: () => void
  onParticipantJoined?: (participant: RemoteParticipant) => void
  onParticipantLeft?: (participant: RemoteParticipant) => void
  onTrackSubscribed?: (track: Track, participant: RemoteParticipant) => void
  onTrackUnsubscribed?: (track: Track, participant: RemoteParticipant) => void
  onActiveSpeakersChanged?: (speakers: ParticipantInfo[]) => void
  onConnectionStateChanged?: (state: ConnectionState) => void
  onError?: (error: Error) => void
}

export class LiveKitManager {
  private room: Room | null = null
  private audioTrack: LocalTrackPublication | null = null
  private eventHandlers: LiveKitEventHandler = {}
  private audioElements: Map<string, HTMLMediaElement[]> = new Map()

  constructor() {}

  setEventHandlers(handlers: LiveKitEventHandler) {
    this.eventHandlers = handlers
  }

  async connect(token: string, roomName?: string): Promise<boolean> {
    if (!LIVEKIT_URL) {
      console.error('LiveKit URL not configured')
      this.eventHandlers.onError?.(new Error('LiveKit URL not configured'))
      return false
    }

    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      this.setupEventListeners()

      await this.room.connect(LIVEKIT_URL, token)

      this.eventHandlers.onConnected?.()
      return true
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error)
      this.eventHandlers.onError?.(error as Error)
      return false
    }
  }

  private setupEventListeners() {
    if (!this.room) return

    this.room.on(RoomEvent.Connected, () => {
      this.eventHandlers.onConnected?.()
    })

    this.room.on(RoomEvent.Disconnected, () => {
      this.eventHandlers.onDisconnected?.()
    })

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.eventHandlers.onParticipantJoined?.(participant)
    })

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.eventHandlers.onParticipantLeft?.(participant)
    })

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      this.eventHandlers.onTrackSubscribed?.(track, participant)

      // Auto-play audio tracks with proper tracking
      if (track.kind === Track.Kind.Audio) {
        const audioElement = track.attach()
        document.body.appendChild(audioElement)

        // Track the element for cleanup
        const participantId = participant.identity
        const existing = this.audioElements.get(participantId) || []
        existing.push(audioElement)
        this.audioElements.set(participantId, existing)
      }
    })

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      this.eventHandlers.onTrackUnsubscribed?.(track, participant)

      // Detach and clean up audio elements
      const elements = track.detach()
      elements.forEach(el => {
        el.remove()
      })

      // Clean up tracked elements for this participant
      const participantId = participant.identity
      const tracked = this.audioElements.get(participantId) || []
      tracked.forEach(el => {
        if (el.parentNode) {
          el.remove()
        }
      })
      this.audioElements.delete(participantId)
    })

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerInfo: ParticipantInfo[] = speakers.map(p => ({
        identity: p.identity,
        isSpeaking: true,
        audioLevel: p.audioLevel,
        isMuted: p.isMicrophoneEnabled === false,
      }))
      this.eventHandlers.onActiveSpeakersChanged?.(speakerInfo)
    })

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.eventHandlers.onConnectionStateChanged?.(state)
    })
  }

  async enableMicrophone(): Promise<boolean> {
    if (!this.room) {
      console.error('Not connected to room')
      return false
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(true)
      return true
    } catch (error) {
      console.error('Failed to enable microphone:', error)
      this.eventHandlers.onError?.(error as Error)
      return false
    }
  }

  async disableMicrophone(): Promise<boolean> {
    if (!this.room) return false

    try {
      await this.room.localParticipant.setMicrophoneEnabled(false)
      return true
    } catch (error) {
      console.error('Failed to disable microphone:', error)
      return false
    }
  }

  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) return false

    const isEnabled = this.room.localParticipant.isMicrophoneEnabled
    return isEnabled ? this.disableMicrophone() : this.enableMicrophone()
  }

  isMicrophoneEnabled(): boolean {
    return this.room?.localParticipant.isMicrophoneEnabled ?? false
  }

  getParticipants(): RemoteParticipant[] {
    if (!this.room) return []
    return Array.from(this.room.remoteParticipants.values())
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant ?? null
  }

  getConnectionState(): ConnectionState | null {
    return this.room?.state ?? null
  }

  async disconnect(): Promise<void> {
    // Clean up all tracked audio elements
    this.audioElements.forEach((elements) => {
      elements.forEach(el => {
        if (el.parentNode) {
          el.remove()
        }
      })
    })
    this.audioElements.clear()

    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected
  }
}

// Singleton instance
let liveKitManager: LiveKitManager | null = null

export function getLiveKitManager(): LiveKitManager {
  if (!liveKitManager) {
    liveKitManager = new LiveKitManager()
  }
  return liveKitManager
}

// React hook for LiveKit
import { useState, useEffect, useCallback } from 'react'

export function useLiveKit(token?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [activeSpeakers, setActiveSpeakers] = useState<ParticipantInfo[]>([])
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const manager = getLiveKitManager()

  useEffect(() => {
    manager.setEventHandlers({
      onConnected: () => {
        setIsConnected(true)
        setError(null)
      },
      onDisconnected: () => {
        setIsConnected(false)
        setIsMicEnabled(false)
      },
      onParticipantJoined: () => {
        setParticipants(manager.getParticipants())
      },
      onParticipantLeft: () => {
        setParticipants(manager.getParticipants())
      },
      onActiveSpeakersChanged: (speakers) => {
        setActiveSpeakers(speakers)
      },
      onConnectionStateChanged: (state) => {
        setConnectionState(state)
      },
      onError: (err) => {
        setError(err)
      },
    })

    return () => {
      // Cleanup on unmount
      manager.disconnect()
    }
  }, [])

  const connect = useCallback(async (roomToken: string) => {
    const success = await manager.connect(roomToken)
    if (success) {
      setParticipants(manager.getParticipants())
    }
    return success
  }, []) // manager is a singleton, doesn't need to be in deps

  const disconnect = useCallback(async () => {
    await manager.disconnect()
  }, [])

  const toggleMic = useCallback(async () => {
    const newState = await manager.toggleMicrophone()
    setIsMicEnabled(manager.isMicrophoneEnabled())
    return newState
  }, [])

  const enableMic = useCallback(async () => {
    const success = await manager.enableMicrophone()
    if (success) {
      setIsMicEnabled(true)
    }
    return success
  }, [])

  const disableMic = useCallback(async () => {
    const success = await manager.disableMicrophone()
    if (success) {
      setIsMicEnabled(false)
    }
    return success
  }, [])

  return {
    isConnected,
    isMicEnabled,
    participants,
    activeSpeakers,
    connectionState,
    error,
    connect,
    disconnect,
    toggleMic,
    enableMic,
    disableMic,
  }
}
