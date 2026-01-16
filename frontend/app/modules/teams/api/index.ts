import axios from 'axios'

const API_URL = import.meta.env.VITE_APP_BACKEND_URL

export const CREATE_TEAM = `${API_URL}/teams`
export const UPDATE_TEAM = `${API_URL}/teams`
export const GET_TEAM_LIST = `${API_URL}/teams`
export const DELETE_TEAM = `${API_URL}/team/delete`
export const ACTIVATE_TEAM = `${API_URL}/teams`
export const DEACTIVATE_TEAM = `${API_URL}/teams`
export const DELETE_TEAMS = `${API_URL}/team/delete`
export const CHECK_ALIAS_EXIST = `${API_URL}/team/check-alias-exist`
export const CHECK_ALIAS_EXIST_FOR_UPDATE = `${API_URL}/team/check-alias-exist-for-update`
export const GET_SHARED_TEAM_LIST = `${API_URL}/teams/shared`

export function getSharedTeamList() {
  return axios.get(GET_SHARED_TEAM_LIST, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createTeam(
  companyId: any,
  creatorId: any,
  teamName: string,
  teamAlias: string,
) {
  return axios.post(CREATE_TEAM, {
    companyId,
    creatorId,
    teamName,
    teamAlias
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function getTeamList(
  searchString: string,
  companyId: any,
  offset: number,
  limit: number
) {
  return axios.get(GET_TEAM_LIST, {
    params: {
      searchString,
      companyId,
      offset,
      limit
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });
}


export function deleteTeam(
  teamId: any,
  companyId: any,
  limit: number,
  offset: any,
  searchString: string
) {
  return axios.post(DELETE_TEAM, {
    teamId,
    companyId,
    limit,
    offset,
    searchString
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function activateTeam(
  teamId: any
) {
  return axios.patch(`${ACTIVATE_TEAM}/${teamId}/status`, {
    active:true
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deactivateTeam(
  teamId: any,
) {
  return axios.patch(`${DEACTIVATE_TEAM}/${teamId}/status`, {
    active:false
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function deleteTeams(
  teamIds: Array<any>,
  companyId: any,
  limit: number
) {
  return axios.post(DELETE_TEAMS, {
    teamIds,
    companyId,
    limit
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function updateTeams(
  teamName: string,
  teamAlias: string,
  companyId: any,
  teamId: any,
) {
  return axios.put(UPDATE_TEAM+`/${teamId}`, {
    teamName,
    teamAlias,
    companyId,
    teamId,
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function checkIfAliasExist(
  alias: any,
  companyId: any
) {
  return axios.post(CHECK_ALIAS_EXIST, {
    alias,
    companyId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function checkIfAliasExistForUpdate(
  alias: any,
  teamId: any
) {
  return axios.post(CHECK_ALIAS_EXIST_FOR_UPDATE, {
    alias,
    teamId
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

