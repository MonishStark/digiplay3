import FileSaver from 'file-saver';
import { useAuth } from "../../auth"
import { useNavigate } from "react-router-dom"
import {
  getDocxFile,
  getDocFile,
  getXlsxFile,
  getXlsFile,
  getPDFFile,
  getTextFile,
  getPPTXFile,
  getHTMLFile,
  getImageFile,
  getVideoFile,
  getAudioFile
} from "../api";
import { useEffect, useState } from "react";
import { FormattedMessage } from 'react-intl';

export const Files = (props: any) => {
  const type = props.title.split('.').pop().toLowerCase()

  const { currentUser, auth, isSharedTeam, currentTeam, teamList } = useAuth()
  const navigate = useNavigate()
  const [filePath,setFilePath] = useState<string>('')

  const exportFile = (fileId: any, fileType: any) => {
    props.settFetchingFile(true)
    if (fileType == 'docx') {
      getDocxFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'doc') {
      getDocFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/msword' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'xlsx') {
      getXlsxFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'xls') {
      getXlsFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/vnd.ms-excel' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'pdf') {
      getPDFFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/pdf' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'txt') {
      getTextFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'text/plain;charset=utf-8' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'pptx') {
      getPPTXFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'html') {
      getHTMLFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'text/html' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'jpeg') {
      getImageFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'image/jpeg' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'jpg') {
      getImageFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'image/jpg' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'mp4' || fileType == "mov") {
      getVideoFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'video/mp4' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'mp3') {
      getAudioFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'audio/mpeg' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    } else if (fileType == 'png') {
      getImageFile(fileId, props.currentTeam)
        .then((response) => {
          const file = new Blob([response.data], { type: 'image/png' })
          FileSaver.saveAs(
            file,
            props.title
          )
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setSuccessResMessage("Download initiated successfully")
        })
        .catch((err) => {
          console.log(err)
          props.settFetchingFile(false)
          props.setChecked(true)
          props.setFailureResMessage("Failed to initiate the download, please try again later")
        })
    }
  }

  const isMSOfficeDocuments = (fileType: string) => {
    return fileType == 'docx' || fileType == 'xlsx' || fileType == 'doc' || fileType == 'pptx' || fileType == 'xls'
  }

  // const openDocumentViewer = (id: any, type: any, name: any) => {
  //   if(!isMSOfficeDocuments(type)) {
  //     window.open(
  //       `view-document?team=${props.currentTeam}&parent=${props.currentParent}&id=${id}&type=${type}&name=${name}`,
  //       '_blank'
  //     )
  //   }
  // }

  const openDocumentViewer = (id: any, type: any, name: any) => {
    if (!isMSOfficeDocuments(type)) {
      if (type == 'html') {
        navigate('/update-document', {
          state: {
            currentTeam: props.currentTeam,
            currentParent: props.parent,
            folderTree: props.folderTree,
            fileId: id,
            fileName: name.split('.')[0]
          }
        })
      } else {
        props.setFileId(id)
        props.setFileType(type)
        props.setFileName(name)
        props.showDocViewer(true)
      }
    }
  }

  const openDocumentSummarizer = (id: any, name: any) => {
    navigate('/summarize-document', {
      state: {
        currentTeam: props.currentTeam,
        currentParent: props.parent,
        folderTree: props.folderTree,
        fileId: id,
        fileExt: name.split('.')[1],
        fileName: name.split('.')[0]
      }
    })
  }

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
        type: 'file',
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
  },[])

  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const handleExportFile = () => {
    const extension = props.title.split('.').pop()?.toLowerCase();
    exportFile(props.id, extension);
  };

  const handleOpenDocumentViewer = () => {
    const extension = props.title.split('.').pop()?.toLowerCase();
    openDocumentViewer(props.id, extension, props.title);
  };

  const handleOpenDocumentSummarizer = () => {
    openDocumentSummarizer(props.id, props.title);
  };

  const handleOpenFileDeletion = (id: string) => () => {
    props.openDialogForFolderOrFileDeletion(id);
  };

  return (
    <>
    {
    props.title.split('.').pop().toLowerCase() != "" &&
    <tr className={dropdownOpen ? 'bg-light' : ''} style={{ height: 'auto' }}>
  <td
    className="d-flex align-items-start cursor-pointer"
    style={{
      userSelect: 'none',
      verticalAlign: 'middle',
      height: 'auto',
      whiteSpace: 'normal',
    }}
  >
    <span
      className='symbol symbol-30px me-2'
      onClick={handleOpenDocumentViewer}
      style={{ flexShrink: 0 }}
    >
      {
        type === "pdf" ? <i style={{ fontSize: "2.2rem", color: "#FF6347" }} className="bi bi-filetype-pdf"></i> :
        type === "docx" ? <i style={{ fontSize: "2.2rem", color: "#1E90FF" }} className="bi bi-filetype-docx"></i> :
        type === "xlsx" ? <i style={{ fontSize: "2.2rem", color: "#32CD32" }} className="bi bi-filetype-xlsx"></i> :
        type === "txt" ? <i style={{ fontSize: "2.2rem", color: "#696969" }} className="bi bi-filetype-txt"></i> :
        type === "doc" ? <i style={{ fontSize: "2.2rem", color: "#1E90FF" }} className="bi bi-filetype-doc"></i> :
        type === "xls" ? <i style={{ fontSize: "2.2rem", color: "#32CD32" }} className="bi bi-filetype-xls"></i> :
        type === "pptx" ? <i style={{ fontSize: "2.2rem", color: "#FF8C00" }} className="bi bi-filetype-pptx"></i> :
        type === "html" ? <i style={{ fontSize: "2.2rem", color: "#FF4500" }} className="bi bi-filetype-html"></i> :
        type === "mp4" ? <i style={{ fontSize: "2.2rem", color: "#000000" }} className="bi bi-filetype-mp4"></i> :
        type === "jpeg" ? <i style={{ fontSize: "2.2rem", color: "#8A2BE2" }} className="bi bi-filetype-jpg"></i> :
        type === "jpg" ? <i style={{ fontSize: "2.2rem", color: "#8A2BE2" }} className="bi bi-filetype-jpg"></i> :
        type === "png" ? <i style={{ fontSize: "2.2rem", color: "#FFD700" }} className="bi bi-filetype-png"></i> :
        type === "mp3" ? <i style={{ fontSize: "2.2rem", color: "#483D8B" }} className="bi bi-filetype-mp3"></i> :
        type === "mov" ? <i style={{ fontSize: "2.2rem", color: "#8B0000" }} className="bi bi-filetype-mov"></i> :
        <i style={{ fontSize: "2.2rem", color: "#A9A9A9" }} className="bi bi-filetype-html"></i>
      }
    </span>

    <span
      style={{
        userSelect: 'none',
        maxWidth: '150px',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
      className="d-flex flex-column"
      onClick={handleOpenDocumentViewer}
    >
      <span className='fs-6 fw-bolder ms-2 my-auto'>
        {props.title.includes('.html') ? props.title.replace('.html', '') : props.title}
      </span>
    </span>
  </td>

  <td
    className="p-0"
    style={{ verticalAlign: 'middle', height: 'auto', whiteSpace: 'normal' }}
  >
    <div className="d-flex h-100 align-items-center">
      {props.owner && (
        <div className='symbol symbol-20px symbol-circle mx-2'>
          <img alt='Pic' src={`${props.avatarUrl}`} />
        </div>
      )}
      {props.owner}
    </div>
  </td>

  <td className="text-start fs-6 align-middle" style={{ height: 'auto' }}>
    {props.size}
  </td>

  <td className="text-start fs-6 align-middle" style={{ height: 'auto' }}>
    {formatDate(props.created)}
  </td>

  <td className="d-flex justify-content-md-end text-end align-middle" style={{ height: 'auto' }}>
    <div className="dropdown">
      <button
        className="btn btn-icon btn-active-color-primary btn-sm"
        type="button"
        id={`dropdownMenuButton-${props.id}`}
        data-bs-toggle="dropdown"
        aria-expanded={dropdownOpen}
        onClick={handleDropdownToggle}
      >
        <i className="bi bi-three-dots-vertical fs-3"></i>
      </button>

      <ul className="dropdown-menu dropdown-menu-start p-1">
        <li>
          <span
            className='dropdown-item cursor-pointer'
            onClick={handleOpenDocumentSummarizer}
            title="Summary"
          >
            <i className="bi bi-stars fs-3 text-primary me-4"></i>
            <span className='fw-bolder'>
              <FormattedMessage id="DOCUMENTS.SUMMARY" />
            </span>
          </span>
        </li>

        <li>
          <span
            className='dropdown-item cursor-pointer'
            onClick={handleOpenDocumentViewer}
            title="View File"
          >
            <i
              className={`bi bi-eye fs-3 me-4 ${!isMSOfficeDocuments(props.title.split('.').pop()) ? 'text-warning' : 'text-muted'}`}
            />
            <span className='fw-bolder'>
              <FormattedMessage id="DOCUMENTS.VIEW" />
            </span>
          </span>
        </li>

        <li>
          <span
            className='dropdown-item cursor-pointer'
            onClick={handleExportFile}
            title="Download File"
          >
            <i className='bi bi-download fs-3 text-success me-4' />
            <span className='fw-bolder'>
              <FormattedMessage id="DOCUMENTS.DOWNLOAD" />
            </span>
          </span>
        </li>

        {auth?.user?.role != 3 &&
          (!isSharedTeam || (isSharedTeam && props.creatorId === currentUser?.id)) && (
            <li>
              <span
                className='dropdown-item cursor-pointer'
                onClick={handleOpenFileDeletion(`delete-file-${props.id}`)}
                title="Delete File"
              >
                <i className="bi bi-trash fs-3 text-danger me-4" />
                <span className='fw-bolder'>
                  <FormattedMessage id="DOCUMENTS.DELETE" />
                </span>
              </span>
            </li>
          )}

        <li>
          <span
            className='dropdown-item cursor-pointer'
            onClick={openChatHandler}
            title="Chat"
          >
            <i className="bi bi-chat fs-3 text-primary me-4"></i>
            <span className='fw-bolder'>
              <FormattedMessage id="DOCUMENTS.CHAT" />
            </span>
          </span>
        </li>
      </ul>
    </div>
  </td>
</tr>

    }
    </>
  )
}