import React from "react"

export const CurrentUploadPath = (props: any) => {
    return (
        <div className="d-flex flex-wrap mb-6 ms-4">
            {props.folderTree.map((folder: any) => (
                <React.Fragment key={folder.id}>
                    <span
                        className='fs-3 fw-bold'
                    >
                        {folder.name == 'Root' ? props.currentTeamTitle : folder.name}
                    </span>
                    <span className="fw-bold fs-3 mx-1">/</span>
                </React.Fragment>
            ))}
        </div>
    )
}