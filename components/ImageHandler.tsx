/**
 * 画像表示コンポーネント
 * React Native環境向けに調整
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { RecipeUrl } from '../types/menu';
import { extractImageFromUrl } from '../lib/image-extractor';

interface ImageHandlerProps {
  urls: RecipeUrl[];
  title: string;
  onUrlClick?: (url: string) => void;
}

export default function ImageHandler({ urls, title, onUrlClick }: ImageHandlerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 画像を抽出（初回表示時に実行）
  useEffect(() => {
    const loadImage = async () => {
      if (urls.length === 0) {
        return;
      }

      try {
        setImageLoading(true);
        setImageError(false);
        
        // 最初のURLから画像を抽出
        const extractedImageUrl = await extractImageFromUrl(urls[0].url);
        
        if (extractedImageUrl) {
          setImageUrl(extractedImageUrl);
        } else {
          setImageError(true);
        }
      } catch (error) {
        console.warn('画像抽出に失敗:', error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();
  }, [urls]);

  const handleImageClick = () => {
    if (onUrlClick) {
      onUrlClick(urls[0].url);
    } else {
      // デフォルトの動作: LinkingでURLを開く
      const { Linking } = require('react-native');
      Linking.openURL(urls[0].url).catch((error: Error) => {
        console.error('URLを開けませんでした:', error);
      });
    }
  };

  return (
    <View style={styles.container}>
      {imageLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>画像を読み込み中...</Text>
        </View>
      ) : imageUrl && !imageError ? (
        <TouchableOpacity
          onPress={handleImageClick}
          style={styles.imageContainer}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleImageClick}
          style={styles.placeholderContainer}
          activeOpacity={0.8}
        >
          <View style={styles.placeholderContent}>
            <Text style={styles.placeholderEmoji}>📷</Text>
            <Text style={styles.placeholderText}>No Image Found</Text>
            <Text style={styles.placeholderSubtext}>タップしてレシピを見る</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 192,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  imageContainer: {
    height: 192,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    height: 192,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
