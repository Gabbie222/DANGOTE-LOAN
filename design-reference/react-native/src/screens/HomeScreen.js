import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import LoanProgressCard from '../components/LoanProgressCard';
import LoanItem from '../components/LoanItem';
import SectionHeader from '../components/SectionHeader';

export default function HomeScreen({ onApplyHomeLoan }) {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View style={styles.avatar} />
        <Pressable style={[styles.menuBtn, { backgroundColor: colors.card2, borderColor: colors.stroke }]}>
          <Text style={{ color: colors.text }}>≡</Text>
        </Pressable>
      </View>

      <Text style={[styles.hero, { color: colors.text }]}>
        Get <Text style={{ color: colors.textDim }}>Loans</Text>
        {'\n'}in Minutes
      </Text>
      <Text style={[styles.sub, { color: colors.textDim }]}>
        Meet financial needs and achieve specific goals.
      </Text>

      <LoanProgressCard paidPct={8} duePct={30} totalPct={62} />

      <SectionHeader title="Popular Loans" onSeeAll={() => {}} />
      <LoanItem icon="🏠" title="Home Loan" onApply={onApplyHomeLoan} />
      <LoanItem icon="🎓" title="Study Loan" onApply={() => {}} />
      <LoanItem
        icon="🚗"
        title="Car Loan"
        description="Seeking financial support for a reliable vehicle."
        onApply={() => {}}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#666' },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { fontSize: 30, fontWeight: '800', lineHeight: 34, marginBottom: 6 },
  sub: { fontSize: 13, marginBottom: 18 },
});
