import { offset } from '@popperjs/core'
import axios from 'axios'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const CREATE_FOLDER = `${API_URL}/teams`
export const GET_ROOT_FOLDERS = `${API_URL}/teams`
export const GET_FOLDERS_AND_FILES = `${API_URL}/teams`
export const GET_CHILD_FILES_AND_FOLDERS = `${API_URL}/file-manager/get-child-folders`
export const GET_ACTIVE_TEAMS = `${API_URL}/teams/active`
export const GET_FOLDER_DATA = `${API_URL}/file-manager/get-folder`
export const DELETE_FOLDER = `${API_URL}/teams`
export const UPDATE_FOLDER = `${API_URL}/folders`
export const UPLOAD_DOCUMENT = `${API_URL}/files/upload`
export const UPLOAD_DOCUMENT_FROM_INTEGRATION = `${API_URL}/integrations`
export const CREATE_DOCUMENT = `${API_URL}/teams`
export const UPDATE_DOCUMENT = `${API_URL}/files`
export const UPDATE_FILE_NAME = `${API_URL}/file-manager/update-filename`
export const DELETE_FILE = `${API_URL}/teams`
export const GET_FILE = `${API_URL}/teams`
export const SEARCH_FILES_AND_FOLDERS = `${API_URL}/teams`
export const GET_COMPANY_USAGE = `${API_URL}/companies`
export const GET_USER_CHAT_HISTORIES = `${API_URL}/chat/get-histories`
export const RENAME_CHAT_HISTORY = `${API_URL}/teams`
export const DELETE_CHAT_HISTORY = `${API_URL}/teams`
export const GET_CHAT_MESSAGES = `${API_URL}/teams`
export const ADD_MESSAGE_TO_CHAT = `${API_URL}/teams`
export const CREATE_NEW_CHAT = `${API_URL}/teams`
export const GET_FOLDER_TREE_FOR_FILE = `${API_URL}/teams`
export const CANCEL_SUBSCRIPTION = `${API_URL}/user/admin/cancel-subscription`
export const REMOVE_USER = `${API_URL}/super-admin/users`
export const GET_SUBSCRIPTION_DETAILS = `${API_URL}/me/subscription`
export const GET_USER_DYNAMIC_ROLES = `${API_URL}/user-role`
export const UPLOAD_AUDIO = `${API_URL}/files/upload/audio`
export const GET_FILE_SUMMARY = `${API_URL}/summarize-document`
export const GET_SUMMARY_DATA = `${API_URL}/teams`
export const UPDATE_SUMMARY_FILE_NAME = `${API_URL}/update-summary-filename`
export const GET_NOTIFICATION=`${API_URL}/notifications`
export const UPDATE_NOTIFICATION=`${API_URL}/notifications/viewed`
export const DELETE_NOTIFICATION = `${API_URL}/notification`
export const GET_JOB_ID = `${API_URL}/file-manager/get-job-id`
export const GET_JOB_STATUS = `${API_URL}/files/jobs`
export const GET_MAX_FILE_UPLOADS = `${API_URL}/settings/max-uploads`
export const RETRY_FILE_UPLOAD = `${API_URL}/files/jobs`
export const GET_ALL_FOLDERS = `${API_URL}/teams`
export const GET_ALL_TEAMS = `${API_URL}/file-manager/get-all-teams`
export const GET_USER_CHAT_HISTORIES_FOR_SPECIFIC_SCOPE= `${API_URL}/teams`
export const GET_RECORDING_PROMPT_TIME = `${API_URL}/settings/recording-prompt-time`
export const GET_RECORDING_LIMIT = `${API_URL}/settings/recording-limit`
export const UPDATE_USER_INTEGRATION = `${API_URL}/integrations`
export const GET_GOOGLE_DRIVE_FILES = `${API_URL}/integrations/integration_1/files`
export const CREATE_AUTHENTICATION_SESSION= `${API_URL}/integrations/auth/oauth-session-token`
export const GET_ONE_DRIVE_FILES = `${API_URL}/integrations/integration_3/files`
export const GET_DROPBOX_FILES = `${API_URL}/integrations/integration_2/files`
export const GET_WORDPRESS_FILES = `${API_URL}/integrations/integration_5/files`
export const GET_SLACK_FILES = `${API_URL}/integrations/integration_4/files`

