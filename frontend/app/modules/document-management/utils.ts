import { VALID_FILE_TYPES, FILE_ICONS } from './constants';
import type { IntegrationFile } from './hooks/useIntegration';

export const isValidFileType = (file: Blob) => {
  return VALID_FILE_TYPES[file.type as keyof typeof VALID_FILE_TYPES] || false;
};

export const isValidIntegrationFileType = (file: IntegrationFile) => {
  const mimeType = file.mimeType || file.type || '';
  return VALID_FILE_TYPES[mimeType as keyof typeof VALID_FILE_TYPES] || false;
};

export const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[extension as keyof typeof FILE_ICONS] || FILE_ICONS.default;
};

export const getFileIconByMimeType = (mimeType: string, fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';

  // Handle Google Docs special cases
  if (mimeType === 'application/vnd.google-apps.document') {
    return FILE_ICONS.docx;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return FILE_ICONS.xlsx;
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return FILE_ICONS.pptx;
  }

  // Handle media types
  if (mimeType.startsWith('video/') || extension === 'mp4' || extension === 'mov') {
    return FILE_ICONS.mp4;
  }
  if (mimeType.startsWith('audio/') || extension === 'mp3') {
    return FILE_ICONS.mp3;
  }
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(extension)) {
    return FILE_ICONS[extension as keyof typeof FILE_ICONS] || FILE_ICONS.jpg;
  }

  return FILE_ICONS[extension as keyof typeof FILE_ICONS] || FILE_ICONS.default;
};

export const formatFileSize = (size: number) => {
  return (size / 1000).toFixed(2);
};

export const formatDate = (dateString: string | number) => {
  if (typeof dateString === 'number') {
    return new Date(dateString * 1000).toISOString().slice(0, 19);
  }
  return dateString;
};