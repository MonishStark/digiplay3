import CircularProgress from "@mui/material/CircularProgress"

export const CustomCircularProgress = () => {
    return (
        <div className='d-flex w-100 h-100'>
            <div className='my-auto mx-auto'>
                <div className='d-flex flex-column justify-content-center'>
                    <span className='text-primary fs-3'>Fetching data</span> <br />
                    <span className='ms-4'>
                        <CircularProgress />
                    </span>
                </div>
            </div>
        </div>
    )
}