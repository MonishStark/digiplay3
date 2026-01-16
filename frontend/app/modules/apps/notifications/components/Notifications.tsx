import {FC, useEffect} from 'react'
import {useNotifications} from '../../../notification/Notification'
import { getJobStatus, retryFileUpload, updateNotifications} from '../../../document-management/api'
import { FormattedMessage } from 'react-intl'

const Notifications: FC = () => {
  const {notifications, fetchNotifications} = useNotifications()
  const fileNotifications = notifications.filter((noti: any) => noti.type === 'file')
  useEffect(() => {
    updateNotifications().then(() => {
      fetchNotifications()
    })
  }, [])

  function convertISOToCustomDate(isoString: string) {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();  
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');  
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  }

  const retryHandler = async(jobId:number)=>{
    try{
      await retryFileUpload(jobId);
      fetchNotifications();
      pollJobStatus(jobId)
    }catch(err){
      console.log(err)
    }
  }

  const pollJobStatus = (jobId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await getJobStatus(jobId)

        if (response.data.state === 'completed' || response.data.state === 'failed') {
          clearInterval(interval)
          
          fetchNotifications()
        }
      } catch (error) {
        clearInterval(interval)
        fetchNotifications()
        console.error(error)
      }
    }, 1000)
  }

  const handleRetry = (jobId: number) => async () => {
    await retryHandler(jobId);
  };

  return (
    <div className='card h-100'>
      <div className='m-10'>
        <h2 className='d-flex align-items-center'>
          <span><FormattedMessage id="NOTIFICATIONS.NOTIFICATIONS" />
</span>
        </h2>
      </div>

      <div className='scroll-y my-5 px-2 px-lg-8 h-100'>
        <h4 className='text-muted'><FormattedMessage id="NOTIFICATIONS.FILE_UPLOADS" /></h4>

        {fileNotifications?.map((notification: any, index: number) => (
          <div key={`alert${index}`} className={`d-flex flex-stack py-4  px-5 rounded`}>
            <div className='d-flex align-items-center w-50'>
              <div className='symbol symbol-35px '></div>

              <div className='mb-0 me-2'>
                <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                  {notification.title}
                </p>
              </div>
            </div>
            <div className='w-25 d-flex flex-column align-items-center'>
              <p  className='fs-6 text-gray-800  fw-bolder' style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>
                {convertISOToCustomDate(notification.created)}
              </p>
            </div>
            <div className='w-25 d-flex flex-column align-items-center'>
            {notification.message === 'successfull' && (
              <span className='btn btn-sm btn-flex fw-bold btn-success ms-1 px-3  disabled'>Successfull</span>
            )}
            {notification.message === 'failed' && (<div className='d-flex sm-flex-column align-items-end'>
            <button className='btn btn-sm btn-flex fw-bold btn-primary my-1 text-center px-2' onClick={handleRetry(notification.objectId)}>
              Retry
            </button>
              <span className='btn btn-sm btn-flex fw-bold btn-danger my-1 disabled px-2 ms-1'>Failed</span>
              </div>
            )}
            {notification.message === 'uploading' && (
              <span className='btn btn-sm btn-flex fw-bold btn-primary disabled'>Uploading</span>
            )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export {Notifications}