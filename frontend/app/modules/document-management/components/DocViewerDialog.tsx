/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from 'react-bootstrap'
import { KTIcon, toAbsoluteUrl } from '../../../../app/theme/helpers'
import {
    getDocxFile,
    getDocFile,
    getXlsxFile,
    getXlsFile,
    getPDFFile,
    getTextFile,
    getHTMLFile,
    getImageFile,
    getVideoFile,
    getAudioFile
} from "../api";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";

type Props = {
    show: boolean
    handleClose: () => void
    currentParent: any
    currentTeam: any
    fileId: any
    fileType: any
    fileName: any
    selectedDocs: any
    setSelectedDocs: any
    blob: any
    setBlob: any
}

const modalsRoot = document.getElementById('root-modals') || document.body

const DocViewerDialog = ({
    show,
    handleClose,
    currentTeam,
    fileId,
    fileType,
    fileName,
    selectedDocs,
    setSelectedDocs,
    setBlob
}: Props) => {

    const [loading, setLoading] = useState<boolean>(true)
    const [fileType1, setFileType1] = useState<string>(fileType)
    const [blobUrl, setBlobUrl] = useState('');
    const [videoError, setVideoError] = useState(false);
    const handleError = () => {
        setVideoError(true);
    };
    
    useEffect(() => {
        setLoading(true)
        setFileType1(fileType)
        if (currentTeam && fileId) {
            if (fileType == 'docx') {
                getDocxFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'doc') {
                getDocFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/msword' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'xlsx') {
                getXlsxFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'xls') {
                getXlsFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/vnd.ms-excel' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'pdf') {
                getPDFFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'application/pdf' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'txt') {
                getTextFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'text/plain;charset=utf-8' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'html') {
                getHTMLFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'text/html' })
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'jpeg' || fileType == 'jpg') {
                getImageFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'image/jpeg' })
                        const url = URL.createObjectURL(file);
                        setBlobUrl(url);
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'mp4' || fileType == "mov") {
                getVideoFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'video/mp4' })
                        const url = URL.createObjectURL(file);
                        setBlobUrl(url);
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'mp3') {
                getAudioFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'audio/mpeg' })
                        const url = URL.createObjectURL(file);
                        setBlobUrl(url);
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            } else if (fileType == 'png') {
                getImageFile(fileId, currentTeam)
                    .then((response) => {
                        const file = new Blob([response.data], { type: 'image/png' })
                        const url = URL.createObjectURL(file);
                        setBlobUrl(url);
                        setSelectedDocs([file])
                        setBlob(file)
                        setLoading(false)
                    })
                    .catch((err) => {
                        console.log(err)
                    })
            }
        }
    }, [fileId, fileType])

    return createPortal(
        <Modal
            id='doc_viewer_modal'
            tabIndex={-1}
            aria-hidden='true'
            dialogClassName='modal-dialog modal-dialog-centered mw-1000px'
            show={show}
            onHide={handleClose}
            backdrop={true}
        >
            <div className='modal-header'>
                <h2>

                </h2>
                {/* begin::Close */}
                <div className='btn btn-sm btn-icon btn-active-color-primary' onClick={handleClose} data-bs-toggle="tooltip" title="Close">
                    <KTIcon className='fs-1' iconName='cross' />
                </div>
                {/* end::Close */}
            </div>

            <div className='modal-body py-lg-10 px-lg-10'>
                {!loading &&
                <>
                {
                    (fileType1 == "jpeg" || fileType1 == "jpg") && 
                    <>
                        <h3>{fileName}</h3>
                        <div className='d-flex flex-column justify-content-center align-items-center' >
                            <img src={blobUrl} alt="file view" className="img-fluid" />
                        </div>
                    </>
                }
                {
                    (fileType1 == "mp4" || fileType1 == "mov") &&
                    <>
                        <h3>{fileName}</h3>
                        <div className='d-flex flex-column justify-content-center align-items-center' >
                            {
                                !videoError ?
                                <video 
                                src={blobUrl} 
                                className="video-fluid" controls  onError={handleError}></video>
                                :
                                <img src={blobUrl} alt="file view" className="img-fluid" />
                            }
                        </div>
                    </>
                }
                {
                    (fileType1 == "mp3") &&
                    <>
                        <h3>{fileName}</h3>
                        <div className='d-flex flex-column justify-content-center align-items-center' >
                            <audio src={blobUrl} className="audio-fluid" controls></audio>
                        </div>
                    </>
                }
                {
                    (fileType1 != "jpeg" && fileType1 != "jpg" && fileType1 != "mp4" && fileType1 != "mp3" && fileType1 != "mov") && 
                    <DocViewer
                        documents={selectedDocs.map((file: any) => ({
                            uri: window.URL.createObjectURL(file),
                            fileName: fileName,
                        }))}
                        pluginRenderers={DocViewerRenderers}
                    />
                }
                </>
                }
                {loading &&
                    <div className='d-flex justify-content-center' style={{ marginTop: '50px', marginBottom: '50px' }}>
                        <div className='w-50px h-50px'>
                            <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
                        </div>
                    </div>
                }
            </div>
        </Modal>,
        modalsRoot
    )
}

export { DocViewerDialog }
