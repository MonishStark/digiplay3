const dotenv = require('dotenv');
const Team = require('../services/Team')
const Documents = require('../services/Documents')
const { createLogger } = require('../init/logger');
const Users = require('../services/Users');
const { getAdminSetting } = require('../init/redisUtils');
dotenv.config();

let logger;

const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER_NAME,
    password: process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
    database: process.env.DATABASE_NAME,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
  }
});

class TeamController {
  static async createNewTeam(request, response) {
    try {
      if (!logger) {
        logger = await createLogger();
      }
      const team = new Team(knex);
      const documents = new Documents(knex);

      const {
        teamName,
        teamAlias,
      } = request.body;
      
      const missing = [];
      if (!teamName) missing.push({ field: "teamName", issue: "This field is required" });
      if (!teamAlias) missing.push({ field: "teamAlias", issue: "This field is required" });

      if (missing.length > 0) {
        return response.status(400).json({
          success: false,
          error: "bad_request",
          message: "Missing required fields",
          details: missing
        });
      }

      const companyId = request.body.companyId || request.decoded.company;
      const userId= request.decoded.userId;
      if (!teamName || !teamAlias  || !companyId) {
        logger.debug(JSON.stringify({
          success: false,
          message: "Missing parameters, fill all the required fields"
        }));

        return response.status(400).send({
          success: false,
          message: "Missing parameters, fill all the required fields"
        });
      }

      const AliasTaken = await team.isAliasAlreadyExistsUnderCompany(teamAlias, companyId)
      if(AliasTaken == 1){
        return response.status(409).send({
          success: false,
          error: "conflict",
          message: "teamAlias already in use"
        })
      }
      const noOfTeams = await team.getTeamCountForCompany(companyId);
      const teamLimit  =await getAdminSetting("MAX_TEAMS");
      if(noOfTeams >= teamLimit){
        return response.status(403).send({
          success: false,
          error: "forbidden",
          message: "Team limit reached."
        })
      }
      const teamData = await team.createTeam(teamName, teamAlias, userId, companyId);
      const teamId = teamData.teamId[0];

      logger.info(`Team created with Id ${teamId}`);

      await documents.createTeamFolder(teamData.uuid);
      await documents.createFolder("Notes", "Default Folder", true, 4, teamId, userId);

      let newTeam = await team.getTeam(teamId);
      newTeam[0].noOfFiles = 0;
      newTeam[0].active= true;
      newTeam[0].companyId=companyId || null;

      logger.info(`Team details fetched for company ${companyId}`);

      return response.status(201).send({
        success: true,
        message: request.t("teamCreateSuccess"),
        team: newTeam[0]
      });

    } catch (err) {
      logger.error("Error creating team:", err);
      console.log(err)
      return response.status(500).send({
        success: false,
        message: "An unexpected error occured",
        error: "server_error"
      });
    }
  }

