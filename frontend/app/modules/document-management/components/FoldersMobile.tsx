import { KTIcon, toAbsoluteUrl } from "../../../../app/theme/helpers"
import { useAuth } from "../../auth"

export const FoldersMobile = (props: any) => {
    const { auth } = useAuth()
    
    const handleOpenFolderDeletion = (id: string) => () => {
      props.openDialogForFolderOrFileDeletion(id);
    };

    const handleUpdateClick = (id: string) => () => {
      props.showUpdateModal(id);
    };

    const handleSetCurrentParent = (id: string) => () => {
      props.setCurrentParent(id);
    };

    return (
        <div className="d-flex justify-content-between mb-6 ms-4">
            <div
                className="d-flex cursor-pointer"
                onClick={handleSetCurrentParent(props.id)}
                style={{ userSelect: 'none' }}
            >
                <div className='symbol symbol-30px'>
                    <img src={toAbsoluteUrl('/media/svg/files/folder-document.svg')} alt='' />
                </div>
                <div className='fs-5 fw-bolder box ms-3 my-auto' >
                    {props.title}
                    {props.tooltip != '' &&
                        <i className="fas fa-exclamation-circle ms-2 my-auto fs-7" data-bs-toggle="tooltip" title={props.tooltip}></i>
                    }
                </div>
            </div>
            <div className="d-flex me-4">
                {auth?.user?.role != 3 &&
                    <>
                        {props.isDefault == 0 &&
                            <>
                                <span
                                    className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-2'
                                    onClick={handleUpdateClick(props.id)}
                                >
                                    <KTIcon iconName='pencil' className='fs-3 text-dark' />
                                </span>
                                <span
                                    className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                    onClick={handleOpenFolderDeletion(`delete-folder-mobile-${props.id}`)}
                                >
                                    <KTIcon iconName='trash' className='fs-3 text-dark' />
                                </span>
                            </>
                        }
                    </>
                }
            </div>
        </div>
    )
}