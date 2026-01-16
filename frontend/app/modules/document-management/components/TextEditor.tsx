import React, { useEffect, useState, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { KTIcon, toAbsoluteUrl } from '../../../../app/theme/helpers';
import { useAuth } from '../../auth';
import { useNavigate } from 'react-router-dom';
import { createDocument, getFolderTreeForFile } from '../api';
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { FormattedMessage } from 'react-intl';
import { OnboardingStep3 } from './OnboardStep3';
import { OnboardingStep2 } from './OnboardStep2';
import { OnboardingStep1 } from './OnboardStep1';

const TextEditor = () => {
    const [folderTree, setFolderTree] = useState<any>([])
    const [value, setValue] = useState<string>('');
    const [fileName, setFileName] = useState<string>('')
    const [valid, setValid] = useState<boolean>(true)
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(false)
    const [creating, setCreating] = useState<boolean>(false)
    const [uploading, setUploading] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const { auth, isBackFromPages, setIsBackFromPages, setIstextEditor, currentTeam, currentParent, teamList } = useAuth()
    const [nextStep, setNextStep] = useState<boolean>(false)
    const navigate = useNavigate()
    const currentTeamId = currentTeam
    const hasUnsavedChanges = useRef(false);
    const [change, setChange] = useState<boolean>(false)
    const [teamName ,setTeamName] =useState('');
    const [createDocumentSuccessResponse,setCreateDocumentSuccessResponse] = useState("");
    const [createDocumentFailureResponse,setCreateDocumentFailureResponse] = useState("");

    useEffect(() => {
        if (fileName != '' || (value.toString() != ("<p><br></p>").toString() && value != '')) {
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
        if (isBackFromPages) {
            navigate(`${localStorage.getItem('current-url')}`, { state: localStorage.getItem('current-parent') })
        }
    }, [isBackFromPages])

    useEffect(() => {
        if (auth?.user?.role == 3) {
            navigate('/error/404')
        } else {
            getFolderTreeForFile(currentParent,currentTeamId)
                .then((response) => {
                    setFolderTree(response.data.predecessors) 
                    setLoading(false)
                })
                .catch((err) => {
                    console.log(err)
                    setLoading(false)
                })

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
        const success: HTMLElement = document.getElementById("create-success")!
        const fail: HTMLElement = document.getElementById("create-fail")!
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
        setCreating(true)
        setValid(true)
        setUploading(true)
        resetAlerts()
        createDocument(
            currentTeamId,
            currentParent,
            auth?.user?.id,
            value,
            fileName
        )
            .then((response) => {
                if(response.data.success){
                    setCreateDocumentSuccessResponse(response.data.message);
                }else{
                    setCreateDocumentFailureResponse(response.data.message);
                }
                setUploading(false)
            })
            .catch(() => {
                setUploading(false)
                setFailureResMessage("Failed to upload document")
                setChecked(true)
            })
    }

    const handleCancel = () => {
        navigate("/files")
        setIstextEditor(false)
        setIsBackFromPages(true)
    }

    useEffect(()=>{
        const team = teamList.find(item => item.id === currentTeam);
        setTeamName(team ? team.teamName : '');
    },[currentTeam,teamList])

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
                            <div className='response-box'>
                                <div className=''>
                                    <div className="d-flex flex-wrap mb-6 ms-4">
                                        {folderTree.map((folder: any) => (
                                            <>
                                                <span
                                                    className='fs-3 my-auto text-muted'
                                                >
                                                    {folder.name == 'Root' ? teamName : folder.name}
                                                </span>
                                                <span className="fw-bold fs-3 mx-1 my-auto text-muted">/</span>
                                            </>
                                        ))}
                                        <div className='d-flex ms-1'>
                                            <input
                                                placeholder='File Name'
                                                type='text'
                                                autoComplete='off'
                                                value={fileName}
                                                onChange={handleFileNameChange}
                                                className={'form-control w-50'}
                                                disabled={creating}
                                            />
                                            <button
                                                onClick={handleSubmit}
                                                className='btn btn-primary ms-3'
                                                disabled={creating}
                                            >
                                                <FormattedMessage id='BUTTON.SAVE' />
                                            </button>
                                            {!creating &&
                                                <button
                                                    className='btn btn-primary ms-3'
                                                    onClick={handleCancel}
                                                >
                                                    <FormattedMessage id='BUTTON.CLOSE' />
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
                            </div>
                            {createDocumentSuccessResponse && 
                            <div className={`alert alert-success show`} >
                                <div className='d-flex justify-content-center'>
                                    <p className='my-auto'>{createDocumentSuccessResponse}</p>
                                </div>
                            </div>
                            }
                            {createDocumentFailureResponse && 
                            <div className={`alert alert-danger show`}  >
                                <div className='d-flex justify-content-center'>
                                    <p  className='my-auto'>{createDocumentFailureResponse}</p>
                                </div>
                            </div>
                            }
                            {creating ? (
                                <div className="d-flex">
                                    <div className='response-box mx-auto' style={{ width: "60%" }}>
                                        {uploading &&
                                            <div id='create-info' className={`alert alert-info show`} >
                                                <div className='d-flex justify-content-center'>
                                                    <p className='my-auto'><FormattedMessage id='DOCUMENTS.CREATING' /></p>
                                                </div>
                                            </div>
                                        }
                                        <div id='create-success' className={`alert alert-success show`} style={{ display: "none" }} >
                                            <div className='d-flex justify-content-center'>
                                                <p id='create-success-text' className='my-auto'>{createDocumentSuccessResponse}</p>
                                            </div>
                                        </div>

                                        <div id='create-fail' className={`alert alert-danger show`} style={{ display: "none" }} >
                                            <div className='d-flex justify-content-center'>
                                                <p id='create-fail-text' className='my-auto'>{createDocumentFailureResponse}</p>
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
                                <>
                                    <ReactQuill theme="snow" formats={formats} modules={modules} value={value} onChange={(newValue) => setValue(newValue)} />
                                </>
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

export { TextEditor }