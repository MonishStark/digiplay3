export const ActiveDirectoryPath = (props: any) => {
    const handleFolderClick = (id: string) => {
        props.setCurrentParent(id);
        localStorage.setItem("current-parent", id);
    };

    const handleFolderClickWrapper = (folderId: string) => () => {
        handleFolderClick(folderId);
    };

    return (
        <div className="d-flex flex-wrap">
            {props.folderTree.map((folder: any) => (
                <>
                {folder.name !=="Root" && 
                    <span
                         className='text-hover-primary cursor-pointer'
                        onClick={handleFolderClickWrapper(folder.id)}
                    >
                        {folder.name}
                    </span>
                }
                    <span className="fw-bold mx-1">/</span>
                </>
            ))}
        </div>
    )
}