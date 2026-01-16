import { useEffect, useState } from "react"
import { toAbsoluteUrl } from "../../../../app/theme/helpers"
import { useAuth } from "../../auth"
import { useNavigate } from "react-router-dom"
import { FormattedMessage } from "react-intl"

export const Folders = (props: any) => {
    const { auth, setHistoryIds,currentTeam, teamList } = useAuth()
    const navigate = useNavigate();
    const [filePath,setFilePath] = useState<string>('')
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleClick = () => {
        setHistoryIds((prevIds: any) => {
            const newIds = [...prevIds, props.id];
            props.setCurrentParent(props.id);
            localStorage.setItem('current-parent', props.id);
            return newIds;
        });
    };

    function formatDate(dateString:string) {
            const date = new Date(dateString);      
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();      
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');      
            return `${month}/${day}/${year} ${hours}:${minutes}`;
          }
          let currentTeamTitle = '';
            teamList.forEach(team=>{
                if(currentTeam===team.id){
                    currentTeamTitle = team.teamName
                }
            })
          const openChatHandler =()=>{
            navigate('/chat-histories', {
            state: {
                type: 'folder',
                teamId: currentTeam,
                fileId:props.id,
                title:currentTeamTitle+filePath
            }
        })
    }    
    useEffect(()=>{
        let title = '';
        props.folderTree.forEach((path:any)=>{
            if(path.name!=='Root'){
            title =title+' / '+path.name
            }      
        })
        title = title + ' / ' + props.title;
            setFilePath(title)
    })    

    const handleDropdownToggle = () => {
        setDropdownOpen(!dropdownOpen);
    };
      
    useEffect(() => {
        const handleDocumentClick = (event:any) => {
            const dropdownMenu = document.getElementById(`dropdownMenuButton-${props.id}`);
            if (dropdownMenu && !dropdownMenu.contains(event.target)) {
            setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('click', handleDocumentClick);
        } else {
            document.removeEventListener('click', handleDocumentClick);
        }

        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [dropdownOpen, props.id]);   

    const handleOpenFolderDeletion = (id: string) => () => {
      props.openDialogForFolderOrFileDeletion(id);
    };

    const handleUpdateClick = (id: string) => () => {
      props.showUpdateModal(id);
    };
    return (
        <tr className={dropdownOpen ? 'bg-light' : ''}>
            <td
                className="d-flex cursor-pointer mw-lg-100 mw-md-75"
                onClick={handleClick}
                style={{ userSelect: 'none', maxWidth: '80px', whiteSpace: 'normal', wordWrap: 'break-word' }}
            >
                <span className='symbol symbol-30px'>
                    <img src={toAbsoluteUrl('/media/svg/files/folder-document.svg')} alt='' />
                </span>
                <span className='fs-5 fw-bolder box ms-2 my-auto' >
                    {props.title}
                    {props.tooltip != '' &&
                        <i className="fas fa-exclamation-circle ms-2 my-auto fs-7" data-bs-toggle="tooltip" title={props.tooltip}></i>
                    }
                </span>
            </td>
            <td className="p-0"> 
            <div className="d-flex  h-50">
              {props.owner && <div className='symbol symbol-25px symbol-circle mx-2'>
                <img alt='Pic' className="" src={`${props.avatarUrl}`} />
                </div>}{props.owner}
              </div>
              </td>
            <td className="p-1">
            </td>
            <td className="p-1">
                {formatDate(props.created)}
            </td>
            <td className="p-1 text-md-end">
                {auth?.user?.role != 3 &&
                    <>
                        <div className="dropdown">
                                <button className="btn btn-icon btn-active-color-primary btn-sm" type="button" id={`dropdownMenuButton-${props.id}`} data-bs-toggle="dropdown" aria-expanded={dropdownOpen} onClick={handleDropdownToggle} >
                                    <i className="bi bi-three-dots-vertical fs-3"></i>
                                </button>
                                <ul className="dropdown-menu dropdown-menu-start" aria-labelledby="dropdownMenuButton">
                                    { (!props.isShared || (props.isShared && (props.creatorId === auth?.user?.id))) && props.isDefault == 0 &&
                                    <li>
                                        <span
                                        className='dropdown-item cursor-pointer'
                                        onClick={handleUpdateClick(props.id)}
                                        data-bs-toggle="tooltip"
                                        title="Edit Folder"
                                        >
                                           <i className="bi bi-pencil-square fs-3 text-dark me-4"></i>
                                           <span className='fw-bolder'> 
                                            <FormattedMessage id="DOCUMENTS.EDIT"/>
                                            </span>
                                        </span>
                                    </li>
                                    }
                                    { (!props.isShared || (props.isShared && (props.creatorId === auth?.user?.id))) && props.isDefault == 0 &&
                                    <li>
                                        <span
                                        className='dropdown-item cursor-pointer'
                                        onClick={handleOpenFolderDeletion(`delete-folder-${props.id}`)}
                                        data-bs-toggle="tooltip"
                                        title="Delete File"
                                        >
                                            <i className="bi bi-trash fs-3 text-danger me-4" />
                                            <span className='fw-bolder'>
                                            <FormattedMessage id="DOCUMENTS.DELETE"/>
                                            </span>
                                        </span>
                                    </li>
                                    }
                                    <li>
                                        <span
                                        className='dropdown-item cursor-pointer'
                                        onClick={openChatHandler}
                                        data-bs-toggle="tooltip"
                                        title="Chat"
                                        >
                                            <i className="bi bi-chat fs-3 text-primary me-4"></i>
                                            <span className='fw-bolder'> 
                                                <FormattedMessage id="DOCUMENTS.CHAT"/>
                                            </span>
                                        </span>
                                    </li>
                                </ul>
                            </div>
                    </>
                }
            </td>
        </tr>
    )
}