import { useState, useEffect } from 'react'
import { KTCard } from '../../../app/theme/helpers'
import { TeamListHeader } from './components/TeamListHeader'
import { TeamListTable } from './components/TeamTable'
import { CreateTeam } from './components/CreateTeam'
import { useAuth } from '../auth'
import { AlertDanger, AlertSuccess } from '../alerts/Alerts'
import { EditTeam } from './components/EditTeam'
import { getTeamList, getSharedTeamList } from './api'

const TeamList = () => {
    const [loading, setLoading] = useState<boolean>(true)
    const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false)
    const [showTeamUpdateModal, setShowTeamUpdateModal] = useState<boolean>(false)

    const [offset] = useState<number>(0)
    const [limit] = useState<number>(10)
    const [teamList, setTeamList] = useState<Array<any>>([])
    const [sharedTeamList, setSharedTeamList] = useState<Array<any>>([])
    const { currentUser, setCurrentParent } = useAuth()
    const [selectedPage, setSelectedPage] = useState<any>(1)
    const [currentPage, setCurrentPage] = useState<any>(1)
    const [totNumOfPage, setTotNumOfPage] = useState<any>(0)
    const [noOfRecords, setNoOfRecords] = useState<any>(0)
    const [warnings, setWarnings] = useState<string>("")
    const [searchString, setSearchString] = useState<string>("")
    const [successResMessage, setSuccessResMessage] = useState<string>('')
    const [failureResMessage, setFailureResMessage] = useState<string>('')
    const [checked, setChecked] = useState<boolean>(true)
    const [checked1, setChecked1] = useState<boolean>(true)
    const [deleteRecord, setDeleteRecord] = useState<Array<string>>([])
    const [selectedAll, setSelectedAll] = useState<boolean>(false)
    const [deleting, setDeleting] = useState<boolean>(false)
    const [comIdToEdit, setComIdToEdit] = useState<any>(null)
    const [currentCommDataToEdit, setCurrentCommDataToEdit] = useState<any>({})

    let responseSuccessMessage = localStorage.getItem("responsesuccessmsg");
    let responseFailureMessage = localStorage.getItem("responsefailuresmsg")

    const [resSuccessMessage, setResSuccessMessage] = useState(responseSuccessMessage);
    const [resFailureMessage, setResFailureMessage] = useState(responseFailureMessage);

    if (warnings != "") {
        setTimeout(() => {
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
        if (searchString?.length > 2) {
            getTeamList(searchString, currentUser?.companyId, offset, limit)
                .then((response) => {
                    if (response.data.success) {
                        let final:any[] = [];
                        response.data.teamList.forEach((a:any) =>{
                            a['isShared']=false
                           final=[...final, a]
                        })
                        setTeamList([...final])
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords+sharedTeamList.length)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
                .catch((err) => {
                    console.log(err)
                })
        } else if (searchString.length === 0) {
            getTeamList('', currentUser?.companyId, offset, limit)
                .then((response) => {
                    if (response.data.success) {
                        let final:any[] = [];
                        response.data.teamList.forEach((a:any) =>{
                            a['isShared']=false
                           final=[...final, a]
                        })
                        setTeamList([...final,...sharedTeamList])
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords+sharedTeamList.length)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
                    }
                })
                .catch((err) => {
                    console.log(err)
                });
        }
    }, [searchString, sharedTeamList])

    const fetchTeamList = ()=>{
        getTeamList('', currentUser?.companyId, offset, limit).then(res =>{
            let final:any[] = [];
                        res.data.teamList.forEach((a:any) =>{
                            a['isShared']=false
                           final=[...final, a]
                        })
                        setTeamList([...final,...sharedTeamList])
                        setTotNumOfPage(res.data.totalPageNum)
                        setNoOfRecords(res.data.noOfRecords+sharedTeamList.length)
                        setSelectedPage(1)
                        setCurrentPage(1)
                        setLoading(false)
        })  


    }

    useEffect(()=>{
        getSharedTeamList().then(res =>{
            let final:any[] = [];
                    res.data.sharedTeamList.forEach((a:any) =>{
                        a['isShared']=true
                       final=[...final, a]
                    })
       setSharedTeamList([...teamList,...final])
    }).catch(err=>{
        console.log(err)
    })
    },[])

    const handleChangeSelection = (id: string, selectOption: boolean) => {
        const findTeam = teamList.find((team: any) => {
            return team.id === id
        })
        findTeam.selected = selectOption
        return findTeam
    }

    const fetchNextData = (pageNum: any) => {
        if (pageNum > 0 && pageNum <= totNumOfPage) {
            setLoading(true)
            if (deleteRecord.length > 0) {
                setSelectedAll(false)
                const newTeamList: Array<any> = []
                teamList.map((team: any) => {
                    newTeamList.push(handleChangeSelection(team.id, false))
                })
                setTeamList([...sharedTeamList,...newTeamList])
                setDeleteRecord([])
            }
            const skip = (parseInt(pageNum) - 1) * limit

            getTeamList(
                searchString,
                currentUser?.companyId,
                skip,
                limit,
            )
                .then((response) => {
                    if (response.data.success) {
                        let final:any[] = [];
                        response.data.teamList.forEach((a:any) =>{
                            a['isShared']=false
                           final=[...final, a]
                        })
                        setTeamList([...sharedTeamList,...final])
                        setTotNumOfPage(response.data.totalPageNum)
                        setNoOfRecords(response.data.noOfRecords+sharedTeamList.length)
                        setLoading(false)
                        setSelectedPage(pageNum)
                        setCurrentPage(pageNum)
                    }
                })

        } else {
            setWarnings('Invalid page number provided, please check it.')
        }
    }

    const handleSearchBarChange = (event: any) => {
        setSearchString(event.target.value)
    }

    const getCommmunityDetail = (id: any) => {
        return new Promise<any>((resolve, reject) => {
            try {
                const findTeam = teamList.find((team: any) => {
                    return team.id === id
                })

                resolve(findTeam)
            } catch (error) {
                reject(error)
            }
        })
    }

    const showUpdateModal = (cid: any) => {
        setComIdToEdit(cid)
        getCommmunityDetail(cid)
            .then((comData: any) => {
                if (comData) {
                    setCurrentCommDataToEdit(comData)
                }
            })
            .then(() => setShowTeamUpdateModal(true))
    }

    useEffect(()=>{
        setCurrentParent(4)
    },[])

    const handleCloseTeamModal = () => {
      setShowTeamUpdateModal(false);
    };

    const handleCloseCreateTeamModal = () => {
        setShowCreateTeamModal(false);
    };

    return (
        <div style={{minWidth:'375px'}}>
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
                <TeamListHeader
                    setShowCreateTeamModal={setShowCreateTeamModal}
                    handleSearchBarChange={handleSearchBarChange}
                    searchString={searchString}
                />
                <TeamListTable
                    loading={loading}
                    showCreateTeamModal={showCreateTeamModal}
                    setShowCreateTeamModal={setShowCreateTeamModal}
                    showTeamUpdateModal={showTeamUpdateModal}
                    setShowTeamUpdateModal={setShowTeamUpdateModal}
                    teamList={teamList}
                    setTeamList={setTeamList}
                    totNumOfPage={totNumOfPage}
                    setTotNumOfPage={setTotNumOfPage}
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
                    limit={limit}
                    setChecked={setChecked}
                    setChecked1={setChecked1}
                    setResSuccessMessage={setResSuccessMessage}
                    setResFailureMessage={setResFailureMessage}
                    setNoOfRecords={setNoOfRecords}
                    noOfRecords={noOfRecords}
                    fetchNextData={fetchNextData}
                    showUpdateModal={showUpdateModal}
                    searchString={searchString}
                    fetchTeams = {fetchTeamList}
                />
            </KTCard>
            <CreateTeam
                show={showCreateTeamModal}
                handleClose={handleCloseCreateTeamModal}
                offset={offset}
                limit={limit}
                setSuccessResMessage={setSuccessResMessage}
                setFailureResMessage={setFailureResMessage}
                setChecked={setChecked}
                _setTeamList={setTeamList}
                setSelectedPage={setSelectedPage}
                setCurrentPage={setCurrentPage}
                setTotNumOfPage={setTotNumOfPage}
                setNoOfRecords={setNoOfRecords}
                fetchTeams = {fetchTeamList}
            />
            <EditTeam
                show={showTeamUpdateModal}
                handleClose={handleCloseTeamModal}
                currentCommDataToEdit={currentCommDataToEdit}
                comIdToEdit={comIdToEdit}
                offset={offset}
                limit={limit}
                setSuccessResMessage={setSuccessResMessage}
                setFailureResMessage={setFailureResMessage}
                setChecked={setChecked}
                _setTeamList={setTeamList}
                selectedPage={selectedPage}
                searchString={searchString}
                fetchTeams = {fetchTeamList}
            />
        </div>
    )
}

export default TeamList