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
  Modal,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  FolderOpen,
  Tag as TagIcon,
  Plus,
  Trash2,
  X,
  Check,
  Sparkles,
  AlertTriangle,
  Hash,
} from 'lucide-react-native';
import { foldersApi } from '../src/api/folders';
import { tagsApi } from '../src/api/tags';
import type { Folder, Tag } from '../src/api/types';

const EMOJI_OPTIONS = ['📁', '🛒', '💊', '🍔', '👕', '📱', '🏠', '✈️', '⛽', '📋'];
const COLOR_OPTIONS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#38BDF8', // Sky
];

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
  indigo: '#818CF8',
  indigoBg: 'rgba(99, 102, 241, 0.12)',
  indigoBorder: 'rgba(99, 102, 241, 0.28)',
  rose: '#FB7185',
  roseBg: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.28)',
};

function ObsidianListSkeleton() {
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
    <View style={styles.skeletonStack}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.skeletonRow, pulseStyle]} />
      ))}
    </View>
  );
}

export default function FoldersScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'folders' | 'tags'>('folders');
  const [segmentWidth, setSegmentWidth] = useState(0);

  // Folders query
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => foldersApi.list(),
  });

  // Tags query
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  // Create Folder state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('📁');
  const [newFolderColor, setNewFolderColor] = useState(COLOR_OPTIONS[0]);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderInputFocused, setFolderInputFocused] = useState(false);

  // Create Tag state
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagInputFocused, setTagInputFocused] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'folder'; item: Folder }
    | { type: 'tag'; item: Tag }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      indicatorX.value = withSpring(activeTab === 'folders' ? 0 : segmentWidth, {
        damping: 18,
        stiffness: 240,
      });
    }
  }, [activeTab, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleSegmentLayout = (e: LayoutChangeEvent) => {
    const innerWidth = e.nativeEvent.layout.width - 8;
    if (innerWidth > 0) {
      const half = innerWidth / 2;
      setSegmentWidth(half);
      indicatorX.value = activeTab === 'folders' ? 0 : half;
    }
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      await foldersApi.create({
        name: newFolderName.trim(),
        emoji: newFolderEmoji,
        color: newFolderColor,
      });
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (err: any) {
      notify('Error', err.message || 'Failed to create folder.');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateTag = async () => {
    const cleaned = newTagName.trim().replace(/^#/, '');
    if (!cleaned) return;
    setIsCreatingTag(true);
    try {
      await tagsApi.create(cleaned);
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTagName('');
      setShowCreateTag(false);
    } catch (err: any) {
      notify('Error', err.message || 'Failed to create tag.');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'folder') {
        await foldersApi.delete(deleteTarget.item.id);
        await queryClient.invalidateQueries({ queryKey: ['folders'] });
      } else {
        await tagsApi.delete(deleteTarget.item.id);
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteTarget(null);
      notify('Error', err.message || 'Failed to delete item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isFoldersTab = activeTab === 'folders';

  return (
    <View style={styles.root}>
      {/* Dynamic Ambient Top Glow */}
      <LinearGradient
        colors={
          isFoldersTab
            ? ['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.05)', 'transparent']
            : ['rgba(99, 102, 241, 0.22)', 'rgba(168, 85, 247, 0.06)', 'transparent']
        }
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
              <Sparkles
                size={12}
                color={isFoldersTab ? OBSIDIAN.emerald : OBSIDIAN.indigo}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: isFoldersTab ? OBSIDIAN.emerald : OBSIDIAN.indigo },
                ]}
              >
                VAULT TAXONOMY
              </Text>
            </View>
            <Text style={styles.title}>Folders & Tags</Text>
            <Text style={styles.subtitle}>
              Group receipts into custom collections or label them with searchable tags
            </Text>
          </Animated.View>

          {/* Spring Segmented Control */}
          <Animated.View
            entering={FadeInDown.delay(70).duration(500).springify()}
            onLayout={handleSegmentLayout}
            style={styles.segmentContainer}
          >
            {segmentWidth > 0 && (
              <Animated.View
                style={[
                  styles.segmentIndicator,
                  isFoldersTab
                    ? {
                        backgroundColor: OBSIDIAN.emeraldBg,
                        borderColor: OBSIDIAN.emeraldBorder,
                      }
                    : {
                        backgroundColor: OBSIDIAN.indigoBg,
                        borderColor: OBSIDIAN.indigoBorder,
                      },
                  indicatorStyle,
                ]}
              />
            )}

            <Pressable
              onPress={() => setActiveTab('folders')}
              style={styles.segmentTab}
            >
              <FolderOpen
                size={15}
                color={isFoldersTab ? OBSIDIAN.emerald : OBSIDIAN.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  isFoldersTab && { color: OBSIDIAN.emerald, fontWeight: '800' },
                ]}
              >
                Folders
              </Text>
              {folders && folders.length > 0 && (
                <View
                  style={[
                    styles.miniCount,
                    isFoldersTab && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniCountText,
                      isFoldersTab && { color: OBSIDIAN.emerald },
                    ]}
                  >
                    {folders.length}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('tags')}
              style={styles.segmentTab}
            >
              <TagIcon
                size={15}
                color={!isFoldersTab ? OBSIDIAN.indigo : OBSIDIAN.textSecondary}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  !isFoldersTab && { color: OBSIDIAN.indigo, fontWeight: '800' },
                ]}
              >
                Tags
              </Text>
              {tags && tags.length > 0 && (
                <View
                  style={[
                    styles.miniCount,
                    !isFoldersTab && { backgroundColor: 'rgba(99, 102, 241, 0.22)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.miniCountText,
                      !isFoldersTab && { color: OBSIDIAN.indigo },
                    ]}
                  >
                    {tags.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* ==================== FOLDERS TAB ==================== */}
          {isFoldersTab && (
            <View>
              {foldersLoading ? (
                <ObsidianListSkeleton />
              ) : !folders || folders.length === 0 ? (
                <Animated.View
                  entering={FadeInUp.duration(400).springify()}
                  style={styles.emptyCard}
                >
                  <View style={styles.emptyIconBox}>
                    <FolderOpen size={26} color={OBSIDIAN.emerald} />
                  </View>
                  <Text style={styles.emptyTitle}>No folders yet</Text>
                  <Text style={styles.emptySub}>
                    Organize work expenses, medical bills, or gadget warranties into dedicated folders.
                  </Text>
                  {!showCreateFolder && (
                    <Pressable
                      onPress={() => setShowCreateFolder(true)}
                      style={styles.primaryCta}
                    >
                      <Plus size={16} color="#042F1E" strokeWidth={2.6} />
                      <Text style={styles.primaryCtaText}>Create First Folder</Text>
                    </Pressable>
                  )}
                </Animated.View>
              ) : (
                <View style={styles.folderList}>
                  {folders.map((folder, idx) => {
                    const accent = folder.color || OBSIDIAN.emerald;
                    return (
                      <Animated.View
                        key={folder.id}
                        entering={FadeInUp.delay(Math.min(idx * 50, 300))
                          .duration(420)
                          .springify()}
                        style={styles.folderCard}
                      >
                        <View
                          style={[styles.folderLeftBar, { backgroundColor: accent }]}
                        />
                        <View
                          style={[
                            styles.folderEmojiBox,
                            {
                              backgroundColor: `${accent}1F`,
                              borderColor: `${accent}44`,
                            },
                          ]}
                        >
                          <Text style={styles.folderEmoji}>{folder.emoji || '📁'}</Text>
                        </View>

                        <View style={styles.folderInfo}>
                          <Text style={styles.folderName} numberOfLines={1}>
                            {folder.name}
                          </Text>
                          <Text style={styles.folderCount}>
                            {folder.receipt_count}{' '}
                            {folder.receipt_count === 1 ? 'receipt' : 'receipts'}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() =>
                            setDeleteTarget({ type: 'folder', item: folder })
                          }
                          hitSlop={8}
                          style={styles.deleteIconBtn}
                        >
                          <Trash2 size={16} color={OBSIDIAN.rose} />
                        </Pressable>
                      </Animated.View>
                    );
                  })}
                </View>
              )}

              {/* Create Folder Card */}
              {showCreateFolder ? (
                <Animated.View
                  entering={FadeInUp.duration(350).springify()}
                  style={styles.createCard}
                >
                  <View style={styles.createHeaderRow}>
                    <Text style={styles.createTitle}>New Folder</Text>
                    <Pressable
                      onPress={() => setShowCreateFolder(false)}
                      hitSlop={8}
                    >
                      <X size={18} color={OBSIDIAN.textSecondary} />
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>Folder Name</Text>
                  <View
                    style={[
                      styles.inputBox,
                      folderInputFocused && {
                        borderColor: OBSIDIAN.borderFocus,
                        backgroundColor: '#1B1B22',
                      },
                    ]}
                  >
                    <TextInput
                      value={newFolderName}
                      onChangeText={setNewFolderName}
                      onFocus={() => setFolderInputFocused(true)}
                      onBlur={() => setFolderInputFocused(false)}
                      placeholder="e.g. Tech & Warranties"
                      placeholderTextColor={OBSIDIAN.textMuted}
                      selectionColor={OBSIDIAN.emerald}
                      style={[
                        styles.inputText,
                        Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                      ]}
                    />
                  </View>

                  <Text style={styles.pickerLabel}>ICON</Text>
                  <View style={styles.optionRow}>
                    {EMOJI_OPTIONS.map((emoji) => {
                      const selected = newFolderEmoji === emoji;
                      return (
                        <Pressable
                          key={emoji}
                          onPress={() => setNewFolderEmoji(emoji)}
                          style={[
                            styles.emojiOption,
                            selected && {
                              backgroundColor: OBSIDIAN.emeraldBg,
                              borderColor: OBSIDIAN.emeraldBorder,
                            },
                          ]}
                        >
                          <Text style={styles.emojiOptionText}>{emoji}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.pickerLabel}>ACCENT COLOR</Text>
                  <View style={styles.optionRow}>
                    {COLOR_OPTIONS.map((color) => {
                      const selected = newFolderColor === color;
                      return (
                        <Pressable
                          key={color}
                          onPress={() => setNewFolderColor(color)}
                          style={[
                            styles.colorDot,
                            { backgroundColor: color },
                            selected && styles.colorDotSelected,
                          ]}
                        >
                          {selected && (
                            <Check size={14} color="#09090B" strokeWidth={3} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => setShowCreateFolder(false)}
                      style={styles.cancelFormBtn}
                    >
                      <Text style={styles.cancelFormText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      onPress={handleCreateFolder}
                      style={[
                        styles.submitFormBtn,
                        (!newFolderName.trim() || isCreatingFolder) && {
                          opacity: 0.55,
                        },
                      ]}
                    >
                      {isCreatingFolder ? (
                        <ActivityIndicator size="small" color="#042F1E" />
                      ) : (
                        <Text style={styles.submitFormText}>Create Folder</Text>
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              ) : (
                folders &&
                folders.length > 0 && (
                  <Pressable
                    onPress={() => setShowCreateFolder(true)}
                    style={styles.dashedAddBtn}
                  >
                    <Plus size={17} color={OBSIDIAN.emerald} strokeWidth={2.5} />
                    <Text style={styles.dashedAddText}>New Folder</Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {/* ==================== TAGS TAB ==================== */}
          {!isFoldersTab && (
            <View>
              {tagsLoading ? (
                <ObsidianListSkeleton />
              ) : !tags || tags.length === 0 ? (
                <Animated.View
                  entering={FadeInUp.duration(400).springify()}
                  style={styles.emptyCard}
                >
                  <View
                    style={[
                      styles.emptyIconBox,
                      {
                        backgroundColor: OBSIDIAN.indigoBg,
                        borderColor: OBSIDIAN.indigoBorder,
                      },
                    ]}
                  >
                    <TagIcon size={26} color={OBSIDIAN.indigo} />
                  </View>
                  <Text style={styles.emptyTitle}>No tags yet</Text>
                  <Text style={styles.emptySub}>
                    Create custom tags like #tax-deductible or #reimburse to filter receipts fast.
                  </Text>
                  {!showCreateTag && (
                    <Pressable
                      onPress={() => setShowCreateTag(true)}
                      style={[
                        styles.primaryCta,
                        { backgroundColor: OBSIDIAN.indigo },
                      ]}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                      <Text style={[styles.primaryCtaText, { color: '#FFFFFF' }]}>
                        Create First Tag
                      </Text>
                    </Pressable>
                  )}
                </Animated.View>
              ) : (
                <Animated.View
                  entering={FadeInUp.duration(400).springify()}
                  style={styles.tagGrid}
                >
                  {tags.map((tag) => (
                    <View key={tag.id} style={styles.tagPillCard}>
                      <Hash size={13} color={OBSIDIAN.indigo} />
                      <Text style={styles.tagName}>{tag.name}</Text>
                      <View style={styles.tagCountBadge}>
                        <Text style={styles.tagCountText}>{tag.receipt_count}</Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setDeleteTarget({ type: 'tag', item: tag })
                        }
                        hitSlop={8}
                        style={styles.tagRemoveBtn}
                      >
                        <X size={13} color={OBSIDIAN.rose} strokeWidth={2.5} />
                      </Pressable>
                    </View>
                  ))}
                </Animated.View>
              )}

              {/* Create Tag Card */}
              {showCreateTag ? (
                <Animated.View
                  entering={FadeInUp.duration(350).springify()}
                  style={styles.createCard}
                >
                  <View style={styles.createHeaderRow}>
                    <Text style={styles.createTitle}>New Tag</Text>
                    <Pressable
                      onPress={() => setShowCreateTag(false)}
                      hitSlop={8}
                    >
                      <X size={18} color={OBSIDIAN.textSecondary} />
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>Tag Name</Text>
                  <View
                    style={[
                      styles.inputBox,
                      tagInputFocused && {
                        borderColor: OBSIDIAN.indigo,
                        backgroundColor: '#1B1B22',
                      },
                    ]}
                  >
                    <Hash size={16} color={OBSIDIAN.indigo} style={{ marginRight: 8 }} />
                    <TextInput
                      value={newTagName}
                      onChangeText={setNewTagName}
                      onFocus={() => setTagInputFocused(true)}
                      onBlur={() => setTagInputFocused(false)}
                      placeholder="e.g. tax-deductible"
                      placeholderTextColor={OBSIDIAN.textMuted}
                      autoCapitalize="none"
                      selectionColor={OBSIDIAN.indigo}
                      style={[
                        styles.inputText,
                        Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                      ]}
                    />
                  </View>

                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => setShowCreateTag(false)}
                      style={styles.cancelFormBtn}
                    >
                      <Text style={styles.cancelFormText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      disabled={isCreatingTag || !newTagName.trim()}
                      onPress={handleCreateTag}
                      style={[
                        styles.submitFormBtn,
                        { backgroundColor: OBSIDIAN.indigo },
                        (!newTagName.trim() || isCreatingTag) && {
                          opacity: 0.55,
                        },
                      ]}
                    >
                      {isCreatingTag ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[styles.submitFormText, { color: '#FFFFFF' }]}
                        >
                          Create Tag
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </Animated.View>
              ) : (
                tags &&
                tags.length > 0 && (
                  <Pressable
                    onPress={() => setShowCreateTag(true)}
                    style={[
                      styles.dashedAddBtn,
                      { borderColor: OBSIDIAN.indigoBorder },
                    ]}
                  >
                    <Plus size={17} color={OBSIDIAN.indigo} strokeWidth={2.5} />
                    <Text
                      style={[styles.dashedAddText, { color: OBSIDIAN.indigo }]}
                    >
                      New Tag
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={ZoomIn.duration(220).springify()}
            style={styles.modalCard}
          >
            <View style={styles.modalIconBox}>
              <AlertTriangle size={26} color={OBSIDIAN.rose} />
            </View>

            <Text style={styles.modalTitle}>
              {deleteTarget?.type === 'folder'
                ? `Delete "${deleteTarget.item.name}"?`
                : `Delete "#${deleteTarget?.item.name}"?`}
            </Text>
            <Text style={styles.modalMessage}>
              {deleteTarget?.type === 'folder'
                ? 'This folder will be removed, but all receipts inside it will remain safely in your vault.'
                : 'This tag will be removed from all associated receipts.'}
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={isDeleting}
                onPress={() => setDeleteTarget(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={isDeleting}
                onPress={confirmDelete}
                style={styles.modalConfirmBtn}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Delete</Text>
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
  /* Segmented Control */
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    marginBottom: 20,
    height: 48,
  },
  segmentIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 1,
  },
  segmentLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  miniCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  miniCountText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  /* Folders List */
  folderList: {
    gap: 10,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    overflow: 'hidden',
  },
  folderLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  folderEmojiBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  folderEmoji: {
    fontSize: 22,
  },
  folderInfo: {
    flex: 1,
    paddingRight: 8,
  },
  folderName: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  folderCount: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  deleteIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Tags Grid */
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.indigoBorder,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 5,
  },
  tagName: {
    color: OBSIDIAN.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  tagCountBadge: {
    backgroundColor: OBSIDIAN.indigoBg,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    marginLeft: 2,
  },
  tagCountText: {
    color: OBSIDIAN.indigo,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tagRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: OBSIDIAN.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  /* Create Form Card */
  createCard: {
    marginTop: 16,
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  createHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  createTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  fieldLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputBox: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.inputBg,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  inputText: {
    flex: 1,
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '500',
  },
  pickerLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 8,
    marginLeft: 2,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  emojiOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: OBSIDIAN.inputBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionText: {
    fontSize: 20,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.08 }],
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelFormBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFormText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  submitFormBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: OBSIDIAN.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFormText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  /* Dashed Add Button */
  dashedAddBtn: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: OBSIDIAN.emeraldBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dashedAddText: {
    color: OBSIDIAN.emerald,
    fontSize: 14,
    fontWeight: '700',
  },
  /* Empty & Skeleton */
  emptyCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 20,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: OBSIDIAN.emerald,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 13,
  },
  primaryCtaText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  skeletonStack: {
    gap: 10,
  },
  skeletonRow: {
    height: 72,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
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