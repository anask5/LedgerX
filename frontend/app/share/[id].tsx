import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share as RNShare } from 'react-native';
import { Text, Button, SegmentedButtons, Switch, RadioButton, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { shareApi } from '../../src/api/share';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { formatDate } from '../../src/lib/formatDate';
import { colors } from '../../src/theme';
import type { ShareLink, CreateShareLinkRequest } from '../../src/api/types';

type ExpiryOption = '24h' | '7d' | '30d';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [expiry, setExpiry] = useState<ExpiryOption>('7d');
  const [hidePayment, setHidePayment] = useState(true);
  const [hidePhone, setHidePhone] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newLink, setNewLink] = useState<ShareLink | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch existing links
  const { data: existingLinks, isLoading, refetch } = useQuery({
    queryKey: ['share-links', id],
    queryFn: () => shareApi.listLinks(id),
  });

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const link = await shareApi.createLink(id, {
        expiry,
        hide_payment: hidePayment,
        hide_phone: hidePhone,
      });
      setNewLink(link);
      queryClient.invalidateQueries({ queryKey: ['share-links', id] });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create share link.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const url = await shareApi.downloadProof(id);
      Alert.alert('Download Ready', 'Your proof PDF is ready for download.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate proof PDF.');
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      Alert.alert('Error', 'Failed to copy link.');
    }
  };

  const handleShareNative = async (url: string) => {
    try {
      await RNShare.share({
        message: `Here's my receipt proof: ${url}`,
        url,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleRevoke = async (linkId: string) => {
    Alert.alert('Revoke Link', 'This link will no longer work. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await shareApi.revokeLink(linkId);
            queryClient.invalidateQueries({ queryKey: ['share-links', id] });
            if (newLink?.id === linkId) setNewLink(null);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Share Proof
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Share your receipt proof securely
      </Text>

      {/* Main Actions */}
      <View style={styles.mainActions}>
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={handleDownloadPDF}
          style={styles.actionButton}
          buttonColor={colors.primary}
          contentStyle={styles.actionButtonContent}
        >
          Download PDF
        </Button>
      </View>

      <Divider style={styles.divider} />

      {/* Create Share Link */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Create Share Link
      </Text>

      {/* Expiry */}
      <Text variant="labelMedium" style={styles.label}>
        Link expires in
      </Text>
      <SegmentedButtons
        value={expiry}
        onValueChange={(val) => setExpiry(val as ExpiryOption)}
        buttons={[
          { value: '24h', label: '24 Hours' },
          { value: '7d', label: '7 Days' },
          { value: '30d', label: '30 Days' },
        ]}
        style={styles.expiryButtons}
      />

      {/* Privacy toggles */}
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text variant="bodyMedium">Hide payment details</Text>
          <Text variant="bodySmall" style={styles.toggleDesc}>
            Card number, UPI ID, etc.
          </Text>
        </View>
        <Switch value={hidePayment} onValueChange={setHidePayment} color={colors.primary} />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text variant="bodyMedium">Hide phone number</Text>
          <Text variant="bodySmall" style={styles.toggleDesc}>
            Your phone number on the receipt
          </Text>
        </View>
        <Switch value={hidePhone} onValueChange={setHidePhone} color={colors.primary} />
      </View>

      <Button
        mode="contained"
        icon="link"
        onPress={handleCreateLink}
        loading={isCreating}
        disabled={isCreating}
        style={styles.createButton}
        buttonColor={colors.primary}
        contentStyle={styles.actionButtonContent}
      >
        Create Share Link
      </Button>

      {/* Newly created link */}
      {newLink && (
        <View style={styles.newLinkCard}>
          <View style={styles.newLinkWarning}>
            <Text variant="bodySmall" style={styles.warningText}>
              ⚠️ Copy this link now — the token is shown only once
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.linkUrl} numberOfLines={2}>
            {newLink.url}
          </Text>
          <View style={styles.newLinkActions}>
            <Button
              mode="contained"
              compact
              onPress={() => handleCopyLink(newLink.url)}
              buttonColor={linkCopied ? colors.success : colors.primary}
              style={styles.copyButton}
            >
              {linkCopied ? '✓ Copied!' : 'Copy'}
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => handleShareNative(newLink.url)}
              style={styles.shareButton}
            >
              Share via...
            </Button>
          </View>
        </View>
      )}

      <Divider style={styles.divider} />

      {/* Existing Links */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Existing Links
      </Text>

      {isLoading ? (
        <LoadingSkeleton count={2} style="row" />
      ) : !existingLinks || existingLinks.length === 0 ? (
        <Text variant="bodyMedium" style={styles.noLinks}>
          No active share links
        </Text>
      ) : (
        existingLinks.map((link) => (
          <View key={link.id} style={styles.linkCard}>
            <View style={styles.linkInfo}>
              <Text variant="bodySmall" style={styles.linkDate}>
                Created {formatDate(link.created_at)}
              </Text>
              <Text variant="bodySmall" style={styles.linkMeta}>
                Expires {formatDate(link.expires_at)} · {link.view_count} views
              </Text>
            </View>
            <Button
              mode="text"
              compact
              textColor={colors.danger}
              onPress={() => handleRevoke(link.id)}
            >
              Revoke
            </Button>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.grey,
    marginTop: 4,
    marginBottom: 20,
  },
  mainActions: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  expiryButtons: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    color: colors.grey,
    marginTop: 2,
  },
  createButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  newLinkCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    elevation: 2,
  },
  newLinkWarning: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  warningText: {
    color: colors.warning,
    textAlign: 'center',
    fontWeight: '500',
  },
  linkUrl: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 12,
  },
  newLinkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flex: 1,
    borderRadius: 8,
  },
  shareButton: {
    flex: 1,
    borderRadius: 8,
  },
  noLinks: {
    color: colors.grey,
    textAlign: 'center',
    paddingVertical: 20,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
    elevation: 1,
  },
  linkInfo: {
    flex: 1,
  },
  linkDate: {
    color: colors.text,
    fontWeight: '500',
  },
  linkMeta: {
    color: colors.grey,
    marginTop: 2,
  },
});
