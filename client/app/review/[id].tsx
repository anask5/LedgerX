import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  AlertTriangle,
  AlertCircle,
  Store,
  MapPin,
  Phone,
  Calendar,
  Hash,
  Receipt as ReceiptIcon,
  CreditCard,
  Layers,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  StickyNote,
  Check,
  Barcode,
} from 'lucide-react-native';
import { useReceipt } from '../../src/hooks/useReceipt';
import { receiptsApi } from '../../src/api/receipts';
import { receiptEditSchema, type ReceiptEditFormData } from '../../src/lib/validation';
import { ImageZoom } from '../../src/components/ImageZoom';
import { formatDate } from '../../src/lib/formatDate';
import type { ReceiptItem } from '../../src/api/types';

function addMonthsToDate(dateStr: string, months: number): string {
  if (!dateStr || !months || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      date.setMonth(date.getMonth() + months);
      return date.toISOString().split('T')[0];
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

const CATEGORIES = [
  'Electronics',
  'Groceries',
  'Clothing',
  'Food',
  'Medical',
  'Fuel',
  'Travel',
  'Other',
];

const PAYMENT_MODES = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Net Banking', value: 'net_banking' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Other', value: 'other' },
] as const;

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  inputBg: '#16161C',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: '#10B981',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  cyan: '#06B6D4',
  cyanBg: 'rgba(6, 182, 212, 0.12)',
  cyanBorder: 'rgba(6, 182, 212, 0.28)',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.32)',
  rose: '#FB7185',
  roseBg: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.28)',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianReviewSkeleton() {
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
        <Animated.View style={[styles.skeletonCard, pulseStyle]} />
        <Animated.View style={[styles.skeletonCard, pulseStyle]} />
      </View>
    </View>
  );
}

interface ObsidianFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  flagged?: boolean;
  flagLabel?: string;
  multiline?: boolean;
  editable?: boolean;
  highlight?: boolean;
}

