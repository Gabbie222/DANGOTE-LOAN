import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import PillButton from './PillButton';

export default function BillCard({ amount, monthLabel, amountLeft, interest, onApply }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.stroke }]}>
      <View style={styles.main}>
        <Text style={[styles.amount, { color: colors.text }]}>${amount}</Text>
        <Text style={[styles.month, { color: colors.textDim }]}>{monthLabel}</Text>
        <View style={styles.stats}>
          <Text style={[styles.statText, { color: colors.textDim }]}>{amountLeft} left</Text>
          <Text style={[styles.statText, { color: colors.textDim }]}>{interest} Interest</Text>
        </View>
      </View>
      <PillButton label="Apply Loan" primary onPress={onApply} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  main: { flex: 1 },
  amount: { fontSize: 16, fontWeight: '700' },
  month: { fontSize: 10 },
  stats: { flexDirection: 'row', gap: 14, marginTop: 6 },
  statText: { fontSize: 11 },
});
