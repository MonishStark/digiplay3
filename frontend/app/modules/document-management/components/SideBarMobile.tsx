import React, { useState } from 'react'
import { FoldersMobile } from "./FoldersMobile";
import { FilesMobile } from "./FilesMobile";
import { Buttons } from "./Buttons";
import { ActiveDirectoryPath } from "./ActiveDirectoryPath";
import { KTIcon } from "../../../../app/theme/helpers";
import { deleteFile, deleteFolder, deleteChatHistory } from "../api";
import { useAuth } from '../../auth';
import { FormattedMessage, useIntl } from 'react-intl';


function openSideBar() {
    const element: HTMLElement = document.getElementById("mySidenav2")!
    const element2: HTMLElement = document.getElementById("filter")!
    element.style.width = "100%";
    element2.style.display = "none"
}

function closeSideBar() {
    const element: HTMLElement = document.getElementById("mySidenav2")!
    const element2: HTMLElement = document.getElementById("filter")!
    element.style.width = "0";
    element2.style.display = "flex"
}

function changeAction(id: string, height: string, display: string) {
    var element: HTMLElement = document.getElementById(id)!
    if (element.style.height !== "0px") {
        element.style.height = "0px";
        setTimeout(() => {
            var element: HTMLElement = document.getElementById(id)!
            element.style.display = "none";
        }, 500);
    } else {
        element.style.display = display;
        setTimeout(() => {
            var element: HTMLElement = document.getElementById(id)!
            element.style.height = height;
        }, 100);
    }

}

const handleToggleDocManagement = () => {
  changeAction("document_management_small", "350px", "block");
};

const handleToggleChatHistories = () => {
  changeAction("chat_histories_small", "150px", "block");
};

