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

  useEffect(() => {
    // まずネイティブスプラッシュ画面を非表示にする
    SplashScreen.hideAsync();

    // ランダムに画像を選択
    const randomIndex = Math.floor(Math.random() * splashImages.length);
    setSelectedImage(splashImages[randomIndex]);

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

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          source={selectedImage}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    width: width,
    height: height,
  },
});
