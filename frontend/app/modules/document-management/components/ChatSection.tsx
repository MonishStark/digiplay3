/* eslint-disable jsx-a11y/anchor-is-valid */
import { FC, useEffect, useState } from 'react'
import clsx from 'clsx'
import { getChatMessages, addMessagesToChat } from '../api'
import {
  toAbsoluteUrl
} from '../../../../app/theme/helpers'
import { useAuth } from '../../auth'
import { useAppContext } from '../../../pages/AppContext/AppContext'
import { Bounce, ToastContainer, toast } from 'react-toastify';
import { useIntl } from 'react-intl'

type Props = {
  isDrawer?: boolean
  selectedChatHistory: any
  currentTeam: any
  height?: any
  setChecked: any
  setSuccessResMessage: any
  setFailureResMessage: any
  setChatHistories:any
}

const ChatSection: FC<Props> = ({ isDrawer = false, selectedChatHistory, currentTeam, height, setChecked, setFailureResMessage, setChatHistories }) => {
  const [textmessage, setTextMessage] = useState<string>('')
  const [messages, setMessages] = useState<Array<any>>([])
  const [querying, setQuerying] = useState<boolean>(false)
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState<boolean>(true)
  const [messagesUpdated, setMessagesUpdated] = useState<boolean>(false)
  const { appData } = useAppContext();
  const [shuffledChatMessages, setShuffledChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const intl = useIntl();

  const autoScrollChatSection = () => {
    // chatScroll.current?.scrollTo(0, chatScroll.current.scrollHeight)
    const chatScroller = document.getElementById("chat-scroller")
    if (chatScroller) {
      chatScroller?.scrollTo(0, chatScroller.scrollHeight + 500)
    }
  }

  useEffect(() => {
    setLoading(true)
    setSuggestedQuestions([])
    if(selectedChatHistory){
    getChatMessages(selectedChatHistory,currentTeam)
      .then((response) => {
        if (response.data.success) {
          setMessages(response.data.chatMessages)
          setLoading(false)
          setMessagesUpdated(true)
        }
      })
      .then(() => {
        autoScrollChatSection()
      })
    }
  }, [selectedChatHistory])

  useEffect(() => {
    if (messagesUpdated) {
      autoScrollChatSection()
      setMessagesUpdated(false)
    }
  }, [messagesUpdated])

  const handleQuerying = (question: string = '') => {
    setQuerying(true)
    setMessages(messagesList => {
      const newMessages = [
        {
          message: textmessage ? textmessage : question,
          role: 'user'
        },
        {
          loader: true,
          role: 'bot'
        }
      ]
      setTextMessage("")
      return [...messagesList, ...newMessages]
    })
    setMessagesUpdated(true)
    addMessagesToChat(selectedChatHistory, currentTeam, textmessage ? textmessage : question, "user")
      .then((response) => {
        if (response.data.success) {
          setSuggestedQuestions(response.data.suggestedQuestions)
          setMessages(messagesList => {
            let oldMessages = messagesList
            const newMessage = response.data.messageData
            const lastMessage = oldMessages.pop()
            // if(messages.length===0){
            //   setChatHistories(response.data.userChatHistories)
            // }

            if (!lastMessage.loader) {
              oldMessages = [...oldMessages, lastMessage]
            }
            return [...oldMessages, newMessage]
          })
          setQuerying(false)
          setMessagesUpdated(true)
        } else {
          setQuerying(false)
          setFailureResMessage(response.data.message)
          setChecked(true)
        }
      })
      .catch((err) => {
        if (err.response) {
          // Handle 429 error
          if (err.response.status === 429) {
            toast.info(err.response.data.message, {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
              transition: Bounce,
            });
              // Remove the last two messages (user and bot)
            setMessages(messagesList => {
              const updatedMessages = [...messagesList];
              // Remove the last two messages (user and bot)
              updatedMessages.splice(updatedMessages.length - 2, 2);
              return updatedMessages;
            });
          }
        }
        setQuerying(false)
      })
  }

  const onEnterPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault()
      handleQuerying()
    }
  }

  const handleShowMoreAndShowLessClick = (id: any) => {
    let updatedList: Array<any> = []
    messages.map((message: any) => {
      if (message.id != id) {
        updatedList = [...updatedList, message]
      } else {
        const newMessage = message
        const toggledValue = !newMessage.showFullCitation
        newMessage.showFullCitation = toggledValue
        updatedList.push(newMessage)
      }
    })
    setMessages(updatedList)
  }

  const [fixedBottom, setFixedBottom] = useState<boolean>(false);
  useEffect(() => {
    function isFixedBottom() {
      const mediaQuery = window.matchMedia('(max-width: 991px)');
      return mediaQuery.matches;
    }
    setFixedBottom(isFixedBottom());
  }, []);

  const shuffleChatMessage = (chatMessage: any) => {
    for (let i = chatMessage.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chatMessage[i], chatMessage[j]] = [chatMessage[j], chatMessage[i]];
    }
    return chatMessage;
  }

  const getRandomChatMessage = () => {
    const randomIndex = Math.floor(Math.random() * shuffledChatMessages.length);
    return shuffledChatMessages[randomIndex];
  }

  useEffect(() => {
    setShuffledChatMessages(shuffleChatMessage(appData.chatMessages));
    setCurrentMessage(getRandomChatMessage());

    const intervalId = setInterval(() => {
      setShuffledChatMessages(shuffleChatMessage(appData.chatMessages));
      setCurrentMessage(getRandomChatMessage());
    }, 5000);

    return () => clearInterval(intervalId);
  }, [appData.chatMessages, currentMessage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextMessage(e.target.value);
  };

  const handleSendClick = () => {
    handleQuerying();
  };

  const createHandleQuestionClick = (question: string) => {
    return (e: React.MouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      handleQuerying(question);
    };
  };

  const handleToggleMessageClick = (id: string) => () => {
    handleShowMoreAndShowLessClick(id);
  };

let heightValue = '50vh';
  if(window.innerHeight<600){
    heightValue='53vh'
  }
  else if(window.innerHeight<700){
    heightValue='60vh'
  }else if(window.innerHeight<800){
    heightValue='65vh'
  }else if(window.innerHeight<900){
    heightValue='67vh'
  }else if(window.innerHeight<1000){
    heightValue='72vh'
  }else if(window.innerHeight<1100){
    heightValue='74vh'
  }else if(window.innerHeight<1200){
    heightValue='76vh'
  }

  return (
    <div
      className="d-flex flex-column"
      style={{ padding: '20px', height: heightValue }}
      id={isDrawer ? 'kt_drawer_chat_messenger_body' : 'kt_chat_messenger_body'}
    >
      <ToastContainer />
      {!loading &&
        <div
          className={clsx('d-flex flex-column chat-height scroll-y me-n5')}
          id='chat-scroller'
        // ref={chatScroll}
        >
          {messages.map((message, index) => {
            const state = message.role === 'user' ? 'info' : 'primary'
            const templateAttr = {}
            if (message.template) {
              Object.defineProperty(templateAttr, 'data-kt-element', {
                value: `template-${message.role}`,
              })
            }
            const contentClass ='justify-content-start'

            return (
              <>
                <div
                  key={`message${index}`}
                  className={clsx('d-flex', contentClass,  { 'd-none': message.template })}
                  {...templateAttr}
                >
                  <div
                    className={clsx(
                      'd-flex align-items',
                      ``,
                      `${message.role == 'user' ? '' : ''}`
                    )}
                  >
                    <div className='d-flex flex-column align-items-center'>
                      {message.role === 'user' ? (
                        <>
                          <div className='symbol symbol-35px symbol-circle ms-2 mt-2'>
                            <img alt='Pic' src={`${currentUser?.avatarUrl}`} />
                          </div>
                        </>
                      ) : (
                        <>
                           <div className='symbol symbol-35px symbol-circle mt-2' style={{ overflow: 'hidden', paddingLeft: '10px',width:'43px' }}>
                            <img alt='Pic'
                              className='w-35px h-35px'
                              src={`${appData.appIcon}`}
                              style={{ marginLeft: '-3px' }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {message.loader ? (
                      <div
                        className={clsx(
                          'p-5 rounded',
                          `bg-light-${state}`,
                          'text-dark',
                          `text-start`
                        )}
                      >
                        <div className='h-30px d-flex align-items-center justify-content-center'>
                          {currentMessage}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={clsx(
                          'p-5 rounded',
                          '',
                          `text-start`,
                          'ms-2'
                        )}
                        data-kt-element='message-text'
                      >
                        {message.message.split("$$").map((str: any, index: number) => (
                          <>
                            <span className='mt-3'>{str}</span>
                            {index != message.message.split("$$").length - 1 && <><br /><br /></>}
                          </>
                        ))}
                        <div className='d-flex flex-wrap mt-2'>

                          {message.showFullCitation &&
                            <>
                              {message.source &&
                                <>
                                  {JSON.parse(message.source).map((source: any, index: number) => (
                                    <div className="d-flex">
                                      <span
                                        className='bg-light-warning mt-2 px-3 py-2'
                                        style={{ borderTopLeftRadius: '5px', borderBottomLeftRadius: '5px' }}
                                      >
                                        {index + 1}
                                      </span>
                                      <span
                                        className='py-2 me-2 mt-2'
                                        style={{
                                          backgroundColor: '#f1f1f1',
                                          color: '#000',
                                          borderTopRightRadius: '5px',
                                          borderBottomRightRadius: '5px'
                                        }}
                                      >
                                        <span className='px-2 py-2'>
                                          {source.fileName}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                  <span
                                    className='badge badge-light-danger ms-2 mt-2 cursor-pointer'
                                    onClick={handleToggleMessageClick(message.id)}
                                  >
                                    Show less
                                  </span>
                                </>
                              }
                            </>
                          }
                          {!message.showFullCitation &&
                            <>
                              {message.source &&
                                <>
                                  <div className="d-flex">
                                    <span
                                      className='bg-light-warning px-3 py-2 mt-2'
                                      style={{ borderTopLeftRadius: '5px', borderBottomLeftRadius: '5px' }}
                                    >
                                      {1}
                                    </span>
                                    <span
                                      className='py-2 me-2 mt-2'
                                      style={{
                                        backgroundColor: '#f1f1f1',
                                        color: '#000',
                                        borderTopRightRadius: '5px',
                                        borderBottomRightRadius: '5px'
                                      }}
                                    >
                                      <span className='px-2 py-2'>
                                        {JSON.parse(message.source)[0].fileName}
                                      </span>
                                    </span>

                                    {JSON.parse(message.source).length > 1 &&
                                      <span
                                        className='badge badge-light-primary ms-2 mt-2 cursor-pointer'
                                        onClick={handleToggleMessageClick(message.id)}
                                      >
                                        Show more
                                      </span>
                                    }
                                  </div>
                                </>
                              }
                            </>
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })}
          {
            !querying && suggestedQuestions.length > 0 && 
            <div className='mt-2 mb-2'>
              <h5 className="text-primary ms-3">Suggested Questions :-</h5>
              {
                suggestedQuestions.map((question, index) => {
                  return (
                  <div className='h-30px d-flex align-items-center mt-3' key={index}>
                    <span className='bg-gray-300 p-2 rounded cursor-pointer'
                      onClick={createHandleQuestionClick(question)}
                    >
                      <span className='ps-3'>
                      {question}
                      </span>
                      <span className="ms-5 fs-5 fw-bolder pe-3">
                        +
                      </span>
                    </span>
                  </div>
                  )
                })
              }
            </div>

          }
        </div>
      }
      
      {loading &&
        <div className='d-flex justify-content-center mx-auto my-auto'>
          <div className='w-50px h-50px'>
            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
          </div>
        </div>
      }

      <div
        className={`d-flex mt-auto ${fixedBottom ? 'fixed-bottom bg-light p-4' : 'pt-4'} justify-content-center`}
        id={isDrawer ? 'kt_drawer_chat_messenger_footer' : 'kt_chat_messenger_footer'}
        style={{ zIndex: 100 }}
      >
        <textarea
          className='form-control form-control-flush rounded-pill bg-light w-100'
          rows={1}
          data-kt-element='input'
          placeholder={intl.formatMessage({ id: "CHAT.ENTER_PROMPT" })}
          value={textmessage}
          onChange={handleTextChange}
          onKeyDown={onEnterPress}
          autoFocus
        ></textarea>

        <div className='d-flex flex-stack'>
          <div className='d-flex align-items-center me-2'>
          </div>
          <i className="bi bi-arrow-right-circle fs-2  "
          style={{color:'#71797E'}}
            data-kt-element='send'
            onClick={handleSendClick}
          >
          </i>
        </div>
      </div>
    </div>
  )
}

export { ChatSection }
