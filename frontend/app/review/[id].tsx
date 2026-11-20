import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Banner, Chip, Surface, IconButton } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useReceipt } from '../../src/hooks/useReceipt';
import { receiptsApi } from '../../src/api/receipts';
import { receiptEditSchema, type ReceiptEditFormData } from '../../src/lib/validation';
import { ImageZoom } from '../../src/components/ImageZoom';
import { FieldRow } from '../../src/components/FieldRow';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { formatINR } from '../../src/lib/formatINR';
import { formatDate } from '../../src/lib/formatDate';
import { colors } from '../../src/theme';
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

const CATEGORIES = ['Electronics', 'Groceries', 'Clothing', 'Food', 'Medical', 'Fuel', 'Travel', 'Other'];
const PAYMENT_MODES = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Net Banking', value: 'net_banking' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Other', value: 'other' },
] as const;

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isLoading, isError, refetch, invalidate } = useReceipt(id);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);

  useEffect(() => {
    if (receipt?.items) {
      setItems(receipt.items);
    }
  }, [receipt]);

  const isFailed = receipt?.status === 'failed';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
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

      // Recalculate brand warranty expiry if brand warranty months changed
      if ('brand_warranty_months' in updates) {
        current.brand_warranty_expiry = updates.brand_warranty_months
          ? addMonthsToDate(purchaseDate, updates.brand_warranty_months)
          : null;
      }

      // Recalculate extended warranty expiry if extended warranty months changed
      if ('extended_warranty_months' in updates) {
        const totalMonths = (current.brand_warranty_months || 0) + (updates.extended_warranty_months || 0);
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
      Alert.alert('Save Failed', err.message || 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSkeleton count={5} />;
  if (isError || !receipt) return <ErrorView onRetry={refetch} />;

  const needsReview = receipt.needs_review || [];

  return (
    <View style={styles.container}>
      {isFailed && (
        <Banner
          visible
          icon="alert"
          style={styles.failBanner}
          actions={[]}
        >
          We couldn't read this receipt. Please enter details manually.
        </Banner>
      )}

      {receipt.ocr_confidence != null && receipt.ocr_confidence < 0.7 && (
        <Banner
          visible
          icon="image-broken-variant"
          style={{ backgroundColor: '#FFF7ED' }}
          actions={[]}
        >
          Low image quality detected ({Math.round(receipt.ocr_confidence * 100)}% confidence). Please review all fields carefully.
        </Banner>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Receipt Image */}
        {receipt.image_url && (
          <ImageZoom uri={receipt.image_url} thumbnailHeight={280} />
        )}

        {/* Form Fields */}
        <View style={styles.form}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Receipt Details
          </Text>

          <Controller
            control={control}
            name="store_name"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Store Name"
                value={value}
                onChangeText={onChange}
                flagged={needsReview.includes('store_name')}
                placeholder="Enter store name"
              />
            )}
          />

          <Controller
            control={control}
            name="store_address"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Store Address"
                value={value || ''}
                onChangeText={onChange}
                placeholder="Enter store address (optional)"
              />
            )}
          />

          <Controller
            control={control}
            name="store_phone"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Store Phone"
                value={value || ''}
                onChangeText={onChange}
                keyboardType="phone-pad"
                placeholder="Enter store phone (optional)"
              />
            )}
          />

          <Controller
            control={control}
            name="purchase_date"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Purchase Date"
                value={value}
                onChangeText={onChange}
                flagged={needsReview.includes('purchase_date')}
                placeholder="YYYY-MM-DD"
              />
            )}
          />

          <Controller
            control={control}
            name="receipt_number"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Receipt #"
                value={value || ''}
                onChangeText={onChange}
                placeholder="Receipt / Invoice number (optional)"
              />
            )}
          />

          <Controller
            control={control}
            name="subtotal"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Subtotal (₹)"
                value={value != null ? String(value) : ''}
                onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                keyboardType="numeric"
                placeholder="0.00"
              />
            )}
          />

          <Controller
            control={control}
            name="tax"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Tax (₹)"
                value={value != null ? String(value) : ''}
                onChangeText={(text) => onChange(text ? parseFloat(text) : undefined)}
                keyboardType="numeric"
                placeholder="0.00"
              />
            )}
          />

          <Controller
            control={control}
            name="total_amount"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Total Amount (₹)"
                value={String(value)}
                onChangeText={(text) => onChange(parseFloat(text) || 0)}
                keyboardType="numeric"
                flagged={needsReview.includes('total_amount')}
                placeholder="0.00"
              />
            )}
          />

          {/* Payment Mode */}
          <View style={styles.fieldSection}>
            <Text variant="labelMedium" style={styles.fieldLabel}>
              PAYMENT MODE
            </Text>
            <View style={styles.chipRow}>
              <Controller
                control={control}
                name="payment_mode"
                render={({ field: { onChange, value } }) => (
                  <>
                    {PAYMENT_MODES.map((mode) => (
                      <Chip
                        key={mode.value}
                        selected={value === mode.value}
                        onPress={() => onChange(mode.value)}
                        style={styles.chip}
                        compact
                      >
                        {mode.label}
                      </Chip>
                    ))}
                  </>
                )}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldSection}>
            <Text variant="labelMedium" style={styles.fieldLabel}>
              CATEGORY
            </Text>
            <View style={styles.chipRow}>
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <>
                    {CATEGORIES.map((cat) => (
                      <Chip
                        key={cat}
                        selected={value === cat}
                        onPress={() => onChange(cat)}
                        style={styles.chip}
                        compact
                      >
                        {cat}
                      </Chip>
                    ))}
                  </>
                )}
              />
            </View>
          </View>

          {/* Items & Warranty Section */}
          <View style={styles.itemsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.sectionTitleNoPad}>
                Items & Warranties ({items.length})
              </Text>
              <Button mode="text" compact icon="plus" onPress={addItem} textColor={colors.primary}>
                Add Item
              </Button>
            </View>

            {items.map((item, idx) => (
              <Surface key={item.id || idx} style={styles.itemEditorCard} elevation={1}>
                <View style={styles.itemCardHeader}>
                  <Text variant="titleSmall" style={styles.itemIndexTitle}>
                    Item #{idx + 1}
                  </Text>
                  {items.length > 1 && (
                    <IconButton
                      icon="trash-can-outline"
                      size={18}
                      iconColor={colors.danger}
                      onPress={() => removeItem(idx)}
                    />
                  )}
                </View>

                <TextInput
                  mode="outlined"
                  label="Item Name"
                  value={item.name}
                  onChangeText={(val) => updateItem(idx, { name: val })}
                  dense
                  style={styles.itemInput}
                />

                <View style={styles.itemRow2}>
                  <TextInput
                    mode="outlined"
                    label="Qty"
                    value={String(item.quantity || 1)}
                    onChangeText={(val) => updateItem(idx, { quantity: parseInt(val, 10) || 1 })}
                    keyboardType="numeric"
                    dense
                    style={[styles.itemInput, { flex: 1 }]}
                  />
                  <TextInput
                    mode="outlined"
                    label="Price (₹)"
                    value={String(item.price || 0)}
                    onChangeText={(val) => updateItem(idx, { price: parseFloat(val) || 0 })}
                    keyboardType="numeric"
                    dense
                    style={[styles.itemInput, { flex: 2 }]}
                  />
                </View>

                <TextInput
                  mode="outlined"
                  label="Serial Number (optional)"
                  value={item.serial_number || ''}
                  onChangeText={(val) => updateItem(idx, { serial_number: val || null })}
                  dense
                  style={styles.itemInput}
                />

                {/* Brand Warranty */}
                <View style={styles.warrantyBox}>
                  <Text variant="labelMedium" style={styles.warrantyBoxTitle}>
                    🛡️ Brand Warranty
                  </Text>
                  <Text variant="bodySmall" style={styles.warrantyDesc}>
                    Select warranty period (optional, blank by default):
                  </Text>
                  <View style={styles.chipRow}>
                    {[
                      { label: 'None', months: null },
                      { label: '6 mo', months: 6 },
                      { label: '1 yr', months: 12 },
                      { label: '2 yr', months: 24 },
                      { label: '3 yr', months: 36 },
                    ].map((opt) => (
                      <Chip
                        key={opt.label}
                        selected={item.brand_warranty_months === opt.months}
                        onPress={() => updateItem(idx, { brand_warranty_months: opt.months })}
                        style={styles.chip}
                        compact
                      >
                        {opt.label}
                      </Chip>
                    ))}
                  </View>
                  {item.brand_warranty_expiry && (
                    <Text variant="bodySmall" style={styles.calculatedDate}>
                      ✓ Expires on {formatDate(item.brand_warranty_expiry)}
                    </Text>
                  )}
                </View>

                {/* Extended Warranty */}
                <View style={[styles.warrantyBox, { marginTop: 8 }]}>
                  <Text variant="labelMedium" style={styles.warrantyBoxTitle}>
                    ➕ Extended Warranty
                  </Text>
                  <Text variant="bodySmall" style={styles.warrantyDesc}>
                    Additional coverage period (optional):
                  </Text>
                  <View style={styles.chipRow}>
                    {[
                      { label: 'None', months: null },
                      { label: '1 yr', months: 12 },
                      { label: '2 yr', months: 24 },
                      { label: '3 yr', months: 36 },
                    ].map((opt) => (
                      <Chip
                        key={opt.label}
                        selected={item.extended_warranty_months === opt.months}
                        onPress={() => updateItem(idx, { extended_warranty_months: opt.months })}
                        style={styles.chip}
                        compact
                      >
                        {opt.label}
                      </Chip>
                    ))}
                  </View>
                  {item.extended_warranty_expiry && (
                    <Text variant="bodySmall" style={styles.calculatedDate}>
                      ✓ Extended until {formatDate(item.extended_warranty_expiry)}
                    </Text>
                  )}
                </View>
              </Surface>
            ))}
          </View>

          {/* Return dates & Warranty note */}
          {receipt.return_deadline && (
            <View style={styles.datesSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Important Dates
              </Text>
              <FieldRow
                label="Return Deadline"
                value={formatDate(receipt.return_deadline)}
                editable={false}
                flagged
                flagLabel="Suggested"
              />
            </View>
          )}

          {/* Notes */}
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <FieldRow
                label="Notes"
                value={value || ''}
                onChangeText={onChange}
                multiline
                placeholder="Add notes (optional)"
              />
            )}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => handleSubmit(onSubmit)()}
          loading={isSaving}
          disabled={isSaving}
          buttonColor={colors.primary}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          Confirm & Save
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 100,
  },
  failBanner: {
    backgroundColor: '#FEF2F2',
  },
  form: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitleNoPad: {
    fontWeight: '600',
    color: colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  fieldSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  fieldLabel: {
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceVariant,
  },
  itemsSection: {
    marginTop: 8,
  },
  itemEditorCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemIndexTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  itemInput: {
    marginBottom: 8,
    backgroundColor: colors.white,
  },
  itemRow2: {
    flexDirection: 'row',
    gap: 8,
  },
  warrantyBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  warrantyBoxTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  warrantyDesc: {
    color: colors.grey,
    marginBottom: 6,
  },
  calculatedDate: {
    color: colors.primary,
    fontWeight: '500',
    marginTop: 6,
  },
  datesSection: {
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
  },
  saveButton: {
    borderRadius: 24,
  },
  saveButtonContent: {
    paddingVertical: 6,
  },
});

