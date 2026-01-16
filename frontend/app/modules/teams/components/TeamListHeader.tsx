import { useAuth } from '../../auth'
import { TeamSearchComponent } from './TeamSearchComponent'
import { TeamToolbar } from './TeamToolbar'

const TeamListHeader = (props: any) => {
  const {currentUser} = useAuth();

  return (
    <div className='card-header border-0 pt-6 px-3'>
      <TeamSearchComponent
        searchString={props.searchString}
        handleSearchBarChange={props.handleSearchBarChange}
        noOfRecords={props.noOfRecords}
      />
    {currentUser?.role === 1 &&
      <div className='card-toolbar'>
        <TeamToolbar
          noOfRecords={props.noOfRecords}
          setShowCreateTeamModal={props.setShowCreateTeamModal}
        />
      </div>
    }
    </div>
  )
}

export { TeamListHeader }