# スプラッシュ画像ファイル

このディレクトリに以下の画像ファイルを配置してください：

- `Morizo_Splash_01.png`
- `Morizo_Splash_02.png`
- `Morizo_Splash_03.png`

## 画像の要件

- **形式**: PNG
- **推奨サイズ**: 1080x1920px (9:16の縦長)
- **ファイルサイズ**: 1MB以下を推奨

## 配置後の手順

1. 画像ファイルをこのディレクトリに配置
2. `components/SplashScreen.tsx`の以下の部分を更新：

```typescript
// 現在のプレースホルダー設定をコメントアウト
// const splashImages = [
//   require('../assets/icon.png'), // プレースホルダー
//   require('../assets/icon.png'), // プレースホルダー
//   require('../assets/icon.png'), // プレースホルダー
// ];

// 実際の画像ファイルの設定を有効化
const splashImages = [
  require('../assets/splash/Morizo_Splash_01.png'),
  require('../assets/splash/Morizo_Splash_02.png'),
  require('../assets/splash/Morizo_Splash_03.png'),
];
```

これで、アプリ起動時に3枚の画像からランダムに1枚が選択されてスプラッシュ画面に表示されます。
