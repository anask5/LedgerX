import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Home,
  FolderArchive,
  Plus,
  Bell,
  Settings,
  Heart,
  ArrowUpRight,
} from 'lucide-react-native';

const OBSIDIAN = {
  bg: '#09090B',
  tabBarBg: '#0D0D11',
  footerBg: '#09090C',
  border: 'rgba(255, 255, 255, 0.08)',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.08)',
  emeraldBorder: 'rgba(16, 185, 129, 0.22)',
};

function AnimatedTabIcon({
  focused,
  IconComponent,
}: {
  focused: boolean;
  IconComponent: any;
}) {
  const scale = useSharedValue(focused ? 1.08 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 15,
      stiffness: 260,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconWrapper, animatedStyle]}>
      <IconComponent
        size={21}
        color={focused ? OBSIDIAN.emerald : OBSIDIAN.textMuted}
        strokeWidth={focused ? 2.3 : 1.9}
      />
      {focused && <View style={styles.activeDot} />}
    </Animated.View>
  );
}

function CenterAddButton({ focused }: { focused: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, {
      damping: 14,
      stiffness: 260,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.centerBtnOuter, animatedStyle]}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centerBtnGradient}
      >
        <Plus size={26} color="#042F1E" strokeWidth={2.8} />
      </LinearGradient>
    </Animated.View>
  );
}

export default function TabLayout() {
  const openCreatorSite = () => {
    const url = 'https://fs0ciety.in';
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: OBSIDIAN.bg },
            tabBarActiveTintColor: OBSIDIAN.emerald,
            tabBarInactiveTintColor: OBSIDIAN.textMuted,
            tabBarStyle: {
              backgroundColor: OBSIDIAN.tabBarBg,
              borderTopWidth: 1,
              borderTopColor: OBSIDIAN.border,
              height: 62,
              paddingBottom: 6,
              paddingTop: 6,
              elevation: 0,
            },
            tabBarLabelStyle: {
              fontSize: 10.5,
              fontWeight: '700',
              letterSpacing: 0.2,
              marginTop: 2,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ focused }) => (
                <AnimatedTabIcon focused={focused} IconComponent={Home} />
              ),
            }}
          />
          <Tabs.Screen
            name="vault"
            options={{
              title: 'Vault',
              tabBarIcon: ({ focused }) => (
                <AnimatedTabIcon focused={focused} IconComponent={FolderArchive} />
              ),
            }}
          />
          <Tabs.Screen
            name="add"
            options={{
              title: '',
              tabBarShowLabel: false,
              tabBarLabel: () => null,
              tabBarIconStyle: {
                marginTop: 4,
              },
              tabBarIcon: ({ focused }) => <CenterAddButton focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="reminders"
            options={{
              title: 'Reminders',
              tabBarIcon: ({ focused }) => (
                <AnimatedTabIcon focused={focused} IconComponent={Bell} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ focused }) => (
                <AnimatedTabIcon focused={focused} IconComponent={Settings} />
              ),
            }}
          />
        </Tabs>
      </View>

      {/* Theme-Matched Obsidian Footer */}
      <View style={styles.footerBar}>
        <View style={styles.footerPill}>
          <Text style={styles.footerText}>Made with </Text>
          <Heart
            size={11}
            color={OBSIDIAN.emerald}
            fill="rgba(16, 185, 129, 0.35)"
            strokeWidth={2.3}
          />
          <Text style={styles.footerText}> by </Text>
          <Pressable
            onPress={openCreatorSite}
            hitSlop={8}
            style={({ pressed }) => [
              styles.brandLinkRow,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.footerBrand}>Fs0ciety</Text>
            <ArrowUpRight size={11} color={OBSIDIAN.emerald} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
  },
  tabsWrapper: {
    flex: 1,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: OBSIDIAN.emerald,
    marginTop: 3,
  },
  centerBtnOuter: {
    marginTop: -12,
    borderRadius: 19,
    padding: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  centerBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OBSIDIAN.footerBg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 7,
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  footerText: {
    color: OBSIDIAN.textMuted,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  brandLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  footerBrand: {
    color: OBSIDIAN.emerald,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});