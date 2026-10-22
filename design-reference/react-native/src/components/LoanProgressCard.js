import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function LoanProgressCard({ paidPct = 8, duePct = 30, totalPct = 62 }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.stroke }]}>
      <View style={styles.legend}>
        <LegendItem color={colors.accent} label="Total Loan" textColor={colors.textDim} />
        <LegendItem color="#bbb" label="Paid Loan" textColor={colors.textDim} />
        <LegendItem color="#555" label="Due Loan" textColor={colors.textDim} />
      </View>
      <View style={styles.bar}>
        <View style={[styles.seg, styles.segPaid, { flex: paidPct }]}>
          <Text style={styles.segPaidText}>{paidPct}%</Text>
        </View>
        <View style={[styles.seg, styles.segDue, { flex: duePct }]}>
          <Text style={styles.segDueText}>{duePct}%</Text>
        </View>
        <View style={[styles.seg, { backgroundColor: colors.accent, flex: totalPct }]}>
          <Text style={[styles.segTotalText, { color: colors.accentText }]}>{totalPct}%</Text>
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label, textColor }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginBottom: 22,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendLabel: { fontSize: 11 },
  bar: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    gap: 3,
  },
  seg: { alignItems: 'center', justifyContent: 'center' },
  segPaid: { backgroundColor: '#e9e9ec' },
  segPaidText: { fontSize: 11, fontWeight: '700', color: '#111' },
  segDue: { backgroundColor: '#3a3a40' },
  segDueText: { fontSize: 11, fontWeight: '700', color: '#ccc' },
  segTotalText: { fontSize: 11, fontWeight: '700' },
});
