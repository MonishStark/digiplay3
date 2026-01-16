export interface AuthModel {
  api_token: string
  refresh_token:string
  user: UserModel | undefined
  company: any
}

export interface UserAddressModel {
  addressLine: string
  country:string
  city: string
  state: string
  postCode: string
}

export interface UserCommunicationModel {
  email: boolean
  sms: boolean
  phone: boolean
}

export interface UserEmailSettingsModel {
  emailNotification?: boolean
  sendCopyToPersonalEmail?: boolean
  activityRelatesEmail?: {
    youHaveNewNotifications?: boolean
    youAreSentADirectMessage?: boolean
    someoneAddsYouAsAsAConnection?: boolean
    uponNewOrder?: boolean
    newMembershipApproval?: boolean
    memberRegistration?: boolean
  }
  updatesFromKeenthemes?: {
    newsAboutKeenthemesProductsAndFeatureUpdates?: boolean
    tipsOnGettingMoreOutOfKeen?: boolean
    thingsYouMissedSindeYouLastLoggedIntoKeen?: boolean
    newsAboutStartOnPartnerProductsAndOtherServices?: boolean
    tipsOnStartBusinessProducts?: boolean
  }
}

export interface UserSocialNetworksModel {
  linkedIn: string
  facebook: string
  twitter: string
  instagram: string
}

export interface UserModel {
  id: number
  firstname: string
  lastname: string
  email: string
  accountStatus?: boolean
  phoneNumberCountryCode?:string
  phoneNumber?: string
  mobileCountryCode?:string
  mobileNumber?: string
  companyId: number
  companyName?: string
  password: string | undefined
  mailingAddress: UserAddressModel
  role?: any
  auth?: AuthModel
  billingAddress?: UserAddressModel
  orgType?: string
  avatarUrl?: string
  twoFactorEnabled?: boolean
  companytwoFactorEnabled?: boolean
  companyLogo?: string
  accountType?: any
  language?: string
  companyLanguage?: string
}
