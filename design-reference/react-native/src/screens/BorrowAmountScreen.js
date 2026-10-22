import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import PrimaryCTA from '../components/PrimaryCTA';

export default function BorrowAmountScreen({ onContinue }) {
  const { colors } = useAppTheme();
  const [amount] = useState(5000);
  const max = 10000;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.prompt, { color: colors.text }]}>
        How much would you like to borrow?
      </Text>

      <Text style={[styles.label, { color: colors.textDim }]}>Loan Amount</Text>
      <Text style={[styles.amount, { color: colors.accent, borderColor: colors.stroke }]}>
        ${amount.toLocaleString()}
      </Text>
      <Text style={[styles.caption, { color: colors.textDim }]}>
        I wanna borrow ${amount.toLocaleString()}.{'\n'}You can only apply up to ${max.toLocaleString()}.
      </Text>

      <PrimaryCTA label="Continue →" onPress={() => onContinue(amount)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' },
  prompt: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 12, marginBottom: 6 },
  amount: {
    fontSize: 44,
    fontWeight: '800',
    borderBottomWidth: 2,
    paddingBottom: 10,
    marginBottom: 14,
  },
  caption: { fontSize: 12, textAlign: 'center', marginBottom: 40 },
});
