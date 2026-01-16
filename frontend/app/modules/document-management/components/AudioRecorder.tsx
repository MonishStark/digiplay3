import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../auth'
import {
  getAllItems,
  uploadAudio,
  getRecordingPromptTime,
  getRecordingLimit,
} from '../api'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import { FormattedMessage, useIntl } from 'react-intl'
import { KTIcon } from '../../../../app/theme/helpers'

const AudioRecorder = () => {
  const [recording, setRecording] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | undefined>(undefined)
  const [duration, setDuration] = useState(0)
  const [recordingPromptTime, setRecordingPromptTime] = useState<number>(1)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [recordingName, setRecordingName] = useState('')
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showInactivityModal, setShowInactivityModal] = useState(false)
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { teamList } = useAuth()
  const [uploading, setUploading] = useState<boolean>(false)
  const [foldersList, setFoldersList] = useState<any[]>([])
  const [folder, setFolder] = useState<string | undefined>('4')
  const [teams, setTeams] = useState<any>([])
  const [team, setTeam] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showStartRecordingPrompt, setShowStartRecordingPrompt] = useState(false)
  const [currentRecordCount, setCurrentRecordCount] = useState<number>(0)
  const [recordLimit, setRecordLimit] = useState<number>(0)
  const intl = useIntl()
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (recording) {
        const message = 'Recording is ongoing. Are you sure you want to leave?'
        event.returnValue = message
        return message
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [recording])

  // Prompt user periodically
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const promptUser = (delay: number) => {
      timeoutId = setTimeout(() => {
        setShowPromptModal(true)
        responseTimeoutRef.current = setTimeout(() => {
          handlePromptResponse('no response')
        }, 2 * 60 * 1000)
        promptUser(recordingPromptTime * 60 * 1000)
      }, delay)
    }

    if (recording) promptUser(recordingPromptTime * 60 * 1000)

    return () => {
      clearTimeout(timeoutId)
      if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current)
    }
  }, [recording, recordingPromptTime])

  const startRecording = () => setShowModal(true)

  const handleStartRecording = (e: any) => {
    e.preventDefault()
    if (team && recordingName !== '') {
      setShowModal(false)
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream)
          recorder.ondataavailable = e => setAudioChunks(prev => [...prev, e.data])
          recorder.onstart = () => {
            setDuration(0)
            timerRef.current = setInterval(() => setDuration(prev => prev + 1000), 1000)
          }
          recorder.start()
          setMediaRecorder(recorder)
          setRecording(true)
          setShowStartRecordingPrompt(true)
        })
        .catch(err => console.error('Error accessing microphone:', err))
    } else {
      setErrorMessage('Fill all details')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      setRecording(false)
      setDuration(0)
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  const handleChange = async () => {
    setUploading(true)
    const formData = new FormData()
    const audioFile = new Blob(audioChunks, { type: 'audio/wav' })
    const fileName = `${recordingName}.wav`
    formData.append('parentId', folder || '')
    formData.append('fileName', fileName)
    formData.append('file', audioFile)

    uploadAudio(formData,team)
      .then(response => {
        setAudioChunks([])
        setUploading(false)
        if (response.data.success){
          //
        } 
      })
      .catch(err => {
        console.error(err)
        setAudioChunks([])
        setUploading(false)
      })

    setRecordingName('')
  }

  useEffect(() => {
    if (audioChunks.length > 0) handleChange()
  }, [audioChunks])

  useEffect(() => {
    if (errorMessage !== '') {
      const t = setTimeout(() => setErrorMessage(''), 5000)
      return () => clearTimeout(t)
    }
  }, [errorMessage])

  useEffect(() => {
    if (team) {
      getAllItems(team,"folder").then(res => {
        setFoldersList(res.data.items)
    }).catch(err =>{
        console.error(err)
    })
  }
        
  }, [team])

  useEffect(() => {
    setTeams(teamList)
    if (teamList[0]) setTeam(teamList[0].id)
  }, [teamList])

  const handlePromptResponse = (response: string) => {
    setShowPromptModal(false)
    if (response === 'yes') {
      if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current)
    } else if (response === 'no response') {
      stopRecording()
      setShowInactivityModal(true)
    } else {
      stopRecording()
    }
  }

  useEffect(() => {
    getRecordingPromptTime()
      .then(res => setRecordingPromptTime(Number(res.data.promptTime)))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (showModal) {
      getRecordingLimit()
        .then(res => {
          setCurrentRecordCount(res.data.data.count)
          setRecordLimit(res.data.data.limit)
        })
        .catch(console.error)
    }
  }, [showModal])

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFolder(e.target.value)
  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setTeam(e.target.value)
  const handleRecordingNameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setRecordingName(e.target.value)
  return (
    <div className='d-flex cursor-pointer px-5'>
      {/* --- Record Button --- */}
      {!recording && audioChunks.length === 0 && (
        <div>
          {teamList.length === 0 ? (
            <span className='menu-title text-white'></span>
          ) : (
            <>
              {new URL(import.meta.env.VITE_APP_BACKEND_ORIGIN_URL || 'http://localhost')
                .protocol === 'https:' ||
              new URL(import.meta.env.VITE_APP_BACKEND_ORIGIN_URL || 'http://localhost')
                .hostname === 'localhost' ? (
                <span onClick={startRecording} className='menu-title text-white'>
                  <i className='bi bi-mic text-white fs-4 me-2'></i>
                  <FormattedMessage id='DOCUMENTS.RECORD' />
                </span>
              ) : (
                <span onClick={() => setShowInfo(true)} className='menu-title text-white'>
                  <i className='bi bi-mic text-white fs-4 me-2'></i>
                  <FormattedMessage id='DOCUMENTS.RECORD' />
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* --- Recording Indicator --- */}
      {recording && (
        <div onClick={stopRecording} className='d-flex align-items-center'>
          <span className='d-flex align-items-center justify-content-center'>
            <span
              className='bullet bullet-dot bg-danger translate-middle animation-blink ms-2 align-self-center'
              style={{ height: '12px', width: '12px', position: 'relative', top: '6px' }}
            />
            <span className='menu-title text-white'>
              <FormattedMessage id='DOCUMENTS.RECORDING_RECORDING' />
            </span>
          </span>
        </div>
      )}

      {/* --- Uploading Indicator --- */}
      {uploading && (
        <div>
          <span className='spinner-border spinner-border-sm align-middle me-2 text-white'></span>
          <span className='menu-title text-white'>
            <FormattedMessage id='DOCUMENTS.UPLOADING' />
          </span>
        </div>
      )}

      {/* --- Start Recording Modal --- */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        dialogClassName='modal-dialog modal-dialog-centered mw-900px'
        backdrop
      >
        <div className='modal-header'>
          <h2>
            <FormattedMessage id='DOCUMENTS.START_RECORDING' />
          </h2>
          <div
            className='btn btn-sm btn-icon btn-active-color-primary'
            onClick={() => setShowModal(false)}
          >
            <KTIcon className='fs-1' iconName='cross' />
          </div>
        </div>
        <form onSubmit={handleStartRecording}>
          <Modal.Body>
            <div className='form-group my-2 px-5'>
              <p className='fw-bolder text-dark fs-4 text-end my-2'>
                <FormattedMessage id='COMPANY.PROFILE.USAGE.CURRENT_MONTH_USAGE' /> :
                {currentRecordCount} / {recordLimit}{' '}
                <FormattedMessage id='DOCUMENTS.RECORDINGS' />
              </p>

              <label
                htmlFor='recordingName'
                className='fw-bolder text-dark fs-4 required my-2'
              >
                <FormattedMessage id='DOCUMENTS.RECORDING_NAME' />
              </label>
              <input
                type='text'
                placeholder={intl.formatMessage({ id: 'DOCUMENTS.RECORDING_NAME' })}
                className='form-control'
                id='recordingName'
                value={recordingName}
                onChange={handleRecordingNameChange}
                required
              />
            </div>

            <div className='form-group my-2 p-5'>
              <label htmlFor='team' className='fw-bolder text-dark fs-4 my-2'>
                <FormattedMessage id='DOCUMENTS.TEAM' />
              </label>
              <select
                className='form-select'
                id='team'
                value={team}
                onChange={handleTeamChange}
                required
              >
                {teams.map((team: any) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>
            {team && (
              <div className='form-group my-2 px-5 pb-5'>
                <label htmlFor='team' className='fw-bolder text-dark fs-4'>
                  <FormattedMessage id='DOCUMENTS.FOLDER' />
                </label>
                <select
                  className='form-select'
                  id='team'
                  value={folder}
                  onChange={handleFolderChange}
                  required
                >
                  <option value='4'>Select a Folder</option>
                  {foldersList.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMessage && (
              <p className='text-center text-danger mt-5 p-1 border border-danger rounded'>
                {errorMessage}
              </p>
            )}
          </Modal.Body>

          <Modal.Footer className='d-flex justify-content-center w-100'>
            <Button
              variant='primary'
              type='submit'
              className='w-50'
              disabled={
                recordingName === '' || !team || currentRecordCount >= recordLimit
              }
            >
              <FormattedMessage id='DOCUMENTS.START_RECORDING' />
            </Button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* --- Continue Recording Prompt --- */}
      <Modal show={showPromptModal} onHide={() => handlePromptResponse('false')}>
        <Modal.Header>
          <Modal.Title>
            <FormattedMessage id='DOCUMENTS.CONTINUE_RECORDING' />
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormattedMessage id='DOCUMENTS.RECORDING_PROMPT_1' /> {Math.floor(duration / 60000)}{' '}
          <FormattedMessage id='DOCUMENTS.RECORDING_PROMPT_2' />
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => handlePromptResponse('false')}>
            <FormattedMessage id='DOCUMENTS.NO' />
          </Button>
          <Button variant='primary' onClick={() => handlePromptResponse('yes')}>
            <FormattedMessage id='DOCUMENTS.YES' />
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Start Recording Prompt --- */}
      <Modal show={showStartRecordingPrompt} onHide={() => setShowStartRecordingPrompt(false)}>
        <Modal.Header>
          <Modal.Title>
            <span className='fw-bolder text-dark fs-3'>
              <FormattedMessage id='DOCUMENTS.RECORDING_STARTED' />
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <span className='fw-bolder text-dark fs-4'>
            <FormattedMessage id='DOCUMENTS.RECORDING_INSTRUCTION' />
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowStartRecordingPrompt(false)}>
            <FormattedMessage id='BUTTON.CLOSE' />
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInfo} onHide={() => setShowInfo(false)}>
        <Modal.Header>
          <Modal.Title>
            <span className='fw-bolder text-dark fs-3'>
              <FormattedMessage id='DOCUMENTS.RECORDING_DESCRIPTION' />
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowInfo(false)}>
            <FormattedMessage id='BUTTON.CLOSE' />
          </Button>
        </Modal.Footer>
      </Modal>

      {/* --- Inactivity Modal --- */}
      <Modal show={showInactivityModal} onHide={() => setShowInactivityModal(false)}>
        <Modal.Header>
          <Modal.Title>
            <span className='fw-bolder text-dark fs-3'>
              <FormattedMessage
                id='DOCUMENTS.RECORDING_STOPPED'
                defaultMessage='Recording stopped due to inactivity'
              />
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <span className='fw-bolder text-dark fs-4'>
            <FormattedMessage
              id='DOCUMENTS.RECORDING_AUTO_STOP_MESSAGE'
              defaultMessage='Your recording has been stopped and saved automatically due to no response.'
            />
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='primary' onClick={() => setShowInactivityModal(false)}>
            <FormattedMessage id='BUTTON.CLOSE' defaultMessage='Close' />
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export { AudioRecorder };
