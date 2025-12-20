import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUserStore, useBattleStore } from '../../lib/store';
import { findBattleByCode, joinBattle } from '../../lib/supabase';

export default function JoinBattleScreen() {
  const { user, isDemo } = useUserStore();
  const { setCurrentBattle } = useBattleStore();

  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinBattle = async () => {
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }

    setIsLoading(true);

    try {
      if (isDemo) {
        // Demo mode - create a mock battle
        const battleId = `demo-join-${Date.now()}`;
        const battle = {
          id: battleId,
          room_code: roomCode.toUpperCase(),
          status: 'ready' as const,
          player1_id: 'demo-host',
          player2_id: user?.id || '',
          winner_id: null,
          current_round: 1,
          total_rounds: 2,
          beat_id: 'demo-1',
          player1_total_score: null,
          player2_total_score: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          voting_style: 'overall' as const,
          show_votes_during_battle: false,
          player1: {
            id: 'demo-host',
            username: 'MC_Host',
            avatar_url: null,
            elo_rating: 1100,
            wins: 10,
            losses: 5,
            total_battles: 15,
            created_at: '',
            updated_at: '',
          },
          player2: user || undefined,
        };

        setCurrentBattle(battle);
        router.replace(`/battle/${battleId}`);
      } else {
        // Real mode - find and join battle
        const battle = await findBattleByCode(roomCode);

        if (!battle) {
          Alert.alert('Error', 'Battle not found. Check the room code.');
          return;
        }

        if (battle.status !== 'waiting') {
          Alert.alert('Error', 'This battle has already started.');
          return;
        }

        const joinedBattle = await joinBattle(battle.id, user?.id || '');

        if (joinedBattle) {
          setCurrentBattle(joinedBattle);
          router.replace(`/battle/${joinedBattle.id}`);
        } else {
          Alert.alert('Error', 'Failed to join battle.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <FontAwesome name="sign-in" size={48} color="#f97316" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Join Battle</Text>
        <Text style={styles.subtitle}>
          Enter the room code shared by your opponent
        </Text>

        {/* Room Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={(text) => setRoomCode(text.toUpperCase())}
            placeholder="ROOM CODE"
            placeholderTextColor="#6b7280"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Join Button */}
        <TouchableOpacity
          style={[styles.joinButton, isLoading && styles.joinButtonDisabled]}
          onPress={handleJoinBattle}
          disabled={isLoading}
        >
          <Text style={styles.joinButtonText}>
            {isLoading ? 'Joining...' : 'Join Battle'}
          </Text>
        </TouchableOpacity>

        {/* Demo hint */}
        {isDemo && (
          <Text style={styles.demoHint}>
            In demo mode, any code will create a simulated battle
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f97316' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#2d2d3d',
  },
  joinButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoHint: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
