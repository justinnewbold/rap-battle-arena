import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Battle } from '../../lib/types';
import { useUserStore } from '../../lib/store';

// Demo battles for testing
const DEMO_BATTLES: Battle[] = [
  {
    id: 'demo-battle-1',
    room_code: 'FIRE01',
    status: 'battling',
    player1_id: 'p1',
    player2_id: 'p2',
    winner_id: null,
    current_round: 1,
    total_rounds: 2,
    beat_id: 'demo-1',
    player1_total_score: null,
    player2_total_score: null,
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    completed_at: null,
    voting_style: 'overall',
    show_votes_during_battle: false,
    player1: {
      id: 'p1',
      username: 'MC_Fire',
      avatar_url: null,
      elo_rating: 1200,
      wins: 15,
      losses: 5,
      total_battles: 20,
      created_at: '',
      updated_at: '',
    },
    player2: {
      id: 'p2',
      username: 'LyricKing',
      avatar_url: null,
      elo_rating: 1150,
      wins: 12,
      losses: 8,
      total_battles: 20,
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 'demo-battle-2',
    room_code: 'ICE02',
    status: 'waiting',
    player1_id: 'p3',
    player2_id: null,
    winner_id: null,
    current_round: 1,
    total_rounds: 3,
    beat_id: 'demo-5',
    player1_total_score: null,
    player2_total_score: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    voting_style: 'per_round',
    show_votes_during_battle: true,
    player1: {
      id: 'p3',
      username: 'FlowMaster',
      avatar_url: null,
      elo_rating: 1050,
      wins: 8,
      losses: 6,
      total_battles: 14,
      created_at: '',
      updated_at: '',
    },
  },
];

export default function BattlesScreen() {
  const [battles, setBattles] = useState<Battle[]>(DEMO_BATTLES);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'waiting'>('all');
  const { user } = useUserStore();

  const filteredBattles = battles.filter((battle) => {
    if (filter === 'live') return battle.status === 'battling';
    if (filter === 'waiting') return battle.status === 'waiting';
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // In real app, fetch battles from Supabase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const renderBattleItem = ({ item }: { item: Battle }) => (
    <TouchableOpacity
      style={styles.battleCard}
      onPress={() => router.push(`/battle/${item.id}?spectator=true`)}
    >
      <View style={styles.battleHeader}>
        <View
          style={[
            styles.statusBadge,
            item.status === 'battling' && styles.statusLive,
            item.status === 'waiting' && styles.statusWaiting,
          ]}
        >
          {item.status === 'battling' && (
            <View style={styles.liveDot} />
          )}
          <Text style={styles.statusText}>
            {item.status === 'battling' ? 'LIVE' : item.status === 'waiting' ? 'WAITING' : item.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.roomCode}>{item.room_code}</Text>
      </View>

      <View style={styles.battlePlayers}>
        <View style={styles.playerInfo}>
          <View style={styles.avatar}>
            <FontAwesome name="user" size={20} color="#f97316" />
          </View>
          <Text style={styles.playerName}>{item.player1?.username || 'Player 1'}</Text>
          <Text style={styles.playerElo}>ELO {item.player1?.elo_rating || 1000}</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.roundText}>
            Round {item.current_round}/{item.total_rounds}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={[styles.avatar, styles.avatarBlue]}>
            <FontAwesome name="user" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.playerName}>{item.player2?.username || 'Waiting...'}</Text>
          <Text style={styles.playerElo}>
            {item.player2 ? `ELO ${item.player2.elo_rating}` : '---'}
          </Text>
        </View>
      </View>

      <View style={styles.battleFooter}>
        <TouchableOpacity
          style={styles.watchButton}
          onPress={() => router.push(`/battle/${item.id}?spectator=true`)}
        >
          <FontAwesome name="eye" size={14} color="#f97316" />
          <Text style={styles.watchButtonText}>
            {item.status === 'waiting' ? 'Join' : 'Watch'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'live', 'waiting'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'Waiting'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Battle List */}
      <FlatList
        data={filteredBattles}
        renderItem={renderBattleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f97316"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="fire" size={48} color="#2d2d3d" />
            <Text style={styles.emptyText}>No battles found</Text>
            <Text style={styles.emptySubtext}>
              Create a battle or wait for others to start
            </Text>
          </View>
        }
      />

      {/* Create Battle FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/battle/create')}
      >
        <FontAwesome name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  filterTabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#1f1f2e',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#f97316',
  },
  filterTabText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  battleCard: {
    backgroundColor: '#1f1f2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2d2d3d',
    gap: 6,
  },
  statusLive: {
    backgroundColor: '#ef4444',
  },
  statusWaiting: {
    backgroundColor: '#eab308',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomCode: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
  battlePlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  playerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f97316' + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarBlue: {
    backgroundColor: '#3b82f6' + '30',
  },
  playerName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  playerElo: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  vsText: {
    color: '#f97316',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roundText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  battleFooter: {
    alignItems: 'center',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f97316' + '20',
    borderWidth: 1,
    borderColor: '#f97316',
  },
  watchButtonText: {
    color: '#f97316',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
