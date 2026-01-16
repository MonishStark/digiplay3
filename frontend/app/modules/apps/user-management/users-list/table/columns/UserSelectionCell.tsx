import {FC, useMemo} from 'react'
import {ID} from '../../../../../../../app/theme/helpers'
import {useListView} from '../../core/ListViewProvider'

type Props = {
  id: ID
}

const UserSelectionCell: FC<Props> = ({id}) => {
  const {selected, onSelect} = useListView()
  const isSelected = useMemo(() => selected.includes(id), [id, selected])

  const handleSelectChange = (id: ID) => () => {
    onSelect(id);
  };

  return (
    <div className='form-check form-check-custom form-check-solid'>
      <input
        className='form-check-input'
        type='checkbox'
        data-kt-check={isSelected}
        data-kt-check-target='#kt_table_users .form-check-input'
        checked={isSelected}
        onChange={handleSelectChange(id)}
      />
    </div>
  )
}

export {UserSelectionCell}
