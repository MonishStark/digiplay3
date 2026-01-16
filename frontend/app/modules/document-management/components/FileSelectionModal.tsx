import { Modal } from 'react-bootstrap';
import { KTIcon } from '../../../../app/theme/helpers';
import { FormattedMessage } from 'react-intl';
import { getFileIconByMimeType, formatFileSize, formatDate } from '../utils';
import type { IntegrationFile } from '../hooks/useIntegration';

interface FileSelectionModalProps {
  show: boolean;
  files: IntegrationFile[];
  selectedFiles: IntegrationFile[];
  onHide: () => void;
  onClear: () => void;
  onCancel: () => void;
  onSelect: () => void;
  onCheckboxChange: (file: IntegrationFile) => void;
  getFileName: (file: IntegrationFile) => string;
  getFileSize: (file: IntegrationFile) => number;
  getCreatedTime: (file: IntegrationFile) => string;
  fileValidator?: (file: IntegrationFile) => boolean;
}

export const FileSelectionModal = ({
  show,
  files,
  selectedFiles,
  onHide,
  onClear,
  onCancel,
  onSelect,
  onCheckboxChange,
  getFileName,
  getFileSize,
  getCreatedTime,
  fileValidator
}: FileSelectionModalProps) => {
  const filteredFiles = fileValidator ? files.filter(fileValidator) : files;

  return (
    <Modal
      id='select_file_modal'
      tabIndex={-1}
      aria-hidden='true'
      dialogClassName='modal-dialog modal-dialog-centered mw-900px'
      show={show}
      onHide={onHide}
      backdrop={true}
    >
      <div className='modal-header'>
        <h2>Files</h2>
        <div className='btn btn-sm btn-icon btn-active-color-primary' onClick={onClear}>
          <KTIcon className='fs-1' iconName='cross' />
        </div>
      </div>

      <div className='modal-body py-lg-10 px-lg-10'>
        {filteredFiles.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th scope="col"><b>#</b></th>
                <th scope="col"><b>Filename</b></th>
                <th scope="col"><b>Size (kb)</b></th>
                <th scope="col"><b>Date</b></th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const fileName = getFileName(file);
                const iconData = getFileIconByMimeType(file.mimeType || '', fileName);

                return (
                  <tr key={file.id}>
                    <th scope="row">
                      <input
                        type="checkbox"
                        onChange={() => onCheckboxChange(file)}
                        checked={selectedFiles.includes(file)}
                        id={`file-checkbox-${file.id}`}
                      />
                    </th>
                    <td>
                      <label
                        htmlFor={`file-checkbox-${file.id}`}
                        style={{ marginLeft: '10px', cursor: 'pointer' }}
                      >
                        <i
                          style={{ fontSize: "2.2rem", color: iconData.color }}
                          className={`bi ${iconData.icon}`}
                        />
                        <span className='ms-2'>{fileName}</span>
                      </label>
                    </td>
                    <td>{formatFileSize(getFileSize(file))}</td>
                    <td>{formatDate(getCreatedTime(file))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="position-absolute" style={{ bottom: 5, right: 5 }}>
          <button className="btn btn-secondary me-2" onClick={onCancel}>
            <FormattedMessage id="BUTTON.CANCEL" />
          </button>
          <button
            className="btn btn-primary"
            onClick={onSelect}
            disabled={selectedFiles.length <= 0}
          >
            Select
          </button>
        </div>
      </div>
    </Modal>
  );
};