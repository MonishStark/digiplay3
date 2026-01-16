import { FormattedMessage } from 'react-intl'
import { KTIcon } from '../../../../app/theme/helpers'
import { useNavigate } from 'react-router-dom'

const InvitationToolbar = (props: any) => {
    const navigate = useNavigate()

    const goToInviteUsers = () => navigate('/invite-users');

    return (
        <div className='d-flex justify-content-end' data-kt-user-table-toolbar='base'>
            {/* begin::Add user */}
            <button type='button' className='btn btn-primary' onClick={goToInviteUsers}>
                <KTIcon iconName='plus' className='fs-2' />
                <FormattedMessage id='INVITATION.INVITE_USERS' />
            </button>
            {/* end::Add user */}
        </div>
    )
}

export { InvitationToolbar }
