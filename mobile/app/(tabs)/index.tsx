import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useUserStore } from '../../lib/store';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { user, setIsDemo, setUser } = useUserStore();

  const handleDemoMode = () => {
    setIsDemo(true);
    setUser({
      id: 'demo-user',
      username: 'DemoMC',
      avatar_url: null,
      elo_rating: 1000,
      wins: 0,
      losses: 0,
      total_battles: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.title}>RAP BATTLE</Text>
          <Text style={styles.subtitle}>ARENA</Text>
          <Text style={styles.tagline}>Step into the arena. Prove your skills.</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (!user) handleDemoMode();
              router.push('/battle/create');
            }}
          >
            <LinearGradient
              colors={['#f97316', '#ea580c']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <FontAwesome name="plus" size={20} color="#fff" />
              <Text style={styles.buttonText}>Create Battle</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (!user) handleDemoMode();
              router.push('/battle/join');
            }}
          >
            <FontAwesome name="search" size={20} color="#f97316" />
            <Text style={styles.secondaryButtonText}>Join Battle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (!user) handleDemoMode();
              router.push('/battles');
            }}
          >
            <FontAwesome name="eye" size={20} color="#f97316" />
            <Text style={styles.secondaryButtonText}>Watch Live</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        {user && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
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
                <Text style={styles.statNumber}>{user.elo_rating}</Text>
                <Text style={styles.statLabel}>ELO</Text>
              </View>
            </View>
          </View>
        )}

        {/* Features Section */}
        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <FontAwesome name="microphone" size={24} color="#f97316" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Live Battles</Text>
              <Text style={styles.featureDesc}>
                Battle other rappers in real-time with beats playing
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <FontAwesome name="music" size={24} color="#3b82f6" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Beat Library</Text>
              <Text style={styles.featureDesc}>
                25+ beats across 10 styles: hip-hop, trap, drill & more
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <FontAwesome name="trophy" size={24} color="#eab308" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Spectator Voting</Text>
              <Text style={styles.featureDesc}>
                Let the crowd decide who wins each battle
              </Text>
            </View>
          </View>
        </View>

        {/* Demo Mode Banner */}
        {!user && (
          <TouchableOpacity style={styles.demoBanner} onPress={handleDemoMode}>
            <Text style={styles.demoText}>Try Demo Mode</Text>
            <FontAwesome name="arrow-right" size={16} color="#f97316" />
          </TouchableOpacity>
        )}
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
  hero: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#f97316',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: -8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  actions: {
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f97316',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  features: {
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: '#6b7280',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  demoText: {
    color: '#f97316',
    fontSize: 16,
    fontWeight: '600',
  },
});
