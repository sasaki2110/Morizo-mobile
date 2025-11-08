import { StyleSheet } from 'react-native';

/**
 * OCRモーダル関連のスタイル定義
 * 
 * 責任: InventoryOCRModalとその関連コンポーネントのスタイル定義を集約
 */
export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  scrollView: {
    maxHeight: 500,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  imageButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  imageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  analyzeButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  resultBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultBoxSuccess: {
    backgroundColor: '#d1fae5',
  },
  resultBoxError: {
    backgroundColor: '#fee2e2',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  errorList: {
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 2,
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  registerButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  closeButtonStyle: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

