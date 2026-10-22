import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

const ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'borrow', label: 'Borrow', icon: '＄' },
  { key: 'credit', label: 'Credit', icon: '◎' },
];

export default function BottomNav({ active, onChange }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.navBg }]}>
      {ITEMS.map((item) => {
        const isActive = active === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[styles.item, isActive && styles.itemActive]}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            {isActive ? <Text style={styles.label}>{item.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 18,
    left: 20,
    right: 20,
    borderRadius: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    gap: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 26,
  },
  itemActive: {
    backgroundColor: '#fff',
  },
  icon: { fontSize: 14 },
  label: { fontSize: 12, color: '#000', fontWeight: '600' },
});
