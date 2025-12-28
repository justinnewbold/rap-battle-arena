'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore, useBattleStore } from '@/lib/store'
import {
  supabase, getBattle, Battle, Profile, Beat,
  castVote, getVoteCounts, VoteCounts, getSpectatorCount, isUserSpectator
} from '@/lib/supabase'
import { useSounds } from '@/lib/sounds'
import { getBeatGenerator } from '@/lib/beat-generator'
import { DEMO_LIBRARY_BEATS, BeatStyle } from '@/lib/constants'

export type BattlePhase = 'waiting' | 'countdown' | 'player1' | 'player2' | 'voting' | 'results'

export const ROUND_DURATION = 60 // seconds
export const COUNTDOWN_DURATION = 3

interface DemoBeat extends Omit<Beat, 'audio_url'> {
  style?: BeatStyle
  audio_url: string | null
}

interface UseBattleOptions {
  battleId: string
  isSpectatorParam?: boolean
  onError?: (error: string) => void
}

interface UseBattleReturn {
  // Battle state
  battle: Battle | null
  phase: BattlePhase
  currentRound: number
  totalRounds: number
  countdown: number
  timer: number
  isRecording: boolean
  isSpectator: boolean

  // Players
  player1: Profile | null
  player2: Profile | null
  currentTurn: 1 | 2

  // Voting
  voteCounts: VoteCounts
  hasVoted: boolean
  votedFor: string | null
  spectatorCount: number
  winner: 1 | 2 | null

  // Beat
  selectedBeat: DemoBeat | null
  isBeatPlaying: boolean
  beatVolume: number
  isMuted: boolean

  // Actions
  startRecording: () => Promise<void>
  stopRecording: () => void
  endTurn: () => void
  handleSkip: () => void
  handleVote: (playerId: string) => Promise<void>
  proceedFromVoting: () => void
  handleExit: () => void
  setIsMuted: (muted: boolean) => void
  setBeatVolume: (volume: number) => void
}

