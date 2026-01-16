/* eslint-disable react-hooks/exhaustive-deps */
import { KTIcon } from '../../../theme/helpers'
import { useIntl } from 'react-intl'

const TeamSearchComponent = (props: any) => {

  const intl = useIntl()
  return (
    <div className='card-title'>
      <div className='user-manager-header'>
        {/* begin::Search */}
        <div className='d-flex align-items-center position-relative my-1 'style={{width:"255px"}}>
          <KTIcon iconName='magnifier' className='fs-1 position-absolute ms-3' />
          <input
            type='text'
            data-kt-user-table-filter='search'
            className='form-control form-control-solid w-260px ps-14'
            placeholder={intl.formatMessage({ id: "TEAM.SEARCH" })}
            // value={props.searchString}
            onChange={props.handleSearchBarChange}
          />
        </div>
        {/* end::Search */}
      </div>
    </div>
  )
}

export { TeamSearchComponent }
