import { InvitationSearchComponent } from './InvitationSearchComponent'
import { InvitationToolbar } from './InvitationToolbar'

const InvitationListHeader = (props: any) => {

  return (
    <div className='card-header border-0 pt-6'>
      <InvitationSearchComponent
        searchString={props.searchString}
        handleSearchBarChange={props.handleSearchBarChange}
        noOfRecords={props.noOfRecords}
      />

      <div className='card-toolbar'>
        <InvitationToolbar noOfRecords={props.noOfRecords} />
      </div>
    </div>
  )
}

export { InvitationListHeader }