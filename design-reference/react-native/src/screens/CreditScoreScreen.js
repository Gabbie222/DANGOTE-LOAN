import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import CreditGauge from '../components/CreditGauge';
import QuickActions from '../components/QuickActions';
import SummaryGrid from '../components/SummaryGrid';
import SectionHeader from '../components/SectionHeader';

export default function CreditScoreScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader title="My Credits" />
      <CreditGauge score={780} max={850} rating="Excellent" />

      <QuickActions
        items={[
          { icon: '💳', label: 'Make Payment' },
          { icon: '⚙️', label: 'Manage' },
          { icon: '⋯', label: 'More' },
        ]}
      />

      <SummaryGrid
        items={[
          { label: 'Late Payments', value: '0' },
          { label: 'Oldest Account', value: '12.4y' },
          { label: 'Available Credit', value: '$31,158' },
          { label: 'Credit Usage', value: '25%' },
        ]}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110 },
});