export function slackDriveFiles() {
  return axios.get(`${GET_SLACK_FILES}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function wordpressFiles(
  userId: any,
) {
  return axios.get(`${GET_WORDPRESS_FILES}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function dropboxFiles(
) {
  return axios.get(`${GET_DROPBOX_FILES}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function oneDriveFiles(
) {
  return axios.get(`${GET_ONE_DRIVE_FILES}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function googleDriveFiles(
  userId: any,
) {
  return axios.get(`${GET_GOOGLE_DRIVE_FILES}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function createAuthenticationSession(
) {
  return axios.post(`${CREATE_AUTHENTICATION_SESSION}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateUserIntegration(
  id: any,
  login: any
) {
  return axios.post(`${UPDATE_USER_INTEGRATION}/${id}`,{
    login
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getAllFolders(
  teamId: any
) {
  return axios.get(`${GET_ALL_FOLDERS}/${teamId}/folders`,{
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function getAllItems(
  teamId: any,
  type:string
) {
  return axios.get(`${GET_ALL_FOLDERS}/${teamId}/items?type=${type}`,{
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getRecordingPromptTime() {
  return axios.get(`${GET_RECORDING_PROMPT_TIME}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getRecordingLimit() {
  return axios.get(`${GET_RECORDING_LIMIT}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getAllTeams(
  companyId: any
) {
  return axios.get(`${GET_ALL_TEAMS}/${companyId}`,{
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getUserChatHisoriesForSpecificScope(
  teamId: any,
  resourceId:any,
  scope:any,
  search:string
) {
  return axios.get(`${GET_USER_CHAT_HISTORIES_FOR_SPECIFIC_SCOPE}/${teamId}/chats?scope=${scope}&resourceId=${resourceId}&search=${search}`,
  {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getUserDynamicRole() {
  return axios.post(GET_USER_DYNAMIC_ROLES, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getJobId() {
  return axios.get(GET_JOB_ID, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getJobStatus(id:number) {
  return axios.get(`${GET_JOB_STATUS}/${id}/status`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getMaxFileUploads() {
  return axios.get(`${GET_MAX_FILE_UPLOADS}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function retryFileUpload(id:number) {
  return axios.get(`${RETRY_FILE_UPLOAD}/${id}/retry`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getSubscriptionDetail() {
  return axios.get(GET_SUBSCRIPTION_DETAILS, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteSubscription(
  userId: any,
) {
  return axios.post(CANCEL_SUBSCRIPTION, {
    userId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function removeUser(
  userId: any,
) {
  return axios.delete(`${REMOVE_USER}/${userId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createFolder(
  folderName: string,
  tooltip: string,
  parentId: any,
  teamId: any,
) {
  return axios.post(`${CREATE_FOLDER}/${teamId}/folders`, {
    folderName,
    tooltip,
    parentId,
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getRootFoldersForTeam(
  teamId: any,
) {
  return axios.get(`${GET_ROOT_FOLDERS}/${teamId}/items`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function getFoldersAndFilesForTeam(
  parentId: any,
  teamId:any,
  offset:any,
  limit:any
) {
  return axios.get(`${GET_FOLDERS_AND_FILES}/${teamId}/folders?parentId=${parentId}&offset=${offset}&limit=${limit}`
 ,{
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function getChildFoldersAndFiles(
  parentId: any,
  teamId: any
) {
  return axios.post(GET_CHILD_FILES_AND_FOLDERS, {
    parentId,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getActiveTeams(
  companyId: any,
) {
  return axios.get(`${GET_ACTIVE_TEAMS}?companyId=${companyId}`,{
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteFolder(
  folderId: any,
  teamId:any,
  deletePermanently:boolean
) {
  return axios.delete(`${DELETE_FOLDER}/${teamId}/folders/${folderId}?deletePermanently=${deletePermanently}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

function extractResponseData(str: string) {
  const chunkResArray: Array<string> = str.split('$')
  const chunkRes = chunkResArray[chunkResArray.length - 2]
  const resData = chunkRes.split('&%&')
  console.log(resData)
  const res = {
    successStatus: resData[0],
    message: resData[1]
  }

  return res

}

export function uploadDocument(
  formData: any,
  teamId: any,
) {
  return axios.post(
    `${UPLOAD_DOCUMENT}/${teamId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // onDownloadProgress(progressEvent) {
      //   extractResponseData(progressEvent.target.response)
      // },
    }
  )
}
export function uploadDocumentFromIntegration(
  fileId: any,
  teamId: any,
  folderId: any,
  integrationId: any,
) {
  return axios.post(
    UPLOAD_DOCUMENT_FROM_INTEGRATION + `/${integrationId}/files/${fileId}/import/${teamId}`,
    {
      folderId
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

export function createDocument(
  teamId: any,
  parentId: any,
  userId: any,
  htmlString: string,
  fileName: string
) {
  return axios.post(
    `${CREATE_DOCUMENT}/${teamId}/files`,
    {
      parentId,
      htmlString,
      fileName
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      onDownloadProgress(progressEvent) {
        const { successStatus, message } = extractResponseData(progressEvent.target.response)

        if (successStatus == "1") {
          const info: HTMLElement = document.getElementById("create-info")!
          const success: HTMLElement = document.getElementById("create-success")!
          const fail: HTMLElement = document.getElementById("create-fail")!
          const successText: HTMLElement = document.getElementById("create-success-text")!
          // const successLogo: HTMLElement = document.getElementById("create-success-logo")!
          // const failLogo: HTMLElement = document.getElementById("create-fail-logo")!

          info.style.display = "none"
          fail.style.display = "none"
          // failLogo.style.display = "none"
          success.style.display = "block"
          successText.innerText = message
          // successLogo.style.display = "block"
        } else {
          const info: HTMLElement = document.getElementById("create-info")!
          const success: HTMLElement = document.getElementById("create-success")!
          const fail: HTMLElement = document.getElementById("create-fail")!
          const failText: HTMLElement = document.getElementById("create-fail-text")!
          // const successLogo: HTMLElement = document.getElementById("create-success-logo")!
          // const failLogo: HTMLElement = document.getElementById("create-fail-logo")!

          info.style.display = "none"
          fail.style.display = "block"
          // successLogo.style.display = "none"
          success.style.display = "none"
          failText.innerText = message
          // failLogo.style.display = "block"
        }
      },
    }
  )
}

export function updateDocument(
  teamId: any,
  parentId: any,
  userId: any,
  htmlString: string,
  fileName: string,
  fileId: any
) {
  return axios.post(
    `${UPDATE_DOCUMENT}/${fileId}`,
    {
      teamId,
      parentId,
      userId,
      htmlString,
      fileName
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      onDownloadProgress(progressEvent) {
        const { successStatus, message } = extractResponseData(progressEvent.target.response)

        if (successStatus == "1") {
          const info: HTMLElement = document.getElementById("update-info")!
          const success: HTMLElement = document.getElementById("update-success")!
          const fail: HTMLElement = document.getElementById("update-fail")!
          const successText: HTMLElement = document.getElementById("update-success-text")!
          info.style.display = "none"
          fail.style.display = "none"
          success.style.display = "block"
          successText.innerText = message
        } else {
          const info: HTMLElement = document.getElementById("update-info")!
          const success: HTMLElement = document.getElementById("update-success")!
          const fail: HTMLElement = document.getElementById("update-fail")!
          const failText: HTMLElement = document.getElementById("update-fail-text")!

          info.style.display = "none"
          fail.style.display = "block"
          success.style.display = "none"
          failText.innerText = message
        }
      },
    }
  )
}

export function deleteFile(
  fileId: any,
  teamId:any
) {
  return axios.delete(`${DELETE_FILE}/${teamId}/files/${fileId}` , {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getFolderData(
  folderId: any
) {
  return axios.post(GET_FOLDER_DATA, {
    folderId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateFolder(
  folderId: any,
  folderName: string,
  folderDescription: any,
  teamId: any
) {
  return axios.put(`${UPDATE_FOLDER}/${folderId}`, {
    folderName,
    folderDescription,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getDocxFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  })
}

export function getDocFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/msword',
    }
  })
}

export function getPDFFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`,  {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/pdf',
    }
  })
}

export function getXlsxFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  })
}

export function getNotifications() {
  return axios.get(GET_NOTIFICATION, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function updateNotifications() {
  return axios.patch(UPDATE_NOTIFICATION, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
export function deleteNotification(id:number) {
  return axios.delete(`${DELETE_NOTIFICATION}/${id}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getXlsFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/vnd.ms-excel',
    }
  })
}

export function getTextFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'text/plain;charset=utf-8',
    }
  })
}

export function getPPTXFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }
  })
}

export function getHTMLFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'text/html',
    }
  })
}

export function getImageFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: '*',
    }
  })
}

export function getVideoFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: '*',
    }
  })
}

export function getAudioFile(
  fileId: any,
  teamId: any
) {
  return axios.get(`${GET_FILE}/${teamId}/files/${fileId}`, {
    responseType: 'arraybuffer',
    headers: {
      Accept: '*',
    }
  })
}

export function searchFilesAndFolders(
  searchString: any,
  teamId: any
) {
  return axios.get(`${SEARCH_FILES_AND_FOLDERS}/${teamId}/folders?search=${searchString}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getCompanyUsage(
  companyId: any,
  day: any,
  month: any,
  year: any,
) {
  return axios.get(`${GET_COMPANY_USAGE}/${companyId}/usage?day=${day}&month=${month}&year=${year}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

// *************************** Chat APIs **************************************

export function getUserChatHisories(
  userId: any,
  teamId: any
) {
  return axios.post(GET_USER_CHAT_HISTORIES, {
    userId,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function renameChatHistory(
  chatId: any,
  name: string,
  teamId: any,
  fileId:any,
  type:any
) {
  return axios.patch(`${RENAME_CHAT_HISTORY}/${teamId}/chats/${chatId}`, {
    name
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteChatHistory(
  chatId: any,
  teamId: any
) {
  return axios.delete(`${DELETE_CHAT_HISTORY}/${teamId}/chats/${chatId}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getChatMessages(
  chatId: any,
  teamId:any
) {
  return axios.get(`${GET_CHAT_MESSAGES}/${teamId}/chats/${chatId}/messages`,
    {
      headers: {
        'Content-Type': 'application/json'
      }
  })
}

export function addMessagesToChat(
  chatId: any,
  teamId: any,
  message: any,
  role:any
) {
  return axios.post(`${ADD_MESSAGE_TO_CHAT}/${teamId}/chats/${chatId}/messages`, {
    message,
    role
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createNewChatApi(
  teamId: any,
  scope:any,
  resourceId :any
) {
  return axios.post(`${CREATE_NEW_CHAT}/${teamId}/chats`, {
    scope,
    resourceId 
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateFilename(
  fileName: string,
  fileId: any,
  parentId: any,
  teamId: any
) {
  return axios.post(UPDATE_FILE_NAME, {
    fileName,
    fileId,
    parentId,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}


export function getFolderTreeForFile(
  parentId: any,
  teamId:any
) {
  return axios.get(`${GET_FOLDER_TREE_FOR_FILE}/${teamId}/folders/${parentId}/tree`,  
    {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function uploadAudio(
  formData: any,
  teamId: any
) {
  return axios.post(
    `${UPLOAD_AUDIO}/${teamId}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onDownloadProgress(progressEvent) {
        const { successStatus, message } = extractResponseData(progressEvent.target.response)

        if (successStatus == "1") {
          const success: HTMLElement = document.getElementById("upload-success")!
          const fail: HTMLElement = document.getElementById("upload-fail")!
          const successText: HTMLElement = document.getElementById("upload-success-text")!

          fail.style.display = "none"
          success.style.display = "block"
          successText.innerText = message
        } else {
          const success: HTMLElement = document.getElementById("upload-success")!
          const fail: HTMLElement = document.getElementById("upload-fail")!
          const failText: HTMLElement = document.getElementById("upload-fail-text")!

          fail.style.display = "block"
          success.style.display = "none"
          failText.innerText = message
        }
      },
    }
  )
}

export function getFileSummary(
  fileId: any,
  teamId: any
) {
  return axios.post(GET_FILE_SUMMARY, {
    fileId,
    teamId,
    fileType: 'html'
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getSummaryData(
  fileId: any,
  teamId:any
) {
  return axios.get(`${GET_SUMMARY_DATA}/${teamId}/files/${fileId}/summary`,
    {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateSummaryFilename(
  fileName: string,
  fileId: any,
  parentId: any,
  teamId: any
) {
  return axios.post(UPDATE_SUMMARY_FILE_NAME, {
    fileName,
    fileId,
    parentId,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
