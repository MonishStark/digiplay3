/* eslint-disable jsx-a11y/anchor-is-valid */
import {FC, useState} from 'react'
import clsx from 'clsx'
import {
  toAbsoluteUrl,
  defaultMessages,
  defaultUserInfos,
  MessageModel,
  UserInfoModel,
  messageFromClient,
} from '../../helpers'
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';

type Props = {
  isDrawer?: boolean
}

const bufferMessages = defaultMessages

const ChatInner: FC<Props> = ({isDrawer = false}) => {
  const [chatUpdateFlag, toggleChatUpdateFlat] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<MessageModel[]>(bufferMessages)
  const [userInfos] = useState<UserInfoModel[]>(defaultUserInfos)

  const sendMessage = () => {
    const newMessage: MessageModel = {
      user: 2,
      type: 'out',
      text: message,
      time: 'Just now',
    }

    bufferMessages.push(newMessage)
    setMessages(bufferMessages)
    toggleChatUpdateFlat(!chatUpdateFlag)
    setMessage('')
    setTimeout(() => {
      bufferMessages.push(messageFromClient)
      setMessages(() => bufferMessages)
      toggleChatUpdateFlat((flag) => !flag)
    }, 1000)
  }

  const onEnterPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div
      className='card-body'
      style={{ background: '#fff', padding: '20px' }}
      id={isDrawer ? 'kt_drawer_chat_messenger_body' : 'kt_chat_messenger_body'}
    >
      <div
        className={clsx('scroll-y me-n5 pe-5', {'h-300px h-lg-auto': !isDrawer})}
        data-kt-element='messages'
        data-kt-scroll='true'
        data-kt-scroll-activate='{default: false, lg: true}'
        data-kt-scroll-max-height='auto'
        data-kt-scroll-dependencies={
          isDrawer
            ? '#kt_drawer_chat_messenger_header, #kt_drawer_chat_messenger_footer'
            : '#kt_header, #kt_app_header, #kt_app_toolbar, #kt_toolbar, #kt_footer, #kt_app_footer, #kt_chat_messenger_header, #kt_chat_messenger_footer'
        }
        data-kt-scroll-wrappers={
          isDrawer
            ? '#kt_drawer_chat_messenger_body'
            : '#kt_content, #kt_app_content, #kt_chat_messenger_body'
        }
        data-kt-scroll-offset={isDrawer ? '0px' : '5px'}
      >
        {messages.map((message, index) => {
          const userInfo = userInfos[message.user]
          const state = message.type === 'in' ? 'info' : 'primary'
          const templateAttr = {}
          if (message.template) {
            Object.defineProperty(templateAttr, 'data-kt-element', {
              value: `template-${message.type}`,
            })
          }
          const contentClass = `${isDrawer ? '' : 'd-flex'} justify-content-${
            message.type === 'in' ? 'start' : 'start'
          }`
          return (
            <div
              key={`message${index}`}
              className={clsx('d-flex', contentClass, 'mb-8', {'d-none': message.template})}
              {...templateAttr}
            >
              <div
                className={clsx(
                  'd-flex align-items',
                  `align-items-${message.type === 'in' ? 'start' : 'end'}`
                )}
              >
                <div className='d-flex flex-column align-items-center mb-2'>
                  {message.type === 'in' ? (
                    <>
                      <div className='symbol symbol-35px symbol-circle '>
                        <img alt='Pic' src={toAbsoluteUrl(`/media/${userInfo.avatar}`)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className='symbol symbol-35px symbol-circle '>
                        <img alt='Pic' src={toAbsoluteUrl(`/media/${userInfo.avatar}`)} />
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={clsx(
                    'p-5 rounded',
                    `bg-light-${state}`,
                    'text-dark fw-bold mw-lg-400px',
                    `text-${message.type === 'in' ? 'start' : 'end'}`
                  )}
                  data-kt-element='message-text'
                >
                  {parse(DOMPurify.sanitize(message.text))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className='card-footer pt-4'
        id={isDrawer ? 'kt_drawer_chat_messenger_footer' : 'kt_chat_messenger_footer'}
      >
        <textarea
          className='form-control form-control-flush mb-3'
          style={{ background: '#f1f1f1' }}
          rows={1}
          data-kt-element='input'
          placeholder='What can I do for you?'
          value={message}
          onChange={handleMessageChange}
          onKeyDown={onEnterPress}
        ></textarea>

        <div className='d-flex flex-stack'>
          <div className='d-flex align-items-center me-2'>
          </div>
          <button
            className='btn btn-primary'
            type='button'
            data-kt-element='send'
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export {ChatInner}
