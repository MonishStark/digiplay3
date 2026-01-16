import { FormattedMessage } from 'react-intl'

export const UserUpdateCard = (props: any) => {

    const createPasswordDialogHandler = (value: boolean) => () =>
    props.setShowPasswordUpdateDialog(value);

    return (
        <>
            <div className="card pt-4 mb-6 mb-xl-9">
                <div className="card-header border-0">
                    <div className="card-title">
                        <h2><FormattedMessage id='PROFILE.UPDATE_PASSWORD' /></h2>
                    </div>
                </div>
                <div className="card-body pt-0 pb-5">
                    <div className="table-responsive">
                        <table className="table align-middle table-row-dashed gy-5" id="kt_table_users_login_session">
                            <tbody className="fs-6 fw-bold text-gray-600">
                                <tr>
                                    <td className='ps-3'><FormattedMessage id='PROFILE.PASSWORD' /></td>
                                    <td>******</td>
                                    <td className="text-end pe-3">
                                        <button
                                            type="button"
                                            className="btn btn-icon btn-bg-light btn-active-light-primary w-30px h-30px ms-auto"
                                            onClick={createPasswordDialogHandler(true)}
                                            data-bs-toggle="tooltip"
                                            title="Edit Password"
                                        >
                                            <span className="svg-icon svg-icon-3 text-dark">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                    <rect opacity="0.25" x="3" y="21" width="18" height="2" rx="1" fill="#191213" />
                                                    <path fillRule="evenodd" clipRule="evenodd" d="M4.08576 11.5L3.58579 12C3.21071 12.375 3 12.8838 3 13.4142V17C3 18.1045 3.89543 19 5 19H8.58579C9.11622 19 9.62493 18.7893 10 18.4142L10.5 17.9142L4.08576 11.5Z" fill="#121319" />
                                                    <path fillRule="evenodd" clipRule="evenodd" d="M5.5 10.0858L11.5858 4L18 10.4142L11.9142 16.5L5.5 10.0858Z" fill="#121319" />
                                                    <path opacity="0.25" fillRule="evenodd" clipRule="evenodd" d="M18.1214 1.70705C16.9498 0.535476 15.0503 0.535476 13.8787 1.70705L13 2.58576L19.4142 8.99997L20.2929 8.12126C21.4645 6.94969 21.4645 5.0502 20.2929 3.87862L18.1214 1.70705Z" fill="#191213" />
                                                </svg>
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    )
}