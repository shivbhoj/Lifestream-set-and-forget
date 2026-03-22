import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../src/utils/theme';

// This screen is immediately replaced by the auth guard in _layout.tsx.
// It acts as a loading splash while the session is resolved.
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
