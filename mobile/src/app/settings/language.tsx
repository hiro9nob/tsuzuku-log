import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/SettingsRow';
import { LANGUAGES, type LanguagePreference } from '@/lib/i18n/languages';
import { useSettings } from '@/lib/settings';
import { spacing } from '@/theme';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const language = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const choose = (next: LanguagePreference) => set('language', next);

  return (
    <>
      <Stack.Screen options={{ title: t('settings.language') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection>
          <SettingsRow first label={t('settings.languageSystem')} checked={language === 'system'} onPress={() => choose('system')} />
        </SettingsSection>
        <SettingsSection>
          {LANGUAGES.map((l, i) => (
            <SettingsRow key={l.code} first={i === 0} label={l.nativeName} checked={language === l.code} onPress={() => choose(l.code)} />
          ))}
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l },
});
