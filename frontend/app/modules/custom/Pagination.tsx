/* eslint-disable jsx-a11y/anchor-is-valid */
import { FC } from 'react'

type Props = {
    totalNumberOfPages: number
    fetchNextData: Function
    selectedPage: any
    setSelectedPage: any
    currentPage: any
    setCurrentPage: any
}

const Pagination: FC<Props> = ({
    totalNumberOfPages,
    setSelectedPage,
    fetchNextData,
    selectedPage,
    currentPage,
}) => {

    const handleChange = (event: any) => {
        setSelectedPage(event.target.value)
    }

    const handleFetchNextData = (page: number) => () => {
      fetchNextData(page);
    };

    return (
        <div className='row'>
            <div className='d-flex'>
                {currentPage > 1 &&
                    <button
                        style={{
                            border: '#0000',
                            background: '#009ef7',
                            borderRadius: '5px',
                            color: '#fff',
                            height: '30px',
                            fontSize: '15px'
                        }}
                        onClick={handleFetchNextData(selectedPage - 1)}
                        disabled={selectedPage == 1}
                    >
                        Prev
                    </button>
                }
                <div className='d-flex my-auto'>
                    <div className='ms-4 d-flex flex-column'>
                        <input
                            type="text"
                            style={{ width: '40px', height: '28px', borderColor: '#0000', textAlign: 'center' }}
                            value={selectedPage}
                            onChange={handleChange}
                            disabled={totalNumberOfPages <= 1}
                        />
                    </div>

                    <span style={{ marginTop: '5px' }} className='ms-2 me-3'>Of</span>
                    <span style={{ marginTop: '5px' }} className='ms-1 me-4'>{totalNumberOfPages}</span>
                </div>
                {currentPage < totalNumberOfPages &&
                    <button
                        style={{
                            border: '#0000',
                            background: '#009ef7',
                            borderRadius: '5px',
                            color: '#fff',
                            height: '30px',
                            fontSize: '15px'
                        }}
                        onClick={handleFetchNextData(parseInt(selectedPage) + 1)}
                        disabled={selectedPage == totalNumberOfPages}
                    >
                        Next
                    </button>
                }

                {totalNumberOfPages > 1 &&
                    <button
                        className='ms-4'
                        style={{
                            border: '#0000',
                            background: '#009ef7',
                            borderRadius: '5px',
                            color: '#fff',
                            height: '30px',
                            fontSize: '15px'
                        }}
                        onClick={handleFetchNextData(selectedPage)}
                    >
                        Go to
                    </button>
                }
            </div>
        </div>
    )
}

export { Pagination }
