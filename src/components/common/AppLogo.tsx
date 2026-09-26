import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface AppLogoProps {
  size?: number;
  variant?: 'brand' | 'white' | 'dark';
  style?: ViewStyle;
}

/**
 * LedgerFlow Official App Logo
 * Uses the official logo image generated for LedgerFlow (navy rounded-square with cyan document & data flow).
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 36,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Image
        source={require('../../assets/app_logo.png')}
        style={{
          width: size,
          height: size,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
