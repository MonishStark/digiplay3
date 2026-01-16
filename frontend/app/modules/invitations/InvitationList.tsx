import { useState, useEffect } from 'react'
import { KTCard } from '../../../app/theme/helpers'
import { InvitationListHeader } from './components/InvitationListHeader'
import { InvitationListTable } from './components/InvitationListTable'
import { getInvitationList, resendInvitation } from './api'
import { useAuth } from '../auth'
import { AlertDanger, AlertSuccess } from '../alerts/Alerts'
import { useNavigate } from 'react-router-dom'

const InvitationList = () => {
    const [loading, setLoading] = useState<boolean>(true)
    const [resending, setResending] = useState<boolean>(false)
    const [offset] = useState<number>(0)
    const [limit] = useState<number>(10)
    const navigate = useNavigate()
    const [invitationList, setInvitationList] = useState<Array<any>>([])
    const { currentUser, auth } = useAuth()
    const [selectedPage, setSelectedPage] = useState<any>(1)
    const [currentPage, setCurrentPage] = useState<any>(1)
    const [totNumOfPage, setTotNumOfPage] = useState<any>(0)
    const [noOfRecords, setNoOfRecords] = useState<any>(0)
    const [warnings, setWarnings] = useState<string>("")
    const [showWarnings, setShowWarnings] = useState<boolean>(false)
    const [searchString, setSearchString] = useState<string>("")
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(true)
    const [checked1, setChecked1] = useState<boolean>(true)
    const [deleteRecord, setDeleteRecord] = useState<Array<string>>([])
    const [selectedAll, setSelectedAll] = useState<boolean>(false)
    const [deleting, setDeleting] = useState<boolean>(false)

    let responseSuccessMessage = localStorage.getItem("responsesuccessmsg");
    let responseFailureMessage = localStorage.getItem("responsefailuresmsg")

    const [resSuccessMessage, setResSuccessMessage] = useState(responseSuccessMessage);
    const [resFailureMessage, setResFailureMessage] = useState(responseFailureMessage);

    if (warnings != "") {
        setTimeout(() => {
            setShowWarnings(false);
            setTimeout(() => {
                setWarnings("");
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

    if (responseSuccessMessage) {
        setTimeout(() => {
            localStorage.removeItem("responsesuccessmsg");
            setChecked1(false);
            setTimeout(() => {
                setResSuccessMessage("");
            }, 300);
        }, 5000);
    }

    if (responseFailureMessage) {
        setTimeout(() => {
            localStorage.removeItem("responsefailuresmsg");
            setChecked1(false);
            setTimeout(() => {
                setResFailureMessage("");
            }, 300);
        }, 5000);
    }

    useEffect(() => {
        if (auth?.user?.role != 1) {
            navigate('/error/404')
        }
    }, [])

    useEffect(() => {
        if (searchString?.length > 2) {
            getInvitationList(
                searchString,
                offset,
                limit,
                currentUser?.companyId
            )
                .then((response) => {
                    if (response.data.success) {
                        setInvitationList(response.data.invitationList)
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
        } else if (searchString.length === 0) {
            getInvitationList(
                searchString,
                offset,
                limit,
                currentUser?.companyId
            )
                .then((response) => {
                    if (response.data.success) {
                        setInvitationList(response.data.invitationList)
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
        }
    }, [searchString])

    const fetchInvitations = async()=>{
        if (searchString?.length > 2) {
            getInvitationList(
                searchString,
                offset,
                limit,
                currentUser?.companyId
            )
                .then((response) => {
                    if (response.data.success) {
                        setInvitationList(response.data.invitationList)
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
        } else if (searchString.length === 0) {
            getInvitationList(
                searchString,
                offset,
                limit,
                currentUser?.companyId
            )
                .then((response) => {
                    if (response.data.success) {
                        setInvitationList(response.data.invitationList)
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
        }
    }

    const handleChangeSelection = (id: string, selectOption: boolean) => {
        const findInvitation = invitationList.find((invitation: any) => {
            return invitation.id === id
        })
        findInvitation.selected = selectOption
        return findInvitation
    }

    const fetchNextData = (pageNum: any) => {
        if (pageNum > 0 && pageNum <= totNumOfPage) {
            setLoading(true)
            if (deleteRecord.length > 0) {
                setSelectedAll(false)
                const newinvitationList: Array<any> = []
                invitationList.map((invitation: any) => {
                    newinvitationList.push(handleChangeSelection(invitation.id, false))
                })
                setInvitationList(newinvitationList)
                setDeleteRecord([])
            }
            const skip = (parseInt(pageNum) - 1) * limit

            getInvitationList(
                searchString,
                skip,
                limit,
                currentUser?.companyId,
            )
                .then((response) => {
                    if (response.data.success) {
                        setInvitationList(response.data.invitationList)
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords)
                        setLoading(false)
                        setSelectedPage(pageNum)
                        setCurrentPage(pageNum)
                    }
                })

        } else {
            setWarnings('Invalid page number provided, please check it.')
            setShowWarnings(true)
        }
    }

    const filterClients = (searchValue: any) => {
        const searchValueLowerCase = searchValue.toLowerCase();
        const filteredInvitedList = invitationList?.filter((client: any) => {
            return `${client?.firstname} ${client?.lastname} ${client?.email}`.toLowerCase().includes(searchValueLowerCase);
        });
        setInvitationList(filteredInvitedList);
        setNoOfRecords(filteredInvitedList.length)
    };

    const handleSearchBarChange = (event: any) => {
        const value = event.target.value;
        setSearchString(value)
        if (value.length >= 3) {
            filterClients(value)
        } else {
            setInvitationList(invitationList);
        }
    }

    const _resendInvitation = (id: string) => {
        setResending(true)
        resendInvitation(id, currentUser?.companyId)
            .then((response) => {
                if (response.data.success) {
                    // setInvitationList(response.data.invitationList)
                    // setTotNumOfPage(response.data.totalPageNum)
                    // setNoOfRecords(response.data.noOfRecords)
                    setLoading(false)
                    setSuccessResMessage(response.data.message)
                    setChecked(true)
                    setResending(false)
                } else {
                    setFailureResMessage(response.data.message)
                    setChecked(true)
                    setResending(false)
                }
            })
    }

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

            <KTCard>
                <InvitationListHeader
                    searchString={searchString}
                    handleSearchBarChange={handleSearchBarChange}
                    noOfRecords={noOfRecords}
                />
                <InvitationListTable
                    warnings={warnings}
                    showWarnings={showWarnings}
                    loading={loading}
                    invitationList={invitationList}
                    setInvitationList={setInvitationList}
                    totNumOfPage={totNumOfPage}
                    setTotNumOfPage={setTotNumOfPage}
                    fetchNextData={fetchNextData}
                    selectedPage={selectedPage}
                    setSelectedPage={setSelectedPage}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    successResMessage={successResMessage}
                    setSuccessResMessage={setSuccessResMessage}
                    failureResMessage={failureResMessage}
                    setFailureResMessage={setFailureResMessage}
                    deleteRecord={deleteRecord}
                    setDeleteRecord={setDeleteRecord}
                    selectedAll={selectedAll}
                    setSelectedAll={setSelectedAll}
                    deleting={deleting}
                    setDeleting={setDeleting}
                    handleChangeSelection={handleChangeSelection}
                    limit={limit}
                    resendInvitation={_resendInvitation}
                    setChecked={setChecked}
                    setChecked1={setChecked1}
                    setResSuccessMessage={setResSuccessMessage}
                    setResFailureMessage={setResFailureMessage}
                    setNoOfRecords={setNoOfRecords}
                    resending={resending}
                    noOfRecords={noOfRecords}
                    fetchInvitaions={fetchInvitations}
                />
            </KTCard>
        </>
    )
}

export default InvitationList