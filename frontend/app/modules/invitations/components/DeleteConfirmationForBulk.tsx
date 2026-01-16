import { FormattedMessage } from "react-intl";

const DeleteConfirmationBox = (props: any) => {
    const createCloseHandler = (id: string) => () => props.closeDialog(id);

    return (
        <div id={`delete-invitations`} style={{ display: 'none' }} className="modal">
            <span onClick={createCloseHandler('delete-invitations')} className="close" title="Close Modal">&times;</span>
            <form className="modal-content">
                <div className="px-7 py-7">
                    <h3 className='text-center'>
                        Delete Users
                    </h3>

                    <p className='font-size-15 text-center'>
                        Are you sure that you wanted to delete the selected users?
                    </p>

                    <div className="d-flex justify-content-center">
                        <button
                            onClick={createCloseHandler('delete-invitations')}
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
                            Delete

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

export { DeleteConfirmationBox }