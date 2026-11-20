import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Switch, Button, Divider, Avatar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/hooks/useAuth';
import { useAppLock } from '../../src/hooks/useAppLock';
import { shareApi } from '../../src/api/share';
import { authApi } from '../../src/api/auth';
import { colors } from '../../src/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isEnabled: isLockEnabled, toggleLock } = useAppLock();
  const [isImporting, setIsImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleExportCSV = async () => {
    try {
      const url = await shareApi.exportCSV({});
      Alert.alert('Export Ready', 'Your CSV export has been prepared for download.');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export data.');
    }
  };

  const handleImportCSV = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    const isCsv = file.name?.toLowerCase().endsWith('.csv') || file.mimeType?.includes('csv');
    if (!isCsv) {
      Alert.alert('Choose a CSV file', 'Please select a file with the .csv extension.');
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
      Alert.alert('Import complete', `${imported.imported} receipt(s) imported.${skipped}`);
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Could not import this CSV file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount();
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Avatar.Text
          size={64}
          label={user?.name?.charAt(0)?.toUpperCase() || 'U'}
          style={{ backgroundColor: colors.primary }}
        />
        <View style={styles.profileInfo}>
          <Text variant="titleLarge" style={styles.profileName}>
            {user?.name || 'User'}
          </Text>
          <Text variant="bodyMedium" style={styles.profileEmail}>
            {user?.email || 'No email'}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Preferences */}
      <List.Section title="Preferences">
        <List.Item
          title="App Lock"
          description="Lock after 30s in background"
          left={(props) => <List.Icon {...props} icon="lock" />}
          right={() => (
            <Switch
              value={isLockEnabled}
              onValueChange={toggleLock}
              color={colors.primary}
            />
          )}
        />
      </List.Section>

      <Divider />

      {/* Data */}
      <List.Section title="Data">
        <List.Item
          title="Export CSV"
          description="Download your receipt data"
          left={(props) => <List.Icon {...props} icon="download" />}
          onPress={handleExportCSV}
        />
        <List.Item
          title={isImporting ? 'Importing CSV…' : 'Import CSV'}
          description="Add receipts from a CSV file"
          left={(props) => <List.Icon {...props} icon="upload" />}
          onPress={handleImportCSV}
          disabled={isImporting}
        />
        <List.Item
          title="Folders & Tags"
          description="Organize your receipts"
          left={(props) => <List.Icon {...props} icon="folder" />}
          onPress={() => {
            // Will be handled by expo-router
          }}
        />
      </List.Section>

      <Divider />

      {/* Legal */}
      <List.Section title="About">
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-lock" />}
          onPress={() => {
            // Open privacy policy URL
          }}
        />
        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          onPress={() => {}}
        />
      </List.Section>

      <Divider />

      {/* Account Actions */}
      <View style={styles.accountActions}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={colors.text}
        >
          Log Out
        </Button>
        <Button
          mode="text"
          onPress={handleDeleteAccount}
          textColor={colors.danger}
          style={styles.deleteButton}
        >
          Delete Account
        </Button>
      </View>

      <Text variant="bodySmall" style={styles.version}>
        ReceiptWise v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '600',
    color: colors.text,
  },
  profileEmail: {
    color: colors.grey,
    marginTop: 2,
  },
  accountActions: {
    padding: 20,
    gap: 12,
  },
  logoutButton: {
    borderRadius: 24,
    borderColor: colors.grey,
  },
  deleteButton: {
    borderRadius: 24,
  },
  version: {
    textAlign: 'center',
    color: colors.grey,
    marginBottom: 20,
  },
});
