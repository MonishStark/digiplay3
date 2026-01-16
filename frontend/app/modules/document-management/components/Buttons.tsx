import { FormattedMessage } from "react-intl"
import { useNavigate } from "react-router-dom"

export const Buttons = (props: any) => {
    const navigate = useNavigate()

    const handleNavigateCreateDocument = () => {
        navigate('/create-document', {
            state: {
            currentTeam: props.currentTeam,
            currentParent: props.currentParent,
            folderTree: props.folderTree,
            },
        });
    };

    const handleNavigateUploadDocument = () => {
        navigate('/upload-document', {
            state: {
            currentTeam: props.currentTeam,
            currentParent: props.currentParent,
            folderTree: props.folderTree,
            },
        });
    };

    const handleOpenDialog = () => {
      props.setOpenDialog(true);
    };

    return (
        <div className="d-flex">
            <a
                className={'btn btn-sm btn-flex fw-bold btn-primary'}
                onClick={handleOpenDialog}
            >
                <FormattedMessage id="DOCUMENTS.BTNS.CREATE_FOLDER" />
            </a>
            <a
                onClick={handleNavigateUploadDocument}
                className={'ms-4 btn btn-sm btn-flex fw-bold btn-primary'}
            >
                <FormattedMessage id="DOCUMENTS.BTNS.UPLOAD_FILE" />
            </a>
            <a
                onClick={handleNavigateCreateDocument}
                className={'ms-4 btn btn-sm btn-flex fw-bold btn-primary'}
            >
                <FormattedMessage id="DOCUMENTS.BTNS.CREATE_FILE" />
            </a>
        </div>
    )
}