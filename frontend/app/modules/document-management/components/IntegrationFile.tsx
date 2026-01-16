import { useEffect, useState} from 'react'
import {uploadDocumentFromIntegration, getJobStatus, retryFileUpload} from '../api'
import {useNotifications} from '../../notification/Notification'

interface FileProps {
  index:number
  fileId: any
  name:any,
  size:any,
  integrationId: String
  source:String
  currentParent: string
  currentTeamId: string
  onDelete: () => void
}
export const IntegrationFile = (props: FileProps) => {
    // console.log(props)

  const [status, setStatus] = useState<string>('')
  const [jobId, setJobId] = useState<number>(0)
  const [jobStatus, setJobStatus] = useState<string>('')

  const {fetchNotifications} = useNotifications()

  const isValidFileType = (file: File) => {
    const validFileTypes: Record<string, boolean> = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
      'application/pdf': true,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
      'text/plain': true,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
      'application/msword': true,
      'application/vnd.ms-excel': true,
      'image/jpeg': true,
      'image/jpg': true,
      'image/png': true,
      'video/mp4': true,
      'audio/mpeg': true,
      'video/quicktime': true,
      'image/mov': true
    }
    return !!validFileTypes[file?.type]
  }

  useEffect(() => {
    uploadHandlerStep2()
  }, [])

  useEffect(() => {
    if (jobStatus === 'completed') {
      setStatus('Completed')
    } else if (jobStatus === 'active') {
      setStatus('Uploading')
    } else if (jobStatus === 'waiting') {
      setStatus('In Queue')
    } else if (jobStatus === 'failed') {
      setStatus('Uploading Failed')
    } else if (jobStatus === 'Generating Summary') {
      setStatus('Generating Summary')
    }else if (jobStatus ==='Extracting Data') {
      setStatus('Extracting Data')
    }else if (jobStatus ==='Analyzing Document') {
      setStatus('Analyzing Document')
    }else if (jobStatus ==='Uploading...') {
      setStatus('Uploading...')
    }
  }, [jobStatus])

  const uploadHandlerStep2 = () => {
    setJobStatus('waiting')
      setTimeout(() => {
    //     let formData = new FormData()
    //     formData.append('file', props.file)
    //     formData.append("source",String(props.source))
    //   formData.append('parentId', props.currentParent)
    //   formData.append("fileName",props.file.name)
      
      

      uploadDocumentFromIntegration(props.fileId,props.currentTeamId,props.currentParent,props.integrationId)
        .then((response) => {
          let newJobId;
          if(response.data.message){
            newJobId = parseInt(response.data.message.split(' ')[1], 10)
          }
          else {
            newJobId = NaN
          }
          if(Number.isNaN(newJobId)){
            setJobId(response.data.jobId)
            pollJobStatus(response.data.jobId)
          }
          else {
            setJobId(newJobId)
            pollJobStatus(newJobId)
          }
        })
        .catch((err) => {
          if (err.response) {
            // Handle 429 error
            if (err.response.status === 429) {
              setStatus(err.response.data.message)
              return;
            }
          }

          setStatus('Uploading Failed')
          fetchNotifications()
          console.error(err)
        })
      }, props.index*700);
      
    
  }

  const retryHandler = async()=>{
    try{
      const response= await retryFileUpload(jobId);
      if(response.data.error === "Job not found"){
        uploadHandlerStep2();
      }else{
        console.log(response)
        pollJobStatus(jobId)
      }
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
          setJobStatus(response.data.state)
          fetchNotifications()
        } else if (response.data.progress === 25) {
          setJobStatus('Generating Summary')
        } else if (response.data.progress === 50) {
          setJobStatus('Extracting Data')
        } else if (response.data.progress === 75) {
          setJobStatus('Analyzing Document')
        } else {
          setJobStatus(response.data.state)
        }
      } catch (error) {
        clearInterval(interval)
        fetchNotifications()
        setStatus('Uploading Failed')
        console.error(error)
      }
    }, 1000)
  }
  return (
    <div className=' d-flex justify-content-between my-3'>
      <div className='d-flex flex-wrap mw-50 d-flex cursor-pointer mw-25 mw-lg-100'>
        <p className="" style={{ wordWrap: 'break-word', wordBreak: 'break-all', hyphens: 'auto' }}>{props.name }</p><h6 className='ms-1'>({(props.size / 1000).toFixed(2)} kb)</h6>
      </div>
    
      {status === 'Too Many Request' && (
         <div className='d-flex h-25'>
          <button className='btn btn-sm btn-flex fw-bold btn-info mx-1' disabled>
            {status}
          </button>
        </div>
      )}
      {status === 'Uploading Failed' && (
         <div className='d-flex h-25'>
          <button className='btn btn-sm btn-flex fw-bold btn-danger mx-1' disabled>
            {status}
          </button>
          <button className='btn btn-sm btn-flex fw-bold btn-primary mx-1' onClick={retryHandler}>
            Retry
          </button>
        </div>
      )}
      {status === 'Uploading' ||
      status === 'Uploading...' ||
      status === 'Uploading' ||
      status === 'Generating Summary' ||
      status === 'Extracting Data' ||
      status === 'Analyzing Document' ||
      status === 'Completed' ||
      status === 'In Queue' ? (
        <div className='d-flex h-25'>
          <button
            className={`btn btn-sm btn-flex fw-bold m-1 ${
              status === 'Completed'
                ? 'btn-success'
                : status === 'In Queue'
                ? 'btn-warning text-dark'
                : 'btn-primary'
            }`}
            disabled
          >
            {status}
          </button>
        </div>
      ) : null}
    </div>
  )
}