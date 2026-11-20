import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, FAB, Chip, Divider } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { foldersApi } from '../src/api/folders';
import { tagsApi } from '../src/api/tags';
import { LoadingSkeleton } from '../src/components/LoadingSkeleton';
import { EmptyState } from '../src/components/EmptyState';
import { colors } from '../src/theme';
import type { Folder, Tag } from '../src/api/types';

const EMOJI_OPTIONS = ['📁', '🛒', '💊', '🍔', '👕', '📱', '🏠', '✈️', '⛽', '📋'];
const COLOR_OPTIONS = ['#0F766E', '#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#D97706', '#16A34A', '#0284C7'];

export default function FoldersScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'folders' | 'tags'>('folders');

  // Folders
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => foldersApi.list(),
  });

  // Tags
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  // Create Folder state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');
  const [newFolderColor, setNewFolderColor] = useState(COLOR_OPTIONS[0]);

  // Create Tag state
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await foldersApi.create({
        name: newFolderName.trim(),
        emoji: newFolderEmoji,
        color: newFolderColor,
      });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create folder.');
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    Alert.alert('Delete Folder', `Delete "${folder.name}"? Receipts won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await foldersApi.delete(folder.id);
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await tagsApi.create(newTagName.trim());
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName('');
      setShowCreateTag(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create tag.');
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert('Delete Tag', `Delete "#${tag.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await tagsApi.delete(tag.id);
            queryClient.invalidateQueries({ queryKey: ['tags'] });
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <Chip
          selected={activeTab === 'folders'}
          onPress={() => setActiveTab('folders')}
          style={styles.tabChip}
        >
          📁 Folders
        </Chip>
        <Chip
          selected={activeTab === 'tags'}
          onPress={() => setActiveTab('tags')}
          style={styles.tabChip}
        >
          🏷️ Tags
        </Chip>
      </View>

      {/* Folders Tab */}
      {activeTab === 'folders' && (
        <View>
          {foldersLoading ? (
            <LoadingSkeleton count={3} style="row" />
          ) : !folders || folders.length === 0 ? (
            <EmptyState
              icon="📁"
              title="No folders yet"
              message="Create folders to organize your receipts"
              actionLabel="Create Folder"
              onAction={() => setShowCreateFolder(true)}
            />
          ) : (
            <>
              {folders.map((folder) => (
                <View key={folder.id} style={[styles.folderCard, { borderLeftColor: folder.color }]}>
                  <Text style={styles.folderEmoji}>{folder.emoji}</Text>
                  <View style={styles.folderInfo}>
                    <Text variant="bodyLarge" style={styles.folderName}>
                      {folder.name}
                    </Text>
                    <Text variant="bodySmall" style={styles.folderCount}>
                      {folder.receipt_count} receipts
                    </Text>
                  </View>
                  <IconButton
                    icon="delete"
                    size={18}
                    iconColor={colors.danger}
                    onPress={() => handleDeleteFolder(folder)}
                  />
                </View>
              ))}
            </>
          )}

          {/* Create Folder Form */}
          {showCreateFolder && (
            <View style={styles.createForm}>
              <Text variant="titleSmall" style={styles.formTitle}>
                New Folder
              </Text>
              <TextInput
                label="Folder Name"
                value={newFolderName}
                onChangeText={setNewFolderName}
                mode="outlined"
                dense
                style={styles.input}
              />
              <Text variant="labelSmall" style={styles.pickerLabel}>
                Icon
              </Text>
              <View style={styles.optionRow}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <Chip
                    key={emoji}
                    selected={newFolderEmoji === emoji}
                    onPress={() => setNewFolderEmoji(emoji)}
                    compact
                    style={styles.emojiChip}
                  >
                    {emoji}
                  </Chip>
                ))}
              </View>
              <Text variant="labelSmall" style={styles.pickerLabel}>
                Color
              </Text>
              <View style={styles.optionRow}>
                {COLOR_OPTIONS.map((color) => (
                  <View
                    key={color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      newFolderColor === color && styles.colorDotSelected,
                    ]}
                    onTouchEnd={() => setNewFolderColor(color)}
                  />
                ))}
              </View>
              <View style={styles.formActions}>
                <Button mode="text" onPress={() => setShowCreateFolder(false)}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleCreateFolder} buttonColor={colors.primary}>
                  Create
                </Button>
              </View>
            </View>
          )}

          {!showCreateFolder && (
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => setShowCreateFolder(true)}
              style={styles.addButton}
            >
              Add Folder
            </Button>
          )}
        </View>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <View>
          {tagsLoading ? (
            <LoadingSkeleton count={3} style="row" />
          ) : !tags || tags.length === 0 ? (
            <EmptyState
              icon="🏷️"
              title="No tags yet"
              message="Create tags to label your receipts"
              actionLabel="Create Tag"
              onAction={() => setShowCreateTag(true)}
            />
          ) : (
            <View style={styles.tagList}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tagCard}>
                  <Text variant="bodyMedium" style={styles.tagName}>
                    #{tag.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.tagCount}>
                    {tag.receipt_count}
                  </Text>
                  <IconButton
                    icon="close"
                    size={16}
                    iconColor={colors.danger}
                    onPress={() => handleDeleteTag(tag)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Create Tag Form */}
          {showCreateTag && (
            <View style={styles.createForm}>
              <TextInput
                label="Tag Name"
                value={newTagName}
                onChangeText={setNewTagName}
                mode="outlined"
                dense
                style={styles.input}
              />
              <View style={styles.formActions}>
                <Button mode="text" onPress={() => setShowCreateTag(false)}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleCreateTag} buttonColor={colors.primary}>
                  Create
                </Button>
              </View>
            </View>
          )}

          {!showCreateTag && (
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => setShowCreateTag(true)}
              style={styles.addButton}
            >
              Add Tag
            </Button>
          )}
        </View>
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
    padding: 16,
    paddingBottom: 40,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    flex: 1,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 1,
  },
  folderEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontWeight: '500',
  },
  folderCount: {
    color: colors.grey,
    marginTop: 2,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingLeft: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagName: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  tagCount: {
    color: colors.grey,
    marginLeft: 6,
  },
  createForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 2,
    gap: 10,
  },
  formTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'transparent',
  },
  pickerLabel: {
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    backgroundColor: colors.surfaceVariant,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  addButton: {
    marginTop: 16,
    borderRadius: 12,
    borderColor: colors.grey,
  },
});
