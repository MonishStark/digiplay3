import { useState, useEffect } from 'react';
import { createAuthenticationSession, googleDriveFiles, oneDriveFiles, dropboxFiles, slackDriveFiles, wordpressFiles } from '../api';
import { isValidIntegrationFileType } from '../utils';

export interface IntegrationFile {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  createdTime?: string;
  downloadUrl?: string;
  source_url?: string;
  url_private_download?: string;
  "@microsoft.graph.downloadUrl"?: string;
  extra?: { url: string };
  media_details?: { sizes?: { full?: { file: string } }; filesize: number };
  editable?: boolean;
  client_modified?: string;
}

export interface IntegrationConfig {
  name: string;
  integrationId: string;
  apiFunction: (userId: string) => Promise<any>;
  downloadFunction?: (file: IntegrationFile) => Promise<Blob>;
  fileValidator?: (file: IntegrationFile) => boolean;
  getFileName: (file: IntegrationFile) => string;
  getFileSize: (file: IntegrationFile) => number;
  getCreatedTime: (file: IntegrationFile) => string;
}

// Specific configurations for each integration
const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  googleDrive: {
    name: 'GoogleDrive',
    integrationId: 'integration_1',
    apiFunction: googleDriveFiles,
    fileValidator: isValidIntegrationFileType,
    getFileName: (file) => file.name,
    getFileSize: (file) => file.size,
    getCreatedTime: (file) => file.createdTime || ''
  },
  dropbox: {
    name: 'Dropbox',
    integrationId: 'integration_2',
    apiFunction: dropboxFiles,
    // fileValidator: isValidIntegrationFileType,
    getFileName: (file) => file.name,
    getFileSize: (file) => file.size,
    getCreatedTime: (file) => file.client_modified || ''
  },
  oneDrive: {
    name: 'OneDrive',
    integrationId: 'integration_3',
    apiFunction: oneDriveFiles,
    fileValidator: (file) => isValidIntegrationFileType(file),
    getFileName: (file) => file.name,
    getFileSize: (file) => file.size,
    getCreatedTime: (file) => ''
  },
  slack: {
    name: 'Slack',
    integrationId: 'integration_4',
    apiFunction: slackDriveFiles,
    fileValidator: (file) => file.editable !== false,
    getFileName: (file) => file.name,
    getFileSize: (file) => file.size,
    getCreatedTime: (file) => file.createdTime || ''
  },
  wordpress: {
    name: 'WordPress',
    integrationId: 'integration_5',
    apiFunction: wordpressFiles,
    getFileName: (file) => file.media_details?.sizes?.full?.file || file.extra?.url.split('/').pop() || file.name,
    getFileSize: (file) => file.size,
    getCreatedTime: (file) => file.createdTime || ''
  }
};

export const useIntegration = (integrationKey: string, currentUser: any, CloudIntegration: any[]) => {
  const config = INTEGRATION_CONFIGS[integrationKey];
  const [files, setFiles] = useState<IntegrationFile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<IntegrationFile[]>([]);
  const [loading, setLoading] = useState(false);

  const isActive = CloudIntegration?.find((service: any) => service.name === config.name)?.active;

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await config.apiFunction(currentUser?.id);

      if (response.data.login || response.data.success) {
        let fileList: IntegrationFile[] = [];

        if (integrationKey === 'slack') {
          fileList = response.data.resources?.flatMap((channel: any) => channel.files || []) || [];
        } else {
          fileList = response.data.resources?.[0]?.files || response.data.files || [];
        }

        setFiles(fileList);
        setModalOpen(true);
      } else {
        await handleAuthentication();
      }
      setLoading(false);
    } catch (err: any) {
      const res = err.response?.data;
      if (res?.error === "conflict" && res?.message === "Integration login required") {
        await handleAuthentication();
      }
      setLoading(false);
    }
  };

  const handleAuthentication = async () => {
    try {
      const session = await createAuthenticationSession();
      const sessionToken = session.data?.sessionToken;
      if (!sessionToken) return;

      const width = 600;
      const height = 600;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      let authUrl = `${import.meta.env.VITE_APP_BACKEND_URL}/integrations/auth/${config.integrationId}?platform=web&st=${sessionToken}`;

      if (integrationKey === 'oneDrive') {
        authUrl = `${import.meta.env.VITE_APP_BACKEND_URL}/integrations/auth/${config.integrationId}?platform=web&st=${sessionToken}`;
      }
      window.location.href =authUrl

      if (integrationKey === 'oneDrive') {
        window.addEventListener('message', (event: any) => {
          if (event.origin === import.meta.env.VITE_APP_BACKEND_ORIGIN_URL) {
            if (event.data.statusRes) {
              handleLogin();
            }
          }
        });
      }

      const pollTimer = window.setInterval(() => {
        if (popup?.closed) {
          window.clearInterval(pollTimer);
        }
      }, 1000);
    } catch (error) {
      console.error(`Authentication error for ${config.name}:`, error);
    }
  };

  const handleCheckboxChange = (file: IntegrationFile) => {
    const isSelected = selectedFiles.some(selected => selected.id === file.id);
    if (isSelected) {
      setSelectedFiles(selectedFiles.filter(selected => selected.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleSelectFiles = () => {
    setModalOpen(false);
    setLoading(true);
    if (selectedFiles.length > 0) {
      const filesData = selectedFiles.map(file => ({
        fileId: file.id,
        name: config.getFileName(file),
        size: config.getFileSize(file),
        integrationId: config.integrationId,
        source: config.name.toLowerCase()
      }));
      return filesData;
    }
    setLoading(false);
    return [];
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setModalOpen(false);
  };

  const handleClear = () => {
    setFiles([]);
    setModalOpen(false);
  };

  useEffect(() => {
    const handleMessage = (event: any) => {
      if (event.origin === import.meta.env.VITE_APP_BACKEND_ORIGIN_URL) {
        if (event.data.statusRes) {
          if (event.data.provider === integrationKey || event.data.provider === config.name.toLowerCase()) {
            handleLogin();
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    files,
    modalOpen,
    selectedFiles,
    loading,
    isActive,
    handleLogin,
    handleCheckboxChange,
    handleSelectFiles,
    handleCancel,
    handleClear,
    setModalOpen,
    config
  };
};