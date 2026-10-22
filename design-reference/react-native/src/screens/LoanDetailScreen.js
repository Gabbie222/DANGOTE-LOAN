import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import AmountStepper from '../components/AmountStepper';
import FrequencyTabs from '../components/FrequencyTabs';
import PrimaryCTA from '../components/PrimaryCTA';
import SectionHeader from '../components/SectionHeader';
import BillCard from '../components/BillCard';

export default function LoanDetailScreen({ onBack }) {
  const { colors } = useAppTheme();
  const [amount, setAmount] = useState(10000);
  const [frequency, setFrequency] = useState('6 months');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: colors.card2, borderColor: colors.stroke }]}
        >
          <Text style={{ color: colors.text }}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Home Loan</Text>
      </View>
      <Text style={[styles.sub, { color: colors.textDim }]}>Maximum amount $20,000</Text>

      <AmountStepper value={amount} onChange={setAmount} />

      <Text style={[styles.freqLabel, { color: colors.textDim }]}>Frequency</Text>
      <FrequencyTabs
        options={['6 months', '12 months', '24 months']}
        value={frequency}
        onChange={setFrequency}
      />

      <PrimaryCTA label="Apply Now" variant="dark" style={{ marginBottom: 24 }} />

      <SectionHeader title="Unpaid Bills" onSeeAll={() => {}} />
      <BillCard amount="110" monthLabel="Fees of February" amountLeft="$1,974" interest="0.1%" />
      <BillCard amount="53" monthLabel="Fees of January" amountLeft="$1,302" interest="0.2%" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700' },
  sub: { fontSize: 11, marginLeft: 46, marginBottom: 20 },
  freqLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
});
