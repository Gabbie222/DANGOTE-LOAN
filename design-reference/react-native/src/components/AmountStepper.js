import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function AmountStepper({ value, onChange, step = 500, fontSize = 34 }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.btn, { backgroundColor: colors.card2, borderColor: colors.stroke }]}
        onPress={() => onChange(Math.max(0, value - step))}
      >
        <Text style={[styles.btnLabel, { color: colors.text }]}>−</Text>
      </Pressable>

      <Text style={[styles.value, { color: colors.accent, fontSize, borderColor: colors.stroke }]}>
        ${value.toLocaleString()}
      </Text>

      <Pressable
        style={[styles.btn, { backgroundColor: colors.card2, borderColor: colors.stroke }]}
        onPress={() => onChange(value + step)}
      >
        <Text style={[styles.btnLabel, { color: colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 20,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { fontSize: 20 },
  value: {
    fontWeight: '800',
    borderBottomWidth: 2,
    paddingBottom: 10,
  },
});