export function SideBarMobile(props: any) {
    const [deleting, setDeleting] = useState<boolean>(false)
    const { auth, teamList } = useAuth()
    const intl = useIntl();

    const openDialogForFolderOrFileDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'block'
    }

    const closeDialogForFolderOrFileDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'none'
    }

    const handleFolderDeletion = (folderId: any) => {
        setDeleting(true)
        deleteFolder(folderId,true)
            .then((response) => {
                if (response.data.success) {
                    // props.setActiveFoldersAndFilesList(response.data.filesAndFolders)
                    // props.setSuccessResMessage(response.data.message)
                    props.setChecked(true)
                } else {
                    props.setFailureResMessage(response.data.message)
                    props.setChecked(true)
                }
                setDeleting(false)
            })
            .then(() => {
                closeDialogForFolderOrFileDeletion(`delete-folder-mobile-${folderId}`)
                closeSideBar()
            })
            .catch(() => {
                props.setFailureResMessage('Failed to delete folder')
                props.setChecked(true)
                setDeleting(false)
            })
    }

    const handleFileDeletion = (fileId: any) => {
        setDeleting(true)
        deleteFile(fileId)
            .then((response) => {
                if (response.data.success) {
                    setDeleting(false)
                    props.setActiveFoldersAndFilesList(response.data.filesAndFolders)
                    props.setSuccessResMessage(response.data.message)
                    props.setChecked(true)
                } else {
                    setDeleting(false)
                    props.setFailureResMessage(response.data.message)
                    props.setChecked(true)
                }
            })
            .then(() => {
                closeDialogForFolderOrFileDeletion(`delete-file-mobile-${fileId}`)
                closeSideBar()
            })
            .catch(() => {
                setDeleting(false)
                props.setFailureResMessage('Failed to delete file')
                props.setChecked(true)
            })
    }

    const handleChatDeletion = (chatId: any) => {
        setDeleting(true)
        deleteChatHistory(chatId, props.currentTeam)
            .then((response) => {
                if (response.data.success) {
                    setDeleting(false)
                    // props.setChatHistories(response.data.userChatHistories)
                    // props.setSuccessResMessage(response.data.message)
                    props.setChecked(true)
                } else {
                    setDeleting(false)
                    props.setFailureResMessage(response.data.message)
                    props.setChecked(true)
                }
            })
            .then(() => {
                closeDialogForFolderOrFileDeletion(`delete-chat-small-${chatId}`)
                closeSideBar()
            })
            .catch(() => {
                setDeleting(false)
                props.setFailureResMessage('Failed to delete chat history')
                props.setChecked(true)
            })
    }

    const handleFileDeletionClick = (id: string) => () => {
      handleFileDeletion(id);
    };

    const handleCloseClick = (id: string) => () => {
      closeDialogForFolderOrFileDeletion(id);
    };

    const handleFolderClick = (id: string) => () => {
      handleFolderDeletion(id);
    };

    const handleCloseFolderClick = (id: string) => () => {
      closeDialogForFolderOrFileDeletion(id);
    };

    const handleChatClick = (id: string) => () => {
      handleChatDeletion(id);
    };

    const handleCloseChatClick = (id: string) => () => {
      closeDialogForFolderOrFileDeletion(id);
    };

    const handleOpenChatDeletion = (id: string) => () => {
      openDialogForFolderOrFileDeletion(id);
    };

    const handleRenameClick = (id: string) => () => {
      props.showRenameModal(id);
    };

    const handleSelectChat = (id: string) => () => {
      props.selectChatHistory(id);
    };

    return (
        <>
            <div id="mySidenav2" className="sidenav page-small">
                <div className="d-flex justify-content-between my-3 mx-3">
                    <label className="font-size-lg text-dark-75 font-weight-bold">

                    </label>
                    <span className="my-auto btn btn-icon btn-bg-light btn-active-color-primary btn-sm" style={{ cursor: "pointer" }} onClick={closeSideBar}>
                        <KTIcon iconName='double-left' className='fs-2 rotate-180' />
                    </span>
                </div>
                <div className="d-flex flex-column" style={{ width: "100%" }}>
                    <div className="d-flex justify-content-between cursor-pointer summary-small border-bg-201" onClick={handleToggleChatHistories}>
                        <span
                            className="fw-bolder fs-5 px-5"
                        // style={{ fontFamily: 'Playball, cursive', fontSize: '20px'}} 
                        >
                            Chat Histories
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-down mt-2" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                        </svg>
                    </div>
                    <div id="chat_histories_small" style={{ height: "0px", display: "none" }} className="abstract-box abstract-scroll bg-content">
                        <div className="h-150px border-bg-201">
                            {props.currentTeam && props.currentTeam != '' &&
                                <div className="checkbox-list category-list">
                                    <div className="d-flex ms-4 my-4">
                                        <a
                                            className={'btn btn-sm btn-flex fw-bold btn-primary'}
                                            onClick={props.createNewChat}
                                        >
                                            <KTIcon iconName='plus' className='fs-2' />
                                            New Chat
                                            {props.creatingNewChat && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                        </a>
                                    </div>

                                    {props.chatHistories.map((chatHistory: any) => (
                                        <>
                                            <div
                                                className={`d-flex justify-content-between px-3 py-2 ${props.selectedChatHistory == chatHistory.id ? 'active-category' : ''}`}
                                            >
                                                <span
                                                    onClick={handleSelectChat(chatHistory.id)}
                                                    style={{ cursor: "pointer" }}
                                                    className={`fs-5 fw-bolder py-2 ps-3`}
                                                >
                                                    {chatHistory.name}
                                                </span>

                                                <div className="d-flex me-4">
                                                    <span
                                                        className='btn btn-icon bg-white btn-active-color-primary btn-sm'
                                                        onClick={handleRenameClick(chatHistory.id)}
                                                    >
                                                        <KTIcon iconName='pencil' className='fs-3 text-dark' />
                                                    </span>
                                                    <span
                                                        className='ms-2 btn btn-icon bg-white btn-active-color-primary btn-sm'
                                                        onClick={handleOpenChatDeletion(`delete-chat-small-${chatHistory.id}`)}
                                                    >
                                                        <KTIcon iconName='trash' className='fs-3 text-dark' />
                                                    </span>
                                                </div>
                                            </div>
                                            <div id={`delete-chat-small-${chatHistory.id}`} style={{ display: 'none' }} className="modal">
                                                <span onClick={handleCloseChatClick(`delete-chat-small-${chatHistory.id}`)} className="close" title="Close Modal">&times;</span>
                                                <form className="modal-content bg-white">
                                                    <div className="px-7 py-7">
                                                        <h3>
                                                            <FormattedMessage id='DOCUMENTS.DELETE_CHAT' />
                                                        </h3>
                                                        <p className='font-size-15'>
                                                            <FormattedMessage id="DOCUMENTS.DELETE.WARN"/>
                                                            <span className="mx-1 fw-bolder">{chatHistory.name}</span>
                                                            chat?
                                                        </p>

                                                        <div className="d-flex">
                                                            <button onClick={handleCloseChatClick(`delete-chat-small-${chatHistory.id}`)} type="button" className="btn btn-primary">
                                                                <FormattedMessage id="BUTTON.CANCEL" /> 
                                                            </button>
                                                            <button
                                                                onClick={handleChatClick(chatHistory.id)}
                                                                type="button"
                                                                className="btn btn-danger ms-3"
                                                            >
                                                                Delete
                                                                {deleting && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        </>
                                    ))}
                                </div>
                            }
                            {teamList.length == 0 &&
                                <div className="d-flex h-100">
                                    <span className="fw-bold mx-auto my-auto">Create a team to start a chat</span>
                                </div>
                            }
                        </div>
                    </div>
                    <div className="d-flex justify-content-between cursor-pointer summary-small border-bg-201" onClick={handleToggleDocManagement}>
                        <span
                            className="fw-bolder fs-5 px-5"
                        // style={{ fontFamily: 'Playball, cursive', fontSize: '20px'}} 
                        >
                            Document Management
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-down mt-2" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                        </svg>
                    </div>
                    <div id="document_management_small" style={{ height: "0px", display: "none" }} className="abstract-box abstract-scroll bg-content">
                        <div className="h-350px border-bg-201">
                            {props.currentTeam && props.currentTeam != '' &&
                                <>
                                    <div className="d-flex justify-content-between my-3 mx-3">
                                        <label className="font-size-lg text-dark-75 font-weight-bold">
                                            <div className='d-flex align-items-center position-relative'>
                                                <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
                                                <input
                                                    type='text'
                                                    className='form-control form-control-solid w-250px ps-14'
                                                    placeholder={intl.formatMessage({ id: 'DOCUMENTS.SEARCH' })}
                                                    value={props.searchString}
                                                    onChange={props.searchFilesAndFolders}
                                                />
                                            </div>
                                        </label>
                                        <span className="mt-2 mr-5 btn btn-icon btn-bg-light btn-active-color-primary btn-sm" style={{ cursor: "pointer" }} onClick={closeSideBar}>
                                            <KTIcon iconName='double-left' className='fs-2 rotate-180' />
                                        </span>
                                    </div>
                                    <div className="d-flex flex-column" style={{ width: "100%" }}>
                                        {auth?.user?.role != 3 &&
                                            <Buttons
                                                setOpenDialog={props.setOpenDialog}
                                                currentParent={props.currentParent}
                                                currentTeam={props.currentTeam}
                                                folderTree={props.folderTree}
                                            />
                                        }
                                        <ActiveDirectoryPath
                                            folderTree={props.folderTree}
                                            setCurrentParent={props.setCurrentParent}
                                        />
                                        {!props.fetchingFolds &&
                                            <>
                                                {props.activeFoldersAndFilesList.map((data: any) => (
                                                    <>
                                                        {data.type == "folder" ? (
                                                            <>
                                                                <FoldersMobile
                                                                    id={data.id}
                                                                    title={data.name}
                                                                    tooltip={data.tooltip}
                                                                    isDefault={data.isDefault}
                                                                    openDialogForFolderOrFileDeletion={openDialogForFolderOrFileDeletion}
                                                                    setCurrentParent={props.setCurrentParent}
                                                                    showUpdateModal={props.showUpdateModal}
                                                                />
                                                                <div id={`delete-folder-mobile-${data.id}`} style={{ display: 'none' }} className="modal">
                                                                    <span onClick={handleCloseFolderClick(`delete-folder-mobile-${data.id}`)} className="close" title="Close Modal">&times;</span>
                                                                    <form className="modal-content bg-white">
                                                                        <div className="px-7 py-7">
                                                                            <h3>
                                                                                Delete Folder
                                                                            </h3>
                                                                            <p className='font-size-15'>
                                                                                <FormattedMessage id="DOCUMENTS.DELETE.WARN"/>
                                                                                <span className="mx-1 fw-bolder">{data.name}</span>
                                                                                folder and it's contents?
                                                                            </p>

                                                                            <div className="d-flex">
                                                                                <button onClick={handleCloseFolderClick(`delete-folder-mobile-${data.id}`)} type="button" className="btn btn-primary">
                                                                                    <FormattedMessage id="BUTTON.CANCEL" /> 
                                                                                </button>
                                                                                <button
                                                                                    onClick={handleFolderClick(data.id)}
                                                                                    type="button"
                                                                                    className="btn btn-danger ms-3"
                                                                                >
                                                                                    Delete
                                                                                    {deleting && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FilesMobile
                                                                    id={data.id}
                                                                    title={data.name}
                                                                    openDialogForFolderOrFileDeletion={openDialogForFolderOrFileDeletion}
                                                                    currentTeam={props.currentTeam}
                                                                    currentParent={props.currentParent}
                                                                    setChecked={props.setChecked}
                                                                    setSuccessResMessage={props.setSuccessResMessage}
                                                                    setFailureResMessage={props.setFailureResMessage}
                                                                    fetchingFile={props.fetchingFile}
                                                                    settFetchingFile={props.settFetchingFile}
                                                                    setFileId={props.setFileId}
                                                                    setFileType={props.setFileType}
                                                                    setFileName={props.setFileName}
                                                                    showDocViewer={props.showDocViewer}
                                                                    folderTree={props.folderTree}
                                                                />
                                                                <div id={`delete-file-mobile-${data.id}`} style={{ display: 'none' }} className="modal">
                                                                    <span onClick={handleCloseClick(`delete-file-mobile-${data.id}`)} className="close" title="Close Modal">&times;</span>
                                                                    <form className="modal-content bg-white">
                                                                        <div className="px-7 py-7">
                                                                            <h3>
                                                                                <FormattedMessage id="DOCUMENTS.DELETE_FILE" />
                                                                            </h3>
                                                                            <p className='font-size-15'>
                                                                                <FormattedMessage id="DOCUMENTS.DELETE.WARN"/>
                                                                                <span className="mx-1 fw-bolder">{data.name}</span> file?
                                                                            </p>

                                                                            <div className="d-flex">
                                                                                <button onClick={handleCloseClick(`delete-file-mobile-${data.id}`)} type="button" className="btn btn-primary">
                                                                                    <FormattedMessage id="BUTTON.CANCEL" /> 
                                                                                </button>
                                                                                <button
                                                                                    onClick={handleFileDeletionClick(data.id)}
                                                                                    type="button"
                                                                                    className="btn btn-danger ms-3"
                                                                                >
                                                                                    Delete
                                                                                    {deleting && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                            </>
                                                        )}
                                                    </>
                                                ))}
                                            </>
                                        }
                                    </div>
                                </>
                            }
                            {teamList.length == 0 &&
                                <div className="d-flex h-100">
                                    <span className="fw-bold mx-auto my-auto">Create a cllection to start</span>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </div>
            <span
                id="filter"
                className="filter-button ms-3 me-4 btn btn-icon btn-active-color-primary btn-sm"
                onClick={openSideBar}
            >
                <KTIcon iconName='menu' className='fs-3 text-dark' />
            </span>
        </>
    );
}