import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function SummaryGrid({ items }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.cell, { backgroundColor: colors.card, borderColor: colors.stroke }]}
        >
          <Text style={[styles.label, { color: colors.textDim }]}>{item.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: {
    flexBasis: '47%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  label: { fontSize: 11 },
  value: { fontSize: 16, fontWeight: '700', marginTop: 2 },
});
