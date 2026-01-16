import React, { useEffect, useState, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { KTIcon, toAbsoluteUrl } from '../../../../app/theme/helpers';
import { useAuth } from '../../auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFolderTreeForFile, getFileSummary, getSummaryData, updateSummaryFilename } from '../api';
import { AlertDanger, AlertSuccess } from '../../alerts/Alerts';
import { FormattedMessage } from 'react-intl';
import { OnboardingStep3 } from './OnboardStep3';
import { OnboardingStep2 } from './OnboardStep2';
import { OnboardingStep1 } from './OnboardStep1';

const DocumentSummarizer = () => {
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
    const { isBackFromPages, setIsBackFromPages, setIstextEditor, currentTeam, teamList } = useAuth()
    const navigate = useNavigate()
    const [displayUpdateBtn, setDisplayUpdateBtn] = useState<boolean>(false)
    const [nextStep, setNextStep] = useState<boolean>(false)
    const hasUnsavedChanges = useRef(false);
    const [change, setChange] = useState<boolean>(false)
    const firstTimeUpdateRef = useRef(true);

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
    }, [value, originalValue, fileName])

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
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [fileName])

    function convertTextToHTML(text: string) {
        const lines = text.split('\n');
        const htmlLines = lines.map(line => {
          if (line.trim() === '') {
            return '<br />';
          }
          return `<p>${line}</p>`;
        });
        return htmlLines.join('');
    }
    
      // Function to generate HTML summary
    function generateHTMLSummary(simpletext: string) {
        return convertTextToHTML(simpletext);
    }

    useEffect(() => {
        if (fileId) {
            getSummaryData(fileId,currentTeamId)
                .then((responses: any) => {
                    if (responses?.data?.success === true) {
                        const summary = responses?.data?.summary?.notes
                        const overviewText = responses?.data?.summary?.overview

                        const htmlsummary = generateHTMLSummary(summary).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '')
                        const htmlOverviewText = generateHTMLSummary(overviewText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '')

                        const fileNames = responses?.data?.summary?.fileName?.split('.')[0]
                        setOriginalFileName(fileNames)
                        setFileName(fileNames)

                        let values = ""
                        if(overviewText.length == 0) {
                            values = '<p>' 
                            + '<strong>' + 'Summary:' + '</strong>'
                            + htmlsummary 
                            + '</p>';
                        }
                        else {
                            values = '<p>' 
                            + '<strong>' + 'Overview:' + '</strong>'
                            + htmlOverviewText 
                            + '<strong>' + 'Notes:' + '</strong>'
                            + htmlsummary 
                            + '</p>';
                        }

                        setOriginalValue(values)
                        setValue(values)
                        setLoading(false)
                    } else {
                        getFileSummary(fileId, currentTeamId)
                            .then((response) => {
                                const summary = response?.data?.message?.outputText
                                const overviewText = response?.data?.message?.overviewOutputText

                                const htmlsummary = generateHTMLSummary(summary).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '')
                                const htmlOverviewText = generateHTMLSummary(overviewText).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*/g, '')

                                let values = ""
                                if(overviewText.length == 0) {
                                    values = '<p>' 
                                    + '<strong>' + 'Summary:' + '</strong>'
                                    + htmlsummary 
                                    + '</p>';
                                }
                                else {
                                    values = '<p>' 
                                    + '<strong>' + 'Overview:' + '</strong>'
                                    + htmlOverviewText 
                                    + '<strong>' + 'Notes:' + '</strong>'
                                    + htmlsummary 
                                    + '</p>';
                                }

                                setOriginalValue(values)
                                setValue(values)
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
        const fileExt = state.fileExt ? state.fileExt : '';
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

        setNameUpdating(true)
        updateSummaryFilename(`${fileName}.${fileExt}`, fileId, currentParent, currentTeamId)
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
    }

    const handleCancel = () => {
        navigate("/files")
        setIstextEditor(false)
        setIsBackFromPages(true)
    }

    const handleChange = (content: string) => {
        setValue(content);

        if (firstTimeUpdateRef.current) {
        setOriginalValue(content);
        firstTimeUpdateRef.current = false;
        }
    };

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
                                <ReactQuill theme="snow" 
                                formats={formats} 
                                modules={modules} 
                                value={value} 
                                onChange={handleChange}
                                />
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

export { DocumentSummarizer }