import axios from 'axios'
import { UserModel } from './_models'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const GET_USER_BY_ACCESSTOKEN_URL = `${API_URL}/verify_token`
export const VALIDATE_AND_GET_OTP_URL = `${API_URL}/auth/login`
export const GET_USER_CLOUD_INTEGRATION = `${API_URL}/integrations`
export const LOGIN_URL_GOOGLE = `${API_URL}/user/social/submit-otp`
export const VALIDATE_GOOGLE_AND_GET_OTP_URL = `${API_URL}/auth/social/login`
export const LOGIN_URL = `${API_URL}/auth/verify-otp`
export const REGISTER_URL = `${API_URL}/auth/register`
export const VERIFY_ACCOUNT_URL = `${API_URL}/auth/verify-account`
export const RESEND_VERIFICATION_URL = `${API_URL}/me/verification/resend`
export const REQUEST_PASSWORD_URL = `${API_URL}/auth/password/forgot`
export const GET_USER_DATA = `${API_URL}/me/profile`
export const RESET_PASSWORD = `${API_URL}/auth/password/reset`
export const UPDATE_USER_PROFILE = `${API_URL}/me/profile`
export const UPDATE_USER_AVATAR = `${API_URL}/me/avatar`
export const UPDATE_COMPANY_PROFILE = `${API_URL}/company/update-profile`
export const CHANGE_PASSWORD_URL = `${API_URL}/me/password`
export const SET_PASSWORD_URL = `${API_URL}/me/password/set`
export const UPDATE_EMAIL = `${API_URL}/me/email`
export const ENABLE_2FA = `${API_URL}/me/2fa`
export const DISABLE_2FA = `${API_URL}/profile/disable-2fa`
export const ENABLE_COMPANY_2FA = `${API_URL}/profile/enable-company-2fa`
export const UPDATE_COMPANY_2FA = `${API_URL}/companies`;
export const GET_COMPANY_DATA = `${API_URL}/companies`;
export const UPDATE_COMPANY = `${API_URL}/companies`;
export const DISABLE_COMPANY_2FA = `${API_URL}/profile/disable-company-2fa`
export const GET_ACCOUNT_STATS = `${API_URL}/profile/get-account-stat`
export const SEND_INVITATION = `${API_URL}/invitations`
export const CHECK_PAYMENT_STATUS = `${API_URL}/auth/payment/status`
export const GOOGLE_PROFILE_IMAGE = `${API_URL}/google/profile/update`
export const SHARE_TEAM = `${API_URL}/teams`
export const DELETE_USER_PROFILE = `${API_URL}/user/delete-profile`
export const DELETE_TEAM_PROFILE = `${API_URL}/user/delete-team-profile`

