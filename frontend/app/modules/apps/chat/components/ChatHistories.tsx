/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { FC, useEffect, useRef, useState } from 'react'
import { KTIcon } from '../../../../theme/helpers'
import { useAuth } from '../../../auth'
import { createNewChatApi, deleteChatHistory, getChatMessages, getUserChatHisoriesForSpecificScope } from '../../../document-management/api'
import { Navigate, useLocation,useNavigate } from 'react-router-dom'
import { RenameChatHistory } from '../../../document-management/components/RenameChat'
import { AlertDanger, AlertSuccess } from '../../../alerts/Alerts'
import { ChatSection } from '../../../document-management/components/ChatSection'
import clsx from 'clsx'
import { FormattedMessage } from 'react-intl'

const ChatHistories: FC = () => {
  const { state }: any = useLocation()
  const [deleting, setDeleting] = useState<boolean>(false);
  const [selectedChatHistory, setSelectedChatHistory] = useState<any>(null)
  const [displayChatSection, setDisplayChatSection] = useState<boolean>(false)
  const [chatHistories, setChatHistories] = useState<Array<any>>([])
  const [successResMessage, setSuccessResMessage] = useState<string>('')
  const [failureResMessage, setFailureResMessage] = useState<string>('')
  const [checked, setChecked] = useState<boolean>(true)
  const [creatingNewChat, setCreatingNewChat] = useState<boolean>(false)
  const [chatIdToEdit, setchatIdToEdit] = useState<any>(null)
  const [currentChatDataToEdit, setCurrentChatDataToEdit] = useState<any>({})
  const [openRenameChatDialog, settOpenRenameChatDialog] = useState<boolean>(false)
  const { auth, teamList, currentTeam, currentParent, currentUser } = useAuth()
  const [loadingChat, setLoadingChat] = useState<boolean>(true)
  const [tab, setTab] = useState<any>()
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDropdownID, setShowDropdownID] = useState<any>();
  const navigate = useNavigate();

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

  const openDialogForFolderOrFileDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'block'
  }

  const closeDialogForFolderOrFileDeletion = (id: string) => {
    const element: HTMLElement = document.getElementById(id)!
    element.style.display = 'none'
  }

  const createNewChat = () => {
    setCreatingNewChat(true)
    createNewChatApi(state.teamId,state.type,state.fileId)
      .then((response) => {
        if (response.data.success) {
          setSelectedChatHistory(response.data?.chat?.id)
                    handleChatMessage(response.data?.chat?.id)
          fetchChats(response.data?.chat?.id);

          // setChatHistories(response.data.userChatHistories)
          // setSelectedChatHistory(response.data.activeChatId)
          // handleChatMessage(response.data.activeChatId)
          setCreatingNewChat(false)
          if (!displayChatSection) {
            setDisplayChatSection(true)
            setTab(response.data.activeChatId)
          }
        } else {
          setFailureResMessage('Failed to create new chat')
          setChecked(true)
          setCreatingNewChat(false)
        }
      })
      .catch((err) => {
        console.log(err)
        setFailureResMessage('Failed to create new chat')
        setChecked(true)
        setCreatingNewChat(false)
      })
  }

  const selectChatHistory = (chatId: any) => {
    setSelectedChatHistory(chatId)
    if (!displayChatSection) {
      setDisplayChatSection(true)
    }
  }

  const handleChatDeletion = (chatId: any) => {
    setDeleting(true)
    deleteChatHistory(chatId,state.teamId)
      .then((response) => {
        if (response.data.success) {
          setDeleting(false)
          if (chatId == selectedChatHistory) {
            setSelectedChatHistory(null)
            setDisplayChatSection(false)
          }
          fetchChats();
          // setChatHistories(response.data.userChatHistories)
          // setSuccessResMessage(response.data.message)
          setChecked(true)
        } else {
          setDeleting(false)
          setFailureResMessage(response.data.message)
          setChecked(true)
        }
      })
      .then(() => {
        closeDialogForFolderOrFileDeletion(`delete-chat-${chatId}`)
      })
      .catch((err) => {
        setDeleting(false)
        setFailureResMessage('Failed to delete chat history')
        setChecked(true)
      })
  }

  const findHistoryData = (id: any) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const historyData = await chatHistories.find((history) => history.id == id)
        resolve(historyData)
      } catch (error) {
        reject(error)
      }

    })
  }

  const showRenameModal = (cid: any) => {
    setchatIdToEdit(cid)
    findHistoryData(cid)
      .then((historyData) => {
        setCurrentChatDataToEdit(historyData)
      })
      .then(() => settOpenRenameChatDialog(true))
  }

  const handleRenameClose = () => {
    settOpenRenameChatDialog(false)
  }

  function closeSideBar() { }

  const fetchChats = (chatId:any)=>{
    getUserChatHisoriesForSpecificScope(state.teamId,state.fileId,state.type,"")
        .then((response:any) => {
          if (response.data.success) {
            setChatHistories(response.data.userChatHistories)
            // if (selectedChatHistory) {
              setSelectedChatHistory(chatId)
              setDisplayChatSection(true)
            // }
          }
        })
        .finally(() =>
          setLoadingChat(false)
        )
  }

  useEffect(() => {
    if (currentTeam) {
      getUserChatHisoriesForSpecificScope(state.teamId,state.fileId,state.type,"")
        .then((response:any) => {
          if (response.data.success) {
            setChatHistories(response.data.userChatHistories)
            if (selectedChatHistory) {
              setSelectedChatHistory(null)
              setDisplayChatSection(false)
            }
          }
        })
        .finally(() =>
          setLoadingChat(false)
        )
    }
  }, [currentTeam])

  useEffect(() => {
    chatHistories.find(history => history.id == selectedChatHistory);
  }, [selectedChatHistory, chatHistories])

  useEffect(() => {
    if (!loadingChat && chatHistories.length == 0 && teamList.length !== 0) {
      createNewChat()
    } else {
      // selectChatHistory(chatHistories[0]?.id)
      // handleChatMessage(chatHistories[0]?.id)
    }
  }, [loadingChat, teamList])

  useEffect(() => {
    setLoadingChat(true)
    if(selectedChatHistory){
      getChatMessages(selectedChatHistory,state.teamId)
      .then((response) => {
        if (response.data.success) {
          response.data.chatMessages.reverse()
        }
      })
      .finally(() => {
        setLoadingChat(false)
      })
    } else {
      setLoadingChat(false)
    }
  }, [chatHistories])

  const plusRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const listRef = useRef<any>();

  // useEffect(() => {
  //   const checkTabsVisibility = () => {
      
  //   };

  //   checkTabsVisibility();
  //   window.addEventListener('resize', checkTabsVisibility);

  //   return () => {
  //     window.removeEventListener('resize', checkTabsVisibility);
  //   };
  // }, [chatHistories]);

  const toggleDropDown = (chatHistoryId: any) => {
    const listItem = document.getElementById(`list-item-${chatHistoryId}`);
    const iconElement = listItem?.querySelector('span.cursor-pointer');
    
    if (iconElement) {
      const iconRect = iconElement.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      let statusOffsetTop = 0;
      let statusOffsetLeft = 0;

      if (screenWidth >= 1920) { // Large Desktop
          statusOffsetTop = !currentUser?.accountStatus ? -100 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 40 : 0;
      } else if (screenWidth >= 1366) { // Desktop
          statusOffsetTop = !currentUser?.accountStatus ? -90 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 30 : 0;
      } else if (screenWidth >= 1024) { // Laptop
          statusOffsetTop = !currentUser?.accountStatus ? -80 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 20 : 0;
      } else if (screenWidth >= 768) { // Tablet
          statusOffsetTop = !currentUser?.accountStatus ? -70 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 15 : 0;
      } else if (screenWidth >= 480) { // Large Mobile
          statusOffsetTop = !currentUser?.accountStatus ? -60 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 10 : 0;
      } else { // Small Mobile and smaller screens
          statusOffsetTop = !currentUser?.accountStatus ? -50 : 0;
          statusOffsetLeft = !currentUser?.accountStatus ? 5 : 0;
      }

      let topOffset = iconRect.bottom + window.scrollY + statusOffsetTop;
      let leftOffset = iconRect.left + window.scrollX + statusOffsetLeft;

      if (screenWidth >= 1920) { // Large Desktop
          topOffset -= 120;
          leftOffset -= 30;
      } else if (screenWidth >= 1366) { // Desktop
          topOffset -= 110;
          leftOffset -= 20;
      } else if (screenWidth >= 1024) { // Laptop
          topOffset -= 100;
          leftOffset -= 15;
      } else if (screenWidth >= 768) { // Tablet
          topOffset -= 90;
          leftOffset -= 10;
      } else if (screenWidth >= 480) { // Large Mobile
          topOffset -= 80;
          leftOffset -= 5;
      } else { // Small Mobile and smaller screens
          topOffset -= 70;
          leftOffset -= 0;
      }

      setDropdownPosition({
          top: topOffset, 
          left: leftOffset,
      });

      setShowDropdown(!showDropdown);
      setShowDropdownID(showDropdown ? null : chatHistoryId);
    }
  };

  
  const handleChatMessage = (id: any) => {
    setTab(id)
    selectChatHistory(id)
    setShowDropdownID(id);
  }

  useEffect(()=>{
    if(!selectedChatHistory && chatHistories[0] ){
      handleChatMessage(chatHistories[0]?.id)
    }
  },[selectedChatHistory])
  
  useEffect(()=>{
    if(selectedChatHistory==null && chatHistories[0] && tab==undefined){
      handleChatMessage(chatHistories[0]?.id)
    }
  },[chatHistories])

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleCloseDropdown = () => {
    if (showDropdown) {
      setShowDropdown(false);
    }
  };

  const handleOpenDeleteDialog = (dialogId: string) => () => {
    openDialogForFolderOrFileDeletion(dialogId);
  };

  const handleShowRenameModal = (id: string) => () => {
    showRenameModal(id);
  };

  const handleChatDeletionClick = (id: string) => () => {
    handleChatDeletion(id);
  };

  const handleCloseDeleteDialog = (id: string) => () => {
    closeDialogForFolderOrFileDeletion(`delete-chat-${id}`);
  };

  const handleToggleDropDown = (id: string) => () => {
    toggleDropDown(id);
  };

  const handleChatMessageClick = (id: string) => () => {
    handleChatMessage(id);
  };

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
        <div className='d-flex flex-column flex-lg-row' onClick={handleCloseDropdown}>
          <div className='flex-lg-row-fluid pb-4'>
            <div className='card cardcustom '>
              <div className='px-4 pt-4'>
              <span >
                <h2 className=''>{state.title}</h2>
              </span>
              </div>
              <div className={`px-6 py-1 ${showDropdown ? 'overflow-auto' : 'overflow-auto'} bg-primary`}  ref={plusRef}>
                <ul
                  className='nav nav-stretch navline-tabs fw-bold border-transparent flex-nowrap'
                  ref={listRef}
                >
                  <li className='nav-item'>
                    <a
                      className={'nav-link cursor-pointer px-0'}
                      onClick={createNewChat}
                      data-bs-toggle="tooltip"
                      title="Create Chat"
                    >
                      {creatingNewChat ? (
                        <span className='spinner-border spinner-border-sm align-middle ms-2 text-white'></span>
                      ) : (
                        <KTIcon iconName='plus' className='fs-2 text-white border border-3 rounded-circle' />
                      )}
                    </a>
                  </li>
                  {chatHistories.slice(0).reverse().map((chatHistory: any, index: any) => (
                    <>
                      <li id={`list-item-${chatHistory.id}`} className='nav-item d-flex' key={index}>
                        <a
                          className={clsx(`nav-link cursor-pointer text-white pe-0`, { active: tab === chatHistory.id })}
                          onClick={handleChatMessageClick(chatHistory.id)}
                        >
                          <span
                            className='px-4 py-1 rounded-pill text-center d-flex  justify-contentaround'
                            style={tab === chatHistory.id ? { background: '#efb916' } : { border: '' }}
                          >
                            <span className={clsx('text-truncate me-2', chatHistories.length < 5 ? 'fs-4' : 'fs-5')} data-bs-toggle="tooltip" title={chatHistory.name}>{chatHistory.name}</span>
                            <span onClick={handleToggleDropDown(chatHistory.id)} className='cursor-pointer'>
                              <KTIcon iconName='down' className=' text-white' />
                            </span>
                          </span>
                        </a>
                      </li>

                      <div id={`delete-chat-${chatHistory.id}`} style={{ display: 'none' }} className="modal">
                        <span onClick={handleCloseDeleteDialog(chatHistory.id)} className="close" title="Close Modal">&times;</span>
                        <form className="modal-content">
                          <div className="px-7 py-7">
                            <h3>
                              <FormattedMessage id="DOCUMENTS.DELETE"/> <FormattedMessage id="DOCUMENTS.CHAT"/>
                            </h3>
                            <p className='font-size-15'>
                              <FormattedMessage id="DOCUMENTS.DELETE.WARN"/>
                              <span className="mx-1 fw-bolder">{chatHistory.name}</span>
                              <FormattedMessage id="DOCUMENTS.CHAT_2"/>? 
                            </p>

                            <div className="d-flex">
                              <button onClick={handleCloseDeleteDialog(chatHistory.id)} type="button" className="btn btn-primary">
                                <FormattedMessage id="BUTTON.CANCEL" />  
                              </button>
                              <button
                                onClick={handleChatDeletionClick(chatHistory.id)}
                                type="button"
                                className="btn btn-danger ms-3"
                              >
                                <FormattedMessage id="DOCUMENTS.DELETE"/>
                                {deleting && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>

                      {showDropdown && showDropdownID === chatHistory.id && (
                        <div className='position-absolute px-2 py-1 rounded' style={{ background: '#efb916', width: 150, top: dropdownPosition.top, left: dropdownPosition.left, zIndex: 1 }}>
                          <div className="d-flex me4 flex-column gap-2">
                            <span onClick={handleShowRenameModal(showDropdownID)}>
                              <span
                                className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                              >
                                <KTIcon iconName='pencil' className='fs-3 text-dark' />
                              </span>
                              <span className='ms-2 text-white cursor-pointer fs-8'><FormattedMessage id='DOCUMENTS.RENAME_CHAT' /></span>
                            </span>
                            <span onClick={handleOpenDeleteDialog(`delete-chat-${showDropdownID}`)}>
                              <span
                                className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                              >
                                <KTIcon iconName='trash' className='fs-3 text-dark' />
                              </span>
                              <span className='ms-2 text-white cursor-pointer fs-8'><FormattedMessage id='DOCUMENTS.DELETE_CHAT' /></span>
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                  <li className="ms-auto list-unstyled">
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="p-0 border-0 bg-transparent"
                      style={{ lineHeight: 0 }}
                    >
                      <div className="btn btn-sm text-white">
                        <i className="bi bi-x text-white fs-1"></i>
                      </div>
                    </button>
                  </li>
                </ul>
              </div>
              <div className='card-body' style={{ padding: 0 }}>
                <div className='tab-content pt-2'>
                  <div className={clsx('tab-pane', { active: tab == tab })}>
                    <ChatSection
                      selectedChatHistory={selectedChatHistory}
                      currentTeam={state.teamId}
                      setChecked={setChecked}
                      setSuccessResMessage={setSuccessResMessage}
                      setFailureResMessage={setFailureResMessage}
                      setChatHistories={setChatHistories}
                    />
                  </div>
                </div>
              </div>
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
      <RenameChatHistory
        show={openRenameChatDialog}
        handleClose={handleRenameClose}
        chatIdToEdit={chatIdToEdit}
        currentChatDataToEdit={currentChatDataToEdit}
        setChecked={setChecked}
        setSuccessResMessage={setSuccessResMessage}
        setFailureResMessage={setFailureResMessage}
        currentParent={currentParent}
        currentTeam={state.teamId}
        fileId={state.fileId}
        type={state.type}
        closeSideBar={closeSideBar}
        setChatHistories={setChatHistories}
        fetchChats={fetchChats}
      />
    </>
  )
}

export { ChatHistories }
