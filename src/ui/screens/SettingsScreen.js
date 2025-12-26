import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';

const LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

const THEMES = [
  { id: 'standard', name: 'Standard', icon: '🌱' },
  { id: 'light', name: 'Hell', icon: '☀️' },
  { id: 'dark', name: 'Dunkel', icon: '🌙' },
  { id: 'blue', name: 'Blau', icon: '🌊' },
  { id: 'amber', name: 'Gold', icon: '✨' },
];

const SettingsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { theme, currentTheme, changeTheme } = useTheme();

  const handleSelectLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleSelectTheme = (themeId) => {
    changeTheme(themeId);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: theme.background, color: theme.text }]}>
          {t('settings.theme')}
        </Text>
        
        {THEMES.map((themeOption) => (
          <TouchableOpacity
            key={themeOption.id}
            style={[
              styles.settingItem,
              { backgroundColor: theme.surface, borderBottomColor: theme.background },
              currentTheme === themeOption.id && { backgroundColor: theme.background }
            ]}
            onPress={() => handleSelectTheme(themeOption.id)}
          >
            <Text style={styles.settingItemFlag}>{themeOption.icon}</Text>
            <Text style={[
              styles.settingItemText,
              { color: theme.textSecondary },
              currentTheme === themeOption.id && { fontWeight: '700', color: theme.primary }
            ]}>
              {themeOption.name}
            </Text>
            {currentTheme === themeOption.id && (
              <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: theme.background, color: theme.text }]}>
          {t('settings.language')}
        </Text>
        
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.settingItem,
              { backgroundColor: theme.surface, borderBottomColor: theme.background },
              i18n.language === lang.code && { backgroundColor: theme.background }
            ]}
            onPress={() => handleSelectLanguage(lang.code)}
          >
            <Text style={styles.settingItemFlag}>{lang.flag}</Text>
            <Text style={[
              styles.settingItemText,
              { color: theme.textSecondary },
              i18n.language === lang.code && { fontWeight: '700', color: theme.primary }
            ]}>
              {lang.name}
            </Text>
            {i18n.language === lang.code && (
              <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Platzhalter für zukünftige Settings */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: theme.background, color: theme.text }]}>
          {t('settings.account')}
        </Text>
        <View style={styles.placeholderItem}>
          <Text style={[styles.placeholderText, { color: theme.textTertiary }]}>
            {t('settings.comingSoon')}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: theme.background, color: theme.text }]}>
          {t('settings.preferences')}
        </Text>
        <View style={styles.placeholderItem}>
          <Text style={[styles.placeholderText, { color: theme.textTertiary }]}>
            {t('settings.comingSoon')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 72,
    borderBottomWidth: 1,
  },
  settingItemFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  settingItemText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  placeholderItem: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontStyle: 'italic',
  },
});

export default SettingsScreen;

