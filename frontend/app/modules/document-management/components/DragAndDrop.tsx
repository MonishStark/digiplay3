import { useState, useRef, useEffect } from 'react'
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFolderTreeForFile, getMaxFileUploads, createAuthenticationSession } from '../api';
import { KTIcon, toAbsoluteUrl } from '../../../../app/theme/helpers';
import { useAuth } from '../../auth';
import { CurrentUploadPath } from './CurrentUploadPath';
import { FormattedMessage } from 'react-intl';
import { File } from './File'
import { Modal } from 'react-bootstrap'
import { getUserCloudIntegration } from '../../auth/core/_requests';
import { IntegrationFile } from './IntegrationFile';
import { useIntegration } from '../hooks/useIntegration';
import { FileSelectionModal } from './FileSelectionModal';
import { IntegrationButton } from './IntegrationButton';
import { isValidFileType } from '../utils';

export const DragDropFile = () => {
  // Location and navigation
    let { auth, isBackFromPages, setIsBackFromPages, teamList, currentTeam, currentUser,setCurrentParent,setCurrentTeam,currentParent } = useAuth()

  const { state }: any = useLocation()
  const currentTeamId = state?.currentTeam || currentTeam
  currentParent = state?.currentParent || currentParent
  
  const navigate = useNavigate()

  // Auth context
  setCurrentParent(currentParent)
  setCurrentTeam(currentTeamId)
  // Local state
  const [folderTree, setFolderTree] = useState<any>([])
  const [dragActive, setDragActive] = useState(false);
  const [successResMessage, setSuccessResMessage] = useState<string>('')
  const [failureResMessage, setFailureResMessage] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean | string>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [maxFileUploads, setMaxFileUploads] = useState<number>(0)
  const [files, setFiles] = useState<any[]>([]);
  const [integrationFiles, setIntegrationFiles] = useState<any[]>([]);
  const [CloudIntegration, setCloudIntegration] = useState<any>(null)

  // Refs
  const inputRef = useRef<any>(null);

  // Get current team title
  let currentTeamTitle = '';
  teamList.forEach(team => {
    if (currentTeam === team.id) {
      currentTeamTitle = team.teamName
    }
  })

  // Integration hooks
  const googleDrive = useIntegration('googleDrive', currentUser, CloudIntegration);
  const dropbox = useIntegration('dropbox', currentUser, CloudIntegration);
  const oneDrive = useIntegration('oneDrive', currentUser, CloudIntegration);
  const slack = useIntegration('slack', currentUser, CloudIntegration);
  const wordpress = useIntegration('wordpress', currentUser, CloudIntegration);

  // Effects
  useEffect(() => {
    const fetchCloudIntegration = async () => {
      try {
        const res = await getUserCloudIntegration();
        const data = res.data.integrations;
        setCloudIntegration(data);
      } catch (error) {
        console.error('Failed to fetch cloud integration:', error);
      }
    };

    fetchCloudIntegration();
  }, []);

  useEffect(() => {
    if (auth?.user?.role == 3) {
      navigate('/error/404')
    } else {
      getFolderTreeForFile(currentParent, currentTeamId)
        .then((response) => {
          setFolderTree(response.data.predecessors)
          setLoading(false)
        })
        .catch((err) => {
          console.log(err)
          setLoading(false)
        })
    }
  }, [])

  useEffect(() => {
    if (isBackFromPages) {
      navigate(`${localStorage.getItem('current-url')}`, { state: localStorage.getItem('current-parent') })
    }
  }, [isBackFromPages])

  useEffect(() => {
    getMaxFileUploads().then(res => {
      setMaxFileUploads(Number(res.data.maxUploads))
    })
  })

  // Alert management
  useEffect(() => {
    if (successResMessage) {
      const timer = setTimeout(() => {
        setChecked(false)
        setTimeout(() => {
          setSuccessResMessage("");
        }, 200);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successResMessage])

  useEffect(() => {
    if (failureResMessage) {
      const timer = setTimeout(() => {
        setChecked(false)
        setTimeout(() => {
          setFailureResMessage("");
        }, 200);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [failureResMessage])

  // Drag and drop handlers
  const handleDrag = function (e: any) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const resetAlerts = () => {
    const success: HTMLElement = document.getElementById("upload-success")!
    const fail: HTMLElement = document.getElementById("upload-fail")!
    if (fail && fail.style) {
      fail.style.display = "none"
    }
    if (success && success.style) {
      success.style.display = "none"
    }
  }

  const handleDrop = async function (e: any) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    resetAlerts()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (e.dataTransfer.files.length <= maxFileUploads) {
        if (isValidFileType(e.dataTransfer.files[0])) {
          setFiles((prevFiles) => [
            ...prevFiles,
            ...Array.from(e.dataTransfer.files).map((file) => ({
              file,
              source: 'Upload',
            })),
          ]);
        } else {
          setUploading(false)
          setFailureResMessage("Invalid file format, only supported format are .doc, .docx, .xlsx, .pdf, .pptx, .txt, mp3, mp4, jpg, jpeg, png and mov")
          setChecked(true)
        }

      } else {
        setUploading(false)
        setFailureResMessage(
          `Cannot upload More than ${maxFileUploads} files at a time`
        )
        setChecked(true)
      }
    }
  };

  const handleChange = async function (e: any) {
    e.preventDefault();
    setUploading("")
    if (e.target.files && e.target.files[0]) {
      if (maxFileUploads >= (e.target.files.length)) {
        if (isValidFileType(e.target.files[0])) {
          setFiles((prevFiles) => [
            ...prevFiles,
            ...Array.from(e.target.files).map((file) => ({
              file,
              source: 'Upload',
            })),
          ]);
        } else {
          setUploading(false)
          setFailureResMessage("Invalid file format, only supported format are .doc, .docx, .xlsx, .pdf, .pptx, .txt, mp3, mp4, jpg, jpeg, png and mov")
          setChecked(true)
        }
      } else {
        setUploading(false)
        setFailureResMessage(
          `Cannot upload More than ${maxFileUploads} files at a time`
        )
        setChecked(true)
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  const handleDelete = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleGoToFiles = () => {
    navigate("/files");
    setIsBackFromPages(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDrag(e);
    }
  };

  // Integration file selection handlers
  const handleIntegrationFileSelect = (integrationKey: string, selectedData: any[]) => {
    if (selectedData.length > 0) {
      setIntegrationFiles(selectedData);
    }
  };

  return (
    <>
      {!loading &&
        <>
          <div className="d-flex flex-column w-100 px-4">
            <div className="d-flex flex-column w-100">
              <div className='response-box'>
                <div className='directory-path'>
                  <CurrentUploadPath folderTree={folderTree} currentTeamTitle={currentTeamTitle} />
                </div>
              </div>
              {uploading ? (
                <>
                  <div className='d-flex justify-content-center' style={{ marginTop: '50px' }}>
                    <div className='w-50px h-50px'>
                      <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onDragEnter={handleDrag}
                    onKeyDown={handleKeyDown}
                  >
                    <form id="form-file-upload" className="mx-auto mt-5" onSubmit={handleSubmit}>
                      <input ref={inputRef} type="file" id="input-files-upload" multiple={true}
                        onChange={handleChange}
                        style={{ display: 'none' }}
                      />
                      <label id="label-file-upload" htmlFor="input-file-upload" className={dragActive ? "drag-active" : ""}>
                        <div>
                          <span className='fs-2 fw-bold'>
                            <FormattedMessage id='DOCUMENTS.DRAG_AND_DROP.PHRASE1' />
                          </span>
                          <p> (Max {maxFileUploads})</p>
                          <br />
                          <button className="btn btn-sm btn-flex fw-bold btn-primary mt-5" onClick={onButtonClick}><FormattedMessage id='DOCUMENTS.DRAG_AND_DROP.PHRASE2' /></button>
                          <div className='mt-3'>
                            OR
                          </div>
                          <div className="d-flex ">
                            <IntegrationButton
                              integration="googleDrive"
                              loading={googleDrive.loading}
                              disabled={!googleDrive.isActive}
                              onClick={googleDrive.handleLogin}
                              title={`${googleDrive.isActive ? 'Google Drive' : 'Contact Admin to Enable (Google Drive)'}`}
                            />
                            <IntegrationButton
                              integration="dropbox"
                              loading={dropbox.loading}
                              disabled={!dropbox.isActive}
                              onClick={dropbox.handleLogin}
                              title={`${dropbox.isActive ? 'Dropbox' : 'Contact Admin to Enable (Dropbox)'}`}
                            />
                            <IntegrationButton
                              integration="oneDrive"
                              loading={oneDrive.loading}
                              disabled={!oneDrive.isActive}
                              onClick={oneDrive.handleLogin}
                              title={`${oneDrive.isActive ? 'OneDrive' : 'Contact Admin to Enable (OneDrive)'}`}
                            />
                            <IntegrationButton
                              integration="slack"
                              loading={slack.loading}
                              disabled={!slack.isActive}
                              onClick={slack.handleLogin}
                              title={`${slack.isActive ? 'Slack' : 'Contact Admin to Enable (Slack)'}`}
                            />
                            <IntegrationButton
                              integration="wordpress"
                              loading={wordpress.loading}
                              disabled={!wordpress.isActive}
                              onClick={wordpress.handleLogin}
                              title={`${wordpress.isActive ? 'WordPress' : 'Contact Admin to Enable (WordPress)'}`}
                            />
                          </div>
                        </div>
                      </label>
                      {dragActive && <div id="drag-file-element" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}></div>}
                    </form>
                  </div>
                  {files[0] && (
                    <div className={`card h-50 p-4 my-9`}>
                      <div className=' d-flex justify-content-between'>
                        <h6><FormattedMessage id='DOCUMENTS.UPLOADING'/>{"  "}{files.length}{"  "}<FormattedMessage id='NOTIFICATIONS.FILES'/>:</h6>
                      </div>

                      {files.map((fileData: any, index: number) => (
                        <File
                          key={index}
                          index={index}
                          file={fileData.file}
                          source={"Local uploads"}
                          currentTeamId={currentTeamId}
                          currentParent={currentParent}
                          onDelete={() => handleDelete(index)}
                        />
                      ))}
                    </div>
                  )}
                  {integrationFiles[0] && (
                    <div className={`card h-50 p-4 my-9`}>
                      <div className=' d-flex justify-content-between'>
                        <h6><FormattedMessage id='DOCUMENTS.UPLOADING'/>{"  "}{integrationFiles.length}{"  "}<FormattedMessage id='NOTIFICATIONS.FILES'/>:</h6>
                      </div>

                      {integrationFiles.map((fileData: any, index: number) => (
                        <IntegrationFile
                          key={index}
                          index={index}
                          fileId={fileData.fileId}
                          name={fileData.name}
                          size={fileData.size}
                          integrationId={fileData.integrationId}
                          source={fileData?.source && fileData.source.trim() !== '' ? fileData.source : 'local'}
                          currentTeamId={currentTeamId}
                          currentParent={currentParent}
                          onDelete={() => handleDelete(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="mt-15">

              </div>
              {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
                <AlertSuccess message={successResMessage} checked={checked} />
              ) : null}

              {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
                <AlertDanger message={failureResMessage} checked={checked} />
              ) : null}

              <div className='response-box'>
                <div className="mx-auto">
                  <button
                    className={'btn btn-sm btn-flex fw-bold btn-primary'}
                    onClick={handleGoToFiles}
                    disabled={uploading == true ? true : false}
                  >
                    <KTIcon iconName='arrow-left' className='fs-2' />
                    <FormattedMessage id='BUTTON.GO_BACK' />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      }

      {/* Integration Modals */}
      <FileSelectionModal
        show={googleDrive.modalOpen}
        files={googleDrive.files}
        selectedFiles={googleDrive.selectedFiles}
        onHide={() => googleDrive.setModalOpen(false)}
        onClear={googleDrive.handleClear}
        onCancel={googleDrive.handleCancel}
        onSelect={() => handleIntegrationFileSelect('googleDrive', googleDrive.handleSelectFiles())}
        onCheckboxChange={googleDrive.handleCheckboxChange}
        getFileName={googleDrive.config.getFileName}
        getFileSize={googleDrive.config.getFileSize}
        getCreatedTime={googleDrive.config.getCreatedTime}
        fileValidator={googleDrive.config.fileValidator}
      />

      <FileSelectionModal
        show={dropbox.modalOpen}
        files={dropbox.files}
        selectedFiles={dropbox.selectedFiles}
        onHide={() => dropbox.setModalOpen(false)}
        onClear={dropbox.handleClear}
        onCancel={dropbox.handleCancel}
        onSelect={() => handleIntegrationFileSelect('dropbox', dropbox.handleSelectFiles())}
        onCheckboxChange={dropbox.handleCheckboxChange}
        getFileName={dropbox.config.getFileName}
        getFileSize={dropbox.config.getFileSize}
        getCreatedTime={dropbox.config.getCreatedTime}
        fileValidator={dropbox.config.fileValidator}
      />

      <FileSelectionModal
        show={oneDrive.modalOpen}
        files={oneDrive.files}
        selectedFiles={oneDrive.selectedFiles}
        onHide={() => oneDrive.setModalOpen(false)}
        onClear={oneDrive.handleClear}
        onCancel={oneDrive.handleCancel}
        onSelect={() => handleIntegrationFileSelect('oneDrive', oneDrive.handleSelectFiles())}
        onCheckboxChange={oneDrive.handleCheckboxChange}
        getFileName={oneDrive.config.getFileName}
        getFileSize={oneDrive.config.getFileSize}
        getCreatedTime={oneDrive.config.getCreatedTime}
        fileValidator={oneDrive.config.fileValidator}
      />

      <FileSelectionModal
        show={slack.modalOpen}
        files={slack.files}
        selectedFiles={slack.selectedFiles}
        onHide={() => slack.setModalOpen(false)}
        onClear={slack.handleClear}
        onCancel={slack.handleCancel}
        onSelect={() => handleIntegrationFileSelect('slack', slack.handleSelectFiles())}
        onCheckboxChange={slack.handleCheckboxChange}
        getFileName={slack.config.getFileName}
        getFileSize={slack.config.getFileSize}
        getCreatedTime={slack.config.getCreatedTime}
        fileValidator={slack.config.fileValidator}
      />

      <FileSelectionModal
        show={wordpress.modalOpen}
        files={wordpress.files}
        selectedFiles={wordpress.selectedFiles}
        onHide={() => wordpress.setModalOpen(false)}
        onClear={wordpress.handleClear}
        onCancel={wordpress.handleCancel}
        onSelect={() => handleIntegrationFileSelect('wordpress', wordpress.handleSelectFiles())}
        onCheckboxChange={wordpress.handleCheckboxChange}
        getFileName={wordpress.config.getFileName}
        getFileSize={wordpress.config.getFileSize}
        getCreatedTime={wordpress.config.getCreatedTime}
        fileValidator={wordpress.config.fileValidator}
      />

      {loading &&
        <div className='d-flex justify-content-center' style={{ marginTop: '50px', marginBottom: '50px' }}>
          <div className='w-50px h-50px'>
            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
          </div>
        </div>
      }
    </>
  );
};