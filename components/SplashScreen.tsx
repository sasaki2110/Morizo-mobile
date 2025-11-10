import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// スプラッシュ画面の自動非表示を防ぐ
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

// スプラッシュ画像のパス
const splashImages = [
  require('../assets/splash/Morizo_Splash_01.png'),
  require('../assets/splash/Morizo_Splash_02.png'),
  require('../assets/splash/Morizo_Splash_03.png'),
];

interface SplashScreenProps {
  onFinish: () => void;
}

export default function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isVisible, setIsVisible] = useState(true);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    // まずネイティブスプラッシュ画面を非表示にする
    SplashScreen.hideAsync();

    // ランダムに画像を選択
    const randomIndex = Math.floor(Math.random() * splashImages.length);
    const image = splashImages[randomIndex];
    setSelectedImage(image);
    
    // 画像が正方形の場合、アスペクト比は1
    // 実際の画像サイズが分かっている場合はここで設定
    // 正方形なのでアスペクト比は1
    setImageAspectRatio(1);

    // プラットフォームに応じてタイミングを調整
    const delay = Platform.OS === 'web' ? 100 : 500; // 実機では少し長めに待機
    const displayTime = Platform.OS === 'web' ? 2500 : 3500; // 実機では長めに表示

    // 少し遅延してからフェードインアニメーション開始
    const fadeInTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, delay);

    // スプラッシュ画面を表示する時間
    const hideTimer = setTimeout(() => {
      // フェードアウトアニメーション
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        onFinish();
      });
    }, displayTime);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(hideTimer);
    };
  }, [onFinish, fadeAnim]);

  if (!selectedImage || !isVisible) {
    return null;
  }

  // 画像サイズの計算（横方向に合わせる）
  const imageWidth = width;
  const imageHeight = imageAspectRatio ? width / imageAspectRatio : height;

  // 画像サイズが取得できていない場合は表示しない
  if (imageAspectRatio === null) {
    return null;
  }

  // 画像がラウンドされている場合のborderRadiusを計算
  // 控えめな角丸にするため、画像サイズの15%程度を使用
  const borderRadius = Math.min(imageWidth, imageHeight) * 0.15;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <View
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: borderRadius,
            overflow: 'hidden',
          }}
        >
          <Image
            source={selectedImage}
            style={[
              styles.image,
              {
                width: imageWidth,
                height: imageHeight,
              }
            ]}
            resizeMode="cover"
            onLoad={(e) => {
              // 画像ロード時に実際のサイズを取得してアスペクト比を更新
              const source = e.nativeEvent?.source;
              if (source?.width && source?.height) {
                setImageAspectRatio(source.width / source.height);
              }
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2fe', // 薄い水色の背景
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999, // 最前面に表示
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  image: {
    // サイズは動的に計算される
  },
});
