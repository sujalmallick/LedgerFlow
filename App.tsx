import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { SplashScreen } from './src/screens/SplashScreen';

export default function App(): React.JSX.Element {
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {splashDone ? (
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        ) : (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
