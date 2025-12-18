import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Audio } from 'expo-av';
import { DEMO_LIBRARY_BEATS } from '../../lib/constants';
import { BeatStyle, DemoBeat } from '../../lib/types';
import { useAudioStore } from '../../lib/store';

const STYLE_COLORS: Record<BeatStyle, string> = {
  hiphop: '#f97316',
  trap: '#8b5cf6',
  boom: '#eab308',
  chill: '#3b82f6',
  aggressive: '#ef4444',
  oldschool: '#f59e0b',
  drill: '#6366f1',
  rnb: '#ec4899',
  grime: '#10b981',
  jersey: '#14b8a6',
};

export default function BeatsScreen() {
  const [selectedStyle, setSelectedStyle] = useState<BeatStyle | 'all'>('all');
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const { volume, isMuted } = useAudioStore();

  const styles_list: (BeatStyle | 'all')[] = [
    'all',
    'hiphop',
    'trap',
    'boom',
    'chill',
    'aggressive',
    'oldschool',
    'drill',
    'rnb',
    'grime',
    'jersey',
  ];

  const filteredBeats =
    selectedStyle === 'all'
      ? DEMO_LIBRARY_BEATS
      : DEMO_LIBRARY_BEATS.filter((beat) => beat.style === selectedStyle);

  const toggleBeat = async (beat: DemoBeat) => {
    if (playingBeatId === beat.id) {
      // Stop playing
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setPlayingBeatId(null);
    } else {
      // Stop any current playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      // For now, just show visual feedback (audio generation would need native module)
      setPlayingBeatId(beat.id);

      // In a real implementation, you'd use expo-av to play audio
      // For demo, we'll just show the playing state
    }
  };

  const renderBeatItem = ({ item }: { item: DemoBeat }) => (
    <TouchableOpacity
      style={[
        styles.beatCard,
        playingBeatId === item.id && styles.beatCardPlaying,
      ]}
      onPress={() => toggleBeat(item)}
    >
      <View
        style={[
          styles.beatCover,
          { backgroundColor: STYLE_COLORS[item.style] + '30' },
        ]}
      >
        <FontAwesome
          name={playingBeatId === item.id ? 'pause' : 'play'}
          size={24}
          color={STYLE_COLORS[item.style]}
        />
      </View>
      <View style={styles.beatInfo}>
        <Text style={styles.beatName}>{item.name}</Text>
        <Text style={styles.beatArtist}>{item.artist}</Text>
        <View style={styles.beatMeta}>
          <View style={[styles.styleTag, { backgroundColor: STYLE_COLORS[item.style] + '30' }]}>
            <Text style={[styles.styleTagText, { color: STYLE_COLORS[item.style] }]}>
              {item.style}
            </Text>
          </View>
          <Text style={styles.bpmText}>{item.bpm} BPM</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Style Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {styles_list.map((style) => (
          <TouchableOpacity
            key={style}
            style={[
              styles.filterChip,
              selectedStyle === style && styles.filterChipActive,
              style !== 'all' && {
                borderColor: STYLE_COLORS[style as BeatStyle],
              },
              selectedStyle === style &&
                style !== 'all' && {
                  backgroundColor: STYLE_COLORS[style as BeatStyle] + '30',
                },
            ]}
            onPress={() => setSelectedStyle(style)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStyle === style && styles.filterChipTextActive,
                selectedStyle === style &&
                  style !== 'all' && {
                    color: STYLE_COLORS[style as BeatStyle],
                  },
              ]}
            >
              {style === 'all' ? 'All' : style.charAt(0).toUpperCase() + style.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Beat List */}
      <FlatList
        data={filteredBeats}
        renderItem={renderBeatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  filterScroll: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f2e',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1f1f2e',
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  filterChipActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  filterChipText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  beatCard: {
    flexDirection: 'row',
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  beatCardPlaying: {
    borderWidth: 1,
    borderColor: '#f97316',
  },
  beatCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  beatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  beatArtist: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  beatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  styleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  styleTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bpmText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
