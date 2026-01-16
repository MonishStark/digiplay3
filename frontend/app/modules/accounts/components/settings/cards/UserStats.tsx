import React, { useEffect, useState } from 'react'
import { KTCard } from '../../../../../../app/theme/helpers'
import ReactApexChart from 'react-apexcharts'
import { useAuth } from '../../../../auth'
import { FormattedMessage } from 'react-intl'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getUserStatistics } from '../../api'

const UserStats = () => {
  const { currentUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [storageWithNumber, setStorageWithNumber] = useState<any>([])

  const [filterType, setFilterType] = useState<'today' | 'month' | 'overall'>('today')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const [size, setSize] = useState<any>({
    series: [],
    options: {},
  })

  /** Fetch stats */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let response: any
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() + 1
        const day = selectedDate.getDate()

        if (filterType === 'today') {
          // For 'today', we can let the user pick any date
          response = await getUserStatistics(day, month, year)
        } else if (filterType === 'month') {
          // For 'month', fetch stats for the whole month
          response = await getUserStatistics(null, month, year)
        } else {
          // For 'overall', fetch all available data
          response = await getUserStatistics(null, null, null)
        }

        setStorageWithNumber(response?.data)
      } catch (error) {
        console.error('Error fetching statistics:', error)
        setStorageWithNumber([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filterType, selectedDate])

  /** Update chart */
  useEffect(() => {
    const sources = (storageWithNumber?.userFileUploadSources ?? []).filter(
      (item: any) => item.source !== null
    )

    setSize({
      series: sources.map((item: any) => item.size),
      options: {
        chart: { type: 'pie', width: 380 },
        labels: sources.map((item: any) => item.source),
        dataLabels: {
          enabled: true,
          formatter: (val: number) => `${val.toFixed(1)}%`,
        },
        tooltip: {
          y: {
            formatter: (val: number, opts: any) =>
              `${val} kb (${sources[opts.seriesIndex]?.count})`,
          },
        },
      },
    })
  }, [storageWithNumber])

  return (
    <KTCard className="mt-5">
      <div className="card-header">
        <div className="card-title fw-bolder fs-1">
          {currentUser?.firstname} <FormattedMessage id="PROFILE.REPORT" />
        </div>
      </div>

      <div className="card-body d-flex flex-column align-items-center">
        {/* Buttons */}
        <div className="d-flex gap-3 mb-4">
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
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date) => setSelectedDate(date)}
            dateFormat="MMMM d, yyyy"
            className="form-control form-control-sm mb-4"
          />
        )}

        {/* Month / Year DatePicker */}
        {filterType === 'month' && (
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date) => setSelectedDate(date)}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            maxDate={new Date()}
            className="form-control form-control-sm mb-4"
          />
        )}

        {/* Chart */}
        {!loading && storageWithNumber?.userFileUploadSources?.length > 0 ? (
          <ReactApexChart options={size.options} series={size.series} type="pie" width={400} />
        ) : (
          !loading && <FormattedMessage id="PROFILE.NO_REPORT" />
        )}
      </div>
    </KTCard>
  )
}

export default UserStats
