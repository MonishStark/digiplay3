export const VALID_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
  'application/pdf': true,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
  'text/plain': true,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
  'application/msword': true,
  'application/vnd.ms-excel': true,
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'video/mp4': true,
  'audio/mpeg': true,
  'video/quicktime': true,
  'image/mov': true
};

export const FILE_ICONS = {
  pdf: { icon: 'bi-filetype-pdf', color: '#FF6347' },
  docx: { icon: 'bi-filetype-docx', color: '#1E90FF' },
  xlsx: { icon: 'bi-filetype-xlsx', color: '#32CD32' },
  txt: { icon: 'bi-filetype-txt', color: '#696969' },
  doc: { icon: 'bi-filetype-doc', color: '#1E90FF' },
  xls: { icon: 'bi-filetype-xls', color: '#32CD32' },
  pptx: { icon: 'bi-filetype-pptx', color: '#FF8C00' },
  html: { icon: 'bi-filetype-html', color: '#FF4500' },
  mp4: { icon: 'bi-filetype-mp4', color: '#000000' },
  jpeg: { icon: 'bi-filetype-jpg', color: '#8A2BE2' },
  jpg: { icon: 'bi-filetype-jpg', color: '#8A2BE2' },
  png: { icon: 'bi-filetype-png', color: '#FFD700' },
  mp3: { icon: 'bi-filetype-mp3', color: '#483D8B' },
  mov: { icon: 'bi-filetype-mov', color: '#8B0000' },
  default: { icon: 'bi-file-earmark', color: '#A9A9A9' }
};

export const INTEGRATION_CONFIGS = {
  googleDrive: {
    name: 'GoogleDrive',
    integrationId: 'integration_1',
    icon: 'fab fa-google-drive',
    size: '22px'
  },
  dropbox: {
    name: 'Dropbox',
    integrationId: 'integration_2',
    icon: 'fab fa-dropbox',
    size: '20px'
  },
  oneDrive: {
    name: 'OneDrive',
    integrationId: 'integration_3',
    icon: 'bi bi-cloudy-fill',
    size: '20px'
  },
  slack: {
    name: 'Slack',
    integrationId: 'integration_4',
    icon: 'bi bi-slack',
    size: '20px'
  },
  wordpress: {
    name: 'WordPress',
    integrationId: 'integration_5',
    icon: 'bi bi-wordpress',
    size: '20px'
  }
};