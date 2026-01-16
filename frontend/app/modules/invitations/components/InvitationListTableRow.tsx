import { Dropdown } from 'react-bootstrap'
import { DropdownCustomToggler } from '../../dropdown/DropdownCustomToggler'
import { DropdownMenu1 } from '../../dropdown/DropDownMenu1'
import { useNavigate } from 'react-router-dom'
import { FormattedMessage } from 'react-intl'


export const InvitationListTableRow = (props: any) => {

    const navigate = useNavigate()

    const goToUserDetail = () => navigate('/user-detail', { state: props.userId });

    return (
        <>
            <tr>
                {/* <td>
                    <div className="ms-3 form-check form-check-sm form-check-custom form-check-solid">
                        <input 
                            id='kt_table_users' 
                            className="form-check-input" 
                            type="checkbox" 
                            checked={props.selected}
                            value={props.id}
                            onChange={(e) => props.handleChange(e)} 
                        />
                    </div>
                </td> */}
                <td className="text-gray-800 text-start">{props.email}</td>
                <td className="text-gray-800 text-center">{props.role}</td>
                <td className="text-gray-800 text-center">{props.status}</td>
                <td className="text-gray-800 text-center"><>{new Date(props.created).toLocaleDateString()}</></td>

                {!props.userId &&
                    <td className='text-center min-w-100px actions'>
                        <Dropdown className="dropdown dropdown-inline" drop={"down"}>
                            <Dropdown.Toggle
                                className=""
                                variant="transparent"
                                id="dropdown-toggle-top-user-profile"
                                as={DropdownCustomToggler}
                            >
                                <span
                                    className='btn btn-light btn-active-light-primary btn-sm'
                                >
                                    <FormattedMessage id='TEAM.ACTIONS' />
                                </span>
                            </Dropdown.Toggle>
                            <Dropdown.Menu className="dropdown-menu dropdown-menu-sm dropdown-menu-right mt-1">
                                <DropdownMenu1
                                    id={props.id}
                                    email={props.email}
                                    resendInvitation={props.resendInvitation}
                                    openDialogForSingleDeletion={props.openDialogForSingleDeletion}
                                    resending={props.resending}
                                />
                            </Dropdown.Menu>
                        </Dropdown>
                    </td>
                }
                {props.userId &&
                    <td className='text-center min-w-100px actions'>
                        <span
                            className='btn btn-light btn-active-light-primary btn-sm'
                            onClick={goToUserDetail}
                        >
                            <FormattedMessage id='COMPANY.VIEW_USER' />
                        </span>
                    </td>
                }
            </tr>
        </>
    )
}