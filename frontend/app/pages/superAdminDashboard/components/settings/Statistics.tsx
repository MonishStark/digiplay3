import React, { useState, useEffect } from 'react'
import { KTCard, KTIcon, toAbsoluteUrl } from '../../../../../app/theme/helpers'
import { useLocation, useNavigate } from 'react-router-dom'
import { getCompanyStatistics, getClientStatistics } from '../../api'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { FormattedMessage } from 'react-intl'

type FilterType = 'today' | 'month' | 'overall'

const Statistics = () => {
  const { state }: any = useLocation()
  const navigate = useNavigate()

  const today = new Date()
  const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>('today')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  /** Stats */
  const [queries, setQueries] = useState<number>(0)
  const [teams, setTeams] = useState<number>(0)
  const [users, setUsers] = useState<number>(0)
  const [storageUsed, setStorageUsed] = useState<string>('0 KB')
  const [recordings, setRecordings] = useState<number>(0)
  const [sources, setSources] = useState<any[]>([])

  /** Fetch statistics */
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        let response: any

        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth() + 1
        const day = selectedDate.getDate()

        if (state?.data === 'team') {
          if (filterType === 'today') {
            response = await getCompanyStatistics(state.companyId, day, month, year)
          } else if (filterType === 'month') {
            response = await getCompanyStatistics(state.companyId, null, month, year)
          } else {
            response = await getCompanyStatistics(state.companyId, null, null, null)
          }
        } else {
          const userId = state?.userId
          if (filterType === 'today') {
            response = await getClientStatistics(userId, day, month, year)
          } else if (filterType === 'month') {
            response = await getClientStatistics(userId, null, month, year)
          } else {
            response = await getClientStatistics(userId, null, null, null)
          }
        }

        const data = response?.data
        setQueries(data?.queries?.current || 0)
        setUsers(data?.noOfUsers?.current || 0)
        setTeams(data?.noOfTeams?.current || 0)
        setStorageUsed(data?.fileStorageSize?.used || '0 KB')
        setRecordings(data?.recordings?.count || 0)
        setSources(data?.companyFileUploadSources || [])
      } catch (error) {
        console.error('Error fetching statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [filterType, selectedDate, state])

  const handleNavigateBack = () => navigate(-1)

  return (
    <>
      {!loading ? (
        <KTCard>
          {/* Header */}
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="card-title">
              <div className="fw-bolder fs-1">
                {state?.data === 'team' ? state?.companyName : state?.userName}{' '}
                <FormattedMessage id="SUPERADMIN.STATISTICS" />
              </div>
            </div>
            <div className="cursor-pointer" onClick={handleNavigateBack}>
              <KTIcon iconName="cross" className="fs-1" />
            </div>
          </div>

          {/* Filters */}
          <div className="card-body pt-4">
            <div className="d-flex gap-3 mb-4 flex-wrap">
              {(['today', 'month', 'overall'] as FilterType[]).map((type) => (
                <button
                  key={type}
                  className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-light'}`}
                  onClick={() => setFilterType(type)}
                >
                  {type === 'today'
                    ? 'Date'
                    : type === 'month'
                    ? 'Month / Year'
                    : 'Overall'}
                </button>
              ))}
            </div>

            {/* 🔹 DatePicker for Today */}
            {filterType === 'today' && (
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date) => setSelectedDate(date)}
                dateFormat="MMMM d, yyyy"
                className="form-control w-auto"
              />
            )}

            {/* 🔹 Month Picker */}
            {filterType === 'month' && (
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date) => setSelectedDate(date)}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                maxDate={startOfCurrentMonth}
                className="form-control w-auto"
              />
            )}
          </div>

          {/* Stats */}
          <div className="card-body gap-8 d-flex flex-column">
            <StatRow label="SUPERADMIN.TEAMS" value={teams} />
            {state?.data === 'team' && <StatRow label="SUPERADMIN.USERS" value={users} />}
            <StatRow label="SUPERADMIN.STORAGE" value={storageUsed} />
            <StatRow label="SUPERADMIN.QUERIES" value={queries} />
            <StatRow label="SUPERADMIN.RECORDINGS" value={recordings} />
          </div>
        </KTCard>
      ) : (
        <div className="d-flex justify-content-center">
          <img
            src={toAbsoluteUrl('/media/utils/upload-loading.gif')}
            alt="Loading"
            width={50}
          />
        </div>
      )}
    </>
  )
}

const StatRow = ({ label, value }: any) => (
  <div className="d-flex justify-content-between align-items-center">
    <span className="fw-bold fs-5">
      <FormattedMessage id={label} />
    </span>
    <span className="fw-bold fs-5 text-muted">{value || 0}</span>
  </div>
)

export { Statistics }
