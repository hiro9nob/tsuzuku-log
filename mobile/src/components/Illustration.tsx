import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import { useTheme } from '@/theme';

// イラスト（docs/illustrations/ の元画像を scripts/illustration.py で整えたもの）。ライト用とダーク用の2枚
const SOURCES = {
  welcome: { light: require('../../assets/illustrations/welcome.png'), dark: require('../../assets/illustrations/welcome-dark.png') },
  rest: { light: require('../../assets/illustrations/rest.png'), dark: require('../../assets/illustrations/rest-dark.png') },
  milestone: { light: require('../../assets/illustrations/milestone.png'), dark: require('../../assets/illustrations/milestone-dark.png') },
} satisfies Record<string, { light: ImageSourcePropType; dark: ImageSourcePropType }>;

/** 飾りのイラスト（読み上げでは飛ばす） */
export function Illustration({ name, height }: { name: keyof typeof SOURCES; height: number }) {
  const theme = useTheme();
  const source = theme.isDark ? SOURCES[name].dark : SOURCES[name].light;
  const { width: w, height: h } = Image.resolveAssetSource(source);
  return (
    <Image
      source={source}
      style={[styles.image, { height, width: (height * w) / h }]}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' },
});
