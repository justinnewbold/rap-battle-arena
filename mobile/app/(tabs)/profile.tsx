import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUserStore } from '../../lib/store';
import { getAvatarUrl } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, isDemo, logout } = useUserStore();

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.notLoggedIn}>
          <FontAwesome name="user-circle" size={80} color="#2d2d3d" />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Sign in to track your stats and battle history
          </Text>
          <TouchableOpacity style={styles.signInButton}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const winRate = user.total_battles > 0
    ? Math.round((user.wins / user.total_battles) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: getAvatarUrl(user.username, user.avatar_url) }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{user.username}</Text>
          {isDemo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>Demo Mode</Text>
            </View>
          )}
          <View style={styles.eloContainer}>
            <FontAwesome name="star" size={16} color="#eab308" />
            <Text style={styles.eloText}>{user.elo_rating} ELO</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user.total_battles}</Text>
            <Text style={styles.statLabel}>Battles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Win Rate</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${winRate}%` }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>{user.wins} wins</Text>
            <Text style={styles.progressLabel}>{user.losses} losses</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FontAwesome name="history" size={20} color="#f97316" />
            </View>
            <Text style={styles.menuText}>Battle History</Text>
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FontAwesome name="trophy" size={20} color="#eab308" />
            </View>
            <Text style={styles.menuText}>Achievements</Text>
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FontAwesome name="cog" size={20} color="#6b7280" />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FontAwesome name="question-circle" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <FontAwesome name="chevron-right" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <FontAwesome name="sign-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>
            {isDemo ? 'Exit Demo Mode' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    padding: 20,
  },
  notLoggedIn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notLoggedInTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  notLoggedInText: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#f97316',
    marginBottom: 16,
  },
  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  demoBadge: {
    backgroundColor: '#f97316' + '30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  demoBadgeText: {
    color: '#f97316',
    fontSize: 12,
    fontWeight: '600',
  },
  eloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  eloText: {
    color: '#eab308',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: '#f97316',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1f1f2e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  menu: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444' + '50',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
