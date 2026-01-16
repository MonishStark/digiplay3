import { useState, useEffect } from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { InvitationListTableRow } from './InvitationListTableRow'
import { DeleteConfirmationBox } from './DeleteConfirmationForBulk'
import { Pagination } from '../../custom/Pagination'
import { NoOfRecords } from '../../custom/NoOfRecords'
import { AlertDanger } from '../../alerts/Alerts'
import { deleteInvitations, deleteInvitation } from '../api'
import { useAuth } from '../../auth'
import { useAppContext } from '../../../pages/AppContext/AppContext'

const InvitationListTable = (props: any) => {
    const { currentUser } = useAuth()
    const intl = useIntl();
    const { appData } = useAppContext();

    const roleID=appData.roleData


    const roleToIdMap: { [key: number]: string } = roleID.reduce((acc, { id, role }: any) => {
        acc[id] = role;
        return acc;
    }, {} as { [key: number]: string });

    useEffect(() => {
        if (props.invitationList) {
            if (props.deleteRecord.length !== props.invitationList.length) {
                props.setSelectedAll(false)
            }
            if (props.deleteRecord.length === props.invitationList.length && props.invitationList.length > 0) {
                props.setSelectedAll(true)
            }
        }
    }, [props.deleteRecord])

    const handleChangeSelected = async (id: string) => {
        console.log(id)
        let newinvitationList: Array<any> = []
        props.invitationList.map((invitation: any) => {
            if (invitation.id != id) {
                newinvitationList = [...newinvitationList, invitation]
            } else {
                console.log(invitation)
                const newInvitation = invitation
                const selected = !newInvitation.selected
                newInvitation.selected = selected

                console.log(newInvitation)
                newinvitationList.push(newInvitation)
            }
        })
        console.log(newinvitationList)
        props.setInvitationList(newinvitationList)
    }

    const handleChange = async (e: any) => {
        await handleChangeSelected(e.target.value)
        if (e.target.checked) {
            props.setDeleteRecord((record: any) => {
                return [
                    ...record,
                    e.target.value
                ]
            })
        } else {
            props.setDeleteRecord((record: any) => {
                const newRecord = record.filter((rec: any) => {
                    return rec !== e.target.value
                })
                return newRecord
            })
        }
    }

    const openDialog = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'block'
    }

    const closeDialog = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'none'
    }

    const openDialogForSingleDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'block'
    }

    const closeDialogForSingleDeletion = (id: string) => {
        const element: HTMLElement = document.getElementById(id)!
        element.style.display = 'none'
    }

    const handleBulkDeletion = () => {
        props.setDeleting(true)
        deleteInvitations(props.deleteRecord, currentUser?.companyId, props.limit)
            .then((response: any) => {
                if (response.data.success) {
                    localStorage.setItem('responsesuccessmsg', response.data.message)
                    window.location.reload();
                } else {
                    if (response.data.message) {
                        localStorage.setItem('responsefailuresmsg', response.data.message)
                        window.location.reload();
                    } else {
                        localStorage.setItem('responsefailuresmsg', 'Failed to delete users')
                        window.location.reload();
                    }
                }
            })
            .then(() => {
                props.setDeleteRecord([])
                closeDialog('delete-invitations')
                props.setDeleting(false)
                if (props.selectedAll) {
                    props.setSelectedAll(false)
                }
            })
    }

    const handleSingleDeletion = (invitationId: any) => {
        props.setDeleting(true)
        deleteInvitation(invitationId, currentUser?.companyId)
            .then((response: any) => {
                if (response.data.success) {
                                        props.fetchInvitations();

                                        closeDialogForSingleDeletion(`delete-invitation-${invitationId}`)


                    // props.setInvitationList(response.data.invitationList)
                    // props.setTotNumOfPage(response.data.totalPageNum)
                    // props.setNoOfRecords(response.data.noOfRecords)
                    props.setSuccessResMessage(response.data.message)
                props.setDeleting(false)
                } else {
                    if (response.data.message) {
                        props.setFailureResMessage(response.data.message)
                    }
                }
            })
            .then(() => {
                closeDialogForSingleDeletion(`delete-invitation-${invitationId}`)
                props.setDeleting(false)
            })
    }

    const createSingleDeletionHandler = (id: string) => () =>
    handleSingleDeletion(id);

    const createCloseHandler = (id: string) => () =>
    closeDialogForSingleDeletion(`delete-invitation-${id}`);

    const createDialogOpener = (id: string) => () => openDialog(id);

    return (
        <>
            <div id="team-user-table" className="card" style={{ overflowX: 'auto' }}>
                {props.warnings != "" &&
                    <AlertDanger message={props.warnings} checked={props.showWarnings} />
                }
                {props.deleteRecord.length > 0 &&
                    <div className="card-header border-0 pt-6">
                        <div className="card-toolbar">
                            <div className="d-flex justify-content-end">
                                {props.deleteRecord.length > 0 &&
                                    <div className="d-flex justify-content-end align-items-center">
                                        <div className="fw-bolder me-5">
                                            <span className="me-2">{props.deleteRecord.length}</span>Selected</div>
                                        <button type="button" onClick={createDialogOpener('delete-invitations')} className="btn btn-danger">
                                            Delete Selected
                                        </button>
                                    </div>
                                }
                                <DeleteConfirmationBox
                                    closeDialog={closeDialog}
                                    deleting={props.deleting}
                                    handleBulkDeletion={handleBulkDeletion}
                                />
                            </div>
                        </div>
                    </div>
                }
                <div className="card-body">
                    <table className="table mb-10 align-middle table-row-dashed fs-6 gy-5 px-3" id="kt_table_users">
                        <thead className="pe-5">
                            <tr className="text-start text-muted fw-bolder fs-7 text-uppercase gs-0">
                                {/* <th className="w-10px pe-2">
                                    <div className="ms-3 form-check form-check-sm form-check-custom form-check-solid me-3">
                                        <input className="form-check-input" onChange={(e) => handleSelectAll(e)} type="checkbox" checked={props.selectedAll} />
                                    </div>
                                </th> */}

                                <th className="min-w-125px">
                                    <FormattedMessage id='INVITATION.TABLE.EMAIL' />
                                </th>
                                <th className="text-center min-w-125px">
                                    <FormattedMessage id='INVITATION.TABLE.ROLE' />
                                </th>
                                <th className="text-center min-w-125px">
                                    <FormattedMessage id='INVITATION.TABLE.STATUS' />
                                </th>
                                <th className="text-center min-w-125px"><FormattedMessage id='INVITATION.TABLE.DATE_SENT' /></th>
                                <th className='min-w-100px text-center'><FormattedMessage id='TEAM.ACTIONS' /></th>
                            </tr>
                        </thead>
                        {!props.loading &&
                            <tbody className="text-gray-600 fw-bold">
                                <>
                                    {props.invitationList.map((data: any) => (
                                        <>
                                            <InvitationListTableRow
                                                id={data.id}
                                                userId={data.userId}
                                                email={data.email}
                                                role={roleToIdMap[data.role.toString()]}
                                                status={data.status}
                                                created={data.created}
                                                selected={data.selected}
                                                openDialogForSingleDeletion={openDialogForSingleDeletion}
                                                handleChange={handleChange}
                                                resendInvitation={props.resendInvitation}
                                                resending={props.resending}
                                            />

                                            <div id={`delete-invitation-${data.id}`} style={{ display: 'none' }} className="modal">
                                                <span onClick={createCloseHandler(data.id)} className="close" title="Close Modal">&times;</span>
                                                <form className="modal-content bg-light">
                                                    <div className="px-7 py-7">
                                                        <h3>
                                                            <FormattedMessage id='INVITATION.DELETE_USER' />
                                                        </h3>
                                                        <p className='font-size-15'>
                                                            <FormattedMessage id='INVITATION.DELETE_USER_CONFIRM' />
                                                        </p>

                                                        <div className="d-flex">
                                                            <button onClick={createCloseHandler(data.id)} type="button" className="btn btn-primary">
                                                                <FormattedMessage id="BUTTON.CANCEL" /> 
                                                            </button>
                                                            <button
                                                                onClick={createSingleDeletionHandler(data.id)}
                                                                type="button"
                                                                className="btn btn-danger ms-3"
                                                            >
                                                               <FormattedMessage id="BUTTON.DELETE" /> 

                                                                {props.deleting && <span className='spinner-border spinner-border-sm align-middle ms-2'></span>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        </>
                                    ))}
                                </>
                            </tbody>
                        }
                    </table>
                </div>
            </div>
            {!props.loading && props.noOfRecords > 0 &&
                <div className='px-15 user-pagination mt-5 mb-5'>
                    <NoOfRecords
                        totalNoOfRecords={props.noOfRecords}
                        selectedPage={props.selectedPage}
                        limit={props.limit}
                        entityName={intl.formatMessage({ id: 'INVITATION.USERS' })}
                    />

                    {props.totNumOfPage > 1 &&
                        <Pagination
                            totalNumberOfPages={props.totNumOfPage}
                            fetchNextData={props.fetchNextData}
                            selectedPage={props.selectedPage}
                            setSelectedPage={props.setSelectedPage}
                            currentPage={props.currentPage}
                            setCurrentPage={props.setCurrentPage}
                        />
                    }
                </div>
            }
        </>
    )
}

export { InvitationListTable }