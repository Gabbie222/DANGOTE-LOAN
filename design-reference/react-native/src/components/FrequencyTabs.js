import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function FrequencyTabs({ options, value, onChange }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.tab,
              {
                backgroundColor: active ? colors.accent : colors.card2,
                borderColor: active ? colors.accent : colors.stroke,
              },
            ]}
          >
            <Text style={[styles.label, { color: active ? colors.accentText : colors.text }]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
