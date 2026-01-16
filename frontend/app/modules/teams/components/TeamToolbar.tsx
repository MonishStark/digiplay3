import { FormattedMessage } from 'react-intl'
import { KTIcon } from '../../../theme/helpers'

const TeamToolbar = (props: any) => {

    const handleOpenCreateTeamModal = () => {
       props.setShowCreateTeamModal(true);
    };

    return (
        <div className='d-flex justify-content-end' data-kt-user-table-toolbar='base'>
            {/* begin::Add user */}
            <button type='button' className='btn btn-primary' onClick={handleOpenCreateTeamModal}>
                <KTIcon iconName='plus' className='fs-2' />
                <FormattedMessage id='BUTTON.CREATE_TEAM' />
            </button>
            {/* end::Add user */}
        </div>
    )
}

export { TeamToolbar }
