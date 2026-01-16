/* eslint-disable jsx-a11y/anchor-is-valid */
import { FC } from 'react'

type Props = {
    totalNoOfRecords: any
    selectedPage: any
    limit: number
    entityName: string
}

const NoOfRecords: FC<Props> = ({
    totalNoOfRecords,
    selectedPage,
    limit,
    entityName
}) => {

    return (
        <div className='row user-numb'>
            <div className='d-flex'>
                <span className='fs-6'>{((selectedPage - 1) * limit) + 1}</span>
                <span className='fs-6 mx-1'>{'-'}</span>
                <span className='fs-6'>{(selectedPage * limit) >= totalNoOfRecords ? totalNoOfRecords : (selectedPage * limit)}</span>
                <span className='fs-6 ms-2'>of</span>
                <span className='fs-6 ms-2'>{totalNoOfRecords}</span>
                <span className='fs-6 ms-1'>{entityName}</span>
            </div>
        </div>
    )
}

export { NoOfRecords }