export function useBattle({ battleId, isSpectatorParam = false, onError }: UseBattleOptions): UseBattleReturn {
  const router = useRouter()
  const { user, isDemo } = useUserStore()
  const { resetBattle } = useBattleStore()
  const sounds = useSounds()

  // Battle data
  const [battle, setBattle] = useState<Battle | null>(null)
  const [isSpectator, setIsSpectator] = useState(isSpectatorParam)

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('waiting')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(2)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [timer, setTimer] = useState(ROUND_DURATION)
  const [isRecording, setIsRecording] = useState(false)

  // Players
  const [player1, setPlayer1] = useState<Profile | null>(null)
  const [player2, setPlayer2] = useState<Profile | null>(null)
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1)

  // Voting
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({ player1Votes: 0, player2Votes: 0, totalVotes: 0 })
  const [hasVoted, setHasVoted] = useState(false)
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [winner, setWinner] = useState<1 | 2 | null>(null)

  // Audio
  const [isMuted, setIsMuted] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Beat playback
  const [selectedBeat, setSelectedBeat] = useState<DemoBeat | null>(null)
  const [isBeatPlaying, setIsBeatPlaying] = useState(false)
  const [beatVolume, setBeatVolume] = useState(0.5)
  const beatAudioRef = useRef<HTMLAudioElement | null>(null)

  // Supabase channel ref for cleanup
  const battleChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Preload sounds
  useEffect(() => {
    sounds.preload()
  }, [])

  // Sync mute state with sound manager and beat volume
  useEffect(() => {
    sounds.setEnabled(!isMuted)
    const effectiveVolume = isMuted ? 0 : beatVolume
    if (beatAudioRef.current) {
      beatAudioRef.current.volume = effectiveVolume
    }
    getBeatGenerator().setVolume(effectiveVolume)
  }, [isMuted, beatVolume])

  // Cleanup beat on unmount
  useEffect(() => {
    return () => {
      stopBeat()
    }
  }, [])

  // Load battle
  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    if (isDemo || battleId.startsWith('demo-')) {
      setupDemoBattle()
    } else {
      loadBattle()
    }

    return () => {
      resetBattle()
      if (battleChannelRef.current) {
        supabase.removeChannel(battleChannelRef.current)
        battleChannelRef.current = null
      }
    }
  }, [battleId])

  // Check spectator status
  useEffect(() => {
    async function checkSpectatorStatus() {
      if (!user || !battleId || battleId.startsWith('demo-')) return
      const spectator = await isUserSpectator(battleId, user.id)
      if (spectator) {
        setIsSpectator(true)
      }
    }
    checkSpectatorStatus()
  }, [battleId, user])

  // Countdown timer
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      sounds.play('countdown')
      const countdownTimeout = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(countdownTimeout)
    } else if (phase === 'countdown' && countdown === 0) {
      sounds.play('round_start')
      startTurn()
    }
  }, [phase, countdown])

  // Round timer
  useEffect(() => {
    if ((phase === 'player1' || phase === 'player2') && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000)
      return () => clearInterval(interval)
    } else if ((phase === 'player1' || phase === 'player2') && timer === 0) {
      endTurn()
    }
  }, [phase, timer])

  // Poll spectator count with proper cleanup
  useEffect(() => {
    if (battleId.startsWith('demo-')) return

    let isMounted = true

    const fetchSpectatorCount = async () => {
      try {
        const count = await getSpectatorCount(battleId)
        if (isMounted) {
          setSpectatorCount(count)
        }
      } catch (error) {
        console.error('Failed to fetch spectator count:', error)
      }
    }

    // Fetch immediately on mount
    fetchSpectatorCount()

    const interval = setInterval(fetchSpectatorCount, 5000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [battleId])

  function setupDemoBattle() {
    const demoPlayer1 = isSpectator ? {
      id: 'demo-player1',
      username: 'MC_Fire',
      avatar_url: null,
      elo_rating: 1100,
      wins: 12,
      losses: 4,
      total_battles: 16,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } : user

    setPlayer1(demoPlayer1)
    setPlayer2({
      id: 'demo-opponent',
      username: 'MC_Ice',
      avatar_url: null,
      elo_rating: 980,
      wins: 5,
      losses: 3,
      total_battles: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const randomBeat = DEMO_LIBRARY_BEATS[Math.floor(Math.random() * DEMO_LIBRARY_BEATS.length)]
    setSelectedBeat(randomBeat as DemoBeat)

    setBattle({
      id: battleId,
      room_code: 'DEMO',
      status: 'ready',
      player1_id: demoPlayer1?.id || '',
      player2_id: 'demo-opponent',
      winner_id: null,
      current_round: 1,
      total_rounds: 2,
      beat_id: randomBeat.id,
      player1_total_score: null,
      player2_total_score: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      voting_style: 'overall',
      show_votes_during_battle: false,
    })

    setTotalRounds(2)
    setSpectatorCount(isSpectator ? 1 : 0)

    setTimeout(() => {
      setPhase('countdown')
    }, 1500)
  }

  async function loadBattle() {
    const loadedBattle = await getBattle(battleId)
    if (loadedBattle) {
      setBattle(loadedBattle)
      setPlayer1(loadedBattle.player1 || null)
      setPlayer2(loadedBattle.player2 || null)
      setTotalRounds(loadedBattle.total_rounds)

      if (loadedBattle.beat_id) {
        const { data: beat } = await supabase
          .from('beats')
          .select('*')
          .eq('id', loadedBattle.beat_id)
          .single()

        if (beat) {
          setSelectedBeat(beat as DemoBeat)
        }
      }

      const isContestant = user?.id === loadedBattle.player1_id || user?.id === loadedBattle.player2_id
      if (!isContestant) {
        setIsSpectator(true)
      }

      const count = await getSpectatorCount(battleId)
      setSpectatorCount(count)

      if (battleChannelRef.current) {
        supabase.removeChannel(battleChannelRef.current)
      }

      const channel = supabase
        .channel(`battle-${battleId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${battleId}`
          },
          (payload) => {
            if (payload.new.status === 'ready') {
              setPhase('countdown')
            }
          }
        )
        .subscribe()

      battleChannelRef.current = channel

      if (loadedBattle.status === 'ready') {
        setPhase('countdown')
      }
    }
  }

  function startBeat() {
    if (!selectedBeat || isBeatPlaying) return

    const generator = getBeatGenerator()
    const effectiveVolume = isMuted ? 0 : beatVolume

    if (selectedBeat.style && (selectedBeat.id.startsWith('demo-') || selectedBeat.id.startsWith('lib-'))) {
      generator.start({ name: selectedBeat.name, bpm: selectedBeat.bpm, style: selectedBeat.style })
      generator.setVolume(effectiveVolume)
      setIsBeatPlaying(true)
    } else if (selectedBeat.audio_url) {
      const audio = new Audio(selectedBeat.audio_url)
      audio.loop = true
      audio.volume = effectiveVolume
      audio.play().catch(err => console.error('Beat playback error:', err))
      beatAudioRef.current = audio
      setIsBeatPlaying(true)
    }
  }

  function stopBeat() {
    const generator = getBeatGenerator()
    generator.stop()

    if (beatAudioRef.current) {
      beatAudioRef.current.pause()
      beatAudioRef.current.src = ''
      beatAudioRef.current = null
    }
    setIsBeatPlaying(false)
  }

  function startTurn() {
    setTimer(ROUND_DURATION)
    setPhase(currentTurn === 1 ? 'player1' : 'player2')

    if (selectedBeat) {
      startBeat()
    }

    if (!isSpectator && isDemo && currentTurn === 1) {
      startRecording()
    }
  }

  async function startRecording() {
    if (isSpectator) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
      onError?.('Failed to start recording. Please check microphone permissions.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const endTurn = useCallback(() => {
    stopRecording()
    stopBeat()
    sounds.play('round_end')

    if (currentTurn === 2) {
      if (currentRound >= totalRounds) {
        setPhase('voting')
        setHasVoted(false)
        setVotedFor(null)

        if (isDemo) {
          setTimeout(() => {
            const p1Votes = Math.floor(Math.random() * 10) + 5
            const p2Votes = Math.floor(Math.random() * 10) + 5
            setVoteCounts({
              player1Votes: p1Votes,
              player2Votes: p2Votes,
              totalVotes: p1Votes + p2Votes
            })
          }, 2000)
        }
      } else {
        if (battle?.voting_style === 'per_round') {
          setPhase('voting')
          setHasVoted(false)
          setVotedFor(null)
        } else {
          setCurrentRound(currentRound + 1)
          setCurrentTurn(1)
          setCountdown(COUNTDOWN_DURATION)
          setPhase('countdown')
        }
      }
    } else {
      setCurrentTurn(2)
      setCountdown(COUNTDOWN_DURATION)
      setPhase('countdown')

      if (isDemo) {
        setTimeout(() => {
          setTimeout(() => {
            endTurn()
          }, 3000 + Math.random() * 2000)
        }, COUNTDOWN_DURATION * 1000)
      }
    }
  }, [currentTurn, currentRound, totalRounds, battle, isDemo])

  async function handleVote(playerId: string) {
    if (!isSpectator || hasVoted || !user || !battle) return

    sounds.play('vote')
    setVotedFor(playerId)
    setHasVoted(true)

    if (!isDemo) {
      try {
        const roundNum = battle.voting_style === 'per_round' ? currentRound : null
        await castVote(battleId, user.id, playerId, roundNum)

        if (player1 && player2) {
          const counts = await getVoteCounts(battleId, player1.id, player2.id, roundNum)
          setVoteCounts(counts)
        }
      } catch (err) {
        console.error('Error casting vote:', err)
        setVotedFor(null)
        setHasVoted(false)
        onError?.('Failed to cast vote. Please try again.')
      }
    } else {
      setVoteCounts(prev => ({
        player1Votes: prev.player1Votes + (playerId === player1?.id ? 1 : 0),
        player2Votes: prev.player2Votes + (playerId === player2?.id ? 1 : 0),
        totalVotes: prev.totalVotes + 1
      }))
    }
  }

  function proceedFromVoting() {
    if (currentRound >= totalRounds) {
      calculateWinner()
    } else {
      setVoteCounts({ player1Votes: 0, player2Votes: 0, totalVotes: 0 })
      setCurrentRound(currentRound + 1)
      setCurrentTurn(1)
      setCountdown(COUNTDOWN_DURATION)
      setPhase('countdown')
    }
  }

  function calculateWinner() {
    let winnerNum: 1 | 2
    if (voteCounts.player1Votes > voteCounts.player2Votes) {
      winnerNum = 1
    } else if (voteCounts.player2Votes > voteCounts.player1Votes) {
      winnerNum = 2
    } else {
      winnerNum = Math.random() > 0.5 ? 1 : 2
    }
    setWinner(winnerNum)

    const userIsWinner = (winnerNum === 1 && user?.id === player1?.id) ||
                         (winnerNum === 2 && user?.id === player2?.id)
    if (!isSpectator) {
      sounds.play(userIsWinner ? 'victory' : 'defeat')
    } else {
      sounds.play('victory')
    }

    setPhase('results')
  }

  function handleSkip() {
    if ((phase === 'player1' || phase === 'player2') && !isSpectator) {
      endTurn()
    }
  }

  function handleExit() {
    resetBattle()
    router.push('/dashboard')
  }

  return {
    battle,
    phase,
    currentRound,
    totalRounds,
    countdown,
    timer,
    isRecording,
    isSpectator,
    player1,
    player2,
    currentTurn,
    voteCounts,
    hasVoted,
    votedFor,
    spectatorCount,
    winner,
    selectedBeat,
    isBeatPlaying,
    beatVolume,
    isMuted,
    startRecording,
    stopRecording,
    endTurn,
    handleSkip,
    handleVote,
    proceedFromVoting,
    handleExit,
    setIsMuted,
    setBeatVolume,
  }
}
