import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen({ navigation }) {
  const { user, profile, signOut, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleSignOut = () => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.confirmSignOut'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const styles = createStyles(theme);

  if (!isAuthenticated) {
    // User must be authenticated to view the profile.
    // If session expired, sign out to redirect to auth screens.
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.logo}>☀️</Text>
          <Text style={styles.notLoggedInTitle}>{t('auth.notLoggedIn')}</Text>
          <Text style={styles.notLoggedInText}>{t('auth.loginToAccessProfile')}</Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => signOut()}
          >
            <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.display_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{profile?.display_name}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
        {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.accountInfo')}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('auth.email')}</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>

        {profile?.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('profile.location')}</Text>
            <Text style={styles.infoValue}>{profile.location}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('profile.memberSince')}</Text>
          <Text style={styles.infoValue}>
            {new Date(profile?.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.actions')}</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Coming Soon', 'Edit profile feature coming soon!')}
        >
          <Text style={styles.actionButtonText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleSignOut}
        >
          <Text style={[styles.actionButtonText, styles.dangerText]}>
            {t('auth.signOut')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    logo: {
      fontSize: 80,
      marginBottom: 20,
    },
    notLoggedInTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
    },
    notLoggedInText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
    },
    header: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 40,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    displayName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    username: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    bio: {
      fontSize: 14,
      color: theme.text,
      textAlign: 'center',
      marginTop: 8,
    },
    section: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '600',
    },
    infoValue: {
      fontSize: 14,
      color: theme.text,
    },
    actionButton: {
      backgroundColor: theme.cardBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    dangerButton: {
      borderColor: '#EF4444',
    },
    dangerText: {
      color: '#EF4444',
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
      width: '100%',
      maxWidth: 300,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      width: '100%',
      maxWidth: 300,
    },
    secondaryButtonText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });


