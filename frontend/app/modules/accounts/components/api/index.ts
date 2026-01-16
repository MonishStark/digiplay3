import axios from 'axios'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const GET_USER_STATISITICS = `${API_URL}/me/usage`
export const GET_COMPANY_STATISTICS = `${API_URL}/companies`




export function getUserStatistics(
  day: any,
  month: any,
  year: any
) {
  return axios.get(`${GET_USER_STATISITICS}?day=${day}&month=${month}&year=${year}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getCompanyStatistics(
  companyId: any
) {
  return axios.get(`${GET_COMPANY_STATISTICS}/${companyId}/usage`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}