// Server should return AuthModel
export function register(
  firstname: string,
  lastname: string,
  email: string,
  phoneNumberCountryCode:string,
  phoneNumber: string,
  mobileCountryCode:string,
  mobileNumber: string,
  companyName: string,
  orgType: string,
  password: string,
  mailingStreetName: string,
  mailingCountryName:string,
  mailingCityName: string,
  mailingStateName: string,
  mailingZip: string,
  billingStreetName: string,
  billingCountryName: string,
  billingCityName: string,
  billingStateName: string,
  billingZip: string,
  accountType: string,
  signUpMethod: string,
  currency: string
) {
  return axios.post(REGISTER_URL, {
    firstname,
    lastname,
    email,
    phoneNumberCountryCode,
    phoneNumber,
    mobileCountryCode,
    mobileNumber,
    companyName,
    orgType,
    password,
    mailingStreetName,
    mailingCountryName,
    mailingCityName,
    mailingStateName,
    mailingZip,
    billingStreetName,
    billingCountryName,
    billingCityName,
    billingStateName,
    billingZip,
    accountType,
    signUpMethod,
    currency
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function registerGoogle(
  code:string,
  code_verifier: string,
  email: string,
  firstname: string,
  lastname: string,
  avatarUrl: string,
  accountType: string,
  signUpMethod: string,
  currency: string
) {
  return axios.post(REGISTER_URL, {
    code,
    code_verifier,
    email,
    firstname,
    lastname,
    avatarUrl,
    accountType,
    signUpMethod,
    currency
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function registerGoogleComp(
  code:string,
  code_verifier: string,
  firstname: string,
  lastname: string,
  email: string,
  phoneNumberCountryCode:string,
  phoneNumber: string,
  companyName: string,
  orgType: string,
  mailingStreetName: string,
  mailingCountryName:string,
  mailingCityName: string,
  mailingStateName: string,
  mailingZip: string,
  billingStreetName: string,
  billingCountryName: string,
  billingCityName: string,
  billingStateName: string,
  billingZip: string,
  avatarUrl: string,
  accountType: string,
  signUpMethod: string,
  currency: string
) {
  return axios.post(REGISTER_URL, {
    code,
    code_verifier,
    firstname,
    lastname,
    email,
    phoneNumberCountryCode,
    phoneNumber,
    companyName,
    orgType,
    mailingStreetName,
    mailingCountryName,
    mailingCityName,
    mailingStateName,
    mailingZip,
    billingStreetName,
    billingCountryName,
    billingCityName,
    billingStateName,
    billingZip,
    avatarUrl,
    accountType,
    signUpMethod,
    currency
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function registerNonComp(
  firstname: string,
  lastname: string,
  email: string,
  mobileCountryCode:string,
  mobileNumber: string,
  password: string,
  accountType: string,
  signUpMethod: string,
  currency: string
) {
  return axios.post(REGISTER_URL, {
    firstname,
    lastname,
    email,
    mobileCountryCode,
    mobileNumber,
    password,
    accountType,
    signUpMethod,
    currency
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function validateGoogleCredential(email: string) {
  return axios.post(VALIDATE_GOOGLE_AND_GET_OTP_URL, {
    email,
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function loginGoogle(email: string, otp: any) {
  return axios.post(LOGIN_URL_GOOGLE, {
    email,
    otp
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function verifyAccount(
  email: any,
  token: any
) {
  return axios.post(VERIFY_ACCOUNT_URL, {
    email,
    token
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function resendVerificationEmail(email: any, api_token: any) {
  return axios.post(RESEND_VERIFICATION_URL, {
    email,
    api_token
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function validateCredential(email: string, password: string,loginType:string) {
  return axios.post(VALIDATE_AND_GET_OTP_URL, {
    email,
    password,
    loginType
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function validateSocialCredential(code: string, loginType:string,code_verifier:string) {
  return axios.post(VALIDATE_AND_GET_OTP_URL, {
    code,
    loginType,
    code_verifier
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getUserCloudIntegration() {
  return axios.get(GET_USER_CLOUD_INTEGRATION, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

// Server should return AuthModel
export function login(email: string, otp: any) {
  return axios.post(LOGIN_URL, {
    email,
    otp
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function requestPasswordResetLink(email: string) {
  return axios.post(REQUEST_PASSWORD_URL, {
    email,
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function resetPassword(email: any, token: any, password: string) {
  return axios.post(RESET_PASSWORD, {
    email,
    token,
    password
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateUserProfile(changes: any) {
  return axios.patch(UPDATE_USER_PROFILE, changes)
}
export function updateUserProfileAvatar(formData: any) {
  return axios.put(`${UPDATE_USER_AVATAR}`, formData)
}

export function getCompanyProfileData(companyId:any) {
  return axios.get(`${GET_COMPANY_DATA}/${companyId}/profile`)
}
export function updateCompanyProfile(companyId:any,formData: any) {
  return axios.patch(`${UPDATE_COMPANY}/${companyId}/profile`, formData)
}
export function updateCompanyAvatar(companyId:any,formData: any) {
  return axios.put(`${UPDATE_COMPANY}/${companyId}/avatar`, formData)
}

export function userDeleteProfile(
  formData: any
) {
  return axios.post(DELETE_USER_PROFILE, formData)
}

export function userDeleteTeamProfile(
  formData: any
) {
  return axios.post(DELETE_TEAM_PROFILE, formData)
}

export function changeCurrentPassword(currentPassword: string, newPassword: string) {
  return axios.post(CHANGE_PASSWORD_URL, {
    currentPassword,
    newPassword
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function setPassword(userId: any, password: string) {
  return axios.post(SET_PASSWORD_URL, {
    userId,
    password
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateEmailAddress(userId: any, newEmail: string, password: string) {
  return axios.post(UPDATE_EMAIL, {
    userId,
    newEmail,
    password
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function enable2FA(userId: any,enabled: boolean) {
  return axios.post(ENABLE_2FA, {
    userId,
    enabled
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function disable2FA(userId: any) {
  return axios.post(DISABLE_2FA, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function enableCompany2FA(companyId: any, userId: any) {
  return axios.post(ENABLE_COMPANY_2FA, {
    companyId,
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function updateCompany2FA(companyId: any, enabled: boolean) {
  return axios.post(
    `${UPDATE_COMPANY_2FA}/${companyId}/2fa`,
    { enabled },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

export function disableCompany2FA(companyId: any) {
  return axios.post(DISABLE_COMPANY_2FA, {
    companyId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getAccountStats(userId: any) {
  return axios.post(GET_ACCOUNT_STATS, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function sendInvitation(
  senderId: any,
  email: string,
  role: any,
  companyId: any
) {
  return axios.post(SEND_INVITATION, {
    senderId,
    email,
    role,
    companyId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function shareTeam(
  email: string,
  teamId: any,
) {
  return axios.post(`${SHARE_TEAM}/${teamId}/share`, {
    email
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function checkPaymentStatus(
  email: any
) {
  return axios.get(`${CHECK_PAYMENT_STATUS}?email=${email}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function googleImageUpload(
  email: any,
  avatarUrl: any
) {
  return axios.post(GOOGLE_PROFILE_IMAGE, {
    email,
    avatarUrl
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

// Server should return object => { result: boolean } (Is Email in DB)
export function requestPassword(email: string) {
  return axios.post(REQUEST_PASSWORD_URL, {
    email,
  })
}
export function getUserData() {
  return axios.get(GET_USER_DATA)
}

export function getUserByToken(token: string) {
  return axios.post<UserModel>(GET_USER_BY_ACCESSTOKEN_URL, {
    api_token: token,
  })
}
