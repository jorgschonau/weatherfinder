import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';

const OnboardingOverlay = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.welcome')}</Text>
          <Text style={[styles.subtitle, { color: theme.primary }]}>{t('onboarding.howItWorks')}</Text>
          
          <View style={styles.steps}>
            <View style={styles.step}>
              <Text style={[styles.stepNumber, { backgroundColor: theme.primary }]}>1</Text>
              <Text style={[styles.stepText, { color: theme.text }]}>{t('onboarding.step1')}</Text>
            </View>
            
            <View style={styles.step}>
              <Text style={[styles.stepNumber, { backgroundColor: theme.primary }]}>2</Text>
              <Text style={[styles.stepText, { color: theme.text }]}>{t('onboarding.step2')}</Text>
            </View>
            
            <View style={styles.step}>
              <Text style={[styles.stepNumber, { backgroundColor: theme.primary }]}>3</Text>
              <Text style={[styles.stepText, { color: theme.text }]}>{t('onboarding.step3')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { 
              backgroundColor: theme.primary,
              shadowColor: theme.primary
            }]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{t('onboarding.letsGo')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  steps: {
    width: '100%',
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  stepNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    lineHeight: 44,
    marginRight: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
});

export default OnboardingOverlay;

