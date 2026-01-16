import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { useAppContext } from '../../../pages/AppContext/AppContext';

export const UserSummary = (props: any) => {
    const { appData } = useAppContext();
    const roleID = appData.roleData

    const roleToIdMap: { [key: number]: string } = roleID.reduce((acc, { id, role }: any) => {
        acc[id] = role;
        return acc;
    }, {} as { [key: number]: string });

    const createUserDeletionHandler = (id: string) => () =>
    props.openDialogForUserDeletion(`delete-user-permanent-${id}`);

    const createUserUndeleteHandler = (id: string) => () =>
    props.openDialogForUserDeletion(`undelete-user-${id}`);

    const createUserUpdateDialogHandler = (value: boolean) => () =>
    props.setShowUserUpdateDialog(value);

    return (
        <>
            <div className="card mb-5 mb-xl-8">
                <div className="card-body pt-0 pt-lg-1">
                    <div className="card">
                        <div className="card-body d-flex flex-center flex-column pt-12 p-9 px-0">
                            <div className="symbol symbol-100px symbol-circle mb-7">
                                <img src={`${props.userDetail.avatarUrl}`} alt="Avatar" />
                            </div>
                        </div>
                    </div>
                    <div className="d-flex flex-stack fs-4 py-3">
                        <div
                            className="fw-bolder"
                        >
                            <FormattedMessage id="INVITATION.DETAILS" /> 
                            <span className="ms-2 rotate-180">
                                <span className="svg-icon svg-icon-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1">
                                        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                            <polygon points="0 0 24 0 24 24 0 24" />
                                            <path d="M6.70710678,15.7071068 C6.31658249,16.0976311 5.68341751,16.0976311 5.29289322,15.7071068 C4.90236893,15.3165825 4.90236893,14.6834175 5.29289322,14.2928932 L11.2928932,8.29289322 C11.6714722,7.91431428 12.2810586,7.90106866 12.6757246,8.26284586 L18.6757246,13.7628459 C19.0828436,14.1360383 19.1103465,14.7686056 18.7371541,15.1757246 C18.3639617,15.5828436 17.7313944,15.6103465 17.3242754,15.2371541 L12.0300757,10.3841378 L6.70710678,15.7071068 Z" fill="#000000" fillRule="nonzero" transform="translate(12.000003, 11.999999) rotate(-180.000000) translate(-12.000003, -11.999999)" />
                                        </g>
                                    </svg>
                                </span>
                            </span>
                        </div>
                        <span>
                            <div
                                className="btn btn-sm btn-light-primary"
                                onClick={createUserUpdateDialogHandler(true)}
                            >
                                <FormattedMessage id="BUTTON.EDIT" /> 
                            </div>
                        </span>
                    </div>
                    <div className="separator"></div>
                    <div id="kt_user_view_details" className="show">
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="PROFILE.FIRSTNAME" /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">{props.userDetail.firstname}</span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="PROFILE.LASTNAME" /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">{props.userDetail.lastname}</span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="AUTH.EMAIL" /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">
                                    {props.userDetail.email}

                                    {props.userDetail.accountStatus &&
                                        <>
                                            <span data-bs-toggle="tooltip" title="Verified">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mb-1 ms-2 bi bi-check-circle-fill text-success" viewBox="0 0 16 16">
                                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
                                                </svg>
                                            </span>
                                        </>
                                    }
                                    {!props.userDetail.accountStatus &&
                                        <span data-bs-toggle="tooltip" title="Not Verified">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mb-1 ms-2 bi bi-x-circle-fill text-danger" viewBox="0 0 16 16">
                                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z" />
                                            </svg>
                                        </span>
                                    }
                                </span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="PROFILE.MOBILENUM" /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">{props.userDetail.mobileCountryCode+" "+props.userDetail.mobileNumber}</span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="PROFILE.LANGUAGE" /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">{props.userDetail.language || "en"}</span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id='INVITATION.TABLE.ROLE' /></div>
                            <div className="text-gray-600">
                                <span className="text-gray-600">{roleToIdMap[props.userDetail.role.toString()]}</span>
                            </div>
                        </div>
                        <div className="pb-5 fs-6">
                            <div className="fw-bolder mt-5"><FormattedMessage id="INVITATION.DELETION" /></div>
                            <div className="text-gray-600">
                                {props.userDetail.accountBlocked &&
                                    <div className='d-flex flex-wrap gap-4 flex-stack'>
                                        <div
                                            className="btn btn-sm btn-light-primary"
                                            onClick={createUserUndeleteHandler(props.userID)}
                                        >
                                            <FormattedMessage id="INVITATION.WHITELIST" />
                                        </div>

                                        <div
                                            className="btn btn-sm btn-danger"
                                            onClick={createUserDeletionHandler(props.userID)}
                                        >
                                            <FormattedMessage id='INVITATION.DELETE_USER' />
                                        </div>
                                    </div>
                                }
                                {!props.userDetail.accountBlocked &&
                                    <div className='d-flex flex-wrap gap-4 flex-stack'>
                                        <div
                                            className="btn btn-sm btn-light-danger"
                                            onClick={props.openDialogForUserDeletion.bind(null, `delete-user-${props.userID}`)}
                                        >
                                            <FormattedMessage id="INVITATION.BLACKLIST" />
                                        </div>

                                        <div
                                            className="btn btn-sm btn-danger"
                                            onClick={createUserDeletionHandler(props.userID)}
                                        >
                                            <FormattedMessage id='INVITATION.DELETE_USER' />
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}