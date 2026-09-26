import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { WorkbookScreen } from '../screens/WorkbookScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HowToUseScreen } from '../screens/HowToUseScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Workbook"
        component={WorkbookScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="HowToUse"
        component={HowToUseScreen}
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};
