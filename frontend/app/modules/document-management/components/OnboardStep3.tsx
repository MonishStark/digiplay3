/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { FormattedMessage } from 'react-intl'
import { useAuth } from '../../auth'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../../pages/AppContext/AppContext'

const OnboardingStep3 = () => {
  const { auth, currentTeam } = useAuth()
  const { appData } = useAppContext()

  return (
    <>
      {/* Greeting Card */}
      <div className='card mb10' style={{ background: 'transparent' }}>
        <div className='card-body d-flex align-items-center py-8'>
          <div className='d-flex h-80px w-80px flex-shrink-0 flex-center position-relative d-md-flex d-none'>
            <span>
              <img
                alt='Logo'
                src={`${appData.appIcon}`}
                className='h-100px w-100px'
              />
            </span>
          </div>

          <div className='ms-md-6'>
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.GREETING_1'
                values={{
                  firstname: (
                    <code className='fs-5 text-primary fw-bold mx-0'>
                      {auth?.user?.firstname}
                    </code>
                  ),
                }}
              />
            </p>
            <br />
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage id='ONBOARDING.REFRESHER_NOTE' />
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className='card' style={{ background: 'transparent' }}>
        <div className='card-body d-flex align-items-center py8 py-0'>
          <div className='ms6'>
            {/* Intro */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.INTRO'
                values={{
                  botName: appData.appBotName,
                  underline: (chunk: any) => <u>{chunk}</u>,
                }}
              />
            </p>
            <br />

            {/* Teams explanation */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.TEAMS_EXPLANATION'
                values={{
                  link: (chunk: any) => <Link to='/teams'><u>{chunk}</u></Link>,
                }}
              />
            </p>
            <br />

            {/* Choosing a Team */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.CHOOSE_TEAM'
                values={{
                  appName: appData.appName,
                  link: (chunk: any) => <Link to='/teams'><u>{chunk}</u></Link>,
                }}
              />
            </p>
            <br />

            {/* Files Info */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.FILES_INFO'
                values={{
                  appName: appData.appName,
                  filesLink: (chunk: any) => (
                    <Link
                      to='/files'
                      style={!currentTeam ? { pointerEvents: 'none', color: 'grey' } : {}}
                    >
                      <u>{chunk}</u>
                    </Link>
                  ),
                  teamsLink: (chunk: any) => <Link to='/teams'><u>{chunk}</u></Link>,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
            <br />

            {/* Add/Remove Info */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.ADD_REMOVE_INFO'
                values={{
                  filesLink: (chunk: any) => (
                    <Link
                      to='/files'
                      style={!currentTeam ? { pointerEvents: 'none', color: 'grey' } : {}}
                    >
                      <u>{chunk}</u>
                    </Link>
                  ),
                  teamsLink: (chunk: any) => <Link to='/teams'><u>{chunk}</u></Link>,
                  underline: (chunk: any) => <u>{chunk}</u>,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
            <br />

            {/* Chat Info */}
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.CHAT_INFO'
                values={{
                  chatLink: (chunk: any) => (
                    <Link
                      to='/chat-histories'
                      style={!currentTeam ? { pointerEvents: 'none', color: 'grey' } : {}}
                    >
                      <u>{chunk}</u>
                    </Link>
                  ),
                }}
              />
            </p>
            <br />

            {/* Closing line */}
            <p className='list-unstyled text-gray600 fw-bolder fs-2 p-0 m-0'>
              <FormattedMessage id='ONBOARDING.CLOSING' />
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export { OnboardingStep3 }
