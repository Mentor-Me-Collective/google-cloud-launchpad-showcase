// Small pill for every lesson screen: orange when offline, green when online.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '../hooks/useOnline';

export function StatusPill() {
  const isOnline = useOnline();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={isOnline ? 'Online, progress saved' : 'Offline, progress saved on this device'}
      style={[styles.pill, isOnline ? styles.online : styles.offline]}
    >
      <View style={[styles.dot, { backgroundColor: isOnline ? '#0ca30c' : '#eb6834' }]} />
      <Text style={styles.text}>{isOnline ? 'Online · Saved' : 'Offline · Saved on this device'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  online: { backgroundColor: '#e8f5e8' },
  offline: { backgroundColor: '#fdf0ea' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  text: { fontSize: 14, fontWeight: '600', color: '#0b0b0b' },
});
