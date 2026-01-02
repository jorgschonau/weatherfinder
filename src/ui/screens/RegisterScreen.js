import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordsDontMatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('auth.error'), t('auth.passwordTooShort'));
      return;
    }

    if (username.length < 3) {
      Alert.alert(t('auth.error'), t('auth.usernameTooShort'));
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      email,
      password,
      username,
      displayName || username
    );
    setLoading(false);

    if (error) {
      Alert.alert(
        t('auth.registrationFailed'),
        error.message || t('auth.tryAgain')
      );
    } else {
      Alert.alert(
        t('auth.success'),
        t('auth.accountCreated'),
        [{ text: 'OK' }]
      );
      // Navigation handled by AuthNavigator
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>☀️</Text>
          <Text style={styles.title}>SunNomad</Text>
          <Text style={styles.subtitle}>{t('auth.createAccount')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.username')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.usernamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.displayName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.displayNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              autoComplete="name"
              editable={!loading}
            />
            <Text style={styles.hint}>{t('auth.optional')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.email')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.password')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
            <Text style={styles.hint}>{t('auth.minSixChars')}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('auth.confirmPassword')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.signUp')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.replace('Main')}
            disabled={loading}
          >
            <Text style={styles.skipText}>{t('auth.continueWithoutAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
      paddingTop: 40,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    logo: {
      fontSize: 60,
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    form: {
      width: '100%',
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 6,
    },
    input: {
      backgroundColor: theme.cardBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: theme.text,
    },
    hint: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    footerText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginRight: 5,
    },
    linkText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    skipButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    skipText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
  });


