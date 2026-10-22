import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function PillButton({ label, onPress, primary = false, style }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: primary ? colors.accent : colors.card2,
          borderColor: primary ? colors.accent : colors.stroke,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: primary ? colors.accentText : colors.text, fontWeight: primary ? '700' : '500' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
  },
});