  static async checkIfAliasAlreadyTaken(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const team = new Team(knex)

    if (request.body.alias) {
      logger.info(`Checking if team ID ${request.body.alias} already exists.`)
      team.isAliasAlreadyExistsUnderCompany(request.body.alias, request.body.companyId)
        .then((res) => {
          if (res == 0) {
            logger.info(`Team ID ${request.body.alias} does not exists`)
            logger.debug(JSON.stringify({ success: true, exist: false }))
            return response.status(201)
              .send({ success: true, exist: false });
          } else {
            logger.info(`Team ID ${request.body.alias} already exists`)
            logger.debug(JSON.stringify({ success: true, exist: true }))
            return response.status(201)
              .send({ success: true, exist: true });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to check team status for ${request.body.alias}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false }))
          return response.status(201)
            .send({ success: false });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async checkIfAliasAlreadyTakenForUpdate(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const team = new Team(knex)

    //logger.debug(JSON.stringify( request ))
    logger.info(`Checking if team ID ${request.body.alias} already exists.`)
    team.isReservedAliasByTeam(request.body.alias, request.body.teamId)
      .then((res) => {
        if (res == 1) {
          logger.info(`Team ID ${request.body.alias} does not exists`)
          logger.debug(JSON.stringify({ success: true, exist: false }))
          return response.status(201)
            .send({ success: true, exist: false });
        } else {
          team.isAliasAlreadyExists(request.body.alias)
            .then((res) => {
              if (res == 0) {
                logger.info(`Team ID ${request.body.alias} does not exists`)
                logger.debug(JSON.stringify({ success: true, exist: false }))
                return response.status(201)
                  .send({ success: true, exist: false });
              } else {
                logger.info(`Team ID ${request.body.alias} already exists`)
                logger.debug(JSON.stringify({ success: true, exist: true }))
                return response.status(201)
                  .send({ success: true, exist: true });
              }
            })
            .catch((err) => {
              logger.warn(`Failed to check team status for ${request.body.alias}`)
              logger.error(err)
              logger.debug(JSON.stringify({ success: false }))
              return response.status(201)
                .send({ success: false });
            })
        }
      })
  }

  static async getTeamList(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const user = new Users(knex)
    const team = new Team(knex)
    // if(!request.query.company){
    //   const type = await user.getUserMetaValue(request.decoded.userId,"accountType")
    //   console.log(type)
    //   if(type == "team"){
    //     return response.status(400).send({
    //     "success": false,
    //     "error": "bad_request",
    //     "message": "Missing or invalid fields",
    //     "details": [
    //       { "field": "companyId", "issue": "Required for company users; must be null for solo users" }
    //     ]
    //   })
    //   }
    // }
    const companyId= request.query.companyId || request.decoded.company;
    let {
      searchString = '',
      offset = 0,
      limit = 10,
    } = request.query;
    if (
      limit &&
      companyId
    ) {
      offset = offset ? offset : 0
      logger.info(`Fetching team list for company ${companyId}`)
      if (searchString && searchString != '') {
        team.searchTeam(
          searchString,
          offset,
          limit,
          companyId
        ).then((teamList) => {
          team.getTotalNumberOfPageForFilteredTeamList(
            limit,
            companyId,
            searchString
          )
            .then((recordCounts) => {
              const { totalPageNum, noOfRecords } = recordCounts
              logger.info(`Team list fetched successfully for company ${companyId}`)
              logger.debug(JSON.stringify({ success: true, message: request.t('teamListFetchSuccess'), teamList, totalPageNum, noOfRecords }))
              return response.status(200)
                .send({ success: true, message: request.t('teamListFetchSuccess'), teamList, totalPageNum, noOfRecords });
            })
            .catch((err) => {
              logger.warn(`Failed to fetch the Team list for company ${companyId}`)
              logger.error(err)
              logger.debug(JSON.stringify({ success: false,error:"server_error", message: "An unexpected error occured" }))
              return response.status(500)
              .send({ success: false,error:"server_error", message: "An unexpected error occured" });
          })
        })
          .catch((err) => {
            logger.warn(`Failed to fetch the team list for company ${companyId}`)
            logger.error(err)
            logger.debug(JSON.stringify({ success: false, message: request.t('teamListFetchFailed') }))
            return response.status(500)
              .send({ success: false,error:"server_error", message: "An unexpected error occured" });
          })
      } else {
        team.getTeamList(
          offset,
          limit,
          companyId,
          request.decoded.userId
        )
          .then((teamList) => {
            team.getTotalNumberOfPageForTeamList(limit, companyId)
              .then((recordCounts) => {
                const { totalPageNum, noOfRecords } = recordCounts
                logger.info(`Team list fetched successfully for company ${companyId}`)
                logger.debug(JSON.stringify({ success: true, message: request.t('teamListFetchSuccess'), teamList, totalPageNum, noOfRecords }))
                return response.status(201)
                  .send({ success: true, message: request.t('teamListFetchSuccess'), teamList, totalPageNum, noOfRecords });
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the colection list for company ${companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify({ success: false,error:"server_error", message: "An unexpected error occured" }))
                return response.status(500)
                  .send({ success: false,error:"server_error", message: "An unexpected error occured" });
              })
          })
          .catch((err) => {
            logger.warn(`Failed to fetch the team list for company ${companyId}`)
            logger.error(err)
            logger.debug(JSON.stringify({ success: false, message: request.t('teamListFetchFailed') }))
            return response.status(500)
              .send({ success: false,error:"server_error", message: "An unexpected error occured" });
          })
      }
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async getSharedTeamList(request,response) {
    if (!logger) {
      logger = await createLogger();
    }
    knex("shared_teams").select('teamId').where({sharedUserEmail:request.decoded.email}).then(res =>{
      if(res.length>0){
      let teamIds = res.map(data => data.teamId )
      knex("teams").select('*').whereIn("id",teamIds).whereNot("companyId", request.decoded.company).then(async (teamList) => {
        for (const team of teamList) {
            const noOfFiles = await knex("documents")
            .select("*")
            .where({ teamId:team.id })
            .andWhere({ type: "file" })
            if(team.active){
              team.active=true
            }else{
              team.active=false
            }
            team.sharedByUserId=team.creatorId
            delete team.creatorId
            team.noOfFiles = noOfFiles.length
        }
        return response.status(200).json({
          success: true,
          message: "Shared teams fetched successfully",
          sharedTeamList:teamList})
      }).catch(err =>{
        console.log(err)
        return response.status(500).json({success:false,error:"server_error",message:"Internal server error"})
      })
    }else{
      return response.status(200).json({success:true,message:'No shared teams found',sharedTeamList:[]})
    }
    }).catch(err =>{
      console.log(err)
      return response.status(500).json({success:false,error:"server_error",message:"Internal server error"})
    })
  }

  static async deactivateTeam(request, response) {
    try {
      if (!logger) {
        logger = await createLogger();
      }
      if (!request.params.teamId) {
        logger.debug(
          JSON.stringify({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          })
        );
          return response.status(400).send({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          });
      }

      const teamId = request.params.teamId;
      const team = new Team(knex);

      logger.info(`Deactivating team ID ${teamId}`);

      const result = await team.deactivateTeam(teamId);

      if (result !== 1) {
        logger.warn(`Failed to deactivate team ID ${teamId}`);
        return response.status(400).send({
          success: false,
          message: request.t("teamDeactivateFailed"),
        });
      }

      logger.info(`Deactivated team ID ${teamId}`);

      // Fetch updated team data
      const teamData = await team.getTeam(teamId);
      const teamObj = teamData[0];

      // Remove sensitive fields
      delete teamObj.creatorId;

      // Ensure active is boolean (though it should already be after deactivation)
      teamObj.active = !!teamObj.active;

      // Get number of files
      const noOfFiles = await knex("documents")
        .where({ teamId, type: "file" });

      teamObj.noOfFiles = noOfFiles.length;

      return response.status(201).send({
        success: true,
        message: request.t("teamDeactivateSuccess"),
        team: teamObj,
      });

    } catch (err) {
      const teamId = request.params.teamId; // fallback
      logger.warn(`Failed to deactivate team ID ${teamId}`);
      logger.error(err);

      return response.status(500).send({
        success: false,
        error:"server_error",
        message:"An unexpected error occured",
      });
    }
  }

 static async updateTeamStatus(request, response) {
    try {
      if (!logger) {
        logger = await createLogger();
      }

      if (!request.params.teamId) {
        logger.debug(
          JSON.stringify({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          })
        );
          return response.status(400).send({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          });
      }

      const { teamId } = request.params;
      const team = new Team(knex);
      const user = new Users(knex);
      const userAccountType = await user.getUserMetaValue(request.decoded.userId,"accountType")
      const activeStatus = request.body.active;
      logger.info(`Updating team ID ${teamId}`);
      if(activeStatus){
      const activationResult = await team.activateTeam(teamId);

      if (activationResult !== 1) {
        logger.warn(`Failed to activate team ID ${teamId}`);
        logger.debug(
          JSON.stringify({
            success: false,
            message: request.t("teamActivateFailed"),
          })
        );
        return response.status(400).send({
          success: false,
          error: "not_found",
          message: "Team does not exist",
          details: []
        });
      }

      logger.info(`Activated team ID ${teamId}`);

      const teamData = await team.getTeam(teamId);
      const noOfFiles = await knex("documents")
            .select("*")
            .where({ teamId })
            .andWhere({ type: "file" })
      delete teamData[0].creatorId;
      if(teamData[0].active){
        teamData[0].active=true
      }else{
        teamData[0].active=false
      }
      teamData[0].noOfFiles = noOfFiles.length
      if(userAccountType == 'solo'){
        delete teamData[0].companyId
      }
      return response.status(200).send({
        success: true,
        message: request.t("teamActivateSuccess"),
        team: teamData[0],
      });
    }else{
      logger.info(`Deactivating team ID ${teamId}`);

      const result = await team.deactivateTeam(teamId);

      if (result !== 1) {
        logger.warn(`Failed to deactivate team ID ${teamId}`);
        return response.status(400).send({
          success: false,
          message: request.t("teamDeactivateFailed"),
        });
      }

      logger.info(`Deactivated team ID ${teamId}`);

      // Fetch updated team data
      const teamData = await team.getTeam(teamId);
      const teamObj = teamData[0];

      // Remove sensitive fields
      delete teamObj.creatorId;

      // Ensure active is boolean (though it should already be after deactivation)
      teamObj.active = !!teamObj.active;
      if(userAccountType == 'solo'){
        delete teamObj.companyId
      }

      // Get number of files
      const noOfFiles = await knex("documents")
        .where({ teamId, type: "file" });

      teamObj.noOfFiles = noOfFiles.length;

      return response.status(200).send({
        success: true,
        message: request.t("teamDeactivateSuccess"),
        team: teamObj,
      });
    }
    } catch (err) {
      const { teamId } = request.params;
      logger.warn(`Failed to update team ID ${teamId}`);
      logger.error(err);
      logger.debug(
        JSON.stringify({
          success: false,
          message: request.t("teamUpdateFailed"),
        })
      );

      return response.status(500).send({
        success: false,
        error:"server_error",
        message:"An unexpected error occured",
      });
    }
  }
  static async activateTeam(request, response) {
    try {
      if (!logger) {
        logger = await createLogger();
      }

      if (!request.params.teamId) {
        logger.debug(
          JSON.stringify({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          })
        );
          return response.status(400).send({
            success: false,
            error: "bad_request",
            message: "Missing or invalid teamId",
            details: [
              { "field": "teamId", "issue": "teamId must be provided in path" }
            ]
          });
      }

      const { teamId } = request.params;
      const team = new Team(knex);

      logger.info(`Activating team ID ${teamId}`);

      const activationResult = await team.activateTeam(teamId);

      if (activationResult !== 1) {
        logger.warn(`Failed to activate team ID ${teamId}`);
        logger.debug(
          JSON.stringify({
            success: false,
            message: request.t("teamActivateFailed"),
          })
        );
        return response.status(400).send({
          success: false,
          error: "not_found",
          message: "Team does not exist",
          details: []
        });
      }

      logger.info(`Activated team ID ${teamId}`);

      const teamData = await team.getTeam(teamId);
      const noOfFiles = await knex("documents")
            .select("*")
            .where({ teamId })
            .andWhere({ type: "file" })
      delete teamData[0].creatorId;
      if(teamData[0].active){
        teamData[0].active=true
      }else{
        teamData[0].active=false
      }
      teamData[0].noOfFiles = noOfFiles.length

      return response.status(201).send({
        success: true,
        message: request.t("teamActivateSuccess"),
        team: teamData[0],
      });

    } catch (err) {
      const { teamId } = request.params;
      logger.warn(`Failed to activate team ID ${teamId}`);
      logger.error(err);
      logger.debug(
        JSON.stringify({
          success: false,
          message: request.t("teamActivateFailed"),
        })
      );

      return response.status(500).send({
        success: false,
        error:"server_error",
        message:"An unexpected error occured",
      });
    }
  }


  static async deleteTeams(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const team = new Team(knex)

    if (
      request.body.limit &&
      request.body.companyId
    ) {
      request.body.offset = request.body.offset ? request.body.offset : 0
      logger.info(`Deleting teams for company ${request.body.companyId}`)
      team.deleteTeams(request.body.teamIds)
        .then((res) => {
          if (res == 1) {
            logger.info(`teams deleted for company ${request.body.companyId}`)
            logger.info(`Fetching updated teams for company ${request.body.companyId}`)
            team.getTeamList(
              request.body.offset,
              request.body.limit,
              request.body.companyId
            )
              .then((teamList) => {
                team.getTotalNumberOfPageForTeamList(request.body.limit, request.body.companyId)
                  .then((recordCounts) => {
                    const { totalPageNum, noOfRecords } = recordCounts
                    logger.info(`Updated teams fetched successfully for company ${request.body.companyId}`)
                    logger.debug(JSON.stringify({ success: true, message: request.t('teamsDeleteSuccess'), teamList, totalPageNum, noOfRecords }))
                    return response.status(201)
                      .send({ success: true, message: request.t('teamsDeleteSuccess'), teamList, totalPageNum, noOfRecords });
                  })
                  .catch((err) => {
                    logger.warn(`Failed to fetch the updated teams for company ${request.body.companyId}`)
                    logger.error(err)
                    logger.debug(JSON.stringify({ success: false, message: request.t('teamsDeleteFailed') }))
                    return response.status(201)
                      .send({ success: false, message: request.t('teamsDeleteFailed') });
                  })
              })
              .catch((err) => {
                logger.warn(`Failed to fetch the updated teams for company ${request.body.companyId}`)
                logger.error(err)
                logger.debug(JSON.stringify({ success: false, message: request.t('teamsDeleteFailed') }))
                return response.status(201)
                  .send({ success: false, message: request.t('teamsDeleteFailed') });
              })
          } else {
            logger.warn(`Failed to delete teams for company ${request.body.companyId}`)
            logger.debug(JSON.stringify({ success: false, message: request.t('teamsDeleteFailed') }))
            return response.status(201)
              .send({ success: false, message: request.t('teamsDeleteFailed') });
          }
        })
        .catch((err) => {
          logger.warn(`Failed to delete teams for company ${request.body.companyId}`)
          logger.error(err)
          logger.debug(JSON.stringify({ success: false, message: request.t('teamsDeleteFailed') }))
          return response.status(201)
            .send({ success: false, message: request.t('teamsDeleteFailed') });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async getActiveTeamList(request, response) {
    if (!logger) {
      logger = await createLogger();
    }
    const team = new Team(knex)
    let companyId = request.body?.companyId || request.query?.companyId || request.decoded.company;

    if (companyId) {
      logger.info(`Fetching active teams list for company ${companyId}`)
      team.getActiveTeamList(companyId,request.decoded.userId)
        .then((_list) => {
          logger.info(`Active teams fetched successfully for ${companyId}`)
          logger.debug(JSON.stringify({ success: true, teamList: _list }))
          return response.status(200)
            .send({ success: true, message: "Active teams fetched successfully", teamList: _list });
        })
        .catch((err) => {
          logger.warn(`Failed to fetch active teams for ${companyId}`)
          logger.debug(JSON.stringify({ success: false, message: request.t('activeTeamsFetchFailed') }))
          return response.status(500)
            .send({ success: false, message: request.t('activeTeamsFetchFailed') });
        })
    } else {
      logger.debug(JSON.stringify({ success: false, message: "Missing parameters, fill all the required fields" }))
      return response.status(400)
        .send({ success: false, message: "Missing parameters, fill all the required fields" });
    }
  }

  static async updateTeam(request, response) {
  try {
    if (!logger) {
      logger = await createLogger();
    }

    const team = new Team(knex);
    const documents = new Documents(knex);

    const { teamName, teamAlias } = request.body;
    const teamId = request.params.teamId;
    if (!teamName || !teamAlias || !teamId) {
      const missingFields = [];
    
      if (!teamName) {
        missingFields.push({ field: "teamName", issue: "This field is required" });
      }
    
      if (!teamAlias) {
        missingFields.push({ field: "teamAlias", issue: "This field is required" });
      }
    
      if (!teamId) {
        missingFields.push({ field: "teamId", issue: "This field is required" });
      }
    
      logger.debug(JSON.stringify({
        success: false,
        error: "bad_request",
        message: "Missing required fields",
        details: missingFields
      }));
    
      return response.status(400).send({
        success: false,
        error: "bad_request",
        message: "Missing required fields",
        details: missingFields
      });
    }

    logger.info(`Updating team ID ${teamId}`);
    const updateResult = await team.updateTeam(teamName, teamAlias, teamId);

    if (updateResult === 1) {
      logger.info(`Data updated successfully for team ${teamId}`);
      logger.info(`Fetching updated team`);

      const newTeam = await team.getTeam(teamId);
      newTeam[0].updatedBy=request.decoded.userId;
      newTeam[0].companyId=request.decoded.companyId || null;
      delete newTeam[0].created;
      delete newTeam[0].uuid;
      delete newTeam[0].active;

      return response.status(201).send({
        success: true,
        message: request.t('teamUpdateSuccess'),
        team: newTeam[0]
      });
    } else {
      logger.warn(`Team update failed for ID ${teamId}`);

      return response.status(500).send({
        success: false,
        error:"server_error",
        message: "An unexpected error has occurred"
      });
    }

  } catch (err) {
    console.log(err)
    logger.warn(`Team update failed for ID ${request.body?.teamId}`);
    logger.error(err);

    return response.status(500).send({
      success: false,
      error:"server_error",
      message: "An unexpected error has occurred"
    });
  }
}

}

module.exports = TeamController