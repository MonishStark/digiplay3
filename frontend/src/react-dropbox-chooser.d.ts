declare module 'react-dropbox-chooser' {
  import * as React from 'react';

  interface DropboxChooserProps {
    appKey: string;
    success: (files: any[]) => void;
    cancel?: () => void;
    multiselect?: boolean;
    extensions?: string[];
    linkType?: 'preview' | 'direct';
    children: React.ReactNode;
  }

  const DropboxChooser: React.FC<DropboxChooserProps>;

  export default DropboxChooser;
}