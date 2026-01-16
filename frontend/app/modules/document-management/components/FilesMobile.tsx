import FileSaver from 'file-saver';
import { KTIcon, toAbsoluteUrl } from "../../../../app/theme/helpers"
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
  getHTMLFile
} from "../api";

const svgMap: any = {
  'pdf': '/media/svg/files/pdf.svg',
  'docx': '/media/svg/files/doc.svg',
  'xlsx': '/media/svg/files/xlsx.svg',
  'txt': '/media/svg/files/txt.svg',
  'doc': '/media/svg/files/doc.svg',
  'xls': '/media/svg/files/xls.svg',
  'pptx': '/media/svg/files/pptx.svg',
  'html': '/media/svg/files/html.svg'
}

export const FilesMobile = (props: any) => {
  const { auth } = useAuth()
  const navigate = useNavigate()

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
            currentParent: props.currentParent,
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

  const handleExportFile = () => {
    const fileExtension = props.title.split('.').pop();
    exportFile(props.id, fileExtension);
  };

  const handleOpenDocumentViewer = () => {
    const extension = props.title.split('.').pop();
    openDocumentViewer(props.id, extension, props.title);
  };

  const handleOpenFileDeletion = (id: string) => () => {
    props.openDialogForFolderOrFileDeletion(id);
  };

  return (
    <div className="d-flex justify-content-between mb-6 ms-4">
      <div
        className="d-flex cursor-pointer"
        style={{ userSelect: 'none' }}
      >
        <div className='symbol symbol-30px my-auto'>
          <img src={toAbsoluteUrl(svgMap[props.title.split('.').pop()])} alt='' />
        </div>
        <div className="d-flex flex-column">
          <div className='fs-5 fw-bolder box ms-3 my-auto'>{props.title}</div>
        </div>
      </div>
      <div className="d-flex me-4">
        <span
          className='me-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
          onClick={handleOpenDocumentViewer}
        >
          <KTIcon
            iconName='eye'
            className={`fs-3 ${!isMSOfficeDocuments(props.title.split('.').pop()) ? 'text-dark' : 'text-muted'}`}
          />
        </span>
        <span
          className='me-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
          onClick={handleExportFile}
        >
          <KTIcon iconName='cloud-download' className='fs-3 text-dark' />
        </span>
        {auth?.user?.role != 3 &&
          <span
            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
            onClick={handleOpenFileDeletion(`delete-file-mobile-${props.id}`)}
          >
            <KTIcon iconName='trash' className='fs-3 text-dark' />
          </span>
        }
      </div>
    </div>
  )
}