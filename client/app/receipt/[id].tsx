import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
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
  Star,
  FolderOpen,
  Tag,
  Archive,
  Trash2,
  Pencil,
  Store,
  MapPin,
  Phone,
  Calendar,
  Hash,
  CreditCard,
  Layers,
  RotateCcw,
  StickyNote,
  ShieldCheck,
  Clock,
  AlertCircle,
  AlertTriangle,
  Receipt as ReceiptIcon,
  ShoppingBag,
} from 'lucide-react-native';
import { useReceipt } from '../../src/hooks/useReceipt';
import { receiptsApi } from '../../src/api/receipts';
import { ImageZoom } from '../../src/components/ImageZoom';
import { formatINR } from '../../src/lib/formatINR';
import { formatDate } from '../../src/lib/formatDate';

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
  indigoBorder: 'rgba(99, 102, 241, 0.28)',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.28)',
  rose: '#FB7185',
  roseBg: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.28)',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianDetailSkeleton() {
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
    <View style={styles.root}>
      <View style={styles.responsiveContainer}>
        <Animated.View style={[styles.skeletonImage, pulseStyle]} />
        <Animated.View style={[styles.skeletonHero, pulseStyle]} />
        <Animated.View style={[styles.skeletonBlock, pulseStyle]} />
        <Animated.View style={[styles.skeletonBlock, pulseStyle]} />
      </View>
    </View>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
  active = false,
  activeColor = OBSIDIAN.emerald,
  activeBg = OBSIDIAN.emeraldBg,
  activeBorder = OBSIDIAN.emeraldBorder,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  activeBg?: string;
  activeBorder?: string;
  danger?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      onPress={onPress}
      style={[
        styles.actionTile,
        active && { backgroundColor: activeBg, borderColor: activeBorder },
        danger && { backgroundColor: OBSIDIAN.roseBg, borderColor: OBSIDIAN.roseBorder },
        animatedStyle,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionLabel,
          active && { color: activeColor, fontWeight: '700' },
          danger && { color: OBSIDIAN.rose, fontWeight: '700' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function DetailMetaRow({
  icon,
  label,
  value,
  highlight = false,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.metaRow, !isLast && styles.metaRowDivider]}>
      <View style={styles.metaLeft}>
        <View style={styles.metaIconBox}>{icon}</View>
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.metaValue,
          highlight && {
            color: OBSIDIAN.emerald,
            fontWeight: '800',
            fontSize: 15.5,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isLoading, isError, refetch, invalidate } = useReceipt(id);
  const queryClient = useQueryClient();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const editScale = useSharedValue(1);

  const editAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editScale.value }],
  }));

  if (isLoading) return <ObsidianDetailSkeleton />;

  if (isError || !receipt) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconBox}>
            <AlertCircle size={28} color={OBSIDIAN.rose} />
          </View>
          <Text style={styles.errorTitle}>Receipt not found</Text>
          <Text style={styles.errorSub}>
            Could not load receipt details. Check your connection or try again.
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <RotateCcw size={16} color="#042F1E" strokeWidth={2.5} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleFavorite = async () => {
    try {
      await receiptsApi.toggleFavorite(id, !receipt.is_favorite);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update favorite');
    }
  };

  const handleArchive = async () => {
    try {
      await receiptsApi.archive(id, !receipt.is_archived);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      if (!receipt.is_archived) {
        showAlert('Archived', 'Receipt has been moved to archive.');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to archive receipt');
    }
  };

  const executeDelete = async () => {
    try {
      setIsDeleting(true);
      await receiptsApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowDeleteModal(false);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setShowDeleteModal(false);
      showAlert('Error', err.message || 'Failed to delete receipt');
    } finally {
      setIsDeleting(false);
    }
  };

  const getOverallStatus = (): 'active' | 'expiringSoon' | 'expired' | 'none' => {
    const deadlines: Date[] = [];
    if (receipt.return_deadline) deadlines.push(new Date(receipt.return_deadline));
    if (receipt.items) {
      for (const item of receipt.items) {
        if (item.brand_warranty_expiry) deadlines.push(new Date(item.brand_warranty_expiry));
        if (item.extended_warranty_expiry) deadlines.push(new Date(item.extended_warranty_expiry));
      }
    }
    if (deadlines.length === 0) return 'none';
    const now = new Date();
    const soonest = deadlines.reduce((min, d) => (d < min ? d : min));
    const daysLeft = Math.ceil((soonest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 7) return 'expiringSoon';
    return 'active';
  };

  const overallStatus = getOverallStatus();

  const statusConfig = {
    active: {
      label: 'Warranty Active',
      color: OBSIDIAN.emerald,
      bg: OBSIDIAN.emeraldBg,
      border: OBSIDIAN.emeraldBorder,
      Icon: ShieldCheck,
    },
    expiringSoon: {
      label: 'Expiring Soon',
      color: OBSIDIAN.amber,
      bg: OBSIDIAN.amberBg,
      border: OBSIDIAN.amberBorder,
      Icon: Clock,
    },
    expired: {
      label: 'Expired',
      color: OBSIDIAN.rose,
      bg: OBSIDIAN.roseBg,
      border: OBSIDIAN.roseBorder,
      Icon: AlertCircle,
    },
    none: {
      label: 'Vault Stored',
      color: OBSIDIAN.textSecondary,
      bg: 'rgba(255, 255, 255, 0.06)',
      border: OBSIDIAN.border,
      Icon: ReceiptIcon,
    },
  }[overallStatus];

  const StatusIcon = statusConfig.Icon;

  // Build clean metadata list so the last visible row never has a stray divider
  const metaRows: {
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
  }[] = [
    {
      key: 'store',
      icon: <Store size={15} color={OBSIDIAN.emerald} />,
      label: 'Store',
      value: receipt.store_name || 'Unknown Store',
    },
  ];

  if (receipt.store_address) {
    metaRows.push({
      key: 'address',
      icon: <MapPin size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Address',
      value: receipt.store_address,
    });
  }
  if (receipt.store_phone) {
    metaRows.push({
      key: 'phone',
      icon: <Phone size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Phone',
      value: receipt.store_phone,
    });
  }
  metaRows.push({
    key: 'date',
    icon: <Calendar size={15} color={OBSIDIAN.cyan} />,
    label: 'Purchase Date',
    value: formatDate(receipt.purchase_date),
  });
  if (receipt.receipt_number) {
    metaRows.push({
      key: 'receipt_num',
      icon: <Hash size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Receipt #',
      value: receipt.receipt_number,
    });
  }
  if (receipt.subtotal != null) {
    metaRows.push({
      key: 'subtotal',
      icon: <ReceiptIcon size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Subtotal',
      value: formatINR(receipt.subtotal),
    });
  }
  if (receipt.tax != null) {
    metaRows.push({
      key: 'tax',
      icon: <ReceiptIcon size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Tax',
      value: formatINR(receipt.tax),
    });
  }
  metaRows.push({
    key: 'total',
    icon: <ReceiptIcon size={15} color={OBSIDIAN.emerald} />,
    label: 'Total Paid',
    value: formatINR(receipt.total_amount),
    highlight: true,
  });
  metaRows.push({
    key: 'payment',
    icon: <CreditCard size={15} color={OBSIDIAN.indigo} />,
    label: 'Payment Mode',
    value: receipt.payment_mode?.replace('_', ' ') || '—',
  });
  metaRows.push({
    key: 'category',
    icon: <Layers size={15} color={OBSIDIAN.textSecondary} />,
    label: 'Category',
    value: receipt.category || '—',
  });
  if (receipt.return_deadline) {
    metaRows.push({
      key: 'return',
      icon: <RotateCcw size={15} color={OBSIDIAN.amber} />,
      label: 'Return Deadline',
      value: formatDate(receipt.return_deadline),
    });
  }
  if (receipt.notes) {
    metaRows.push({
      key: 'notes',
      icon: <StickyNote size={15} color={OBSIDIAN.textSecondary} />,
      label: 'Notes',
      value: receipt.notes,
    });
  }

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
          {/* Receipt Image Preview Frame */}
          {receipt.image_url && (
            <Animated.View
              entering={FadeInDown.duration(500).springify().damping(17)}
              style={styles.imageFrame}
            >
              <ImageZoom uri={receipt.image_url} thumbnailHeight={280} />
              <View style={styles.zoomHintPill} pointerEvents="none">
                <Text style={styles.zoomHintText}>Tap image to zoom</Text>
              </View>
            </Animated.View>
          )}

          {/* Hero Store & Total Card */}
          <Animated.View
            entering={FadeInDown.delay(70).duration(550).springify().damping(17)}
            style={styles.heroWrapper}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.3)', 'rgba(6, 182, 212, 0.12)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBorder}
            >
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusConfig.bg,
                        borderColor: statusConfig.border,
                      },
                    ]}
                  >
                    <StatusIcon size={12.5} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>

                  {receipt.is_archived && (
                    <View style={styles.archivedPill}>
                      <Archive size={11} color={OBSIDIAN.textSecondary} />
                      <Text style={styles.archivedText}>ARCHIVED</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.storeName}>
                  {receipt.store_name || 'Unknown Store'}
                </Text>

                <Text style={styles.amount}>
                  {formatINR(receipt.total_amount)}
                </Text>

                <View style={styles.heroFooterRow}>
                  <View style={styles.heroDateChip}>
                    <Calendar size={12.5} color={OBSIDIAN.textSecondary} />
                    <Text style={styles.heroDateText}>
                      {formatDate(receipt.purchase_date)}
                    </Text>
                  </View>
                  {receipt.category && (
                    <View style={styles.heroCatChip}>
                      <Text style={styles.heroCatText}>{receipt.category}</Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Action Grid */}
          <Animated.View
            entering={FadeInDown.delay(140).duration(500).springify()}
            style={styles.actionsGrid}
          >
            <ActionTile
              icon={<Share2 size={18} color={OBSIDIAN.cyan} />}
              label="Share"
              onPress={() => router.push(`/share/${id}`)}
            />
            <ActionTile
              icon={
                <Star
                  size={18}
                  color={receipt.is_favorite ? OBSIDIAN.amber : OBSIDIAN.textSecondary}
                  fill={receipt.is_favorite ? OBSIDIAN.amber : 'transparent'}
                />
              }
              label="Favorite"
              onPress={handleFavorite}
              active={receipt.is_favorite}
              activeColor={OBSIDIAN.amber}
              activeBg={OBSIDIAN.amberBg}
              activeBorder={OBSIDIAN.amberBorder}
            />
            <ActionTile
              icon={<FolderOpen size={18} color={OBSIDIAN.indigo} />}
              label="Folder"
              onPress={() => router.push('/folders')}
            />
            <ActionTile
              icon={<Tag size={18} color="#C084FC" />}
              label="Tags"
              onPress={() => router.push('/folders')}
            />
            <ActionTile
              icon={
                <Archive
                  size={18}
                  color={receipt.is_archived ? OBSIDIAN.emerald : OBSIDIAN.textSecondary}
                />
              }
              label={receipt.is_archived ? 'Restore' : 'Archive'}
              onPress={handleArchive}
              active={receipt.is_archived}
            />
            <ActionTile
              icon={<Trash2 size={18} color={OBSIDIAN.rose} />}
              label="Delete"
              onPress={() => setShowDeleteModal(true)}
              danger
            />
          </Animated.View>

          {/* Receipt Breakdown Details */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>RECEIPT DETAILS</Text>
            <View style={styles.groupCard}>
              {metaRows.map((row, idx) => (
                <DetailMetaRow
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={row.value}
                  highlight={row.highlight}
                  isLast={idx === metaRows.length - 1}
                />
              ))}
            </View>
          </Animated.View>

          {/* Line Items Section */}
          {receipt.items && receipt.items.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(260).duration(500).springify()}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>LINE ITEMS</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{receipt.items.length}</Text>
                </View>
              </View>

              <View style={styles.groupCard}>
                {receipt.items.map((item: any, idx: number) => {
                  const isLast = idx === receipt.items!.length - 1;
                  const qty = item.quantity ?? 1;
                  const unitPrice = item.unit_price ?? item.price;

                  return (
                    <View
                      key={item.id || idx}
                      style={[styles.itemCardRow, !isLast && styles.metaRowDivider]}
                    >
                      <View style={styles.itemIconBox}>
                        <ShoppingBag size={16} color={OBSIDIAN.emerald} />
                      </View>

                      <View style={styles.itemBody}>
                        <Text style={styles.itemName}>
                          {item.name || 'Item'}
                        </Text>
                        <Text style={styles.itemSub}>
                          Qty {qty}
                          {unitPrice != null ? ` × ${formatINR(unitPrice)}` : ''}
                        </Text>

                        {(item.brand_warranty_expiry || item.extended_warranty_expiry) && (
                          <View style={styles.warrantyBadgesRow}>
                            {item.brand_warranty_expiry && (
                              <View style={styles.warrantyPill}>
                                <ShieldCheck size={11} color={OBSIDIAN.emerald} />
                                <Text style={styles.warrantyPillText}>
                                  Brand until {formatDate(item.brand_warranty_expiry)}
                                </Text>
                              </View>
                            )}
                            {item.extended_warranty_expiry && (
                              <View style={styles.warrantyPill}>
                                <ShieldCheck size={11} color={OBSIDIAN.cyan} />
                                <Text style={[styles.warrantyPillText, { color: OBSIDIAN.cyan }]}>
                                  Ext until {formatDate(item.extended_warranty_expiry)}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      <Text style={styles.itemTotal}>
                        {formatINR(item.total_price ?? item.price ?? 0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Tags Section */}
          {receipt.tags && receipt.tags.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(310).duration(500).springify()}
              style={styles.section}
            >
              <Text style={styles.sectionLabel}>TAGS</Text>
              <View style={styles.tagChips}>
                {receipt.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Floating Emerald Gradient Edit CTA */}
      <AnimatedPressable
        onPressIn={() => {
          editScale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          editScale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPress={() => router.push(`/review/${id}`)}
        style={[styles.editFabWrapper, editAnimatedStyle]}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.editFabGradient}
        >
          <Pencil size={17} color="#042F1E" strokeWidth={2.5} />
          <Text style={styles.editFabText}>Edit Receipt</Text>
        </LinearGradient>
      </AnimatedPressable>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={ZoomIn.duration(220).springify()}
            style={styles.modalCard}
          >
            <View style={styles.modalIconBox}>
              <AlertTriangle size={26} color={OBSIDIAN.rose} />
            </View>

            <Text style={styles.modalTitle}>Delete Receipt?</Text>
            <Text style={styles.modalMessage}>
              This action cannot be undone. This receipt, its image, and any linked warranty reminders will be permanently deleted.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={isDeleting}
                onPress={() => setShowDeleteModal(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isDeleting}
                onPress={executeDelete}
                style={styles.modalDeleteBtn}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    paddingTop: 16,
    paddingBottom: 104,
    paddingHorizontal: 18,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  /* Image Preview */
  imageFrame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    marginBottom: 16,
  },
  zoomHintPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(9, 9, 11, 0.78)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  zoomHintText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  /* Hero Card */
  heroWrapper: {
    marginBottom: 16,
  },
  heroBorder: {
    borderRadius: 24,
    padding: 1.2,
  },
  heroCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22.8,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  archivedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  archivedText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: OBSIDIAN.emerald,
    letterSpacing: -0.9,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  heroDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroDateText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  heroCatChip: {
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroCatText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  /* Quick Action Grid */
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  actionTile: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  /* Sections & Grouped Cards */
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
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 999,
    marginBottom: 8,
  },
  countPillText: {
    color: OBSIDIAN.emerald,
    fontSize: 11,
    fontWeight: '800',
  },
  groupCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 15,
    gap: 12,
  },
  metaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: OBSIDIAN.border,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    fontWeight: '500',
  },
  metaValue: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
    textTransform: 'capitalize',
    fontVariant: ['tabular-nums'],
  },
  /* Line Items */
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    gap: 12,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: OBSIDIAN.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '700',
  },
  itemSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  warrantyBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 7,
  },
  warrantyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  warrantyPillText: {
    color: OBSIDIAN.emerald,
    fontSize: 10.5,
    fontWeight: '600',
  },
  itemTotal: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  /* Tags */
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: OBSIDIAN.indigoBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.indigoBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    color: OBSIDIAN.indigo,
    fontSize: 12.5,
    fontWeight: '700',
  },
  /* Floating Edit Button */
  editFabWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    maxWidth: 600,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  editFabGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editFabText: {
    color: '#042F1E',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  /* Skeleton & Error */
  skeletonImage: {
    height: 220,
    borderRadius: 22,
    backgroundColor: OBSIDIAN.surface,
    marginTop: 18,
    marginBottom: 14,
  },
  skeletonHero: {
    height: 140,
    borderRadius: 22,
    backgroundColor: OBSIDIAN.surface,
    marginBottom: 14,
  },
  skeletonBlock: {
    height: 180,
    borderRadius: 20,
    backgroundColor: OBSIDIAN.surface,
    marginBottom: 14,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  errorIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OBSIDIAN.emerald,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  /* Delete Modal */
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
  modalDeleteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});