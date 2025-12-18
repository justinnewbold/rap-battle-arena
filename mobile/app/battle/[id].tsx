import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio } from 'expo-av';
import { useUserStore, useBattleStore, useAudioStore } from '../../lib/store';
import { getAvatarUrl } from '../../lib/supabase';
import { DEMO_LIBRARY_BEATS } from '../../lib/constants';
import { Profile } from '../../lib/types';

type BattlePhase = 'waiting' | 'countdown' | 'player1' | 'player2' | 'voting' | 'results';

const ROUND_DURATION = 60;
const COUNTDOWN_DURATION = 3;

export default function BattleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isDemo } = useUserStore();
  const { currentBattle, resetBattle } = useBattleStore();
  const { isMuted, volume } = useAudioStore();

  // Battle state
  const [phase, setPhase] = useState<BattlePhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(2);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const [timer, setTimer] = useState(ROUND_DURATION);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);

  // Players
  const [player1, setPlayer1] = useState<Profile | null>(null);
  const [player2, setPlayer2] = useState<Profile | null>(null);

  // Voting
  const [player1Votes, setPlayer1Votes] = useState(0);
  const [player2Votes, setPlayer2Votes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [winner, setWinner] = useState<1 | 2 | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setupBattle();
    return () => {
      cleanupBattle();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Countdown timer
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      startTurn();
    }
  }, [phase, countdown]);

  // Round timer
  useEffect(() => {
    if ((phase === 'player1' || phase === 'player2') && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if ((phase === 'player1' || phase === 'player2') && timer === 0) {
      endTurn();
    }
  }, [phase, timer]);

  function setupBattle() {
    // Demo battle setup
    const demoPlayer1: Profile = user || {
      id: 'demo-player1',
      username: 'MC_Fire',
      avatar_url: null,
      elo_rating: 1100,
      wins: 12,
      losses: 4,
      total_battles: 16,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const demoPlayer2: Profile = {
      id: 'demo-opponent',
      username: 'MC_Ice',
      avatar_url: null,
      elo_rating: 980,
      wins: 5,
      losses: 3,
      total_battles: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPlayer1(demoPlayer1);
    setPlayer2(demoPlayer2);
    setTotalRounds(currentBattle?.total_rounds || 2);

    // Start countdown after a brief moment
    setTimeout(() => {
      setPhase('countdown');
    }, 1500);
  }

  function cleanupBattle() {
    if (recording) {
      recording.stopAndUnloadAsync();
    }
  }

  function startTurn() {
    setTimer(ROUND_DURATION);
    setPhase(currentTurn === 1 ? 'player1' : 'player2');

    // Auto-start recording for demo
    if (isDemo && currentTurn === 1) {
      startRecording();
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
    }
  }

  function endTurn() {
    stopRecording();

    if (currentTurn === 2) {
      if (currentRound >= totalRounds) {
        setPhase('voting');

        // Demo: simulate votes after delay
        if (isDemo) {
          setTimeout(() => {
            const p1 = Math.floor(Math.random() * 10) + 5;
            const p2 = Math.floor(Math.random() * 10) + 5;
            setPlayer1Votes(p1);
            setPlayer2Votes(p2);
          }, 2000);
        }
      } else {
        setCurrentRound(currentRound + 1);
        setCurrentTurn(1);
        setCountdown(COUNTDOWN_DURATION);
        setPhase('countdown');
      }
    } else {
      setCurrentTurn(2);
      setCountdown(COUNTDOWN_DURATION);
      setPhase('countdown');

      // Demo: simulate opponent turn
      if (isDemo) {
        setTimeout(() => {
          setTimeout(endTurn, 3000 + Math.random() * 2000);
        }, COUNTDOWN_DURATION * 1000);
      }
    }
  }

  function handleVote(player: 1 | 2) {
    if (hasVoted) return;

    setHasVoted(true);
    if (player === 1) {
      setPlayer1Votes((v) => v + 1);
    } else {
      setPlayer2Votes((v) => v + 1);
    }
  }

  function showResults() {
    const winnerNum = player1Votes > player2Votes ? 1 : player2Votes > player1Votes ? 2 : (Math.random() > 0.5 ? 1 : 2);
    setWinner(winnerNum);
    setPhase('results');
  }

  function handleExit() {
    resetBattle();
    router.replace('/');
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit}>
          <FontAwesome name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roundText}>
            Round {currentRound} of {totalRounds}
          </Text>
          <Text style={styles.phaseText}>
            {phase === 'waiting' && 'Waiting...'}
            {phase === 'countdown' && 'Get Ready!'}
            {phase === 'player1' && `${player1?.username}'s Turn`}
            {phase === 'player2' && `${player2?.username}'s Turn`}
            {phase === 'voting' && 'Vote Now!'}
            {phase === 'results' && 'Battle Complete!'}
          </Text>
        </View>
        <TouchableOpacity>
          <FontAwesome
            name={isMuted ? 'volume-off' : 'volume-up'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* VS Display */}
        <View style={styles.vsContainer}>
          {/* Player 1 */}
          <TouchableOpacity
            style={[
              styles.playerCard,
              phase === 'player1' && styles.playerCardActive,
              phase === 'voting' && !hasVoted && styles.playerCardVotable,
            ]}
            onPress={() => phase === 'voting' && handleVote(1)}
          >
            <Image
              source={{ uri: getAvatarUrl(player1?.username || 'Player1', player1?.avatar_url) }}
              style={styles.avatar}
            />
            <Text style={styles.playerName}>{player1?.username}</Text>
            {phase === 'voting' && (
              <Text style={styles.voteCount}>{player1Votes} votes</Text>
            )}
          </TouchableOpacity>

          {/* Timer / VS */}
          <View style={styles.centerDisplay}>
            {(phase === 'player1' || phase === 'player2') ? (
              <Text style={[styles.timer, timer <= 10 && styles.timerWarning]}>
                {formatTime(timer)}
              </Text>
            ) : phase === 'countdown' ? (
              <Text style={styles.countdown}>{countdown}</Text>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
          </View>

          {/* Player 2 */}
          <TouchableOpacity
            style={[
              styles.playerCard,
              phase === 'player2' && styles.playerCardActive,
              phase === 'voting' && !hasVoted && styles.playerCardVotable,
            ]}
            onPress={() => phase === 'voting' && handleVote(2)}
          >
            <Image
              source={{ uri: getAvatarUrl(player2?.username || 'Player2', player2?.avatar_url) }}
              style={[styles.avatar, styles.avatarBlue]}
            />
            <Text style={styles.playerName}>{player2?.username}</Text>
            {phase === 'voting' && (
              <Text style={styles.voteCount}>{player2Votes} votes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <Animated.View
            style={[styles.recordingIndicator, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </Animated.View>
        )}

        {/* Voting Phase */}
        {phase === 'voting' && (
          <View style={styles.votingContainer}>
            {hasVoted ? (
              <>
                <Text style={styles.votedText}>Vote Cast!</Text>
                <TouchableOpacity style={styles.resultsButton} onPress={showResults}>
                  <Text style={styles.resultsButtonText}>See Results</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.votingPrompt}>Tap a player to vote!</Text>
            )}
          </View>
        )}

        {/* Results Phase */}
        {phase === 'results' && (
          <View style={styles.resultsContainer}>
            <Text style={styles.winnerEmoji}>
              {winner === 1 && user?.id === player1?.id ? '🏆' : winner === 2 && user?.id === player2?.id ? '🏆' : '🎉'}
            </Text>
            <Text style={styles.winnerText}>
              {winner === 1 ? player1?.username : player2?.username} Wins!
            </Text>
            <View style={styles.finalScores}>
              <Text style={styles.finalScore}>
                {player1?.username}: {player1Votes} votes
              </Text>
              <Text style={styles.finalScore}>
                {player2?.username}: {player2Votes} votes
              </Text>
            </View>
            <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
              <Text style={styles.exitButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Controls */}
      {(phase === 'player1' || phase === 'player2') && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isRecording && styles.controlButtonRecording]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <FontAwesome
              name={isRecording ? 'stop' : 'microphone'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={endTurn}>
            <FontAwesome name="forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f2e',
  },
  headerCenter: {
    alignItems: 'center',
  },
  roundText: {
    color: '#6b7280',
    fontSize: 14,
  },
  phaseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  vsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1f1f2e',
    opacity: 0.6,
  },
  playerCardActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#f97316',
  },
  playerCardVotable: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#6b7280',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#f97316',
    marginBottom: 12,
  },
  avatarBlue: {
    borderColor: '#3b82f6',
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  voteCount: {
    color: '#f97316',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  centerDisplay: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  vsText: {
    color: '#f97316',
    fontSize: 32,
    fontWeight: 'bold',
  },
  timer: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono',
  },
  timerWarning: {
    color: '#ef4444',
  },
  countdown: {
    color: '#eab308',
    fontSize: 72,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444' + '30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    alignSelf: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  votingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  votingPrompt: {
    color: '#eab308',
    fontSize: 18,
    fontWeight: '600',
  },
  votedText: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultsButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resultsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  winnerEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  winnerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  finalScores: {
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  finalScore: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 4,
  },
  exitButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 20,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1f1f2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonRecording: {
    backgroundColor: '#ef4444',
  },
  skipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f1f2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
