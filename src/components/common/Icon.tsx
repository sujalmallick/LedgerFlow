import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';

export type IconName =
  | 'camera'
  | 'document'
  | 'folder'
  | 'table'
  | 'add'
  | 'save'
  | 'edit'
  | 'delete'
  | 'arrow-back'
  | 'arrow-forward'
  | 'more-vert'
  | 'check'
  | 'warning'
  | 'flash'
  | 'flash-off'
  | 'gallery'
  | 'undo'
  | 'redo'
  | 'close'
  | 'chevron-right'
  | 'offline'
  | 'columns'
  | 'share'
  | 'crop'
  | 'visibility'
  | 'functions'
  | 'search'
  | 'lock'
  | 'info'
  | 'receipt-long'
  | 'currency-rupee'
  | 'unfold-more'
  | 'arrow-upward'
  | 'arrow-downward'
  | 'open-in-new'
  | 'person'
  | 'grid-view'
  | 'settings'
  | 'expand-less'
  | 'expand-more'
  | 'help'
  | 'help-outline'
  | 'security'
  | 'shield'
  | 'phone-android'
  | 'smartphone'
  | 'language'
  | (string & {});

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * Pure React Native vector-like icons.
 * Zero external native font or asset dependencies, ensuring 100% Android offline reliability.
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = '#191C1E',
  style,
}) => {
  const s = size;

  switch (name) {
    case 'add':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.7, height: 2, backgroundColor: color, borderRadius: 1 }} />
          <View
            style={{
              position: 'absolute',
              width: 2,
              height: s * 0.7,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'arrow-back':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.65, height: 2, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              left: s * 0.15,
              width: s * 0.35,
              height: s * 0.35,
              borderLeftWidth: 2,
              borderTopWidth: 2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-forward':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.65, height: 2, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              right: s * 0.15,
              width: s * 0.35,
              height: s * 0.35,
              borderRightWidth: 2,
              borderTopWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-upward':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: 2, height: s * 0.65, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              top: s * 0.15,
              width: s * 0.35,
              height: s * 0.35,
              borderLeftWidth: 2,
              borderTopWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-downward':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: 2, height: s * 0.65, backgroundColor: color }} />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.15,
              width: s * 0.35,
              height: s * 0.35,
              borderRightWidth: 2,
              borderBottomWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderRightWidth: 2,
              borderTopWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginLeft: -s * 0.1,
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.7,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.7,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.55,
              height: s * 0.3,
              borderLeftWidth: 2.2,
              borderBottomWidth: 2.2,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginTop: -s * 0.1,
            }}
          />
        </View>
      );

    case 'camera':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.32,
              height: s * 0.12,
              backgroundColor: color,
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: s * 0.85,
              height: s * 0.6,
              borderWidth: 2,
              borderColor: color,
              borderRadius: 4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.28,
                height: s * 0.28,
                borderRadius: s * 0.14,
                borderWidth: 1.8,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'document':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.82,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              padding: 2,
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <View style={{ width: '80%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '60%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '75%', height: 1.5, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'folder':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.85, height: s * 0.65 }}>
            <View
              style={{
                width: s * 0.4,
                height: s * 0.16,
                backgroundColor: color,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
              }}
            />
            <View
              style={{
                width: '100%',
                height: s * 0.52,
                borderWidth: 1.8,
                borderColor: color,
                borderRadius: 3,
                borderTopLeftRadius: 0,
              }}
            />
          </View>
        </View>
      );

    case 'table':
    case 'columns':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.78,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: '45%',
                width: '100%',
                height: 1.5,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: '48%',
                width: 1.5,
                height: '100%',
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'save':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.75,
              height: s * 0.75,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.4,
                height: s * 0.28,
                backgroundColor: color,
                borderBottomLeftRadius: 2,
                borderBottomRightRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'edit':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.22,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 2,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'delete':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.7, height: 1.8, backgroundColor: color, marginBottom: 1 }} />
          <View
            style={{
              width: s * 0.55,
              height: s * 0.6,
              borderWidth: 1.8,
              borderColor: color,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </View>
      );

    case 'more-vert':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center', gap: 3 }, style]}>
          <View style={{ width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color }} />
          <View style={{ width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color }} />
          <View style={{ width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: color }} />
        </View>
      );

    case 'warning':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.42,
              borderRightWidth: s * 0.42,
              borderBottomWidth: s * 0.75,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.35,
              width: 2,
              height: s * 0.25,
              backgroundColor: '#FFFFFF',
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.18,
              width: 2,
              height: 2,
              backgroundColor: '#FFFFFF',
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'flash':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.25,
              borderRightWidth: s * 0.15,
              borderBottomWidth: s * 0.45,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '15deg' }],
            }}
          />
        </View>
      );

    case 'flash-off':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.22,
              borderRightWidth: s * 0.12,
              borderBottomWidth: s * 0.42,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              opacity: 0.6,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.7,
              height: 1.8,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'gallery':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.8,
              height: s * 0.65,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: s * 0.2,
                borderRightWidth: s * 0.2,
                borderBottomWidth: s * 0.28,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'undo':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          {/* Arrowhead pointing left */}
          <View
            style={{
              position: 'absolute',
              left: s * 0.1,
              top: s * 0.18,
              width: 0,
              height: 0,
              borderTopWidth: s * 0.2,
              borderBottomWidth: s * 0.2,
              borderRightWidth: s * 0.26,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: color,
            }}
          />
          {/* Curved arc sweeping right and down */}
          <View
            style={{
              position: 'absolute',
              right: s * 0.14,
              top: s * 0.28,
              width: s * 0.54,
              height: s * 0.46,
              borderTopWidth: 2.4,
              borderRightWidth: 2.4,
              borderColor: color,
              borderTopRightRadius: s * 0.36,
            }}
          />
        </View>
      );

    case 'redo':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          {/* Arrowhead pointing right */}
          <View
            style={{
              position: 'absolute',
              right: s * 0.1,
              top: s * 0.18,
              width: 0,
              height: 0,
              borderTopWidth: s * 0.2,
              borderBottomWidth: s * 0.2,
              borderLeftWidth: s * 0.26,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
            }}
          />
          {/* Curved arc sweeping left and down */}
          <View
            style={{
              position: 'absolute',
              left: s * 0.14,
              top: s * 0.28,
              width: s * 0.54,
              height: s * 0.46,
              borderTopWidth: 2.4,
              borderLeftWidth: 2.4,
              borderColor: color,
              borderTopLeftRadius: s * 0.36,
            }}
          />
        </View>
      );

    case 'offline':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25, backgroundColor: color }} />
        </View>
      );

    case 'crop':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.65,
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderColor: color,
              position: 'absolute',
              top: s * 0.1,
              left: s * 0.1,
            }}
          />
          <View
            style={{
              width: s * 0.65,
              height: s * 0.65,
              borderBottomWidth: 2,
              borderRightWidth: 2,
              borderColor: color,
              position: 'absolute',
              bottom: s * 0.1,
              right: s * 0.1,
            }}
          />
        </View>
      );

    case 'visibility':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.8,
              height: s * 0.45,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: s * 0.4,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.22,
                height: s * 0.22,
                borderRadius: s * 0.11,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'lock':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.4,
              height: s * 0.35,
              borderWidth: 1.8,
              borderColor: color,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: s * 0.6,
              height: s * 0.42,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      );

    case 'info':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.75,
              height: s * 0.75,
              borderRadius: s * 0.375,
              borderWidth: 1.6,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: 1.8, height: 2, backgroundColor: color, marginBottom: 2 }} />
            <View style={{ width: 1.8, height: s * 0.28, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'currency-rupee':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <Text style={{ fontSize: Math.round(s * 0.8), fontWeight: '700', color, includeFontPadding: false }}>
            ₹
          </Text>
        </View>
      );

    case 'functions':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <Text style={{ fontSize: Math.round(s * 0.75), fontStyle: 'italic', fontWeight: '700', color, includeFontPadding: false }}>
            fx
          </Text>
        </View>
      );

    case 'receipt-long':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.62,
              height: s * 0.85,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 2,
              padding: 2,
              gap: 2,
            }}
          >
            <View style={{ width: '85%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '60%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '75%', height: 1.5, backgroundColor: color }} />
            <View style={{ width: '45%', height: 1.5, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'unfold-more':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.3,
              height: s * 0.3,
              borderTopWidth: 1.8,
              borderLeftWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginBottom: 2,
            }}
          />
          <View
            style={{
              width: s * 0.3,
              height: s * 0.3,
              borderBottomWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'open-in-new':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.65,
              height: s * 0.65,
              borderLeftWidth: 1.8,
              borderBottomWidth: 1.8,
              borderTopWidth: 1.8,
              borderColor: color,
              position: 'absolute',
              left: 2,
              bottom: 2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: s * 0.38,
              height: s * 0.38,
              borderTopWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.55,
              height: s * 0.55,
              borderRadius: s * 0.275,
              borderWidth: 1.8,
              borderColor: color,
              marginLeft: -s * 0.1,
              marginTop: -s * 0.1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.15,
              bottom: s * 0.15,
              width: s * 0.3,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'share':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: color, position: 'absolute', right: 2, top: 2 }} />
          <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: color, position: 'absolute', left: 2, top: s * 0.37 }} />
          <View style={{ width: s * 0.26, height: s * 0.26, borderRadius: s * 0.13, backgroundColor: color, position: 'absolute', right: 2, bottom: 2 }} />
          <View style={{ width: s * 0.52, height: 1.6, backgroundColor: color, transform: [{ rotate: '-25deg' }], position: 'absolute', left: s * 0.2, top: s * 0.32 }} />
          <View style={{ width: s * 0.52, height: 1.6, backgroundColor: color, transform: [{ rotate: '25deg' }], position: 'absolute', left: s * 0.2, bottom: s * 0.32 }} />
        </View>
      );

    case 'person':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderRadius: s * 0.19,
              backgroundColor: color,
              marginBottom: 1,
            }}
          />
          <View
            style={{
              width: s * 0.7,
              height: s * 0.32,
              backgroundColor: color,
              borderTopLeftRadius: s * 0.35,
              borderTopRightRadius: s * 0.35,
            }}
          />
        </View>
      );

    case 'grid-view':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center', gap: 2 }, style]}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={{ width: s * 0.35, height: s * 0.35, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: s * 0.35, height: s * 0.35, borderRadius: 2, backgroundColor: color }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            <View style={{ width: s * 0.35, height: s * 0.35, borderRadius: 2, backgroundColor: color }} />
            <View style={{ width: s * 0.35, height: s * 0.35, borderRadius: 2, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'settings':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.72,
              borderRadius: s * 0.36,
              borderWidth: 2,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ width: s * 0.22, height: s * 0.22, borderRadius: s * 0.11, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'expand-less':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderTopWidth: 2.2,
              borderLeftWidth: 2.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: s * 0.1,
            }}
          />
        </View>
      );

    case 'expand-more':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.36,
              height: s * 0.36,
              borderBottomWidth: 2.2,
              borderRightWidth: 2.2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginBottom: s * 0.1,
            }}
          />
        </View>
      );

    case 'volume':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.24,
              height: s * 0.36,
              backgroundColor: color,
              borderTopLeftRadius: 2,
              borderBottomLeftRadius: 2,
              position: 'absolute',
              left: s * 0.2,
            }}
          />
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: s * 0.28,
              borderBottomWidth: s * 0.28,
              borderRightWidth: s * 0.26,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderRightColor: color,
              position: 'absolute',
              left: s * 0.34,
            }}
          />
        </View>
      );

    case 'phone':
    case 'phone-android':
    case 'smartphone':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.52,
              height: s * 0.8,
              borderWidth: 1.8,
              borderColor: color,
              borderRadius: 3,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 2,
            }}
          >
            <View style={{ width: s * 0.15, height: 1.5, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'currency':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <Text style={{ fontSize: Math.round(s * 0.8), fontWeight: '700', color, includeFontPadding: false }}>
            ₹
          </Text>
        </View>
      );

    case 'translate':
    case 'language':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }, style]}>
          <Text style={{ fontSize: Math.round(s * 0.62), fontWeight: '800', color, includeFontPadding: false }}>
            EN
          </Text>
        </View>
      );

    default:
      return <View style={[{ width: s, height: s }, style]} />;
  }
};
