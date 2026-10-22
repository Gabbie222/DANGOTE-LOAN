import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export default function TermCard({ icon, title, subtitle, selected, onPress }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.card2 : colors.card,
          borderColor: selected ? colors.accent : colors.stroke,
        },
      ]}
    >
      <View style={styles.main}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card2 }]}>
          <Text>{icon}</Text>
        </View>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textDim }]}>{subtitle}</Text>
        </View>
      </View>
      <View
        style={[
          styles.check,
          {
            borderColor: selected ? colors.accent : colors.stroke,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      >
        {selected ? <Text style={{ color: colors.accentText, fontSize: 12 }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 11 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
