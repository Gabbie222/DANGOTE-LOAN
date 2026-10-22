import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function QuickActions({ items }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Pressable key={item.label} style={styles.item} onPress={item.onPress}>
          <View style={[styles.circle, { backgroundColor: colors.card2, borderColor: colors.stroke }]}>
            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
          </View>
          <Text style={[styles.label, { color: colors.textDim }]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  item: { alignItems: 'center', gap: 6 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11 },
});
