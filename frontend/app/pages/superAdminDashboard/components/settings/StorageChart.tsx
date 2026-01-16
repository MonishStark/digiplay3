import React from 'react';
import ReactApexChart from 'react-apexcharts';

const StorageChart: React.FC<any> = ({ storageWithNumber }) => {
  const [size] = React.useState({
    series: (storageWithNumber ?? [])
      .filter((item: any) => item.source !== null)
      .map((item: any) => item.size),
    options: {
      chart: {
        width: 380,
        type: 'pie' as 'pie',
      },
      labels: (storageWithNumber ?? [])
        .filter((item: any) => item.source !== null)
        .map((item: any) => item.source),
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          colors: ['#fff'], // Labels in white for better visibility
        },
        dropShadow: {
          enabled: true,
          top: 1,
          left: 1,
          blur: 1,
          opacity: 0.5,
        },
        formatter: function (val: number) {
          return `${val.toFixed(1)}%`; // Format as a percentage
        },
      },
      plotOptions: {
        pie: {
          dataLabels: {
            offset: -5, // Move labels towards the center of each slice
            minAngleToShowLabel: 10, // Only show labels if slice angle is greater than this
          },
        },
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: function (val: number, opts: any) {
            const sourceData = storageWithNumber.filter(
              (item: any) => item.source !== null
            );
            const count = sourceData[opts.seriesIndex]?.count;
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
              fontSize: '12px',
            },
            dataLabels: {
              style: {
                fontSize: '12px',
              },
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
              fontSize: '10px',
            },
            dataLabels: {
              style: {
                fontSize: '10px',
              },
              offset: -2, // Adjust label positioning for smaller sizes
            },
          },
        },
      ],
    },
  });
  

  return (
    <div className="d-flex">
      <div className='d-flex flex-column align-items-center'>
        <ReactApexChart options={size.options} series={size.series} type="pie" width={400} />
      </div>
    </div>
  );
};

export default StorageChart;
