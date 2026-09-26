import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, typography, shadows } from '../../theme/spacing';
import { Icon } from './Icon';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Safe diagnostic logging only; no user PII, file data, or challan contents
    console.warn('Unhandled React Error Boundary catch:', error?.name, errorInfo?.componentStack?.slice(0, 300));
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Icon name="warning" size={32} color={colors.warning} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected display issue occurred. Your spreadsheets and saved files on this device remain safe.
            </Text>

            <View style={styles.actions}>
              <Button
                label="Try Again"
                variant="primary"
                onPress={this.handleReset}
                style={styles.button}
              />
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.modal,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warningSurface,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  title: {
    ...typography.titleMedium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
  },
  button: {
    width: '100%',
  },
});
