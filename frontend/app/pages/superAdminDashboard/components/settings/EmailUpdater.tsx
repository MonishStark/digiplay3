import React, { useEffect, useState, useRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { KTIcon, toAbsoluteUrl } from '../../../../../app/theme/helpers'
import { useLocation, useNavigate } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { useAuth } from '../../../../modules/auth';
import { AlertDanger, AlertSuccess } from '../../../../modules/alerts/Alerts';
import { updateEmailTemplate } from '../../api';

const EmailUpdater = () => {
    const { state }: any = useLocation()
    const fileId = state.fileId ? state.fileId : null
    const [loading, setLoading] = useState<boolean>(true)
    const [value, setValue] = useState<string>('');
    const [originalValue, setOriginalValue] = useState<string>('')
    const [originalFileName] = useState<string>(state.fileName ? state.fileName : '')
    const [fileName, setFileName] = useState<string>(state.fileName ? state.fileName : '')
    const [subjectvalid, setSubjectValid] = useState<boolean>(true)
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(false)
    const [creating] = useState<boolean>(false)
    const [uploading] = useState<boolean>(false)
    const { setIstextEditor } = useAuth()
    const navigate = useNavigate()
    const [displayUpdateBtn, setDisplayUpdateBtn] = useState<boolean>(false)
    const hasUnsavedChanges = useRef(false);
    
    const [subject, setSubject] = useState(state.subject)
    const originalSubject = state.subject

    useEffect(() => {
        if(value != originalValue || fileName !== originalFileName || subject  !== originalSubject){
            setIstextEditor(true)
        }
        else {
            setIstextEditor(false)
        }
    }, [value, fileName, subject])

    useEffect(() => {
        if (value != originalValue) {
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [value])

    useEffect(() => {
        if (subject != originalSubject) {
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [subject])

    useEffect(() => {
        if (fileName != originalFileName) {
            if (!displayUpdateBtn) setDisplayUpdateBtn(true)
        } else {
            if (displayUpdateBtn) setDisplayUpdateBtn(false)
        }
    }, [fileName])

    useEffect(() => {
        if (fileId) {
            setValue(state.fileContent)
            setOriginalValue(state.fileContent)
            setLoading(false)
        }
    }, [])

    if (successResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setSuccessResMessage("");
                navigate('/admin/email-templates')
            }, 200);
        }, 2000);
    }

    if (failureResMessage) {
        setTimeout(() => {
            setChecked(false)
            setTimeout(() => {
                setFailureResMessage("");
            }, 200);
        }, 5000);
    }

    const handleSubjectChange = (e: any) => {
        if (!subjectvalid) setSubjectValid(true)
        setSubject(e.target.value)
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
        if (value == "") {
            setFailureResMessage("Text editor is empty, please add some text.")
            setChecked(true)
            window.scrollTo(0, 0)
            return
        }

        try {
            updateEmailTemplate(state.fileId, subject, value, fileName)
                .then((res) => {
                    if(res.data.success) {
                        setSuccessResMessage(res.data.message)
                        setChecked(true)
                    }
                    else {
                        setFailureResMessage(res.data.message)
                        setChecked(true)
                    }
                })
        } catch (error) {
            console.log(error)
        } 
    }

    const handleCancel = () => {
        setIstextEditor(false)
        navigate('/admin/email-templates')
    }

    const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileName(e.target.value);
    };

    return (
        <>
            {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
                <AlertSuccess message={successResMessage} checked={checked} />
            ) : null}

            {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
                <AlertDanger message={failureResMessage} checked={checked} />
            ) : null}

                <>
                    {!loading &&
                        <>
                            <div className='d-flex response-box mb-8'>
                                <div className='d-flex me-5 flex-grow-1'>
                                    <div className="d-flex my-auto flex-wrap flex-grow-1">
                                        <div className='d-flex ms-1 flex-grow-1' >
                                            <input
                                                placeholder='File Name'
                                                type='text'
                                                autoComplete='off'
                                                value={fileName}
                                                onChange={handleFileNameChange}
                                                className={'form-control bg-white'}
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
                                <div className='d-flex align-items-center mb-8 ms-2'>
                                    <span className='text-black-50 fs-4 me-2'>Subject:</span>
                                    <input
                                        placeholder='File Name'
                                        type='text'
                                        autoComplete='off'
                                        value={subject}
                                        onChange={handleSubjectChange}
                                        className={'form-control bg-white'}
                                    />
                                    
                                    {!subjectvalid && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>
                                            <span role='alert'>{`File name is required`}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <ReactQuill theme="snow" formats={formats} modules={modules} value={value} onChange={setValue} />
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
            
        </>
    )
}

export { EmailUpdater }