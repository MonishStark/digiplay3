/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { FormattedMessage } from 'react-intl'
import { Onboarding } from './Onboarding'
import { useAppContext } from '../../../pages/AppContext/AppContext'

type Props = {
  setSuccessResMessage: any
  setFailureResMessage: any
  setChecked: any
}

const OnboardingStep2 = ({
  setSuccessResMessage,
  setFailureResMessage,
  setChecked,
}: Props) => {
  const { appData } = useAppContext()

  return (
    <>
      <div className='card mb10' style={{ background: 'transparent' }}>
        <div className='card-body d-flex align-items-center py8 pt-0'>
          <div className='d-flex h-80px w-80px flex-shrink-0 flex-center position-relative d-md-flex d-none'>
            <span>
              <img
                alt='Logo'
                src={`${appData.appIcon}`}
                className='h-100px w-100px'
              />
            </span>
          </div>

          <div className='card p-6 ms-md-6 bg-gray-400'>
            <p className='list-unstyled text-gray600 fwbold fs-4 p-0 m-0'>
              <FormattedMessage
                id='ONBOARDING.TEAM_DESCRIPTION'
                values={{
                  botName: appData.appBotName,
                  strong: (chunk: any) => <strong>{chunk}</strong>,
                }}
              />
            </p>
          </div>
        </div>
      </div>

      <Onboarding
        setSuccessResMessage={setSuccessResMessage}
        setFailureResMessage={setFailureResMessage}
        setChecked={setChecked}
      />
    </>
  )
}

export { OnboardingStep2 }
