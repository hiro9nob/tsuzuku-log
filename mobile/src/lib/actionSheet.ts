import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type SheetOption = { label: string; onPress: () => void; destructive?: boolean };

/** iOS はアクションシート、Android はダイアログで選んでもらう */
export function showActionSheet(title: string, options: SheetOption[], cancelLabel: string): void {
  if (Platform.OS === 'ios') {
    const destructiveIndex = options.findIndex((o) => o.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.label), cancelLabel],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (i) => options[i]?.onPress(),
    );
    return;
  }
  Alert.alert(
    title,
    undefined,
    [...options.map((o) => ({ text: o.label, onPress: o.onPress, style: o.destructive ? ('destructive' as const) : ('default' as const) })), { text: cancelLabel, style: 'cancel' as const }],
    { cancelable: true },
  );
}
