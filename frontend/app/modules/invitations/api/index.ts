import axios from 'axios'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const INVITATION_LIST = `${API_URL}/invitations`
export const DELETE_INVITATIONS = `${API_URL}/invitations/delete`
export const DELETE_INVITATION = `${API_URL}/companies`
export const RESEND_INVITATION = `${API_URL}/companies`
export const GET_INVITATION = `${API_URL}/invitations/verify`
export const CREATE_USER = `${API_URL}/auth/register`
export const DECLINE_INVITATION = `${API_URL}/invitation/decline`
export const GET_USER_DETAIL = `${API_URL}/admin/users`
export const GET_SUPERADMIN_DETAIL = `${API_URL}/admin/get-superAdmin-detail`
export const VERIFY_USER_ACCOUNT = `${API_URL}/admin/users`
export const UPDATE_USER = `${API_URL}/admin/users`
export const WHITELIST_USER = `${API_URL}/admin/whitelist-user`
export const UPDATE_USER_2FA_FOR_ADMIN = `${API_URL}/admin/users`
export const DISABLE_USER_2FA_FOR_ADMIN = `${API_URL}/admin/disable-user-2fa`
export const ADMIN_USER_UPDATE = `${API_URL}/admin/users`
export const ADMIN_USER_PASSWORD_UPDATE = `${API_URL}/admin/users`


export function getInvitationList(
  searchString: string,
  offset: number,
  limit: number,
  companyId: any
) {
  return axios.get(`${INVITATION_LIST}?companyId=${companyId}&search=${searchString}&offset=${offset}&limit=${limit}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteInvitations(
  invitationIds: Array<any>,
  companyId: any,
  limit: number
) {
  return axios.post(DELETE_INVITATIONS, {
    invitationIds,
    companyId,
    limit
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteInvitation(
  invitationId: any,
  companyId: any,
) {
  return axios.delete(`${DELETE_INVITATION}/${companyId}/invitations/${invitationId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function resendInvitation(
  invitationId: string,
  companyId: any
) {
  return axios.post(`${RESEND_INVITATION}/${companyId}/invitations/${invitationId}/resend`,  {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getInvitationDataByEmail(
  email: any,
  token: any
) {
  return axios.post(`${GET_INVITATION}`,{
email,
token
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createAccountForInvitedUsers(
  firstname: string,
  lastname: string,
  email: string,
  mobileCountryCode: any,
  mobileNumber: any,
  password: string,
  companyId: any,
  role: any,
  token: any,
  signUpMethod: any,
  accountType :any,
  avatarUrl:any,
  code:any,
  code_verifier:any
) {
  return axios.post(CREATE_USER, {
    firstname,
    lastname,
    email,
    mobileCountryCode,
    mobileNumber,
    password,
    companyId,
    role,
    token,
    signUpMethod,
    accountType,
    avatarUrl,
    code,
    code_verifier
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createAccountForSuperInvitedUsers(
  firstname: string,
  lastname: string,
  email: string,
  companyId: any,
  role: any,
  token: any,
  signUpMethod: any,
  avatarUrl: any
) {
  return axios.post(CREATE_USER, {
    firstname,
    lastname,
    email,
    companyId,
    role,
    token,
    signUpMethod,
    avatarUrl
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function declineInvitation(
  email: any,
  token: any
) {
  return axios.post(DECLINE_INVITATION, {
    email,
    token
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getUserDetailForAdmin(
  userId: any
) {
  return axios.get(`${GET_USER_DETAIL}/${userId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getSuperAdminDetailForAdmin(
  userId: any
) {
  return axios.post(GET_SUPERADMIN_DETAIL, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function verifyUserAccountForAdmin(
  userId: any
) {
  return axios.patch(`${VERIFY_USER_ACCOUNT}/${userId}/verify`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateUserAccountStatus(
  userId: any,
  status: string
) {
  return axios.patch(`${UPDATE_USER}/${userId}/account-status`, {
    status
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function whitelistUserAccount(
  userId: any,
) {
  return axios.post(WHITELIST_USER, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}


export function updateUser2FAOptionForAdmin(
  userId: any,
  enabled: any
) {
  return axios.patch(`${UPDATE_USER_2FA_FOR_ADMIN}/${userId}/2fa`, {
    enabled
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function disableUser2FAOptionForAdmin(
  userId: any
) {
  return axios.post(DISABLE_USER_2FA_FOR_ADMIN, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function adminUserPasswordUpdate(
  userId: any,
  newPassword: string,
) {
  return axios.patch(`${ADMIN_USER_PASSWORD_UPDATE}/${userId}/password`, {
    newPassword
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function adminUserUpdate(
  userId: any,
  formData: any
) {
  return axios.patch(`${ADMIN_USER_UPDATE}/${userId}/profile`, formData)
}
export function adminUserAvatarUpdate(
  userId: any,
  formData: any
) {
  return axios.put(`${ADMIN_USER_UPDATE}/${userId}/profile/avatar`, formData)
}