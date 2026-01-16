/* eslint-disable react-hooks/exhaustive-deps */
import { useIntl } from 'react-intl'
import { KTIcon } from '../../../../app/theme/helpers'

const InvitationSearchComponent = (props: any) => {

  const intl = useIntl();
  return (
    <div className='card-title'>
      <div className='user-manager-header'>
        {/* begin::Search */}
        <div className='d-flex align-items-center position-relative my-1'>
          <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-6' />
          <input
            type='text'
            data-kt-user-table-filter='search'
            className='form-control form-control-solid w-250px ps-14'
            placeholder={intl.formatMessage({ id: 'COMPANY.SEARCH_USERS' })}
            value={props.searchString}
            onChange={props.handleSearchBarChange}
          />
        </div>
        {/* end::Search */}
      </div>
    </div>
  )
}

export { InvitationSearchComponent }
