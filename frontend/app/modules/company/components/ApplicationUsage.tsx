import React, { useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { getCompanyUsage } from '../../document-management/api'
import { FormattedMessage } from 'react-intl'
import DatePicker from 'react-datepicker'
import ReactApexChart from 'react-apexcharts'
import { KTCard } from '../../../../app/theme/helpers'
import 'react-datepicker/dist/react-datepicker.css'

const ApplicationUsage: React.FC = () => {
  const { currentUser } = useAuth()

  const today = new Date()
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'today' | 'month' | 'overall'>('today')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  /** Usage states */
  const [noOfQueries, setNoOfQueries] = useState<any>('')
  const [noOfQueriesLimit, setNoOfQueriesLimit] = useState<any>('')
  const [noOfUsers, setNoOfUsers] = useState<any>('') 
  const [maxUsers, setMaxUsers] = useState<any>(0)
  const [storageUsage, setStorageUsage] = useState<any>('') 
  const [storageLimit, setStorageLimit] = useState<any>('') 
  const [recordingCount, setRecordingCount] = useState<number>(0)
  const [recordingLimit, setRecordingLimit] = useState<number>(0)

  /** Chart states */
  const [sources, setSources] = useState<any[]>([])
  const [chartData, setChartData] = useState<any>({
    series: [],
    options: {},
  })

  /** Fetch data */
  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true)
      try {
        let response: any
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() + 1
        const day = selectedDate.getDate()

        if (filterType === 'today') {
          response = await getCompanyUsage(
            currentUser?.companyId,
            day,
            month,
            year
          )
        } else if (filterType === 'month') {
          response = await getCompanyUsage(
            currentUser?.companyId,
            null,
            month,
            year
          )
        } else {
          response = await getCompanyUsage(currentUser?.companyId, null, null, null)
        }

        if (response?.data?.success) {
          const data = response.data

          setNoOfQueries(data.queries.current)
          setNoOfQueriesLimit(data.queries.limit)
          setNoOfUsers(data.noOfUsers.current)
          setMaxUsers(data.noOfUsers.limit)
          setStorageUsage(data.fileStorageSize.used)
          setStorageLimit(data.fileStorageSize.limit)
          setRecordingCount(data.recordings.count)
          setRecordingLimit(data.recordings.limit)

          setSources(data.companyFileUploadSources || [])
        }
      } catch (error) {
        console.error('Error fetching company usage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [filterType, selectedDate, currentUser])

  /** Update pie chart */
  useEffect(() => {
    const filtered = sources.filter((item) => item.source !== null)

    setChartData({
      series: filtered.map((item) => item.size || 0),
      options: {
        chart: { type: 'pie', width: 380 },
        labels: filtered.map((item) => item.source),
        dataLabels: {
          enabled: true,
          formatter: (val: number) => `${val.toFixed(1)}%`,
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            colors: ['#fff'],
          },
        },
        tooltip: {
          y: {
            formatter: (val: number, opts: any) =>
              `${val} kb (${filtered[opts.seriesIndex]?.count || 0})`,
          },
        },
        responsive: [
          {
            breakpoint: 768,
            options: {
              chart: { width: 300 },
              legend: { position: 'bottom' },
            },
          },
          {
            breakpoint: 480,
            options: {
              chart: { width: 250 },
              legend: { position: 'bottom' },
            },
          },
        ],
      },
    })
  }, [sources])

  return (
    <>
      {/* ===== Usage Table ===== */}
      <div className="card mb-5 mb-xl-10">
        <div className="card-header border-0">
          <div className="card-title m-0 d-flex flex-column">
            <h3 className="fw-bolder m-0 py-5">
              <FormattedMessage id="COMPANY.PROFILE.USAGE.TITLE" />
            </h3>

            {/* Filters */}
            <div className="d-flex gap-3 mt-4 flex-wrap">
              <button
                className={`btn btn-sm ${filterType === 'today' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setFilterType('today')}
              >
                Date
              </button>

              <button
                className={`btn btn-sm ${filterType === 'month' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setFilterType('month')}
              >
                Month / Year
              </button>

              <button
                className={`btn btn-sm ${filterType === 'overall' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setFilterType('overall')}
              >
                Overall
              </button>
            </div>

            {/* DatePicker for 'Today' */}
            {filterType === 'today' && (
              <div className="mt-3">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date) => setSelectedDate(date)}
                  dateFormat="MMMM d, yyyy"
                  className="form-control form-control-sm"
                />
              </div>
            )}

            {/* Month Picker for 'Month' */}
            {filterType === 'month' && (
              <div className="mt-3">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date) => setSelectedDate(date)}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  maxDate={new Date(startOfCurrentMonth.getTime())}
                  className="form-control form-control-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="card-body border-top px-9 pt-3 pb-4">
          <div className="table-responsive">
            <table className="table table-row-dashed border-gray-300 align-middle gy-6">
              <tbody className="fs-6 fw-bold">
                {[ 
                  ['COMPANY.PROFILE.USAGE.NO_OF_QUERIES', noOfQueries, noOfQueriesLimit],
                  ['COMPANY.PROFILE.USAGE.NO_OF_USERS', noOfUsers, maxUsers],
                  ['COMPANY.PROFILE.USAGE.STORAGE', storageUsage, `${storageLimit} GB`],
                  ['COMPANY.PROFILE.USAGE.NO_OF_RECORDINGS', recordingCount, recordingLimit],
                ].map(([label, used, limit], idx) => (
                  <tr key={idx}>
                    <td><FormattedMessage id={label as string} /></td>
                    <td>{loading ? <span className="spinner-border spinner-border-sm" /> : used}</td>
                    <td>{loading ? <span className="spinner-border spinner-border-sm" /> : limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===== Company Pie Chart ===== */}
      <KTCard className="mt-5 d-flex justify-content-between align-items-center">
        <div className="card-header">
          <div className="card-title">
            <div className="fw-bolder fs-1">
              {currentUser?.companyName} <FormattedMessage id="PROFILE.REPORT" />
            </div>
          </div>
        </div>

        <div className="d-flex flex-column align-items-center">
          {!loading && sources.length > 0 ? (
            <ReactApexChart
              options={chartData.options}
              series={chartData.series}
              type="pie"
              width={400}
            />
          ) : (
            !loading && <FormattedMessage id="PROFILE.NO_REPORT" />
          )}
        </div>
      </KTCard>
    </>
  )
}

export { ApplicationUsage }
