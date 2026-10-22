import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function PrimaryCTA({ label, onPress, variant = 'accent', style }) {
  const { colors } = useAppTheme();
  const bg = variant === 'accent' ? colors.accent : colors.text;
  const fg = variant === 'accent' ? colors.accentText : colors.bg;

  return (
    <Pressable onPress={onPress} style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
