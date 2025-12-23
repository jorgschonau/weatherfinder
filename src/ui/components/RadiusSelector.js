import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';

const RADIUS_OPTIONS = [200, 400, 600, 1500, 3000];

const RadiusSelector = ({ selectedRadius, onRadiusChange }) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectRadius = (radius) => {
    onRadiusChange(radius);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('radius.title')}</Text>
      <TouchableOpacity
        style={styles.radiusButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.radiusButtonText}>
          {t('radius.inRadius', { radius: selectedRadius })}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('radius.title')}</Text>
            {RADIUS_OPTIONS.map((radius) => (
              <TouchableOpacity
                key={radius}
                style={styles.modalOption}
                onPress={() => handleSelectRadius(radius)}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedRadius === radius && styles.modalOptionTextSelected,
                  ]}
                >
                  {radius} km
                </Text>
                {selectedRadius === radius && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  arrow: {
    fontSize: 10,
    color: '#666',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: '#2E7D32',
  },
  checkmark: {
    fontSize: 18,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
});

export default RadiusSelector;


