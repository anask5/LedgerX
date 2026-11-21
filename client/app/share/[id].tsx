import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Share as RNShare,
  Platform,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Share2,
  FileText,
  Download,
  Link2,
  Clock,
  CreditCard,
  PhoneOff,
  Copy,
  Check,
  AlertTriangle,
  Eye,
  Trash2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { shareApi } from '../../src/api/share';
import { formatDate } from '../../src/lib/formatDate';
import type { ShareLink } from '../../src/api/types';

type ExpiryOption = '24h' | '7d' | '30d';

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  inputBg: '#16161C',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  cyan: '#06B6D4',
  cyanBg: 'rgba(6, 182, 212, 0.12)',
  cyanBorder: 'rgba(6, 182, 212, 0.28)',
  violet: '#C084FC',
  violetBg: 'rgba(168, 85, 247, 0.12)',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.3)',
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

function LinksSkeleton() {
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <View style={styles.skeletonList}>
      <Animated.View style={[styles.skeletonRow, pulseStyle]} />
      <Animated.View style={[styles.skeletonRow, pulseStyle]} />
    </View>
  );
}

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [expiry, setExpiry] = useState<ExpiryOption>('7d');
  const [hidePayment, setHidePayment] = useState(true);
  const [hidePhone, setHidePhone] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [newLink, setNewLink] = useState<ShareLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const createScale = useSharedValue(1);
  const pdfScale = useSharedValue(1);

  const { data: existingLinks, isLoading } = useQuery({
    queryKey: ['share-links', id],
    queryFn: () => shareApi.listLinks(id),
  });

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

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const link = await shareApi.createLink(id, {
        expiry,
        hide_payment: hidePayment,
        hide_phone: hidePhone,
      });
      setNewLink(link);
      setLinkCopied(false);
      queryClient.invalidateQueries({ queryKey: ['share-links', id] });
    } catch (err: any) {
      notify('Error', err.message || 'Failed to create share link.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const result: any = await shareApi.downloadProof(id);
      const downloadUrl = typeof result === 'string' ? result : result?.url;
      if (downloadUrl) {
        openExternalUrl(downloadUrl);
      } else {
        notify('Download Ready', 'Your verified proof PDF is ready for download.');
      }
    } catch (err: any) {
      notify('Error', err.message || 'Failed to generate proof PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      notify('Error', 'Failed to copy link.');
    }
  };

  const handleShareNative = async (url: string) => {
    try {
      await RNShare.share({
        message: `Here's my verified receipt proof: ${url}`,
        url,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTargetId) return;
    setIsRevoking(true);
    try {
      await shareApi.revokeLink(revokeTargetId);
      queryClient.invalidateQueries({ queryKey: ['share-links', id] });
      if (newLink?.id === revokeTargetId) setNewLink(null);
      setRevokeTargetId(null);
    } catch (err: any) {
      setRevokeTargetId(null);
      notify('Error', err.message || 'Could not revoke link.');
    } finally {
      setIsRevoking(false);
    }
  };

  const createAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: createScale.value }],
  }));

  const pdfAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pdfScale.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow */}
      <LinearGradient
        colors={['rgba(6, 182, 212, 0.2)', 'rgba(16, 185, 129, 0.07)', 'transparent']}
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
              <ShieldCheck size={12} color={OBSIDIAN.cyan} />
              <Text style={styles.badgeText}>REDACTED PROOF SHARING</Text>
            </View>
            <Text style={styles.title}>Share Proof</Text>
            <Text style={styles.subtitle}>
              Export an official PDF certificate or generate a self-destructing verification link
            </Text>
          </Animated.View>

          {/* Download PDF Proof Card */}
          <Animated.View
            entering={FadeInDown.delay(70).duration(500).springify()}
            style={styles.section}
          >
            <AnimatedPressable
              disabled={isDownloadingPdf}
              onPressIn={() => {
                pdfScale.value = withSpring(0.978, { damping: 16, stiffness: 320 });
              }}
              onPressOut={() => {
                pdfScale.value = withSpring(1, { damping: 16, stiffness: 320 });
              }}
              onPress={handleDownloadPDF}
              style={[styles.pdfCard, pdfAnimatedStyle]}
            >
              <View style={styles.pdfIconBox}>
                <FileText size={22} color={OBSIDIAN.violet} />
              </View>
              <View style={styles.pdfBody}>
                <Text style={styles.pdfTitle}>Export Proof PDF</Text>
                <Text style={styles.pdfDesc}>
                  Clean formatted receipt & warranty certificate for claims
                </Text>
              </View>
              <View style={styles.pdfActionPill}>
                {isDownloadingPdf ? (
                  <ActivityIndicator size="small" color={OBSIDIAN.emerald} />
                ) : (
                  <>
                    <Download size={14} color={OBSIDIAN.emerald} />
                    <Text style={styles.pdfActionText}>PDF</Text>
                  </>
                )}
              </View>
            </AnimatedPressable>
          </Animated.View>

          {/* Create Share Link Builder Card */}
          <Animated.View
            entering={FadeInUp.delay(140).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>CREATE SECURE LINK</Text>
            <View style={styles.groupCard}>
              {/* Expiry Picker */}
              <View style={styles.expiryHeader}>
                <Clock size={14} color={OBSIDIAN.cyan} />
                <Text style={styles.expiryLabel}>Link Expiration Window</Text>
              </View>

              <View style={styles.expiryRow}>
                {EXPIRY_OPTIONS.map((opt) => {
                  const selected = expiry === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setExpiry(opt.value)}
                      style={[
                        styles.expiryPill,
                        selected && {
                          backgroundColor: OBSIDIAN.cyanBg,
                          borderColor: OBSIDIAN.cyanBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.expiryPillText,
                          selected && { color: OBSIDIAN.cyan, fontWeight: '800' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.innerDivider} />

              {/* Privacy Redaction Toggles */}
              <Pressable
                onPress={() => setHidePayment(!hidePayment)}
                style={[styles.toggleRow, styles.toggleDivider]}
              >
                <View style={styles.toggleIconBox}>
                  <CreditCard size={16} color={OBSIDIAN.emerald} />
                </View>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Hide payment details</Text>
                  <Text style={styles.toggleDesc}>
                    Redact card digits, UPI ID & transaction ref
                  </Text>
                </View>
                <ObsidianSwitch value={hidePayment} onValueChange={setHidePayment} />
              </Pressable>

              <Pressable
                onPress={() => setHidePhone(!hidePhone)}
                style={styles.toggleRow}
              >
                <View style={styles.toggleIconBox}>
                  <PhoneOff size={16} color={OBSIDIAN.emerald} />
                </View>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Hide phone number</Text>
                  <Text style={styles.toggleDesc}>
                    Mask personal contact numbers printed on receipt
                  </Text>
                </View>
                <ObsidianSwitch value={hidePhone} onValueChange={setHidePhone} />
              </Pressable>

              {/* Generate Link CTA */}
              <AnimatedPressable
                disabled={isCreating}
                onPressIn={() => {
                  createScale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
                }}
                onPressOut={() => {
                  createScale.value = withSpring(1, { damping: 16, stiffness: 320 });
                }}
                onPress={handleCreateLink}
                style={[styles.createTouchable, createAnimatedStyle]}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.createGradient, isCreating && { opacity: 0.75 }]}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#042F1E" />
                  ) : (
                    <>
                      <Link2 size={18} color="#042F1E" strokeWidth={2.5} />
                      <Text style={styles.createBtnText}>Generate Share Link</Text>
                    </>
                  )}
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </Animated.View>

          {/* Newly Created One-Time Link Card */}
          {newLink && (
            <Animated.View
              entering={ZoomIn.duration(320).springify()}
              style={styles.newLinkWrapper}
            >
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.35)', 'rgba(6, 182, 212, 0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newLinkBorder}
              >
                <View style={styles.newLinkCard}>
                  <View style={styles.warningPill}>
                    <AlertTriangle size={13} color={OBSIDIAN.amber} />
                    <Text style={styles.warningText}>
                      Copy now — secret access token is shown only once
                    </Text>
                  </View>

                  <View style={styles.urlBox}>
                    <Text style={styles.linkUrl} numberOfLines={2} selectable>
                      {newLink.url}
                    </Text>
                  </View>

                  <View style={styles.newLinkActions}>
                    <Pressable
                      onPress={() => handleCopyLink(newLink.url)}
                      style={[
                        styles.copyBtn,
                        linkCopied && { backgroundColor: '#059669' },
                      ]}
                    >
                      {linkCopied ? (
                        <>
                          <Check size={15} color="#042F1E" strokeWidth={2.6} />
                          <Text style={styles.copyBtnText}>Copied!</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={15} color="#042F1E" strokeWidth={2.4} />
                          <Text style={styles.copyBtnText}>Copy Link</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => handleShareNative(newLink.url)}
                      style={styles.shareNativeBtn}
                    >
                      <Share2 size={15} color={OBSIDIAN.textPrimary} />
                      <Text style={styles.shareNativeText}>Share via…</Text>
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Existing Active Links */}
          <Animated.View
            entering={FadeInUp.delay(220).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>ACTIVE SHARE LINKS</Text>
              {!isLoading && existingLinks && existingLinks.length > 0 && (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{existingLinks.length}</Text>
                </View>
              )}
            </View>

            {isLoading ? (
              <LinksSkeleton />
            ) : !existingLinks || existingLinks.length === 0 ? (
              <View style={styles.emptyLinksCard}>
                <Sparkles size={20} color={OBSIDIAN.textMuted} />
                <Text style={styles.emptyLinksText}>
                  No active share links for this receipt
                </Text>
              </View>
            ) : (
              <View style={styles.linksStack}>
                {existingLinks.map((link) => (
                  <View key={link.id} style={styles.linkCard}>
                    <View style={styles.linkIconBox}>
                      <Link2 size={16} color={OBSIDIAN.cyan} />
                    </View>

                    <View style={styles.linkInfo}>
                      <Text style={styles.linkDate}>
                        Created {formatDate(link.created_at)}
                      </Text>
                      <View style={styles.linkMetaRow}>
                        <Text style={styles.linkMeta}>
                          Expires {formatDate(link.expires_at)}
                        </Text>
                        <View style={styles.viewsChip}>
                          <Eye size={11} color={OBSIDIAN.textSecondary} />
                          <Text style={styles.viewsText}>{link.view_count}</Text>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => setRevokeTargetId(link.id)}
                      hitSlop={8}
                      style={styles.revokeBtn}
                    >
                      <Trash2 size={13} color={OBSIDIAN.rose} />
                      <Text style={styles.revokeText}>Revoke</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Revoke Confirmation Modal */}
      <Modal
        visible={revokeTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !isRevoking && setRevokeTargetId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={ZoomIn.duration(220).springify()}
            style={styles.modalCard}
          >
            <View style={styles.modalIconBox}>
              <AlertTriangle size={26} color={OBSIDIAN.rose} />
            </View>

            <Text style={styles.modalTitle}>Revoke Share Link?</Text>
            <Text style={styles.modalMessage}>
              Anyone holding this URL will immediately lose access to the receipt proof.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={isRevoking}
                onPress={() => setRevokeTargetId(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isRevoking}
                onPress={confirmRevoke}
                style={styles.modalConfirmBtn}
              >
                {isRevoking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Revoke Link</Text>
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
    color: OBSIDIAN.cyan,
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
  subtitle: {
    fontSize: 13.5,
    color: OBSIDIAN.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  countPill: {
    backgroundColor: OBSIDIAN.cyanBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.cyanBorder,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 999,
    marginBottom: 8,
  },
  countPillText: {
    color: OBSIDIAN.cyan,
    fontSize: 11,
    fontWeight: '800',
  },
  /* PDF Export Card */
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    gap: 13,
  },
  pdfIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: OBSIDIAN.violetBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBody: {
    flex: 1,
  },
  pdfTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  pdfDesc: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  pdfActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pdfActionText: {
    color: OBSIDIAN.emerald,
    fontSize: 12.5,
    fontWeight: '800',
  },
  /* Group Card & Expiry */
  groupCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  expiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  expiryLabel: {
    color: OBSIDIAN.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  expiryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expiryPill: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: OBSIDIAN.inputBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryPillText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  innerDivider: {
    height: 1,
    backgroundColor: OBSIDIAN.border,
    marginVertical: 14,
  },
  /* Privacy Toggles */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  toggleDivider: {
    borderBottomWidth: 1,
    borderBottomColor: OBSIDIAN.border,
  },
  toggleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: OBSIDIAN.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 8,
  },
  toggleTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },
  toggleDesc: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
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
  /* Create Link CTA */
  createTouchable: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  createGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnText: {
    color: '#042F1E',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  /* Newly Created Link Card */
  newLinkWrapper: {
    marginBottom: 22,
  },
  newLinkBorder: {
    borderRadius: 22,
    padding: 1.2,
  },
  newLinkCard: {
    backgroundColor: '#101614',
    borderRadius: 20.8,
    padding: 16,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  warningText: {
    color: OBSIDIAN.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  urlBox: {
    backgroundColor: OBSIDIAN.bg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  linkUrl: {
    color: OBSIDIAN.emerald,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    lineHeight: 18,
  },
  newLinkActions: {
    flexDirection: 'row',
    gap: 10,
  },
  copyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: OBSIDIAN.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  copyBtnText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  shareNativeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  shareNativeText: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  /* Existing Links */
  linksStack: {
    gap: 10,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    gap: 12,
  },
  linkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: OBSIDIAN.cyanBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkDate: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  linkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  linkMeta: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
  },
  viewsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewsText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  revokeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  revokeText: {
    color: OBSIDIAN.rose,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyLinksCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    gap: 8,
  },
  emptyLinksText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
  },
  skeletonList: {
    gap: 10,
  },
  skeletonRow: {
    height: 68,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
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
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
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
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});