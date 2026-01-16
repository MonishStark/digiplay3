import axios from 'axios'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const GET_ROLE = `${API_URL}/super-admin/users`
export const GET_ENV = `${API_URL}/super-admin/environment`
export const UPDATE_ENV = `${API_URL}/super-admin/environment`
export const UPDATE_EMAIL_TEMPLATE = `${API_URL}/super-admin/email/templates`
export const GET_CLIENTS = `${API_URL}/super-admin/clients`
export const GET_TEMPLATES = `${API_URL}/super-admin/email/templates`
export const GET_CLIENT_STATISTICS = `${API_URL}/super-admin/users`
export const GET_COMPANY_STATISTICS = `${API_URL}/super-admin/companies`
export const GET_CLIENT_USERS = `${API_URL}/get/user/users`
export const ADMIN_USER_UPDATE = `${API_URL}/super-admin/update-profile`
export const USER_UPDATE = `${API_URL}/super-admin/users`
export const SUPER_ADMIN_DELETE_USER = `${API_URL}/super-admin/delete-user`
export const SUPER_ADMIN_DELETE_TEAM_ACCOUNT = `${API_URL}/super-admin/companies`
export const ADMIN_ORG_UPDATE = `${API_URL}/super-admin/companies/:companyId/profile`
export const SUPER_ADMIN_UPDATE = `${API_URL}/me/profile`
export const CREATE_USER = `${API_URL}/user/create-account-for-super-user`
export const SUPER_EMAIL = `${API_URL}/super-user-email`
export const REMOVE_SUPER_USER = `${API_URL}/remove-suoer-user`
export const REMOVE_USER = `${API_URL}/super-admin/users`
export const LAST_MONTH_DATA = `${API_URL}/super-admin/usage/last-month`
export const GET_LAST_MONTH_DATA = `${API_URL}/super-admin/companies`
export const GET_RECORDING_COUNT= `${API_URL}/get-recording-count`

export function getAdminRole(
  userId: any
) {
  return axios.get(`${GET_ROLE}/${userId}/role`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getAdminENV() {
  return axios.get(GET_ENV, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateAdminENV(formData: any) {
  return axios.patch(UPDATE_ENV, formData)
}

export function updateEmailTemplate(id: any, subject: any, template: any, fileName: any) {
  return axios.patch(`${UPDATE_EMAIL_TEMPLATE}/${id}`, {subject, template, fileName})
}

export function getClients() {
  return axios.get(GET_CLIENTS, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getTemplates() {
  return axios.get(GET_TEMPLATES, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getClientStatistics(
  userId:any,
  day: any,
  month: any,
  year: any
) {
  return axios.get(`${GET_CLIENT_STATISTICS}/${userId}/usage?day=${day}&month=${month}&year=${year}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getCompanyStatistics(
  companyId: any,
  day: any,
  month: any,
  year: any
) {
  return axios.get(`${GET_COMPANY_STATISTICS}/${companyId}/usage?day=${day}&month=${month}&year=${year}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getClientUsers(
  companyId: any
) {
  return axios.post(GET_CLIENT_USERS, {
    companyId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function superAdminUserUpdate(
  formData: any
) {
  return axios.post(ADMIN_USER_UPDATE, formData)
}

export function superAdminSoloUserUpdate(
  userId: any,
  formData: any
) {
  return axios.patch(`${USER_UPDATE}/${userId}/profile`, formData)
}

export function superAdminDeleteUser(
  formData: any
) {
  return axios.post(SUPER_ADMIN_DELETE_USER, formData)
}

export function superAdminDeleteTeamAccount(
  companyId: any,
) {
  return axios.delete(`${SUPER_ADMIN_DELETE_TEAM_ACCOUNT}/${companyId}`)
}

export function superAdminOrgUpdate(
  companyId: any,
  formData: any
) {
  return axios.patch(`${ADMIN_ORG_UPDATE}/super-admin/companies/${companyId}/profile`, formData)
}

export function createAccountForSuperUsers(
  firstname: string,
  lastname: string,
  email: string,
  mobileCountryCode: string,
  mobileNumber: any,
  password: string,
  companyId: any,
  role: any
) {
  return axios.post(CREATE_USER, {
    firstname,
    lastname,
    email,
    mobileCountryCode,
    mobileNumber,
    password,
    companyId,
    role
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function superAdminUpdate(
  formData: any
) {
  return axios.patch(SUPER_ADMIN_UPDATE, formData)
}


export function getSuperEmail() {
  return axios.post(SUPER_EMAIL)
}

export function removeSuperUser(
  userId: any,
  companyId: any
) {
  return axios.post(REMOVE_SUPER_USER, {
    userId,
    companyId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function removeUser(
  userId: any
) {
  return axios.delete(`${REMOVE_USER}/${userId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getLastMonthData(
  companyId: any
) {
  return axios.get(`${GET_LAST_MONTH_DATA}/${companyId}/usage/last-month`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function insertLastMonthData(
  lastMonthData: any
) {
  return axios.put(LAST_MONTH_DATA, lastMonthData)
}

export function getRecordingCount(
  companyId: any,
  date:any
) {
  return axios.post(GET_RECORDING_COUNT, {companyId,date},{
    headers: {
    'Content-Type': 'application/json'
  }
})
}