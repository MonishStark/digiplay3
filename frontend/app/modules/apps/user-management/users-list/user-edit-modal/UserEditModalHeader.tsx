import {KTIcon} from '../../../../../../app/theme/helpers'
import {useListView} from '../core/ListViewProvider'

const UserEditModalHeader = () => {
  const {setItemIdForUpdate} = useListView()

  const handleResetItemIdForUpdate = () => {
    setItemIdForUpdate(undefined);
  };

  return (
    <div className='modal-header'>
      {/* begin::Modal title */}
      <h2 className='fw-bolder'>Add User</h2>
      {/* end::Modal title */}

      {/* begin::Close */}
      <div
        className='btn btn-icon btn-sm btn-active-icon-primary'
        data-kt-users-modal-action='close'
        onClick={handleResetItemIdForUpdate}
        style={{cursor: 'pointer'}}
      >
        <KTIcon iconName='cross' className='fs-1' />
      </div>
      {/* end::Close */}
    </div>
  )
}

export {UserEditModalHeader}
