import React, { useEffect, useState, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { KTIcon, toAbsoluteUrl } from '../../../../app/theme/helpers';
import { useAuth } from '../../auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { getHTMLFile, updateDocument, updateFilename, getFolderTreeForFile } from '../api';
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { FormattedMessage } from 'react-intl';
import { OnboardingStep3 } from './OnboardStep3';
import { OnboardingStep2 } from './OnboardStep2';
import { OnboardingStep1 } from './OnboardStep1';

const DocumentUpdater = () => {
    const { state }: any = useLocation()
    const currentTeamId = state.currentTeam
    const currentParent = state.currentParent
    const [folderTree, setFolderTree] = useState<any>([])
    const fileId = state.fileId ? state.fileId : null
    const [loading, setLoading] = useState<boolean>(true)
    const [originalValue, setOriginalValue] = useState<string>('')
    const [value, setValue] = useState<string>('');
    const [originalFileName, setOriginalFileName] = useState<string>(state.fileName ? state.fileName : '')
    const [fileName, setFileName] = useState<string>(state.fileName ? state.fileName : '')
    const [valid, setValid] = useState<boolean>(true)
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(false)
    const [creating, setCreating] = useState<boolean>(false)
    const [uploading, setUploading] = useState<boolean>(false)
    const [nameUpdating, setNameUpdating] = useState<boolean>(false)
    const { auth, isBackFromPages, setIsBackFromPages, setIstextEditor, currentTeam, teamList } = useAuth()
    const navigate = useNavigate()
    const [displayUpdateBtn, setDisplayUpdateBtn] = useState<boolean>(false)
    const [nextStep, setNextStep] = useState<boolean>(false)
    const hasUnsavedChanges = useRef(false);
    const [change, setChange] = useState<boolean>(false)
    const [updateDocumentSuccessResponse,setUpdateDocumentSuccessResponse] = useState("");
    const [updateDocumentFailureResponse,setUpdateDocumentFailureResponse] = useState("");

    useEffect(() => {
        if (originalValue != value || fileName != originalFileName) {
            setIstextEditor(true)
            setChange(true)
            hasUnsavedChanges.current = true;
        }
        else {
            setIstextEditor(false)
            setChange(false)
            hasUnsavedChanges.current = false;
        }
    }, [value, fileName])

    useEffect(() => {
        const handleBeforeUnload = (event: any) => {
            if (change) {
                const message = "You have unsaved changes. Are you sure you want to leave?";
                event.returnValue = message;
                return message;
            }
        };

        const handleNavigateAway = (event: any) => {
            if (change) {
                const confirmation = window.confirm("You have unsaved changes. Are you sure you want to leave?");
                if (!confirmation) {
                    event.preventDefault();
                } else {
                    setIstextEditor(false)
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handleNavigateAway);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handleNavigateAway);
        };
    }, [change]);

    useEffect(() => {
        if (value != originalValue) {
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [value])

    useEffect(() => {
        if (fileName != originalFileName) {
            console.log(state.fileName)
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [fileName])

    useEffect(() => {
        if (fileId) {
            getHTMLFile(fileId, currentTeamId)
                .then((response) => {
                    const str = new TextDecoder().decode(response.data)
                    setOriginalValue(str)
                    setValue(str)
                    getFolderTreeForFile(currentParent,currentTeamId)
                        .then((response) => {
                            setFolderTree(response.data.predecessors)
                            setLoading(false)
                        })
                        .catch((err) => {
                            console.log(err)
                            setLoading(false)
                        })
                })
                .catch((err) => {
                    console.log(err)
                    setLoading(false)
                })
        }
    }, [])

    useEffect(() => {
        if (isBackFromPages) {
            navigate(`${localStorage.getItem('current-url')}`, { state: localStorage.getItem('current-parent') })
        }
    }, [isBackFromPages])

    useEffect(() => {
        if (auth?.user?.role == 3) {
            navigate('/error/404');
            setIstextEditor(false);
        }
    }, [])

    if (successResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setSuccessResMessage("");
            }, 200);
        }, 5000);
    }

    if (failureResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setFailureResMessage("");
            }, 200);
        }, 5000);
    }

    const handleFileNameChange = (e: any) => {
        if (!valid) setValid(true)
        setFileName(e.target.value)
    }

    const resetAlerts = () => {
        const success: HTMLElement = document.getElementById("update-success")!
        const fail: HTMLElement = document.getElementById("update-fail")!
        if (fail && fail.style) {
            fail.style.display = "none"
        }
        if (success && success.style) {
            success.style.display = "none"
        }
    }

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ],
    }

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'color', 'background'
    ]

    const handleSubmit = () => {
        hasUnsavedChanges.current = false;
        setIstextEditor(false)
        if (fileName == "") {
            setValid(false)
            window.scrollTo(0, 0)
            return
        }
        if (value == "") {
            setFailureResMessage("Text editor is empty, please add some text.")
            setChecked(true)
            window.scrollTo(0, 0)
            return
        }

        if (originalValue == value) {
            setNameUpdating(true)
            updateFilename(fileName, fileId, currentParent, currentTeamId)
                .then((res) => {
                    if (res.data.success) {
                        setSuccessResMessage(res.data.message)
                        setChecked(true)
                        setNameUpdating(false)
                    } else {
                        setFailureResMessage(res.data.message)
                        setChecked(true)
                        setNameUpdating(false)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    setFailureResMessage("Failed to update the filename")
                    setChecked(true)
                    setNameUpdating(false)
                })
        } else {
            setCreating(true)
            setValid(true)
            setUploading(true)
            resetAlerts()

            updateDocument(
                currentTeamId,
                currentParent,
                auth?.user?.id,
                value,
                fileName,
                fileId
            )
                .then((response) => {
                    if(response.data.success){
                    setUpdateDocumentSuccessResponse(response.data.message);
                }else{
                    setUpdateDocumentFailureResponse(response.data.message);
                }
                    setUploading(false)
                })
                .catch(() => {
                    setUploading(false)
                    setFailureResMessage("Failed to upload document")
                    setChecked(true)
                })
        }
    }

    const handleCancel = () => {
        navigate("/files")
        setIstextEditor(false)
        setIsBackFromPages(true)
    }

    return (
        <>
            {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
                <AlertSuccess message={successResMessage} checked={checked} />
            ) : null}

            {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
                <AlertDanger message={failureResMessage} checked={checked} />
            ) : null}

            {teamList.length !== 0 ? currentTeam ? (
                <>
                    {!loading &&
                        <>
                            <div className='d-flex response-box mb-8'>
                                <div className='d-flex me-5'>
                                    <div className="d-flex my-auto flex-wrap">
                                        {folderTree.map((folder: any) => (
                                            <>
                                                <span
                                                    className='fs-3 my-auto'
                                                >
                                                    {folder.name == 'Root' ? 'Home' : folder.name}
                                                </span>
                                                <span className="fw-bold fs-3 mx-1 my-auto">/</span>
                                            </>
                                        ))}
                                        <div className='d-flex ms-1'>
                                            <input
                                                placeholder='File Name'
                                                type='text'
                                                autoComplete='off'
                                                value={fileName}
                                                onChange={handleFileNameChange}
                                                className={'form-control bg-white w-100'}
                                                disabled={creating}
                                            />
                                        </div>
                                        {displayUpdateBtn ? (
                                            <button
                                                onClick={handleSubmit}
                                                className='ms-3 btn btn-primary'
                                                disabled={creating}
                                            >
                                                <FormattedMessage id='BUTTON.UPDATE' />
                                                {nameUpdating && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                            </button>
                                        ) : (
                                            <></>
                                        )}
                                        {!creating &&
                                            <button
                                                className={'ms-3 btn btn-sm btn-flex fw-bold btn-primary'}
                                                onClick={handleCancel}
                                            >
                                                <FormattedMessage id='BUTTON.CANCEL' />
                                            </button>
                                        }
                                        {!valid && (
                                            <div className='d-flex fv-plugins-message-container'>
                                                <div className='ms-3 my-auto fv-help-block'>
                                                    <span role='alert'>{`File name is required`}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {updateDocumentSuccessResponse && 
                            <div className={`alert alert-success show`} >
                                <div className='d-flex justify-content-center'>
                                    <p className='my-auto'>{updateDocumentSuccessResponse}</p>
                                </div>
                            </div>
                            }
                            {updateDocumentFailureResponse && 
                            <div className={`alert alert-danger show`}  >
                                <div className='d-flex justify-content-center'>
                                    <p  className='my-auto'>{updateDocumentFailureResponse}</p>
                                </div>
                            </div>
                            }
                            {creating ? (
                                <div className="d-flex">
                                    <div className='response-box mx-auto' style={{ width: "60%" }}>
                                        {uploading &&
                                            <div id='update-info' className={`alert alert-info show`} >
                                                <div className='d-flex justify-content-center'>
                                                    <p className='my-auto'><FormattedMessage id='DOCUMENTS.UPDATING' /></p>
                                                </div>
                                            </div>
                                        }
                                        <div id='update-success' className={`alert alert-success show`} style={{ display: "none" }} >
                                            <div className='d-flex justify-content-center'>
                                                <p id='update-success-text' className='my-auto'></p>
                                            </div>
                                        </div>

                                        <div id='update-fail' className={`alert alert-danger show`} style={{ display: "none" }} >
                                            <div className='d-flex justify-content-center'>
                                                <p id='update-fail-text' className='my-auto'></p>
                                            </div>
                                        </div>

                                        {/* <div id="create-success-logo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" className="bi bi-patch-check-fill text-success my-5" viewBox="0 0 16 16">
                                        <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z"/>
                                    </svg>
                                </div>

                                <div id="create-fail-logo">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" className="bi bi-patch-exclamation-fill text-danger my-5" viewBox="0 0 16 16">
                                        <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                                    </svg>
                                </div> */}

                                        {uploading &&
                                            <div className='d-flex justify-content-center' style={{ marginTop: '50px', marginBottom: '50px' }}>
                                                <div className='w-50px h-50px'>
                                                    <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
                                                </div>
                                            </div>
                                        }

                                        <div className="mx-auto">
                                            <button
                                                className={'btn btn-sm btn-flex fw-bold btn-primary'}
                                                onClick={handleCancel}
                                                disabled={uploading}
                                            >
                                                <KTIcon iconName='arrow-circle-left' className='fs-2' />
                                                <FormattedMessage id='BUTTON.GO_BACK' />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <ReactQuill theme="snow" formats={formats} modules={modules} value={value} onChange={setValue} />
                            )}
                        </>
                    }
                    {loading &&
                        <div className='d-flex justify-content-center' style={{ marginTop: '50px', marginBottom: '50px' }}>
                            <div className='w-50px h-50px'>
                                <img className='w-50px h-50px' src={toAbsoluteUrl('/media/utils/upload-loading.gif')} alt="Loading" />
                            </div>
                        </div>
                    }
                </>
            ) : (
                teamList.length !== 0 && (
                    <>
                        {setIstextEditor(false)}
                        <OnboardingStep3 />
                    </>
                )
            ) : (
                <>
                    {nextStep ? (
                        <OnboardingStep2
                            setSuccessResMessage={setSuccessResMessage}
                            setFailureResMessage={setFailureResMessage}
                            setChecked={setChecked}
                        />
                    ) : (
                        <OnboardingStep1
                            setNextStep={setNextStep}
                        />
                    )}
                </>
            )}
        </>
    )
}

export { DocumentUpdater }