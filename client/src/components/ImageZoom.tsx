import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors } from '../theme';

interface ImageZoomProps {
  uri: string;
  thumbnailHeight?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImageZoom({ uri, thumbnailHeight = 300 }: ImageZoomProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsFullscreen(true)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri }}
          style={[styles.thumbnail, { height: thumbnailHeight }]}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <Modal
        visible={isFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenContainer}>
          <IconButton
            icon="close"
            iconColor={colors.white}
            size={28}
            style={styles.closeButton}
            onPress={() => setIsFullscreen(false)}
          />
          <Image
            source={{ uri }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: '100%',
    backgroundColor: '#F1F5F9',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
});
