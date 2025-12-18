import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUserStore, useBattleStore } from '../../lib/store';
import { DEMO_LIBRARY_BEATS } from '../../lib/constants';

export default function CreateBattleScreen() {
  const { user, isDemo } = useUserStore();
  const { setCurrentBattle } = useBattleStore();

  const [totalRounds, setTotalRounds] = useState(2);
  const [votingStyle, setVotingStyle] = useState<'overall' | 'per_round'>('overall');
  const [showVotes, setShowVotes] = useState(false);
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);

  const handleCreateBattle = async () => {
    // In demo mode, create a local battle
    const battleId = `demo-${Date.now()}`;
    const roomCode = generateRoomCode();

    const battle = {
      id: battleId,
      room_code: roomCode,
      status: 'waiting' as const,
      player1_id: user?.id || '',
      player2_id: null,
      winner_id: null,
      current_round: 1,
      total_rounds: totalRounds,
      beat_id: selectedBeatId,
      player1_total_score: null,
      player2_total_score: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      voting_style: votingStyle,
      show_votes_during_battle: showVotes,
      player1: user || undefined,
    };

    setCurrentBattle(battle);
    router.replace(`/battle/${battleId}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Rounds Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Number of Rounds</Text>
          <View style={styles.optionsRow}>
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.optionButton,
                  totalRounds === num && styles.optionButtonActive,
                ]}
                onPress={() => setTotalRounds(num)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    totalRounds === num && styles.optionButtonTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voting Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voting Style</Text>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={[
                styles.optionButtonWide,
                votingStyle === 'overall' && styles.optionButtonActive,
              ]}
              onPress={() => setVotingStyle('overall')}
            >
              <FontAwesome
                name="trophy"
                size={20}
                color={votingStyle === 'overall' ? '#fff' : '#6b7280'}
              />
              <Text
                style={[
                  styles.optionButtonText,
                  votingStyle === 'overall' && styles.optionButtonTextActive,
                ]}
              >
                Overall
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButtonWide,
                votingStyle === 'per_round' && styles.optionButtonActive,
              ]}
              onPress={() => setVotingStyle('per_round')}
            >
              <FontAwesome
                name="list"
                size={20}
                color={votingStyle === 'per_round' ? '#fff' : '#6b7280'}
              />
              <Text
                style={[
                  styles.optionButtonText,
                  votingStyle === 'per_round' && styles.optionButtonTextActive,
                ]}
              >
                Per Round
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show Votes Toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setShowVotes(!showVotes)}
        >
          <View>
            <Text style={styles.toggleLabel}>Show Live Votes</Text>
            <Text style={styles.toggleDescription}>
              Display vote counts during battle
            </Text>
          </View>
          <View style={[styles.toggle, showVotes && styles.toggleActive]}>
            <View
              style={[styles.toggleThumb, showVotes && styles.toggleThumbActive]}
            />
          </View>
        </TouchableOpacity>

        {/* Beat Selection Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Beat</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.beatScroll}
          >
            {DEMO_LIBRARY_BEATS.slice(0, 8).map((beat) => (
              <TouchableOpacity
                key={beat.id}
                style={[
                  styles.beatCard,
                  selectedBeatId === beat.id && styles.beatCardSelected,
                ]}
                onPress={() => setSelectedBeatId(beat.id)}
              >
                <FontAwesome name="music" size={24} color="#f97316" />
                <Text style={styles.beatName} numberOfLines={1}>
                  {beat.name}
                </Text>
                <Text style={styles.beatBpm}>{beat.bpm} BPM</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateBattle}
        >
          <Text style={styles.createButtonText}>Create Battle</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonWide: {
    flex: 1,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  optionButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleDescription: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2d2d3d',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#f97316',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6b7280',
  },
  toggleThumbActive: {
    backgroundColor: '#fff',
    marginLeft: 'auto',
  },
  beatScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  beatCard: {
    width: 100,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  beatCardSelected: {
    borderColor: '#f97316',
  },
  beatName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  beatBpm: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
