import React, {useState, useEffect} from 'react'
import {getAccountStats} from '../../../../auth/core/_requests'
import { useAuth } from '../../../../auth'

const Notifications: React.FC = () => {
  const [stats, setStats] = useState<any>({
    noOfQueriesDone : 0,
    noOfQueriesMaxLimit : 0,
    noOfUsers : 0,
    noOfUsersMaxLimit : 0,
    storageSizeOccupied : 0,
    storageSizeMaxLimit : 0,
  })
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAccountStats(currentUser?.id)
    .then((response) => {
      if(response.data.success) {
        setStats(response.data.statData)
        setLoading(false)
      } else {
        setLoading(false)
      }
    })
    .catch((err) => {
      console.log(err)
      setLoading(false)
    })
  }, [])

  return (
    <div className='card mb-5 mb-xl-10'>
      <div
        className='card-header border-0 cursor-pointer'
        role='button'
        data-bs-toggle='collapse'
        data-bs-target='#kt_account_notifications'
        aria-expanded='true'
        aria-controls='kt_account_notifications'
      >
        <div className='card-title m-0'>
          <h3 className='fw-bolder m-0'>Application Usage</h3>
        </div>
      </div>

      <div id='kt_account_notifications' className='collapse show'>
        <form className='form'>
          <div className='card-body border-top px-9 pt-3 pb-4'>
            <div className='table-responsive'>
              <table className='table table-row-dashed border-gray-300 align-middle gy-6'>
                <tbody className='fs-6 fw-bold'>
                  <tr>
                    <td className='min-w-250px fs-4 fw-bolder'>Usage Parameter</td>
                    <td className='w-125px'>
                      <div className='form-check form-check-solid'>
                        <label
                          className='form-check-label ps-2'
                          htmlFor='kt_settings_notification_email'
                        >
                          Used
                        </label>
                      </div>
                    </td>
                    <td className='w-125px'>
                      <div className='form-check form-check-solid'>
                        <label
                          className='form-check-label ps-2'
                          htmlFor='kt_settings_notification_phone'
                        >
                          Limit
                        </label>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td>Number of queries</td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                          <label className='form-check-label ps-2'>{stats.noOfQueriesDone}</label>
                        </div>
                      }
                      {loading && 
                        <div className='form-check form-check-solid'>
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </div>
                      }
                    </td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                          <label className='form-check-label ps-2'>{stats.noOfQueriesMaxLimit}</label>
                        </div>
                      }
                      {loading &&
                        <div className='form-check form-check-solid'>
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </div>
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>Number of users</td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                          <label className='form-check-label ps-2'>{stats.noOfUsers}</label>
                        </div>
                      }
                       {loading && 
                        <div className='form-check form-check-solid'>
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </div>
                      }
                    </td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                        <label className='form-check-label ps-2'>{stats.noOfUsersMaxLimit}</label>
                      </div>
                      }
                      {loading && 
                        <div className='form-check form-check-solid'>
                        <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                      </div>
                      }
                    </td>
                  </tr>

                  <tr>
                    <td>File storage size</td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                          <label className='form-check-label ps-2'>{stats.storageSizeOccupied} GB</label>
                        </div>
                      }
                      {loading && 
                        <div className='form-check form-check-solid'>
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </div>
                      }
                    </td>
                    <td>
                      {!loading && 
                        <div className='form-check form-check-solid'>
                          <label className='form-check-label ps-2'>{stats.storageSizeMaxLimit} GB</label>
                        </div>
                      }
                      {loading && 
                        <div className='form-check form-check-solid'>
                          <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                        </div>
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export {Notifications}
