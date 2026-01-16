import { FormattedMessage } from "react-intl"

const DeleteConfirmationBoxForTeam = (props: any) => {

    const handleCloseDialog = (dialogId: string) => () => {
        props.closeDialog(dialogId);
    };

    return (
        <div id={`delete-teams`} style={{ display: 'none' }} className="modal">
            <span onClick={handleCloseDialog('delete-teams')} className="close" title="Close Modal">&times;</span>
            <form className="modal-content">
                <div className="px-7 py-7">
                    <h3 className='text-center'>
                        <FormattedMessage id="TEAM.DELETE" />
                    </h3>

                    <p className='font-size-15 text-center'>
                        <FormattedMessage id="TEAM.DELETE.CONFIRM" />
                    </p>

                    <div className="d-flex justify-content-center">
                        <button
                            onClick={handleCloseDialog('delete-teams')}
                            type="button"
                            className="btn btn-primary"
                        >
                            <FormattedMessage id="BUTTON.CANCEL" />
                        </button>
                        <button
                            onClick={props.handleBulkDeletion}
                            type="button"
                            className="btn btn-danger ms-3"
                        >
                            <FormattedMessage id="DOCUMENTS.DELETE" /> 

                            {props.deleting &&
                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            }
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export { DeleteConfirmationBoxForTeam }