function ObsidianField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = 'default',
  flagged = false,
  flagLabel = 'Needs Review',
  multiline = false,
  editable = true,
  highlight = false,
}: ObsidianFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = focused
    ? OBSIDIAN.borderFocus
    : flagged
    ? OBSIDIAN.amberBorder
    : OBSIDIAN.border;

  return (
    <View style={styles.fieldWrapper}>
      <View style={styles.fieldHeaderRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {flagged && (
          <View style={styles.flaggedPill}>
            <AlertTriangle size={10} color={OBSIDIAN.amber} />
            <Text style={styles.flaggedPillText}>{flagLabel}</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.inputBox,
          multiline && styles.inputBoxMultiline,
          {
            borderColor,
            backgroundColor: focused
              ? '#1B1B22'
              : flagged
              ? 'rgba(245, 158, 11, 0.05)'
              : OBSIDIAN.inputBg,
          },
        ]}
      >
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={OBSIDIAN.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          selectionColor={OBSIDIAN.emerald}
          style={[
            styles.inputText,
            multiline && styles.inputTextMultiline,
            highlight && {
              color: OBSIDIAN.emerald,
              fontWeight: '800',
              fontSize: 16,
            },
            !editable && { color: OBSIDIAN.textSecondary },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
        />
      </View>
    </View>
  );
}

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isLoading, isError, refetch, invalidate } = useReceipt(id);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const saveScale = useSharedValue(1);

  useEffect(() => {
    if (receipt?.items) {
      setItems(receipt.items);
    }
  }, [receipt]);

  const isFailed = receipt?.status === 'failed';

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReceiptEditFormData>({
    resolver: zodResolver(receiptEditSchema),
    values: receipt
      ? {
          store_name: receipt.store_name || '',
          store_address: receipt.store_address || '',
          store_phone: receipt.store_phone || '',
          purchase_date: receipt.purchase_date || '',
          receipt_number: receipt.receipt_number || '',
          subtotal: receipt.subtotal ?? undefined,
          tax: receipt.tax ?? undefined,
          total_amount: receipt.total_amount || 0,
          payment_mode: receipt.payment_mode || 'other',
          category: receipt.category || '',
          notes: receipt.notes || '',
        }
      : undefined,
  });

  const purchaseDate = watch('purchase_date') || receipt?.purchase_date || '';

  const updateItem = (index: number, updates: Partial<ReceiptItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], ...updates };

      if ('brand_warranty_months' in updates) {
        current.brand_warranty_expiry = updates.brand_warranty_months
          ? addMonthsToDate(purchaseDate, updates.brand_warranty_months)
          : null;
      }

      if ('extended_warranty_months' in updates) {
        const totalMonths =
          (current.brand_warranty_months || 0) + (updates.extended_warranty_months || 0);
        current.extended_warranty_expiry = updates.extended_warranty_months
          ? addMonthsToDate(purchaseDate, totalMonths)
          : null;
      }

      copy[index] = current;
      return copy;
    });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: 'New Item',
      quantity: 1,
      price: 0,
      serial_number: null,
      brand_warranty_months: null,
      brand_warranty_expiry: null,
      extended_warranty_months: null,
      extended_warranty_expiry: null,
      return_deadline: null,
      status: 'none',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ReceiptEditFormData) => {
    setIsSaving(true);
    try {
      await receiptsApi.update(id, { ...data, items, confirm: true } as any);
      invalidate();
      router.replace(`/receipt/${id}`);
    } catch (err: any) {
      const msg = err.message || 'Could not save changes.';
      if (Platform.OS === 'web') {
        window.alert(`Save Failed: ${msg}`);
      } else {
        Alert.alert('Save Failed', msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  if (isLoading) return <ObsidianReviewSkeleton />;

  if (isError || !receipt) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconBox}>
            <AlertCircle size={28} color={OBSIDIAN.rose} />
          </View>
          <Text style={styles.errorTitle}>Couldn't load receipt</Text>
          <Text style={styles.errorSub}>
            Check your connection and retry loading the extracted details.
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <RotateCcw size={16} color="#042F1E" strokeWidth={2.5} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const needsReview = receipt.needs_review || [];
  const lowConfidence =
    receipt.ocr_confidence != null && receipt.ocr_confidence < 0.7;

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
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.responsiveContainer}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).springify().damping(17)}
            style={styles.header}
          >
            <View style={styles.badgeRow}>
              <Sparkles size={12} color={OBSIDIAN.emerald} />
              <Text style={styles.badgeText}>AI EXTRACTION REVIEW</Text>
            </View>
            <Text style={styles.title}>Verify & Confirm</Text>
            <Text style={styles.subtitle}>
              Review extracted fields and configure product warranties before saving
            </Text>
          </Animated.View>

          {/* Status / Confidence Alert Banners */}
          {isFailed && (
            <Animated.View
              entering={FadeInDown.delay(60).duration(400)}
              style={styles.failBanner}
            >
              <AlertCircle size={18} color={OBSIDIAN.rose} />
              <Text style={styles.failBannerText}>
                We couldn't automatically read this receipt. Please enter the details manually below.
              </Text>
            </Animated.View>
          )}

          {!isFailed && lowConfidence && (
            <Animated.View
              entering={FadeInDown.delay(60).duration(400)}
              style={styles.warnBanner}
            >
              <AlertTriangle size={18} color={OBSIDIAN.amber} />
              <Text style={styles.warnBannerText}>
                Low image clarity ({Math.round(receipt.ocr_confidence! * 100)}% confidence). Highlighted fields should be double-checked.
              </Text>
            </Animated.View>
          )}

          {/* Receipt Image Preview */}
          {receipt.image_url && (
            <Animated.View
              entering={FadeInDown.delay(90).duration(500).springify()}
              style={styles.imageFrame}
            >
              <ImageZoom uri={receipt.image_url} thumbnailHeight={260} />
              <View style={styles.zoomHintPill} pointerEvents="none">
                <Text style={styles.zoomHintText}>Tap to zoom receipt</Text>
              </View>
            </Animated.View>
          )}

          {/* Merchant & Totals Card */}
          <Animated.View
            entering={FadeInUp.delay(140).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>MERCHANT & TOTALS</Text>
            <View style={styles.groupCard}>
              <Controller
                control={control}
                name="store_name"
                render={({ field: { onChange, value } }) => (
                  <ObsidianField
                    label="Store Name"
                    value={value}
                    onChangeText={onChange}
                    icon={<Store size={16} color={OBSIDIAN.emerald} />}
                    flagged={needsReview.includes('store_name')}
                    placeholder="Enter store name"
                  />
                )}
              />
              {errors.store_name && (
                <Text style={styles.validationError}>{errors.store_name.message}</Text>
              )}

              <Controller
                control={control}
                name="store_address"
                render={({ field: { onChange, value } }) => (
                  <ObsidianField
                    label="Store Address"
                    value={value || ''}
                    onChangeText={onChange}
                    icon={<MapPin size={16} color={OBSIDIAN.textSecondary} />}
                    placeholder="Enter store address (optional)"
                  />
                )}
              />

              <View style={styles.twoColRow}>
                <View style={styles.halfCol}>
                  <Controller
                    control={control}
                    name="store_phone"
                    render={({ field: { onChange, value } }) => (
                      <ObsidianField
                        label="Phone"
                        value={value || ''}
                        onChangeText={onChange}
                        icon={<Phone size={15} color={OBSIDIAN.textSecondary} />}
                        keyboardType="phone-pad"
                        placeholder="Optional"
                      />
                    )}
                  />
                </View>

                <View style={styles.halfCol}>
                  <Controller
                    control={control}
                    name="receipt_number"
                    render={({ field: { onChange, value } }) => (
                      <ObsidianField
                        label="Receipt #"
                        value={value || ''}
                        onChangeText={onChange}
                        icon={<Hash size={15} color={OBSIDIAN.textSecondary} />}
                        placeholder="Optional"
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="purchase_date"
                render={({ field: { onChange, value } }) => (
                  <ObsidianField
                    label="Purchase Date"
                    value={value}
                    onChangeText={onChange}
                    icon={<Calendar size={16} color={OBSIDIAN.cyan} />}
                    flagged={needsReview.includes('purchase_date')}
                    placeholder="YYYY-MM-DD"
                  />
                )}
              />

              <View style={styles.twoColRow}>
                <View style={styles.halfCol}>
                  <Controller
                    control={control}
                    name="subtotal"
                    render={({ field: { onChange, value } }) => (
                      <ObsidianField
                        label="Subtotal (₹)"
                        value={value != null ? String(value) : ''}
                        onChangeText={(text) =>
                          onChange(text ? parseFloat(text) : undefined)
                        }
                        icon={<ReceiptIcon size={15} color={OBSIDIAN.textSecondary} />}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    )}
                  />
                </View>

                <View style={styles.halfCol}>
                  <Controller
                    control={control}
                    name="tax"
                    render={({ field: { onChange, value } }) => (
                      <ObsidianField
                        label="Tax (₹)"
                        value={value != null ? String(value) : ''}
                        onChangeText={(text) =>
                          onChange(text ? parseFloat(text) : undefined)
                        }
                        icon={<ReceiptIcon size={15} color={OBSIDIAN.textSecondary} />}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="total_amount"
                render={({ field: { onChange, value } }) => (
                  <ObsidianField
                    label="Total Amount (₹)"
                    value={String(value)}
                    onChangeText={(text) => onChange(parseFloat(text) || 0)}
                    icon={<ReceiptIcon size={16} color={OBSIDIAN.emerald} />}
                    keyboardType="numeric"
                    flagged={needsReview.includes('total_amount')}
                    highlight
                    placeholder="0.00"
                  />
                )}
              />
            </View>
          </Animated.View>

          {/* Payment Mode & Category Card */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>CLASSIFICATION</Text>
            <View style={styles.groupCard}>
              <View style={styles.chipSection}>
                <View style={styles.chipHeaderRow}>
                  <CreditCard size={14} color={OBSIDIAN.cyan} />
                  <Text style={styles.chipSectionTitle}>Payment Mode</Text>
                </View>
                <Controller
                  control={control}
                  name="payment_mode"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.chipWrap}>
                      {PAYMENT_MODES.map((mode) => {
                        const selected = value === mode.value;
                        return (
                          <Pressable
                            key={mode.value}
                            onPress={() => onChange(mode.value)}
                            style={[
                              styles.selectPill,
                              selected && {
                                backgroundColor: OBSIDIAN.cyanBg,
                                borderColor: OBSIDIAN.cyanBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectPillText,
                                selected && {
                                  color: OBSIDIAN.cyan,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {mode.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              </View>

              <View style={styles.innerDivider} />

              <View style={styles.chipSection}>
                <View style={styles.chipHeaderRow}>
                  <Layers size={14} color={OBSIDIAN.emerald} />
                  <Text style={styles.chipSectionTitle}>Category</Text>
                </View>
                <Controller
                  control={control}
                  name="category"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.chipWrap}>
                      {CATEGORIES.map((cat) => {
                        const selected = value === cat;
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => onChange(cat)}
                            style={[
                              styles.selectPill,
                              selected && {
                                backgroundColor: OBSIDIAN.emeraldBg,
                                borderColor: OBSIDIAN.emeraldBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectPillText,
                                selected && {
                                  color: OBSIDIAN.emerald,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {cat}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />
              </View>
            </View>
          </Animated.View>

          {/* Line Items & Warranty Builder */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.itemsHeaderRow}>
              <Text style={styles.sectionLabel}>
                ITEMS & WARRANTIES ({items.length})
              </Text>
              <Pressable onPress={addItem} style={styles.addItemPill}>
                <Plus size={14} color={OBSIDIAN.emerald} strokeWidth={2.5} />
                <Text style={styles.addItemText}>Add Item</Text>
              </Pressable>
            </View>

            <View style={styles.itemsList}>
              {items.map((item, idx) => (
                <Animated.View
                  key={item.id || idx}
                  entering={FadeInUp.delay(Math.min(idx * 50, 250)).duration(380)}
                  style={styles.itemEditorCard}
                >
                  <View style={styles.itemCardTop}>
                    <View style={styles.itemIndexBadge}>
                      <Text style={styles.itemIndexText}>ITEM #{idx + 1}</Text>
                    </View>

                    {items.length > 1 && (
                      <Pressable
                        onPress={() => removeItem(idx)}
                        hitSlop={8}
                        style={styles.removeItemBtn}
                      >
                        <Trash2 size={15} color={OBSIDIAN.rose} />
                      </Pressable>
                    )}
                  </View>

                  <ObsidianField
                    label="Item Name"
                    value={item.name}
                    onChangeText={(val) => updateItem(idx, { name: val })}
                    placeholder="Product or service name"
                  />

                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <ObsidianField
                        label="Qty"
                        value={String(item.quantity || 1)}
                        onChangeText={(val) =>
                          updateItem(idx, { quantity: parseInt(val, 10) || 1 })
                        }
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={{ flex: 2 }}>
                      <ObsidianField
                        label="Price (₹)"
                        value={String(item.price || 0)}
                        onChangeText={(val) =>
                          updateItem(idx, { price: parseFloat(val) || 0 })
                        }
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <ObsidianField
                    label="Serial Number (Optional)"
                    value={item.serial_number || ''}
                    onChangeText={(val) =>
                      updateItem(idx, { serial_number: val || null })
                    }
                    icon={<Barcode size={15} color={OBSIDIAN.textMuted} />}
                    placeholder="S/N or IMEI for warranty claims"
                  />

                  {/* Brand Warranty Box */}
                  <View style={styles.warrantyBox}>
                    <View style={styles.warrantyTitleRow}>
                      <ShieldCheck size={15} color={OBSIDIAN.emerald} />
                      <Text style={styles.warrantyTitle}>Brand Warranty</Text>
                    </View>
                    <Text style={styles.warrantyDesc}>
                      Standard manufacturer coverage period:
                    </Text>
                    <View style={styles.chipWrap}>
                      {[
                        { label: 'None', months: null },
                        { label: '6 mo', months: 6 },
                        { label: '1 yr', months: 12 },
                        { label: '2 yr', months: 24 },
                        { label: '3 yr', months: 36 },
                      ].map((opt) => {
                        const selected = item.brand_warranty_months === opt.months;
                        return (
                          <Pressable
                            key={opt.label}
                            onPress={() =>
                              updateItem(idx, { brand_warranty_months: opt.months })
                            }
                            style={[
                              styles.warrantyChip,
                              selected && {
                                backgroundColor: OBSIDIAN.emeraldBg,
                                borderColor: OBSIDIAN.emeraldBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.warrantyChipText,
                                selected && {
                                  color: OBSIDIAN.emerald,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {item.brand_warranty_expiry && (
                      <View style={styles.expiryConfirmRow}>
                        <CheckCircle2 size={13} color={OBSIDIAN.emerald} />
                        <Text style={styles.expiryConfirmText}>
                          Expires on {formatDate(item.brand_warranty_expiry)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Extended Warranty Box */}
                  <View style={[styles.warrantyBox, { marginTop: 10 }]}>
                    <View style={styles.warrantyTitleRow}>
                      <Sparkles size={15} color={OBSIDIAN.cyan} />
                      <Text style={styles.warrantyTitle}>Extended Warranty</Text>
                    </View>
                    <Text style={styles.warrantyDesc}>
                      Additional protection plan coverage:
                    </Text>
                    <View style={styles.chipWrap}>
                      {[
                        { label: 'None', months: null },
                        { label: '1 yr', months: 12 },
                        { label: '2 yr', months: 24 },
                        { label: '3 yr', months: 36 },
                      ].map((opt) => {
                        const selected = item.extended_warranty_months === opt.months;
                        return (
                          <Pressable
                            key={opt.label}
                            onPress={() =>
                              updateItem(idx, { extended_warranty_months: opt.months })
                            }
                            style={[
                              styles.warrantyChip,
                              selected && {
                                backgroundColor: OBSIDIAN.cyanBg,
                                borderColor: OBSIDIAN.cyanBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.warrantyChipText,
                                selected && {
                                  color: OBSIDIAN.cyan,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {item.extended_warranty_expiry && (
                      <View style={styles.expiryConfirmRow}>
                        <CheckCircle2 size={13} color={OBSIDIAN.cyan} />
                        <Text
                          style={[
                            styles.expiryConfirmText,
                            { color: OBSIDIAN.cyan },
                          ]}
                        >
                          Extended until {formatDate(item.extended_warranty_expiry)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Important Dates & Notes */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>ADDITIONAL DETAILS</Text>
            <View style={styles.groupCard}>
              {receipt.return_deadline && (
                <ObsidianField
                  label="Return Deadline"
                  value={formatDate(receipt.return_deadline)}
                  icon={<RotateCcw size={15} color={OBSIDIAN.amber} />}
                  editable={false}
                  flagged
                  flagLabel="Suggested"
                />
              )}

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, value } }) => (
                  <ObsidianField
                    label="Notes"
                    value={value || ''}
                    onChangeText={onChange}
                    icon={<StickyNote size={15} color={OBSIDIAN.textSecondary} />}
                    multiline
                    placeholder="Add warranty claim notes, store salesperson, etc."
                  />
                )}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky Obsidian Footer Save Bar */}
      <View style={styles.footerBar}>
        <View style={styles.footerInner}>
          <AnimatedPressable
            disabled={isSaving}
            onPressIn={() => {
              saveScale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
            }}
            onPressOut={() => {
              saveScale.value = withSpring(1, { damping: 16, stiffness: 320 });
            }}
            onPress={() => handleSubmit(onSubmit)()}
            style={[styles.saveTouchable, saveAnimatedStyle]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveGradient, isSaving && { opacity: 0.75 }]}
            >
              {isSaving ? (
                <ActivityIndicator color="#042F1E" />
              ) : (
                <>
                  <Check size={19} color="#042F1E" strokeWidth={2.8} />
                  <Text style={styles.saveText}>Confirm & Save to Vault</Text>
                </>
              )}
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
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
    paddingTop: 18,
    paddingBottom: 112,
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
  subtitle: {
    fontSize: 13.5,
    color: OBSIDIAN.textSecondary,
    marginTop: 4,
    lineHeight: 19,
  },
  /* Alert Banners */
  failBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  failBannerText: {
    flex: 1,
    color: OBSIDIAN.rose,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  warnBannerText: {
    flex: 1,
    color: OBSIDIAN.amber,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  /* Image Preview */
  imageFrame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    marginBottom: 20,
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
  /* Sections & Cards */
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
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  /* Custom Obsidian Field */
  fieldWrapper: {
    marginBottom: 13,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  fieldLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  flaggedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  flaggedPillText: {
    color: OBSIDIAN.amber,
    fontSize: 10,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    paddingHorizontal: 12,
  },
  inputBoxMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 82,
  },
  inputIcon: {
    marginRight: 9,
  },
  inputText: {
    flex: 1,
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  inputTextMultiline: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  validationError: {
    color: OBSIDIAN.rose,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 4,
  },
  /* Chips */
  chipSection: {
    paddingVertical: 4,
  },
  chipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  chipSectionTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  selectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: OBSIDIAN.inputBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  selectPillText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  innerDivider: {
    height: 1,
    backgroundColor: OBSIDIAN.border,
    marginVertical: 14,
  },
  /* Items & Warranties */
  itemsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  addItemText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    gap: 12,
  },
  itemEditorCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  itemCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemIndexBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  itemIndexText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  removeItemBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warrantyBox: {
    backgroundColor: OBSIDIAN.surfaceElevated,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  warrantyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  warrantyTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  warrantyDesc: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    marginBottom: 9,
  },
  warrantyChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: OBSIDIAN.inputBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  warrantyChipText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  expiryConfirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  expiryConfirmText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  /* Sticky Footer */
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.92)',
    borderTopWidth: 1,
    borderTopColor: OBSIDIAN.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  footerInner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  saveTouchable: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  saveGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: '#042F1E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  /* Skeleton & Error */
  skeletonImage: {
    height: 200,
    borderRadius: 22,
    backgroundColor: OBSIDIAN.surface,
    marginTop: 18,
    marginBottom: 16,
  },
  skeletonCard: {
    height: 220,
    borderRadius: 22,
    backgroundColor: OBSIDIAN.surface,
    marginBottom: 16,
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
});