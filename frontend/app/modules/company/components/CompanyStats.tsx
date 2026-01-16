import React, { useEffect, useState } from 'react'
import { KTCard } from '../../../../app/theme/helpers'
import ReactApexChart from 'react-apexcharts'
import { useAuth } from '../../auth'
import { FormattedMessage } from 'react-intl'
import { getCompanyStatistics } from '../../accounts/components/api'

const CompanyStats = () => {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamSourceWithNumber, setTeamSourceWithNumber] = useState<any>([])
  const [chartData, setChartData] = useState({
    series: [],
    options: {
      chart: {
        width: 380,
        type: 'pie' as 'pie',
      },
      labels: [],
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          colors: ['#fff'],
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 1,
          opacity: 0.5,
        },
        formatter: function (val: number) {
          return `${val.toFixed(1)}%`
        },
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -5,
            minAngleToShowLabel: 10,
          },
        },
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: function (val: number, opts: any) {
            const sourceData = teamSourceWithNumber.filter(
              (item: any) => item.source !== null
            )
            const count = sourceData[opts.seriesIndex]?.count
            return `${val} kb (${count || 0})`
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 150,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
    },
  })

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const data: any = await getCompanyStatistics(currentUser?.companyId)
        const clientStatistics = data?.data
        if (!clientStatistics) {
          setTeamSourceWithNumber([])
          return
        }
        setTeamSourceWithNumber(clientStatistics.companyFileUploadSources || [])
      } catch (error) {
        console.error('Error fetching company statistics:', error)
        setTeamSourceWithNumber([])
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyData()
  }, [currentUser])

  useEffect(() => {
    const filteredData = teamSourceWithNumber?.filter(
      (item: any) => item.source !== null
    ) || []

    setChartData({
      series: filteredData.map((item: any) => item.size || 0),
      options: {
        chart: {
          width: 380,
          type: 'pie' as 'pie',
        },
        labels: filteredData.map((item: any) => item.source),
        dataLabels: {
          enabled: true,
          style: {
            fontSize: '14px',
            fontWeight: 'bold',
            colors: ['#fff'],
          },
          dropShadow: {
            enabled: true,
            top: 1,
            left: 1,
            blur: 1,
            opacity: 0.5,
          },
          formatter: function (val: number) {
            return `${val.toFixed(1)}%`; // Format as percentage
          },
        },
        plotOptions: {
          pie: {
            dataLabels: {
              offset: -5, // Move labels towards center
              minAngleToShowLabel: 10, // Only show labels for slices larger than this angle
            },
          },
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: function (val: number, opts: any) {
              const count = filteredData[opts.seriesIndex]?.count || 0;
              return `${val} kb (${count})`;
            },
          },
        },
        responsive: [
          {
            breakpoint: 768, // Tablets
            options: {
              chart: {
                width: 300,
              },
              legend: {
                position: 'bottom',
              },
            },
          },
          {
            breakpoint: 480, // Mobile devices
            options: {
              chart: {
                width: 250,
              },
              legend: {
                position: 'bottom',
              },
            },
          },
        ],
      },
    });
    
  }, [teamSourceWithNumber])

  return (
    <KTCard className='mt-5 d-flex justify-content-between align-items-center'>
      <div className='card-header'>
        <div className='card-title'>
          <div className='fw-bolder fs-1'>
            {currentUser?.companyName}<FormattedMessage id='PROFILE.REPORT' />
          </div>
        </div>
      </div>
      <div className='d-flex flex-column align-items-center'>
        {!loading && (
          (teamSourceWithNumber.length > 0 && teamSourceWithNumber?.[0]?.source != null ) ?
          <ReactApexChart
            options={chartData.options}
            series={chartData.series}
            type='pie'
            width={400}
          />
          :
          <FormattedMessage id='PROFILE.NO_REPORT' />
          )
        }
      </div>
    </KTCard>
  )
}

export default CompanyStats
