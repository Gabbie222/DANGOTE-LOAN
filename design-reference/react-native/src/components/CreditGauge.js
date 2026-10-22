import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../theme/ThemeContext';

// score: 0-850 mapped onto a 180deg arc
export default function CreditGauge({ score = 780, max = 850, rating = 'Excellent' }) {
  const { colors } = useAppTheme();
  const pct = Math.min(1, score / max);

  // Arc from angle 180 (left) to 0 (right) along a 90px-radius semicircle centered at (100,100)
  const angle = 180 - pct * 180;
  const rad = (angle * Math.PI) / 180;
  const endX = 100 + 90 * Math.cos(rad);
  const endY = 100 - 90 * Math.sin(rad);
  const largeArc = pct > 0.5 ? 1 : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.gauge}>
        <Svg viewBox="0 0 200 110" width="100%" height="100%">
          <Path
            d="M10,100 A90,90 0 0 1 190,100"
            fill="none"
            stroke={colors.stroke}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <Path
            d={`M10,100 A90,90 0 ${largeArc} 1 ${endX},${endY}`}
            fill="none"
            stroke={colors.accent}
            strokeWidth={14}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.overlay} pointerEvents="none">
          <Text style={[styles.score, { color: colors.text }]}>{score}</Text>
          <Text style={[styles.rating, { color: colors.success }]}>{rating}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 10 },
  gauge: { width: 200, height: 110, position: 'relative' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  score: { fontSize: 40, fontWeight: '800', marginBottom: -4 },
  rating: { fontSize: 12, fontWeight: '700' },
});
