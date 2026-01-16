import { FormattedMessage } from "react-intl"
import { KTIcon } from "../../../../app/theme/helpers"
import { useNavigate } from "react-router-dom"

export const CreateFileButton = (props: any) => {
    const navigate = useNavigate()

    const handleClick = () => {
        navigate("/create-document", {
        state: {
            currentTeam: props.currentTeam,
            currentParent: props.currentParent,
            folderTree: props.folderTree,
        },
        });
    };

    return (
        <div className="d-flex mb-8 ms-4">
            <a
                onClick={handleClick}
                className={'btn btn-sm btn-flex fw-bold btn-secondary'}
            >
                <KTIcon iconName='plus' className='fs-2' />
                <FormattedMessage id="DOCUMENTS.BTNS.CREATE_FILE" />
            </a>
        </div>
    )
}