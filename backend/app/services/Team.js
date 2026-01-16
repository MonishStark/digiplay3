let uuidv5;
(async () =>{
    const { v5 }= await import('uuid')
    uuidv5=v5;
})();
const dotenv = require('dotenv');
dotenv.config();

const { createLogger } = require('../init/logger');

let logger;


class Team {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }

    createTeam(
        teamName,
        teamAlias,
        creatorId,
        companyId
    ) {
        return new Promise((resolve, reject) => {

            const dateTime = new Date()
            const uuid = this.generateUUID(teamAlias, companyId)
            this.dbConnection('teams')
                .insert({
                    companyId: companyId,
                    creatorId: creatorId,
                    teamName: teamName,
                    teamAlias: teamAlias,
                    active: 1,
                    uuid,
                    created: dateTime,
                    updated: dateTime
                })
                .then((teamId) => {
                    resolve({
                        teamId,
                        uuid
                    })
                })
                .catch((err) => {
                    reject(err)
                })
        })
    }

    generateUUID(alias, companyId) {
        const uniqueId = uuidv5(`${alias}-${companyId}-${new Date()}`, process.env.UUID_NAMESPACE)
        return uniqueId
    }

    async updateTeam(
        teamName,
        teamAlias,
        teamId
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            const dateTime = new Date()

            this.dbConnection('teams')
                .where({ id: teamId })
                .update(
                    {
                        teamName: teamName,
                        teamAlias: teamAlias,
                        updated: dateTime
                    }
                ).then((res) => {
                    if (res == 1) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getTotalNumberOfPageForTeamList(limit, companyId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('teams')
                .where({ companyId: companyId })
                .then((_list) => {
                    resolve({
                        totalPageNum: Math.ceil(_list.length / limit),
                        noOfRecords: _list.length
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getTotalNumberOfPageForFilteredTeamList(limit, companyId, searchString) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('teams')
                .where({ companyId: companyId })
                .andWhere(incase => { incase.whereRaw('LOWER(teamName) LIKE ?', [`%${searchString.toLowerCase()}%`]) })
                .then((_list) => {
                    resolve({
                        totalPageNum: Math.ceil(_list.length / limit),
                        noOfRecords: _list.length
                    })
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getTeamList(
        offset,
        limit,
        companyId,
        userId
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('teams')
                .where({ companyId: companyId })
                .limit(limit)
                .offset(offset)
                .orderBy('created', 'desc')
                .then(async (teamList) => {
                    for (const team of teamList) {
                        const noOfFiles = await this.getNoOfFilesInTeam(team.id)
                        team.selected = false
                        team.noOfFiles = noOfFiles
                        team.active = team.active === 1;
                    }
                    resolve(teamList)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    getNoOfFilesInTeam(teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection("documents")
                .select("*")
                .where({ teamId })
                .andWhere({ type: "file", isNotAnalyzed:0 })
                .then((res) => {
                    resolve(res.length)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }
    async getTeamCountForCompany(companyId) {
        if (!logger) {
            logger = await createLogger();
        }

        try {
            const result = await this.dbConnection('teams')
                .where({ companyId })
                .count({ count: 'id' })   
                .first();

            return Number(result.count); 
        } catch (err) {
            logger.error(err);
            throw err;
        }
    }

    async getAllTeamList(
        companyId
    ) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection
                .select('*')
                .from('teams')
                .where({ companyId: companyId })
                .then(async (teamList) => {
                    resolve(teamList)
                })
                .catch((err) => {
                    logger.error(err)
                    reject(err)
                })
        })
    }

    async getActiveTeamList(companyId, userId) {
      if (!logger) {
        logger = await createLogger();
      }

      try {
        const userRecord = await this.dbConnection('users')
          .select('email')
          .where({ id: userId })
          .first();

        if (!userRecord) {
          logger.warn(`No user found for ID ${userId}`);
          return [];
        }

        const userEmail = userRecord.email;

        const sharedTeamRows = await this.dbConnection('shared_teams')
          .select('teamId')
          .where({ sharedUserEmail: userEmail });

        const sharedTeamIds = sharedTeamRows.map((c) => c.teamId);

        const [sharedTeams, companyTeams] = await Promise.all([
          sharedTeamIds.length
            ? this.dbConnection('teams')
                .select('*')
                .whereIn('id', sharedTeamIds)
                .andWhere({ active: 1 })
            : [],
          this.dbConnection('teams')
            .select('*')
            .where({ companyId, active: 1 }),
        ]);

        const allTeams = [...sharedTeams, ...companyTeams];
        const uniqueTeams = Array.from(
          new Map(allTeams.map((c) => [c.id, c])).values()
        );

        uniqueTeams.forEach((team) => {
          team.selected = false;
          team.active = team.active === 1;
        });

        logger.info(
          `Fetched ${uniqueTeams.length} active teams for company ${companyId}, user ${userId}`
        );

        return uniqueTeams;
      } catch (err) {
        logger.error(`Failed to fetch active team list: ${err.message}`);
        throw err;
      }
    }

    async searchTeam(searchString, offset, limit, companyId) {
    if (!logger) {
        logger = await createLogger();
    }
    return new Promise((resolve, reject) => {
        this.dbConnection('teams')
            .where({ companyId: companyId })
            .andWhere(incase => { incase.whereRaw('LOWER(teamName) LIKE ?', [`%${searchString.toLowerCase()}%`]) })
            .limit(limit)
            .offset(offset)
            .orderBy('created', 'desc')
            .then(async (teamList) => {
                teamList = teamList.map((team) => {
                    team.selected = false;
                    team.active = team.active == 1 ? true :false; 
                    return team;
                });
                resolve(teamList);
            })
            .catch((err) => {
                logger.error(err);
                reject(err);
            });
    });
}


    async deleteTeam(teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            try {
                this.dbConnection.raw(
                    'Delete from teams where id = ?',
                    [teamId]
                )
                    .then((res) => {
                        resolve(1)
                    })
                    .catch((err) => {
                        logger.error(err)
                        reject(err)
                    })
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    async deactivateTeam(teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection("teams")
                .where({ id: teamId })
                .update({
                    active: 0
                })
                .then((res) => {
                    if (res == 1) {
                        resolve(res)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                })
        })
    }

    async activateTeam(teamId) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise((resolve, reject) => {
            this.dbConnection("teams")
                .where({ id: teamId })
                .update({
                    active: 1
                })
                .then((res) => {
                    if (res == 1) {
                        resolve(res)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                })
        })
    }

    async deleteTeams(teamIds) {
        if (!logger) {
            logger = await createLogger();
        }
        return new Promise(async (resolve, reject) => {
            try {
                await teamIds.map(async (comId) => {
                    await this.dbConnection.raw(
                        'Delete from teams where id = ?',
                        [comId]
                    )
                })
                resolve(1)
            } catch (error) {
                logger.error(error)
                reject(error)
            }
        })
    }

    isAliasAlreadyExists(alias) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('*')
                .where({ teamAlias: alias })
                .then((res) => {
                    if (res.length > 0) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    isAliasAlreadyExistsUnderCompany(alias, companyId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('*')
                .where({ teamAlias: alias })
                .andWhere({ companyId })
                .then((res) => {
                    if (res.length > 0) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    isReservedAliasByTeam(alias, teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('teamAlias')
                .where({ id: teamId })
                .then((res) => {
                    if (res[0].teamAlias == alias) {
                        resolve(1)
                    } else {
                        resolve(0)
                    }
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getTeamAlias(teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('teamAlias')
                .where({ id: teamId })
                .then((res) => {
                    resolve(res[0]["teamAlias"])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getTeamUUID(teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('uuid')
                .where({ id: teamId })
                .then((res) => {
                    resolve(res[0]["uuid"])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getTeam(teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('*')
                .where({ id: teamId })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getCompanyIdForTeam(teamId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('companyId')
                .where({ id: teamId })
                .then((res) => {
                    resolve(res[0]["companyId"])
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }

    getTeamCount(userId) {
        return new Promise((resolve, reject) => {
            this.dbConnection('teams')
                .select('*')
                .where({ creatorId: userId })
                .then((res) => {
                    resolve(res)
                })
                .catch((err) => {
                    console.log(err)
                    reject(err)
                })
        })
    }
}

module.exports = Team