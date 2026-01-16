import { storeCurrentTeam, useAuth } from "../../auth";

function SelectTeams(props: any) {
    const { istextEditor, setCurrentParent } = useAuth()

    const handleChange = (event: any) => {
        if (istextEditor) {
            const confirmation = window.confirm("You have unsaved changes. Are you sure you want to change team?");
            if (!confirmation) {
                event.preventDefault();
            } else {
                event.preventDefault();
                props.setCurrentTeam(event.target.value)
                setCurrentParent(4)
                storeCurrentTeam(event.target.value)
            }
        } else {
            event.preventDefault();
            props.setCurrentTeam(event.target.value)
            setCurrentParent(4)
            storeCurrentTeam(event.target.value)
        }
    };

    return (
        <>
            <div className="form-group row">
                <select
                    className="form-control form-control-lg form-control-solid team-select"
                    name="sort"
                    onChange={handleChange}
                    value={props.currentTeam ? props.currentTeam : ''}
                    style={{ border: "1px solid rgb(184, 169, 169)" }}
                >
                    <option value="" disabled={props.currentTeam !== ''}>Select Team</option>
                    {props.teamList.length > 0 &&
                        <>
                            {props.teamList.map((list: any) => (
                                <option key={list.id} value={list.id}>{list.teamName} / {list.teamAlias}</option>
                            ))}
                        </>
                    }
                </select>
            </div>
        </>
    )
}

export { SelectTeams };