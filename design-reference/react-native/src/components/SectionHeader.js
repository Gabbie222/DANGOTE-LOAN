import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function SectionHeader({ title, onSeeAll, style, titleStyle }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: colors.text }, titleStyle]}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll}>
          <Text style={[styles.seeAll, { color: colors.textDim }]}>See all ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 15, fontWeight: '700' },
  seeAll: { fontSize: 12 },
});
