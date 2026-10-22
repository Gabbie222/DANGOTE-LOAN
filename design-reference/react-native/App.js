import React, { useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import BottomNav from './src/components/BottomNav';
import HomeScreen from './src/screens/HomeScreen';
import BorrowAmountScreen from './src/screens/BorrowAmountScreen';
import RepaymentTermScreen from './src/screens/RepaymentTermScreen';
import CreditScoreScreen from './src/screens/CreditScoreScreen';
import LoanDetailScreen from './src/screens/LoanDetailScreen';

// Simple stack-free router: 'home' | 'borrow' | 'term' | 'credit' | 'detail'
function AppShell() {
  const { colors, mode, toggleTheme } = useAppTheme();
  const [route, setRoute] = useState('home');

  const activeNavTab = route === 'term' || route === 'detail' ? (route === 'detail' ? 'home' : 'borrow') : route;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.topBar}>
        <Text style={[styles.clock, { color: colors.text }]}>9:41</Text>
        <Pressable
          onPress={toggleTheme}
          style={[styles.toggle, { backgroundColor: colors.card2, borderColor: colors.stroke }]}
        >
          <Text style={{ color: colors.text, fontSize: 11 }}>Toggle theme</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {route === 'home' && <HomeScreen onApplyHomeLoan={() => setRoute('detail')} />}
        {route === 'borrow' && <BorrowAmountScreen onContinue={() => setRoute('term')} />}
        {route === 'term' && <RepaymentTermScreen onContinue={() => setRoute('credit')} />}
        {route === 'credit' && <CreditScoreScreen />}
        {route === 'detail' && <LoanDetailScreen onBack={() => setRoute('home')} />}
      </View>

      <BottomNav active={activeNavTab} onChange={setRoute} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider initial="dark">
      <AppShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 4,
  },
  clock: { fontSize: 13, fontWeight: '600' },
  toggle: { borderRadius: 20, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 10 },
  body: { flex: 1 },
});
