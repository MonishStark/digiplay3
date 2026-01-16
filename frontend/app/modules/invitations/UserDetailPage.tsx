import { useEffect, useState } from 'react'
import { UserSummary } from './components/UserSummary'
import { UserUpdateCard } from './components/UserUpdateCard'
import { UserUpdateWithAddress } from './components/UserUpdateWithAddress'
import { TwoFactorAuthCard } from './components/TwoFactorAuthCard'
import { UpdatePassword } from './components/UpdatePasswordDialog'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircularProgress } from '@mui/material'
import { updateUserAccountStatus, getSuperAdminDetailForAdmin, getUserDetailForAdmin, whitelistUserAccount } from './api'
import { AlertDanger, AlertSuccess } from '../alerts/Alerts'
import { useAuth } from '../auth'
import { removeUser } from '../document-management/api'
import { FormattedMessage } from 'react-intl'


const UserDetailPage = () => {

    const { state } = useLocation();
    const userID = state;
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [userDetail, setUserDetail] = useState<any>(null)

    const [showUserUpdateDialog, setShowUserUpdateDialog] = useState<boolean>(false)
    const [showPasswordUpdateDialog, setShowPasswordUpdateDialog] = useState<boolean>(false)

    const successMsg = localStorage.getItem('resSuccess')
    const [resSuccessMessage, setResSuccessMessage] = useState<string | null>(successMsg)

    const failureMsg = localStorage.getItem('resFailure')
    const [resFailureMessage, setResFailureMessage] = useState<string | null>(failureMsg)

    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked1, setChecked1] = useState<boolean>(true)

    const { auth } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (auth?.user?.role != 1) {
            navigate('/error/404')
        }
    }, [])

    if (resSuccessMessage !== null && resSuccessMessage !== undefined) {
        setTimeout(() => {
            setChecked(false);
            localStorage.removeItem('resSuccess')
            setTimeout(() => {
                setResSuccessMessage(null);
            }, 300);
        }, 5000);
    }

    if (resFailureMessage !== null && resFailureMessage !== undefined) {
        setTimeout(() => {
            setChecked(false);
            localStorage.removeItem('resFailure')
            setTimeout(() => {
                setResFailureMessage(null);
            }, 300);
        }, 5000);
    }

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

    const openDialogForUserDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'block'
    }

    const closeDialogForUserDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'none'
    }

    useEffect(() => {
        if (auth?.user?.role == 4) {
            getSuperAdminDetailForAdmin(userID)
                .then((response) => {
                    console.log("response",response)
                    setUserDetail(response.data.userData)
                    setLoading(false)
                })
                .catch((err) => {
                    console.log(err)
                })
        } else {
            getUserDetailForAdmin(userID)
                .then((response) => {
                    setUserDetail(response.data.userData)
                    setLoading(false)
                })
                .catch((err) => {
                    console.log(err)
                })
        }
    }, [])

    const blacklistUser = () => {
        setProcessing(true)
        updateUserAccountStatus(userID,"blacklisted")
            .then((res) => {
                if (res.data.success) {
                    setUserDetail((user: any) => {
                        let updated = user
                        updated.accountBlocked = true
                        return updated
                    })
                    setSuccessResMessage(res.data.message)
                    setChecked(true)
                    setProcessing(false)
                } else {
                    setFailureResMessage(res.data.message)
                    setChecked(true)
                    setProcessing(false)
                }
            })
            .then(() => {
                closeDialogForUserDeletion(`delete-user-${userID}`)
                window.scrollTo(0, 0)
            })
            .catch(() => {
                setFailureResMessage('Failed to blacklist user account due to internal error')
                setChecked(true)
                setProcessing(false)
                closeDialogForUserDeletion(`delete-user-${userID}`)
                window.scrollTo(0, 0)
            })
    }

    const whitelistUser = () => {
        setProcessing(true)
        updateUserAccountStatus(userID,"whitelisted")
            .then((res) => {
                if (res.data.success) {
                    setUserDetail((user: any) => {
                        let updated = user
                        updated.accountBlocked = false
                        return updated
                    })
                    setSuccessResMessage(res.data.message)
                    setChecked(true)
                    setProcessing(false)
                } else {
                    setFailureResMessage(res.data.message)
                    setChecked(true)
                    setProcessing(false)
                }
            })
            .then(() => {
                closeDialogForUserDeletion(`undelete-user-${userID}`)
                window.scrollTo(0, 0)
            })
            .catch(() => {
                setFailureResMessage('Failed to whitelist user account due to internal error')
                setChecked(true)
                setProcessing(false)
                closeDialogForUserDeletion(`undelete-user-${userID}`)
                window.scrollTo(0, 0)
            })
    }

    const deleteUser = () => {
        removeUser(userID)
            .then((response) => {
                if (response.data.success) {
                    setSuccessResMessage(response.data.message)
                    setChecked(true)
                } else {
                    setFailureResMessage(response.data.message)
                    setChecked(true)
                }
            })
            .catch(() => {
                setFailureResMessage('Failed to delete User.')
                setChecked(true)
            })
            .finally(() => {
                closeDialogForUserDeletion(`delete-user-permanent-${userID}`)
                navigate('/manage-users')
            })
    }

    const createUndeleteHandler = (id: string) => () =>
    closeDialogForUserDeletion(`${id}`);

    const createPermanentDeleteHandler = (id: string) => () =>
    closeDialogForUserDeletion(`${id}`);

    const handleCloseUserDeletion = () => {
    closeDialogForUserDeletion(`delete-user-${userID}`);
    };

    return (
        <>
            {successResMessage !== undefined && successResMessage !== null && successResMessage !== "" ? (
                <AlertSuccess message={successResMessage} checked={checked} />
            ) : null}

            {failureResMessage !== undefined && failureResMessage !== null && failureResMessage !== "" ? (
                <AlertDanger message={failureResMessage} checked={checked} />
            ) : null}

            {resSuccessMessage !== null && resSuccessMessage !== undefined && resSuccessMessage !== "" ? (
                <AlertSuccess message={resSuccessMessage} checked={checked1} />
            ) : null}

            {resFailureMessage !== null && resFailureMessage !== undefined && resFailureMessage !== "" ? (
                <AlertDanger message={resFailureMessage} checked={checked1} />
            ) : null}

            {!loading &&
                <div className="post d-flex flex-column-fluid" id="kt_post">
                    <div id="kt_content_container" className="container">
                        <div className="d-flex flex-column flex-xl-row gap-10">
                            <div className="flex-column flex-lg-row-auto w-100 w-xl-400px">
                                <UserSummary
                                    userID={userID}
                                    showUserUpdateDialog={showUserUpdateDialog}
                                    setShowUserUpdateDialog={setShowUserUpdateDialog}
                                    userDetail={userDetail}
                                    setUserDetail={setUserDetail}
                                    setSuccessResMessage={setSuccessResMessage}
                                    setFailureResMessage={setFailureResMessage}
                                    setChecked={setChecked}
                                    openDialogForUserDeletion={openDialogForUserDeletion}
                                />
                            </div>
                            <div className="flex-lg-row-fluid">
                                <div className="tab-content" id="myTabContent">
                                    <div className="tab-pane show active" id="kt_user_view_overview_security" role="tabpanel">
                                        <UserUpdateCard
                                            showPasswordUpdateDialog={showPasswordUpdateDialog}
                                            setShowPasswordUpdateDialog={setShowPasswordUpdateDialog}
                                        />
                                        <TwoFactorAuthCard
                                            userID={userID}
                                            userDetail={userDetail}
                                            setUserDetail={setUserDetail}
                                            setSuccessResMessage={setSuccessResMessage}
                                            setFailureResMessage={setFailureResMessage}
                                            setChecked={setChecked}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div id={`delete-user-${userID}`} style={{ display: 'none' }} className="modal">
                                <span onClick={handleCloseUserDeletion} className="close" title="Close Modal">&times;</span>
                                <form className="modal-content">
                                    <div className="px-7 py-7">
                                        <h3>
                                            <FormattedMessage id="INVITATION.MARK" />
                                        </h3>
                                        <p className='font-size-15'>
                                            <FormattedMessage id="INVITATION.DELETE.CONFIRM" />
                                        </p>

                                        <div className="d-flex">
                                            <button onClick={handleCloseUserDeletion} type="button" className="btn btn-primary">
                                                <FormattedMessage id="BUTTON.CANCEL" />
                                            </button>
                                            <button
                                                onClick={blacklistUser}
                                                type="button"
                                                className="btn btn-danger ms-3"
                                            >
                                                <FormattedMessage id="BUTTON.DELETE" />   
                                                {processing && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div id={`delete-user-permanent-${userID}`} style={{ display: 'none' }} className="modal">
                                <span onClick={createPermanentDeleteHandler(`delete-user-permanent-${userID}`)} className="close" title="Close Modal">&times;</span>
                                <form className="modal-content">
                                    <div className="px-7 py-7">
                                        <h3>
                                            <FormattedMessage id="INVITATION.DELETE.ACCOUNT" />  
                                        </h3>
                                        <p className='font-size-15'>
                                            <FormattedMessage id="INVITATION.DELETE.ACCOUNT_CONFIRM" />  
                                        </p>

                                        <div className="d-flex">
                                            <button onClick={createPermanentDeleteHandler(`delete-user-permanent-${userID}`)} type="button" className="btn btn-primary">
                                                <FormattedMessage id="BUTTON.CANCEL" /> 
                                            </button>
                                            <button
                                                onClick={deleteUser}
                                                type="button"
                                                className="btn btn-danger ms-3"
                                            >
                                                <FormattedMessage id="BUTTON.DELETE" />
                                                {processing && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div id={`undelete-user-${userID}`} style={{ display: 'none' }} className="modal">
                                <span onClick={createUndeleteHandler(`undelete-user-${userID}`)} className="close" title="Close Modal">&times;</span>
                                <form className="modal-content">
                                    <div className="px-7 py-7">
                                        <h3>
                                            Unmark account from deletion
                                        </h3>
                                        <p className='font-size-15'>
                                            Are you sure that you want to unmark this account from deletion?
                                        </p>

                                        <div className="d-flex">
                                            <button onClick={createUndeleteHandler(`undelete-user-${userID}`)} type="button" className="btn btn-secondary">
                                                <FormattedMessage id="BUTTON.CANCEL" /> 
                                            </button>
                                            <button
                                                onClick={whitelistUser}
                                                type="button"
                                                className="btn btn-primary ms-3"
                                            >
                                                Unmark
                                                {processing && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                        <UserUpdateWithAddress
                            userID={userID}
                            showUserUpdateDialog={showUserUpdateDialog}
                            setShowUserUpdateDialog={setShowUserUpdateDialog}
                            userDetail={userDetail}
                            setUserDetail={setUserDetail}
                            setSuccessResMessage={setSuccessResMessage}
                            setFailureResMessage={setFailureResMessage}
                            setChecked={setChecked}
                        />
                        <UpdatePassword
                            userID={userID}
                            showPasswordUpdateDialog={showPasswordUpdateDialog}
                            setShowPasswordUpdateDialog={setShowPasswordUpdateDialog}
                            setSuccessResMessage={setSuccessResMessage}
                            setFailureResMessage={setFailureResMessage}
                            setChecked={setChecked}
                        />
                    </div>
                </div>
            }

            {loading &&
                <div className='d-flex w-100 h-100'>
                    <div className='my-auto mx-auto'>
                        <div className='d-flex flex-column justify-content-center'>
                            <span className='text-primary fs-3'>Loading</span> <br />
                            <span className='ms-4'>
                                <CircularProgress />
                            </span>
                        </div>
                    </div>
                </div>
            }
        </>
    )
}

export default UserDetailPage