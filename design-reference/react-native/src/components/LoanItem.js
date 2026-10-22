import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import PillButton from './PillButton';

export default function LoanItem({ icon, title, description, onApply }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.stroke }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.card2 }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.desc, { color: colors.textDim }]}>{description}</Text>
        ) : null}
      </View>
      <PillButton label="Apply Loan" onPress={onApply} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 11, marginTop: 2 },
});
