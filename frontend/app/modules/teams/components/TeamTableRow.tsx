import { FormattedMessage, useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useEffect, useState } from 'react'

export const TeamListTableRow = (props: any) => {
  const { setCurrentTeam,setIsSharedTeam, currentUser } = useAuth()
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const intl = useIntl();

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const clickHandler =()=>{
    if(props.active){
      setIsSharedTeam(props.isShared)
      setCurrentTeam(props.id)
      navigate('/files')
    }
  }
  const shareTeamHandler = ()=>{
     navigate('/share-team', {
      state: {
        teamName: props.teamName,
        teamId: props.id,
      }
    })
  }
  const openChatHandler =()=>{
    setCurrentTeam(props.id)
    navigate('/chat-histories', {
      state: {
        type: 'team',
        teamId: props.id,
        fileId:props.id,
        title:props.teamName
      }
  })
  }
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();  
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');  
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  }

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

  const handleToggleTeam = () => {
    const action = props.active
      ? `deactivate-team-${props.id}`
      : `activate-team-${props.id}`;
      
    props.openDialogForSingleDeletion(action);
  };

  const handleShowUpdateModal = () => {
    props.showUpdateModal(props.id);
  };
  return (
      <tr className={dropdownOpen ? 'bg-light' : ''}>
        {/* <td>
                    <div className="ms-3 form-check form-check-sm form-check-custom form-check-solid">
                        <input 
                            id='kt_table_users' 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={props.selected}
                            value={props.id}
                            onChange={(e) => props.handleChange(e)} 
                        />
                    </div>
                </td> */}
        <td onClick={clickHandler}  className={`text-gray-800 text-start p-1 p-lg-2 ${props.active ? 'cursor-pointer' : ''}`}>{props.teamName}</td>
        <td onClick={clickHandler}  className={`text-gray-800 text-start p-1 p-lg-2 ${props.active ? 'cursor-pointer' : ''}`}>{props.teamAlias}</td>
        <td onClick={clickHandler}  className={`text-gray-800 text-start p-1 p-lg-2 ${props.active ? 'cursor-pointer' : ''}`}>
          {props.active &&
            <div className="badge badge-light-success fw-bolder"><FormattedMessage id='TEAM.STATUS.ACTIVE' /></div>
          }
          {!props.active &&
            <div className="badge badge-light-danger fw-bolder"><FormattedMessage id='TEAM.STATUS.INACTIVE' /></div>
          }
        </td>
        <td onClick={clickHandler}  className={`text-gray-800 text-start p-1 p-lg-2 ${props.active ? 'cursor-pointer' : ''}`}>{props.noOfFiles}</td>
        <td onClick={clickHandler}  className={`text-gray-800 text-start p-1 p-lg-2 ${props.active ? 'cursor-pointer' : ''}`}>{formatDate(props.updated)}</td>
        <td>
        <div className='d-flex justify-content-md-end flex-shrink-0'>
            <div className="dropdown">
              <button className="btn btn-icon btn-active-color-primary btn-sm" type="button" id={`dropdownMenuButton-${props.id}`} data-bs-toggle="dropdown" aria-expanded={dropdownOpen} onClick={handleDropdownToggle}>
                <i className="bi bi-three-dots-vertical fs-3"></i>
              </button>
              {!(props.isShared && !props.active || (currentUser?.role!==1 && !props.active)) && (
    <ul className="dropdown-menu dropdown-menu-start">
      {!props.isShared && (currentUser?.role==1 || currentUser?.role==2) && (
        <li className="cursor-pointer text-right">
          <span
            className="dropdown-item"
            onClick={shareTeamHandler}
            data-bs-toggle="tooltip"
            title="Share Team"
          >
            <i className="bi bi-share fs-3 me-4 text-primary"></i>
            <span className="fw-bolder"><FormattedMessage id='TEAM.SHARE' /></span>
          </span>
        </li>
      )}
      {!props.isShared && currentUser?.role==1 && (
        <li className="cursor-pointer">
          <span
            className="dropdown-item"
            onClick={handleShowUpdateModal}
            data-bs-toggle="tooltip"
            title="Edit Team"
          >
            <i className="bi bi-pencil-square text-dark fs-3 me-4"></i>
            <span className="fw-bolder"><FormattedMessage id='TEAM.EDIT' /></span>
          </span>
        </li>
      )}
      {!props.isShared && currentUser?.role==1 && (
        <li className="cursor-pointer">
          <span
            className="dropdown-item"
            onClick={handleToggleTeam}
            data-bs-toggle="tooltip"
            title={props.active ? intl.formatMessage({ id: 'TEAM.DEACTIVATE_1' }) + " " : intl.formatMessage({ id: 'TEAM.ACTIVATE_1' }) + " "}
          >
            <i
              className={
                props.active
                  ? "bi bi-trash fs-3 me-4 text-danger"
                  : "bi bi-plus fs-3 me-4"
              }
            ></i>
            <span className="fw-bolder">
              {props.active ? intl.formatMessage({ id: 'TEAM.DEACTIVATE_1' }) + " " : intl.formatMessage({ id: 'TEAM.ACTIVATE_1' }) + " "}
            </span>
          </span>
        </li>
      )}
      {props.active && (
        <li className="list-unstyled">
          <button
            type="button"
            onClick={openChatHandler}
            className="dropdown-item d-flex align-items-center cursor-pointer bg-transparent border-0 w-100 text-start"
            data-bs-toggle="tooltip"
            title="Chat"
          >
            <i className="bi bi-chat fs-3 text-primary me-4"></i>
            <span className="fw-bolder"><FormattedMessage id='TEAM.CHAT' /></span>
          </button>
        </li>
      )}
    </ul>
  )}
            </div>
          </div>
        </td>
      </tr>
  )
}