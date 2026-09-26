import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/spacing';
import { rs, ms, wp, screen } from '../theme/responsive';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let finished = false;
    const finishOnce = () => {
      if (!finished) {
        finished = true;
        onFinish();
      }
    };

    // Sequence: logo fades in and scales up → title appears → tagline → progress bar → fade out
    const anim = Animated.sequence([
      // 1. Logo scale + fade in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title appears
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // 3. Tagline appears
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      // 4. Progress bar fills (simulate init time)
      Animated.timing(progressWidth, {
        toValue: wp(50), // 50% of screen width (responsive)
        duration: 900,
        useNativeDriver: false, // width animation cannot use native driver
      }),
      // 5. Brief pause at the end
      Animated.delay(200),
      // 6. Fade out the entire splash
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    anim.start(() => {
      finishOnce();
    });

    // Fallback timer: guarantees transition even if system animations are disabled or delayed
    const fallbackTimer = setTimeout(finishOnce, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      anim.stop();
    };
  }, [logoScale, logoOpacity, titleOpacity, taglineOpacity, progressWidth, screenOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.content}>
        {/* App Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/app_logo.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* App Title */}
        <Animated.Text style={[styles.appTitle, { opacity: titleOpacity }]}>
          LedgerFlow
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Turn paper into organized data.
        </Animated.Text>
      </View>

      {/* Progress bar at the bottom */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.offlineNote}>Offline • All data stays on your device</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(20),
  },
  appTitle: {
    ...typography.titleLarge,
    fontSize: ms(30),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    ...typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.1,
  },
  progressContainer: {
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: wp(50),
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
  offlineNote: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: ms(11),
    letterSpacing: 0.2,
  },
  iconContainer: {
    marginBottom: rs(28),
  },
  iconBg: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(22),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(16),
  },
});

