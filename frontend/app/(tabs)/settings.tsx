import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Lock,
  Download,
  Upload,
  FolderOpen,
  ShieldCheck,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useAppLock } from '../../src/hooks/useAppLock';
import { shareApi } from '../../src/api/share';
import { authApi } from '../../src/api/auth';

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  cyan: '#06B6D4',
  indigo: '#818CF8',
  indigoBg: 'rgba(99, 102, 241, 0.12)',
  violet: '#C084FC',
  violetBg: 'rgba(168, 85, 247, 0.12)',
  rose: '#FB7185',
  roseBg: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.28)',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  const thumbX = useSharedValue(value ? 20 : 2);

  useEffect(() => {
    thumbX.value = withSpring(value ? 20 : 2, {
      damping: 16,
      stiffness: 260,
    });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      style={[
        styles.switchTrack,
        {
          backgroundColor: value ? OBSIDIAN.emerald : '#27272A',
          borderColor: value ? OBSIDIAN.emerald : 'rgba(255,255,255,0.12)',
        },
      ]}
    >
      <Animated.View
        style={[
          styles.switchThumb,
          { backgroundColor: value ? '#042F1E' : '#A1A1AA' },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  isLast?: boolean;
}

function SettingRow({
  title,
  description,
  icon,
  iconBg,
  onPress,
  rightElement,
  disabled = false,
  isLast = false,
}: SettingRowProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled || !onPress}
      onPressIn={() => {
        if (onPress) scale.value = withSpring(0.985, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        if (onPress) scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      onPress={onPress}
      style={[
        styles.row,
        !isLast && styles.rowDivider,
        disabled && { opacity: 0.6 },
        animatedStyle,
      ]}
    >
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>{icon}</View>

      <View style={styles.rowTextContainer}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>

      {rightElement ? (
        rightElement
      ) : onPress ? (
        <ChevronRight size={17} color={OBSIDIAN.textMuted} />
      ) : null}
    </AnimatedPressable>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isEnabled: isLockEnabled, toggleLock } = useAppLock();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<'logout' | 'delete' | null>(null);
  const [isProcessingModal, setIsProcessingModal] = useState(false);

  const queryClient = useQueryClient();

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const openExternalUrl = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const result: any = await shareApi.exportCSV({});
      const downloadUrl = typeof result === 'string' ? result : result?.url;
      if (downloadUrl) {
        openExternalUrl(downloadUrl);
      } else {
        notify('Export Ready', 'Your CSV export has been prepared for download.');
      }
    } catch (err: any) {
      notify('Export Failed', err.message || 'Could not export data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const isCsv =
      file.name?.toLowerCase().endsWith('.csv') || file.mimeType?.includes('csv');
    if (!isCsv) {
      notify('Choose a CSV file', 'Please select a file with the .csv extension.');
      return;
    }

    try {
      setIsImporting(true);
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name || 'receipts.csv',
        type: file.mimeType || 'text/csv',
      } as any);

      const imported = await shareApi.importCSV(form);
      await queryClient.invalidateQueries({ queryKey: ['receipts'] });

      const skipped = imported.skipped ? ` ${imported.skipped} row(s) were skipped.` : '';
      notify('Import complete', `${imported.imported} receipt(s) imported.${skipped}`);
    } catch (err: any) {
      notify('Import Failed', err.message || 'Could not import this CSV file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmAction = async () => {
    setIsProcessingModal(true);
    try {
      if (confirmModal === 'delete') {
        await authApi.deleteAccount();
        await logout();
      } else if (confirmModal === 'logout') {
        await logout();
      }
      setConfirmModal(null);
    } catch (err: any) {
      setConfirmModal(null);
      notify('Error', err.message || 'Action failed. Please try again.');
    } finally {
      setIsProcessingModal(false);
    }
  };

  const initials = (user?.name || 'User')
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.06)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).springify().damping(17)}
            style={styles.header}
          >
            <View style={styles.badgeRow}>
              <Sparkles size={12} color={OBSIDIAN.emerald} />
              <Text style={styles.badgeText}>VAULT CONFIGURATION</Text>
            </View>
            <Text style={styles.title}>Settings</Text>
          </Animated.View>

          {/* Profile Hero Card */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(550).springify().damping(17)}
            style={styles.profileCardWrapper}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.3)', 'rgba(6, 182, 212, 0.14)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileBorder}
            >
              <View style={styles.profileCard}>
                <LinearGradient
                  colors={['#10B981', '#06B6D4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRing}
                >
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                </LinearGradient>

                <View style={styles.profileInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {user?.name || 'Vault User'}
                    </Text>
                    <View style={styles.syncPill}>
                      <View style={styles.syncDot} />
                      <Text style={styles.syncText}>SYNCED</Text>
                    </View>
                  </View>
                  <Text style={styles.profileEmail} numberOfLines={1}>
                    {user?.email || 'Encrypted account'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Security & Preferences Group */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>SECURITY & PREFERENCES</Text>
            <View style={styles.groupCard}>
              <SettingRow
                title="App Lock"
                description="Require authentication after 30s in background"
                icon={<Lock size={18} color={OBSIDIAN.emerald} />}
                iconBg={OBSIDIAN.emeraldBg}
                onPress={() => toggleLock(!isLockEnabled)}
                rightElement={
                  <ObsidianSwitch value={isLockEnabled} onValueChange={toggleLock} />
                }
                isLast
              />
            </View>
          </Animated.View>

          {/* Data Management Group */}
          <Animated.View
            entering={FadeInDown.delay(220).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>DATA & ORGANIZATION</Text>
            <View style={styles.groupCard}>
              <SettingRow
                title={isExporting ? 'Preparing CSV…' : 'Export CSV'}
                description="Download a spreadsheet of all your receipts"
                icon={<Download size={18} color={OBSIDIAN.cyan} />}
                iconBg="rgba(6, 182, 212, 0.12)"
                onPress={handleExportCSV}
                disabled={isExporting}
                rightElement={
                  isExporting ? (
                    <ActivityIndicator size="small" color={OBSIDIAN.cyan} />
                  ) : undefined
                }
              />
              <SettingRow
                title={isImporting ? 'Importing CSV…' : 'Import CSV'}
                description="Bulk-import receipts from a .csv file"
                icon={<Upload size={18} color={OBSIDIAN.indigo} />}
                iconBg={OBSIDIAN.indigoBg}
                onPress={handleImportCSV}
                disabled={isImporting}
                rightElement={
                  isImporting ? (
                    <ActivityIndicator size="small" color={OBSIDIAN.indigo} />
                  ) : undefined
                }
              />
              <SettingRow
                title="Folders & Tags"
                description="Organize your receipts into custom collections"
                icon={<FolderOpen size={18} color={OBSIDIAN.violet} />}
                iconBg={OBSIDIAN.violetBg}
                onPress={() => router.push('/folders')}
                isLast
              />
            </View>
          </Animated.View>

          {/* Legal & About Group */}
          <Animated.View
            entering={FadeInDown.delay(290).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>LEGAL & PRIVACY</Text>
            <View style={styles.groupCard}>
              <SettingRow
                title="Privacy Policy"
                description="How your receipt data is encrypted & protected"
                icon={<ShieldCheck size={18} color={OBSIDIAN.textSecondary} />}
                iconBg="rgba(255, 255, 255, 0.06)"
                onPress={() => openExternalUrl('https://fs0ciety.in')}
              />
              <SettingRow
                title="Terms of Service"
                description="Usage guidelines and service terms"
                icon={<FileText size={18} color={OBSIDIAN.textSecondary} />}
                iconBg="rgba(255, 255, 255, 0.06)"
                onPress={() => openExternalUrl('https://fs0ciety.in')}
                isLast
              />
            </View>
          </Animated.View>

          {/* Account Actions */}
          <Animated.View
            entering={FadeInUp.delay(350).duration(500).springify()}
            style={styles.accountActions}
          >
            <Pressable
              onPress={() => setConfirmModal('logout')}
              style={styles.logoutBtn}
            >
              <LogOut size={17} color={OBSIDIAN.textPrimary} />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </Pressable>

            <Pressable
              onPress={() => setConfirmModal('delete')}
              style={styles.deleteBtn}
            >
              <Trash2 size={16} color={OBSIDIAN.rose} />
              <Text style={styles.deleteBtnText}>Delete Account Permanently</Text>
            </Pressable>
          </Animated.View>

          <Text style={styles.version}>LedgerX v1.0.0 • Fs0ciety</Text>
        </View>
      </ScrollView>

      {/* Obsidian Confirmation Modal */}
      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !isProcessingModal && setConfirmModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={ZoomIn.duration(220).springify()}
            style={styles.modalCard}
          >
            <View
              style={[
                styles.modalIconBox,
                confirmModal === 'delete'
                  ? { backgroundColor: OBSIDIAN.roseBg, borderColor: OBSIDIAN.roseBorder }
                  : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: OBSIDIAN.border },
              ]}
            >
              {confirmModal === 'delete' ? (
                <AlertTriangle size={26} color={OBSIDIAN.rose} />
              ) : (
                <LogOut size={24} color={OBSIDIAN.textPrimary} />
              )}
            </View>

            <Text style={styles.modalTitle}>
              {confirmModal === 'delete' ? 'Delete Account?' : 'Log Out of Vault?'}
            </Text>
            <Text style={styles.modalMessage}>
              {confirmModal === 'delete'
                ? 'This action is permanent and cannot be undone. All your receipts, reminders, and files will be permanently erased.'
                : 'You can sign back in anytime to access your synced receipts and warranty reminders.'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={isProcessingModal}
                onPress={() => setConfirmModal(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isProcessingModal}
                onPress={handleConfirmAction}
                style={[
                  styles.modalConfirmBtn,
                  confirmModal === 'delete'
                    ? { backgroundColor: '#E11D48' }
                    : { backgroundColor: OBSIDIAN.emerald },
                ]}
              >
                {isProcessingModal ? (
                  <ActivityIndicator
                    size="small"
                    color={confirmModal === 'delete' ? '#FFF' : '#042F1E'}
                  />
                ) : (
                  <Text
                    style={[
                      styles.modalConfirmText,
                      confirmModal === 'delete' && { color: '#FFFFFF' },
                    ]}
                  >
                    {confirmModal === 'delete' ? 'Delete Forever' : 'Log Out'}
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
  },
  topGlow: {
    position: 'absolute',
    top: -60,
    left: -50,
    right: -50,
    height: 320,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 48,
    paddingHorizontal: 18,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  /* Header */
  header: {
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  badgeText: {
    color: OBSIDIAN.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.7,
  },
  /* Profile Card */
  profileCardWrapper: {
    marginBottom: 24,
  },
  profileBorder: {
    borderRadius: 22,
    padding: 1.2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20.8,
    padding: 16,
    gap: 14,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 20,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#111615',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: OBSIDIAN.emerald,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.3,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  syncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: OBSIDIAN.emerald,
  },
  syncText: {
    color: OBSIDIAN.emerald,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  profileEmail: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    marginTop: 4,
  },
  /* Sections & Grouped Cards */
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 13,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: OBSIDIAN.border,
  },
  rowIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowDesc: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  /* Custom Animated Switch */
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  /* Account Buttons */
  accountActions: {
    marginTop: 4,
    gap: 12,
  },
  logoutBtn: {
    height: 50,
    borderRadius: 15,
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    height: 48,
    borderRadius: 15,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteBtnText: {
    color: OBSIDIAN.rose,
    fontSize: 14,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    color: OBSIDIAN.textMuted,
    fontSize: 12,
    marginTop: 24,
  },
  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: OBSIDIAN.surfaceElevated,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  modalIconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
});