import { FC } from 'react'

const ExpiredInvitation: FC = () => {
  return (
    <>
      {/* begin::Title */}
      <h1 className='fw-bolder fs-2qx text-gray-900 mb-4'>Invitation Expired</h1>
      {/* end::Title */}

      {/* begin::Text */}
      <div className='fw-semibold fs-6 text-gray-500 mb-7'>
        The invitation you are trying to access have been expired.
      </div>
      {/* end::Text */}
    </>
  )
}

export { ExpiredInvitation }
