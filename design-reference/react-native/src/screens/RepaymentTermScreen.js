import React, { useState } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import TermCard from '../components/TermCard';
import PrimaryCTA from '../components/PrimaryCTA';

const TERMS = [
  { key: '6', icon: '⏱', title: '6 months', subtitle: 'With 6.25% Interest Rate' },
  { key: '12', icon: '📄', title: '12 months', subtitle: 'With 6.00% Interest Rate' },
  { key: '24', icon: '📅', title: '24 months', subtitle: 'With 5.85% Interest Rate' },
  { key: 'custom', icon: '⚙️', title: 'Custom', subtitle: 'Get your own date and rate' },
];

export default function RepaymentTermScreen({ onContinue }) {
  const { colors } = useAppTheme();
  const [selected, setSelected] = useState('6');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>
        How long do you want to{'\n'}take to repay the loan?
      </Text>

      {TERMS.map((term) => (
        <TermCard
          key={term.key}
          icon={term.icon}
          title={term.title}
          subtitle={term.subtitle}
          selected={selected === term.key}
          onPress={() => setSelected(term.key)}
        />
      ))}

      <PrimaryCTA label="Continue →" onPress={() => onContinue(selected)} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 18 },
});
