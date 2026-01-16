/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { FormattedMessage } from 'react-intl'
import { useAuth } from '../../auth'
import { useAppContext } from '../../../pages/AppContext/AppContext'

type Props = {
  setNextStep: any
}

const OnboardingStep1 = ({ setNextStep }: Props) => {
  const { auth } = useAuth()
  const { appData } = useAppContext()

  return (
    <>
      <div className='card mb-10' style={{ background: 'transparent' }}>
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

          <div className='ms-6'>
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.GREETING'
                values={{ botName: appData.appBotName }}
              />
            </p>
            <br />
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.NO_TEAMS'
                values={{
                  userName: (
                    <code className='fs-5 text-primary fw-bold mx-0'>
                      {auth?.user?.firstname}
                    </code>
                  ),
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
          </div>
        </div>
      </div>

      <div className='card bg-gray-400'>
        <div className='card-body d-flex align-items-center py-8'>
          <div className='ms-md-6'>
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.TEAM_INTRO'
                values={{
                  botName: appData.appBotName,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
            <br />
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.TEAM_PURPOSE'
                values={{
                  botName: appData.appBotName,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
            <br />
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.TEAM_SECURITY'
                values={{
                  botName: appData.appBotName,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
          </div>
        </div>

        <div className='text-center cardfooter ms-6 px-8 mb-8'>
          <button
            type='button'
            className='btn btn-lg w50 col-12'
            style={{ background: '#efb916' }}
            onClick={setNextStep}
          >
            <span className='indicator-label fw-bolder'>
              <FormattedMessage id='ONBOARDING.ONE' />
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

export { OnboardingStep1 }
