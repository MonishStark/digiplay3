/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useState } from 'react'
import { KTIcon } from '../../../../app/theme/helpers'
import { Buttons } from '../../document-management/components/Buttons'
import { useAuth } from '../../auth'
import { Navigate } from 'react-router-dom'
import { deleteFile, deleteFolder, getChildFoldersAndFiles, getFolderData, getFoldersAndFilesForTeam, getFolderTreeForFile, getRootFoldersForTeam, searchFilesAndFolders } from '../../document-management/api'
import { ActiveDirectoryPath } from '../../document-management/components/ActiveDirectoryPath'
import { Folders } from '../../document-management/components/Folders'
import { Files } from '../../document-management/components/Files'
import { CreateFolderDialog } from '../../document-management/components/CreateFolderDialog'
import { UpdateFolderDialog } from '../../document-management/components/UpdateFolderDialog'
import { DocViewerDialog } from '../../document-management/components/DocViewerDialog'
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts'
import { FormattedMessage, useIntl } from 'react-intl'

export function Documents() {
  const [deleting, setDeleting] = useState<boolean>(false)
  const { currentTeam, teamList, auth, setOnHomePage, isBackFromPages, setIsBackFromPages, currentParent, setCurrentParent, isSharedTeam} = useAuth()
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const [folderTree, setFolderTree] = useState<Array<any>>([])
  const [searchString, setSearchString] = useState<string>('')
  const [activeFoldersAndFilesList, setActiveFoldersAndFilesList] = useState<Array<any>>([])
  const [fetchingFolds, settFetchingFolds] = useState<boolean>(true)
  const [folderIdToEdit, setFolderIdToEdit] = useState<any>(null)
  const [currentFolderDataToEdit, setCurrentFolderDataToEdit] = useState<any>({})
  const [openEditDialog, setEditOpenDialog] = useState<boolean>(false)
  const [successResMessage, setSuccessResMessage] = useState<string>('')
  const [failureResMessage, setFailureResMessage] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(true)
  const [fetchingFile, settFetchingFile] = useState<boolean>(false)
  const [fileId, setFileId] = useState<any>(null)
  const [fileType, setFileType] = useState<any>(null)
  const [fileName, setFileName] = useState<any>(null)
  const [openDocViewer, setOpenDocViewer] = useState<boolean>(false)
  const [selectedDocs, setSelectedDocs] = useState<Array<any>>([])
  const [blob, setBlob] = useState<any>('')
  const intl = useIntl();
  
  let currentTeamTitle = '';
  teamList.forEach(team=>{
    if(currentTeam===team.id){
      currentTeamTitle = team.teamName
    }
  })
  const _searchFilesAndFolders = (event: any) => {
    setSearchString(event.target.value)

    if (event.target.value != '') {
      if (searchString?.length >= 2) {
        searchFilesAndFolders(event.target.value, currentTeam)
          .then((response) => {
            if (response.data.success) {
              setActiveFoldersAndFilesList(response.data.items)
              // setFolderTree(response.data.predecessors)
            }
          })
          .catch((err) => {
            console.log(err)
          })
      }
    } else {
      getRootFoldersForTeam(currentTeam)
        .then((response) => {
          if (response.data.success) {
            setActiveFoldersAndFilesList(response.data.items)
            setCurrentParent(4)
          }
          settFetchingFolds(false)
        })
    }
  }

  const showUpdateModal = (fid: any) => {
    setFolderIdToEdit(fid)
    getFolderData(fid)
      .then((response: any) => {
        if (response.data.success) {
          setCurrentFolderDataToEdit(response.data.folderData)
        }
      })
      .then(() => setEditOpenDialog(true))
  }

  function closeSideBar() { }

  if (successResMessage) {
    setTimeout(() => {
      setChecked(false)
      setTimeout(() => {
        setSuccessResMessage("");
      }, 200);
    }, 5000);
  }

  if (failureResMessage) {
    setTimeout(() => {
      setChecked(false)
      setTimeout(() => {
        setFailureResMessage("");
      }, 200);
    }, 5000);
  }

  const handleClose = () => {
    setOpenDialog(false)
  }

  const handleUpdateClose = () => {
    setEditOpenDialog(false)
  }

  const handleDocViewerClose = () => {
    setOpenDocViewer(false)
  }

  const closeDialogForFolderOrFileDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'none'
  }

  const openDialogForFolderOrFileDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'flex'
  }
  const handleFolderDeletion = (folderId: any) => {
    setDeleting(true)
    deleteFolder(folderId,currentTeam,true)
      .then((response) => {
        if (response.data.success) {
          getFoldersAndFilesForTeam(currentParent,currentTeam)
        .then((response1) => {
          if (response1.data.success) {

            setActiveFoldersAndFilesList(response1.data.items)
            setCurrentParent(4)
          }
          settFetchingFolds(false)
        })
          // setActiveFoldersAndFilesList(response.data.filesAndFolders)
          setSuccessResMessage(response.data.message)
          // setChecked(true)
        } else {
          setFailureResMessage(response.data.message)
          setChecked(true)
        }
        setDeleting(false)
      })
      .then(() => {
        closeDialogForFolderOrFileDeletion(`delete-folder-${folderId}`)
      })
      .catch(() => {
        setFailureResMessage('Failed to delete folder')
        setChecked(true)
        setDeleting(false)
      })
  }

  const handleFileDeletion = (fileId: any) => {
    setDeleting(true)
    deleteFile(fileId,currentTeam)
      .then((response) => {
        if (response.data.success) {
          setDeleting(false)
          // setActiveFoldersAndFilesList(response.data.filesAndFolders)
          setSuccessResMessage(response.data.message)
          getFoldersAndFilesForTeam(currentParent, currentTeam)
        .then((response) => {
          if (response.data.success) {
getFolderTreeForFile(currentParent, currentTeam).then((response1)=>{
              if (response1.data.success) {
            setFolderTree(response1.data.predecessors)

                        setActiveFoldersAndFilesList(response.data.items)

              }
            })            
            if (isBackFromPages) {
              setIsBackFromPages(false)
              settFetchingFolds(false)
            }
          }
        })
          setChecked(true)
        } else {
          setDeleting(false)
          setFailureResMessage(response.data.message)
          setChecked(true)
        }
      })
      .then(() => {
        closeDialogForFolderOrFileDeletion(`delete-file-${fileId}`)
      })
      .catch(() => {
        setDeleting(false)
        setFailureResMessage('Failed to delete file')
        setChecked(true)
      })
  }

  useEffect(() => {
    setOnHomePage(false)
    return () => setOnHomePage(false)
  }, [])
  useEffect(() => {
    if (currentParent) {
      if (searchString.length > 0) {
        setSearchString('')
      }

      getFoldersAndFilesForTeam(currentParent, currentTeam)
        .then((response) => {
          if (response.data.success) {

            getFolderTreeForFile(currentParent, currentTeam).then((response2)=>{
              if (response.data.success) {
            setFolderTree(response2.data.predecessors)
                        setActiveFoldersAndFilesList(response.data.items)

              }
            })
            
            if (isBackFromPages) {
              setIsBackFromPages(false)
              settFetchingFolds(false)
            }
          }
        })
    }
  }, [currentParent])

  useEffect(() => {
    if (currentTeam && !isBackFromPages) {
      settFetchingFolds(true)
      getRootFoldersForTeam(currentTeam)
        .then((response) => {
          if (response.data.success) {
            setActiveFoldersAndFilesList(response.data.items)
            setFolderTree([])
          }
          settFetchingFolds(false)
        })
    }
  }, [currentTeam])

  const createFileDeletionHandler = (id: string) => () => handleFileDeletion(id);

  const createCloseHandler = (id: string) => () =>
  closeDialogForFolderOrFileDeletion(`delete-file-${id}`);

  const createFolderDeletionHandler = (id: string) => () => handleFolderDeletion(id);

  const createFolderCloseHandler = (id: string) => () =>
  closeDialogForFolderOrFileDeletion(`delete-folder-${id}`);

  const createSetParentHandler = (id: number) => () => setCurrentParent(id);
  return (
    <>
      <div id="main">
        {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
          <AlertSuccess message={successResMessage} checked={checked} />
        ) : null}

        {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
          <AlertDanger message={failureResMessage} checked={checked} />
        ) : null}
      </div>

      {teamList.length !== 0 ? currentTeam ? (
        <div>
          <div
            id='document_management'
            className='d-flex flex-column h-100 row tab-p0 card flex-wrap py-5 '
            style={{ overflowX: 'auto', marginLeft:'0px', marginRight:'0px', marginTop:'0px' }}
          >

            <div className='d-flex justify-content-between  mt6 mx-lg-2 folder-opt-align flex-wrap p-5'>
              <h2 className="d-flex align-items-center  mb-6">
                <span className='text-hover-primary cursor-pointer' onClick={createSetParentHandler(4)}>
                 {currentTeamTitle} 
                </span>
                <span className="">
                  {teamList.length > 0 && (
                    <>
                      {teamList.map((list: any) => {
                        return <React.Fragment key = {list.id}>
                          {
                            list.id == currentTeam && currentParent !== 4 &&
                            <span key={list.id}  className='' >
                              <ActiveDirectoryPath
                                folderTree={folderTree}
                                setCurrentParent={setCurrentParent}
                              />
                            </span>
                          }
                        </React.Fragment>
                      })}
                    </>
                  )}
                </span>
              </h2>
              <span className='d-flex flex-stack flex-wrap gap-4'>
                <label className='font-size-lg text-dark-75 font-weight-bold'>
                  <div className='d-flex align-items-center position-relative'>
                    <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
                    <input
                      type='text'
                      className='form-control form-control-solid w-250px ps-14'
                      placeholder={intl.formatMessage({ id: 'DOCUMENTS.SEARCH_1' })}
                      value={searchString}
                      onChange={_searchFilesAndFolders}
                    />
                  </div>
                </label>
                <span className=''>
                  {(auth?.user?.role != 3 || isSharedTeam) && (
                    <>
                      <Buttons
                        setOpenDialog={setOpenDialog}
                        currentParent={currentParent}
                        currentTeam={currentTeam}
                        folderTree={folderTree}
                      />
                    </>
                  )}
                </span>
              </span>
            </div>
            <div className="p-5">
              <table className="table mb-6 align-middle table-row-dashed fs-6 gy-5 " id="kt_table_users">
                <thead className="pe-5">
                  <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                    <th className='min-w-50px p-1 p-lg-2'>
                      <FormattedMessage id='DOCUMENT.TABLE.NAME' />
                    </th>
                    <th className='min-w-50px  p-lg-2'><FormattedMessage id='TEAM.OWNER' /></th>
                    <th className='min-w-50px  p-lg-2'><FormattedMessage id='TEAM.SIZE' /></th>
                    <th className='min-w-50px  p-lg-2'><FormattedMessage id='TEAM.LAST_UPDATED' /></th>
                    <th className='min-w-50px  p-lg-2 text-lg-end'><FormattedMessage id='TEAM.ACTIONS' /></th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 fw-bold" style={{ height: "55px"}}>
                  {!fetchingFolds && (
                    <>
                      {activeFoldersAndFilesList.map((data: any) => (
                        <React.Fragment key={data.id}>
                          {data.type == "folder" ? (
                            <>
                              <Folders
                                id={data.id}
                                title={data.name}
                                tooltip={data.tooltip}
                                isDefault={data.isDefault}
                                openDialogForFolderOrFileDeletion={openDialogForFolderOrFileDeletion}
                                setCurrentParent={setCurrentParent}
                                showUpdateModal={showUpdateModal}
                                created={data.created}
                                isShared={isSharedTeam}
                                creatorId={data.creatorId}
                                folderTree ={folderTree}
                                owner={data.ownerName}
                                avatarUrl={data.avatarUrl}
                              />
                              <div
                                id={`delete-folder-${data.id}`}
                                style={{ display: 'none' }}
                                className='modal'
                              >
                                <span
                                  onClick={createFolderCloseHandler(data.id)}
                                  className='close'
                                  title='Close Modal'
                                >
                                  &times;
                                </span>
                                <form className='modal-content bg-light w-75 w-md-50' style={{height:'fit-content',marginTop:'150px'}}>
                                  <div className='px-7 py-7'>
                                    <h3>Delete Folder</h3>
                                    <p className='font-size-15'>
                                      <FormattedMessage id="DOCUMENTS.DELETE.WARN" />  
                                      <span className='mx-1 fw-bolder'>{data.name}</span>
                                      folder and it's contents?
                                    </p>

                                    <div className='d-flex justify-content-center'>
                                      <button
                                        onClick={createCloseHandler(data.id)}
                                        type='button'
                                        className='btn btn-primary'
                                      >
                                        <FormattedMessage id="BUTTON.CANCEL" /> 
                                      </button>
                                      <button
                                        onClick={createFolderDeletionHandler(data.id)}
                                        type='button'
                                        className='btn btn-danger ms-3'
                                      >
                                        Delete
                                        {deleting && (
                                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </>
                          ) : (
                            <>
                              <Files
                                id={data.id}
                                title={data.name}
                                parent={data.parentId}
                                openDialogForFolderOrFileDeletion={openDialogForFolderOrFileDeletion}
                                currentTeam={currentTeam}
                                currentParent={currentParent}
                                setChecked={setChecked}
                                setSuccessResMessage={setSuccessResMessage}
                                setFailureResMessage={setFailureResMessage}
                                fetchingFile={fetchingFile}
                                settFetchingFile={settFetchingFile}
                                setFileId={setFileId}
                                setFileType={setFileType}
                                setFileName={setFileName}
                                showDocViewer={setOpenDocViewer}
                                folderTree={folderTree}
                                created={data.created}
                                size={data.size}
                                isShared={isSharedTeam}
                                creatorId={data.creatorId}
                                owner={data.ownerName}
                                avatarUrl={data.avatarUrl}
                              />
                              <div
                                id={`delete-file-${data.id}`}
                                style={{ display: 'none' }}
                                className='modal'
                              >
                                <span
                                  onClick={createCloseHandler(data.id)}
                                  className='close'
                                  title='Close Modal'
                                >
                                  &times;
                                </span>
                                <form className='modal-content bg-light w-75 w-md-50' style={{height:'fit-content',marginTop:'150px'}}>
                                  <div className='px-7 py-7'>
                                    <FormattedMessage id="DOCUMENTS.DELETE_FILE" />
                                    <p className='font-size-15'>
                                      <FormattedMessage id="DOCUMENTS.DELETE.WARN" />  
                                      <span className='mx-1 fw-bolder'>{data.name}</span> file?
                                    </p>

                                    <div className='d-flex justify-content-center'>
                                      <button
                                        onClick={createCloseHandler(data.id)}
                                        type='button'
                                        className='btn btn-primary'
                                      >
                                        <FormattedMessage id="BUTTON.CANCEL" /> 
                                      </button>
                                      <button
                                        onClick={createFileDeletionHandler(data.id)}
                                        type='button'
                                        className='btn btn-danger ms-3'
                                      >
                                        <FormattedMessage id="DOCUMENTS.DELETE" /> 
                                        {deleting && (
                                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        teamList.length !== 0 && (
          <Navigate to='/dashboard' />
        )
      ) : (
        <Navigate to='/dashboard' />
      )}

      <CreateFolderDialog
        show={openDialog}
        handleClose={handleClose}
        setActiveFoldersAndFilesList={setActiveFoldersAndFilesList}
        setChecked={setChecked}
        setSuccessResMessage={setSuccessResMessage}
        setFailureResMessage={setFailureResMessage}
        currentParent={currentParent}
        currentTeam={currentTeam}
        closeSideBar={closeSideBar}
      />
      <UpdateFolderDialog
        show={openEditDialog}
        handleClose={handleUpdateClose}
        folderIdToEdit={folderIdToEdit}
        currentFolderDataToEdit={currentFolderDataToEdit}
        setActiveFoldersAndFilesList={setActiveFoldersAndFilesList}
        setChecked={setChecked}
        setSuccessResMessage={setSuccessResMessage}
        setFailureResMessage={setFailureResMessage}
        currentParent={currentParent}
        currentTeam={currentTeam}
        searchString={searchString}
        closeSideBar={closeSideBar}
      />
      <DocViewerDialog
        selectedDocs={selectedDocs}
        setSelectedDocs={setSelectedDocs}
        blob={blob}
        setBlob={setBlob}
        show={openDocViewer}
        handleClose={handleDocViewerClose}
        currentParent={currentParent}
        currentTeam={currentTeam}
        fileId={fileId}
        fileType={fileType}
        fileName={fileName}
      />
    </>
  )
}
