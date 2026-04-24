// weconnect-server/controllers/taskApiController.js
const { retrieveTaskStatusListByPersonIdList } =  require('./taskController');
const { createTaskDefinition, createTaskGroup, createTaskType, deleteOneTaskGroupTeamLink, deleteOneTaskType,
  findTaskDefinitionById, findTaskDefinitionListByParams, findTaskGroupById, findTaskGroupTeamLinkListByParams,
  findTaskGroupListByParams, findTaskTypeListByParams,
  TASK_DEFINITION_FIELDS_ACCEPTED, TASK_DEFINITION_FIELDS_TO_MAP_TO_PERSON_FIELDS,
  TASK_FIELDS_ACCEPTED_DICT, TASK_GROUP_FIELDS_ACCEPTED, TASK_TYPE_FIELDS_ACCEPTED,
  removeProtectedFieldsFromTask, removeProtectedFieldsFromTaskDefinition, removeProtectedFieldsFromTaskGroup,
  removeProtectedFieldsFromTaskType,
  saveTaskDefinition, saveTaskGroup, saveTaskType, updateOrCreateTask, updateOrCreateTaskGroupTeamLink } = require('../models/taskModel');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { convertToInteger } = require('../utils/convertToInteger');
const { savePerson } = require('../models/personModel');


/**
 * GET /api/v1/task-definition-list-retrieve
 * Retrieve a list of TaskDefinitions for one TaskGroup.
 */
exports.taskDefinitionListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    taskDefinitionList: [],
    status: '',
    success: true,
  };
  try {
    let params = {};
    if (taskGroupId && taskGroupId >= 0) {
      params = { taskGroupId };
    }
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskDefinitionInstructions: { contains: searchText, mode: 'insensitive' } },
        { taskDefinitionText: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskDefinitionList = await findTaskDefinitionListByParams(params);
    jsonData.success = true;
    if (taskDefinitionList) {
      jsonData.taskDefinitionList = taskDefinitionList;
      jsonData.status += 'TASK_DEFINITION_LIST_FOUND ';
    } else {
      jsonData.status += 'TASK_DEFINITION_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-team-link-list-retrieve
 * Retrieve a list of taskGroupTeamLink entries.
 */
exports.taskGroupTeamLinkListRetrieve = async (request, response) => {
  const jsonData = {
    taskGroupTeamLinkList: [],
    status: '',
    success: true,
  };
  try {
    const params = {};
    const taskGroupTeamLinkList = await findTaskGroupTeamLinkListByParams(params);
    jsonData.success = true;
    // console.log('== AFTER findTaskGroupTeamLinkListByParams taskGroupTeamLinkList:', taskGroupTeamLinkList);
    if (taskGroupTeamLinkList) {
      jsonData.taskGroupTeamLinkList = taskGroupTeamLinkList;
      jsonData.status += 'TASK_GROUP_TEAM_LINK_LIST_FOUND ';
    } else {
      jsonData.status += 'TASK_GROUP_TEAM_LINK_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-list-retrieve
 * Retrieve a list of taskGroups.
 */
exports.taskGroupListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    taskGroupList: [],
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskGroupName: { contains: searchText, mode: 'insensitive' } },
        { taskGroupDescription: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskGroupList = await findTaskGroupListByParams(params);
    jsonData.success = true;
    if (taskGroupList) {
      jsonData.taskGroupList = taskGroupList;
      jsonData.status += 'TASK_GROUP_LIST_FOUND ';
    } else {
      jsonData.status += 'TASK_GROUP_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * POST /api/v1/task-status-list-retrieve
 * Retrieve a list of tasks and the supporting data.
 */
exports.taskStatusListRetrieve = async (request, response) => {
  const personIdListIncoming = request.body.personIdList || [];
  // console.log('~~~~~~ taskStatusListRetrieve request.body', request.body);
  // console.log('~~~~~~ taskStatusListRetrieve personIdListIncoming', JSON.stringify(request.body.personIdList) || '');

  const personIdList = personIdListIncoming.map(convertToInteger);

  const jsonData = {
    isSearching: false,
    taskList: [],
    taskDefinitionList: [],
    taskGroupList: [],
    status: '',
    success: true,
  };
  try {
    // console.log('taskStatusListRetrieve personIdList:', personIdList);
    const results = await retrieveTaskStatusListByPersonIdList(personIdList);
    // console.log('results:', results);
    jsonData.success = true;
    jsonData.taskList = results.taskList;
    jsonData.taskDefinitionList = results.taskDefinitionList;
    jsonData.taskGroupList = results.taskGroupList;
    jsonData.status += results.status;
  } catch (err) {
    console.log('taskStatusListRetrieve err:', err);
    jsonData.status += err.message;
    jsonData.success += `personIdListIncoming.length=${personIdListIncoming.length}`;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-retrieve
 * Retrieve one taskGroup.
 */
exports.taskGroupRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const searchText = queryParams.get('searchText');

  const jsonData = {
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { taskGroupInstructions: { contains: searchText, mode: 'insensitive' } },
        { taskGroupName: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const taskGroup = await findTaskGroupById(taskGroupId);
    jsonData.success = true;
    if (taskGroup) {
      jsonData.taskGroupId = taskGroup.id;
      const keys = Object.keys(taskGroup);
      const values = Object.values(taskGroup);
      for (let i = 0; i < keys.length; i++) {
        jsonData[keys[i]] = values[i];
      }
      jsonData.status += 'TASK_GROUP_FOUND ';
    } else {
      jsonData.status += 'TASK_GROUP_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-save
 *
 */
exports.taskGroupSave = async (request, response) => {
  let shouldCreateTaskGroup = false;
  let shouldUpdateTaskGroup = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const taskGroupChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_GROUP_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    taskGroupCreated: false,
    taskGroupId: -1,
    taskGroupUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskGroupId = taskGroupId;
    jsonData.success = true;
    const keys = Object.keys(taskGroupChangeDict);
    const values = Object.values(taskGroupChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    let requiredFieldsExist = true;
    if (taskGroupId < 0) {
      if (!taskGroupChangeDict.taskGroupName || taskGroupChangeDict.taskGroupName.length === 0) {
        jsonData.status += 'taskGroupName_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (taskGroupId >= 0) {
      jsonData.status += 'TASK_GROUP_ID_FOUND ';
      shouldUpdateTaskGroup = requiredFieldsExist;
    } else {
      jsonData.status += 'TASK_GROUP_TO_BE_CREATED ';
      shouldCreateTaskGroup = requiredFieldsExist;
    }

    if (shouldCreateTaskGroup) {
      const taskGroup = await createTaskGroup(taskGroupChangeDict);
      // taskGroupId = taskGroup.id;
      // console.log('Created new taskGroup:', taskGroup);
      jsonData.taskGroupCreated = true;
      jsonData.taskGroupId = taskGroup.id;
      jsonData.status += 'TASK_GROUP_CREATED ';
      const modifiedTaskGroupDict = removeProtectedFieldsFromTaskGroup(taskGroup);
      const taskGroupKeys = Object.keys(modifiedTaskGroupDict);
      const taskGroupValues = Object.values(modifiedTaskGroupDict);
      for (let i = 0; i < taskGroupKeys.length; i++) {
        jsonData[taskGroupKeys[i]] = taskGroupValues[i];
      }
    } else if (shouldUpdateTaskGroup) {
      taskGroupChangeDict.id = taskGroupId;
      // console.log('Updating taskGroup:', taskGroupChangeDict);
      const taskGroup = await saveTaskGroup(taskGroupChangeDict);
      jsonData.taskGroupUpdated = true;
      jsonData.taskGroupId = taskGroupId;
      jsonData.status += 'TASK_GROUP_UPDATED ';
      const modifiedTaskGroupDict = removeProtectedFieldsFromTaskGroup(taskGroup);
      const taskGroupKeys = Object.keys(modifiedTaskGroupDict);
      const taskGroupValues = Object.values(modifiedTaskGroupDict);
      for (let i = 0; i < taskGroupKeys.length; i++) {
        jsonData[taskGroupKeys[i]] = taskGroupValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving taskGroup:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-definition-save
 *
 */
exports.taskDefinitionSave = async (request, response) => {
  let shouldCreateTaskDefinition = false;
  let shouldUpdateTaskDefinition = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskDefinitionId = convertToInteger(queryParams.get('taskDefinitionId'));
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  // console.log('queryParams:', queryParams);
  const taskDefinitionChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_DEFINITION_FIELDS_ACCEPTED);
  // console.log('taskDefinitionChangeDict:', taskDefinitionChangeDict);
  // Set up the default JSON response.
  const jsonData = {
    taskDefinitionCreated: false,
    taskDefinitionId: -1,
    taskGroupId: -1,
    taskDefinitionUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskGroupId = taskGroupId;
    jsonData.taskDefinitionId = taskDefinitionId;
    jsonData.success = true;
    const keys = Object.keys(taskDefinitionChangeDict);
    const values = Object.values(taskDefinitionChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (taskDefinitionId >= 0) {
      jsonData.status += 'TASK_DEFINITION_ID_FOUND ';
      shouldUpdateTaskDefinition = true;
    } else {
      jsonData.status += 'TASK_DEFINITION_TO_BE_CREATED ';
      shouldCreateTaskDefinition = true;
    }

    let requiredFieldsExist = true;
    if (!taskGroupId || taskGroupId === -1) {
      jsonData.status += 'taskGroupId_MISSING ';
      requiredFieldsExist = false;
    }
    if (shouldCreateTaskDefinition) {
      if (!taskDefinitionChangeDict.taskName || taskDefinitionChangeDict.taskName.length === 0) {
        jsonData.status += 'taskName_MISSING ';
        requiredFieldsExist = false;
      }
    }

    if (!requiredFieldsExist) {
      shouldCreateTaskDefinition = false;
      shouldUpdateTaskDefinition = false;
    }

    if (shouldCreateTaskDefinition) {
      //
      taskDefinitionChangeDict.taskGroupId = taskGroupId;
      const taskDefinition = await createTaskDefinition(taskDefinitionChangeDict);
      // taskDefinitionId = taskDefinition.id;
      // console.log('Created new taskDefinition:', taskDefinition);
      jsonData.taskDefinitionCreated = true;
      jsonData.taskDefinitionId = taskDefinition.id;
      jsonData.status += 'TASK_DEFINITION_CREATED ';
      const modifiedTaskDefinitionDict = removeProtectedFieldsFromTaskDefinition(taskDefinition);
      const taskDefinitionKeys = Object.keys(modifiedTaskDefinitionDict);
      const taskDefinitionValues = Object.values(modifiedTaskDefinitionDict);
      for (let i = 0; i < taskDefinitionKeys.length; i++) {
        jsonData[taskDefinitionKeys[i]] = taskDefinitionValues[i];
      }
    } else if (shouldUpdateTaskDefinition) {
      taskDefinitionChangeDict.id = taskDefinitionId;
      // console.log('Updating taskDefinition:', taskDefinitionChangeDict);
      const taskDefinition = await saveTaskDefinition(taskDefinitionChangeDict);
      // console.log('=== Updated taskDefinition:', taskDefinition);
      jsonData.taskDefinitionUpdated = true;
      jsonData.taskDefinitionId = taskDefinitionId;
      jsonData.status += 'TASK_DEFINITION_UPDATED ';
      const modifiedTaskDefinitionDict = removeProtectedFieldsFromTaskDefinition(taskDefinition);
      const taskDefinitionKeys = Object.keys(modifiedTaskDefinitionDict);
      const taskDefinitionValues = Object.values(modifiedTaskDefinitionDict);
      for (let i = 0; i < taskDefinitionKeys.length; i++) {
        jsonData[taskDefinitionKeys[i]] = taskDefinitionValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving taskDefinition:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-team-link-delete
 */
exports.taskGroupTeamLinkDelete = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const teamId = convertToInteger(queryParams.get('teamId'));

  // Set up the default JSON response.
  const jsonData = {
    taskGroupId,
    taskGroupTeamLinkDeleted: false,
    teamId,
    status: '',
    success: true,
    updateErrors: [],
  };

  try {
    if (parseInt(teamId) >= 0) {
      jsonData.status += 'TASK_GROUP_TEAM_LINK_TO_BE_DELETED ';
      await deleteOneTaskGroupTeamLink(taskGroupId, teamId);
      // console.log('Deleted TaskGroupTeamLink taskGroupId:', taskGroupId, ', teamId:', teamId);
      jsonData.taskGroupTeamLinkDeleted = true;
      jsonData.status += 'TASK_GROUP_TEAM_LINK_DELETED ';
    }
  } catch (err) {
    console.error('Error while deleting TaskGroupTeamLink:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-group-team-link-save
 *
 */
exports.taskGroupTeamLinkSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  // Set up the default JSON response.
  const jsonData = {
    taskCreated: false,
    teamId: -1,
    taskGroupId: -1,
    taskUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskGroupId = taskGroupId;
    jsonData.teamId = teamId;
    jsonData.success = true;
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    let requiredFieldsExist = true;
    if (teamId < 0) {
      jsonData.status += 'teamId_MISSING ';
      requiredFieldsExist = false;
    }
    if (taskGroupId < 0) {
      jsonData.status += 'WARNING_taskGroupId_MISSING ';
    }

    if (requiredFieldsExist) {
      const taskGroupTeamLink = await updateOrCreateTaskGroupTeamLink(taskGroupId, teamId);
      jsonData.taskCreated = true;
      jsonData.taskGroupId = taskGroupTeamLink.taskGroupId;
      jsonData.teamId = taskGroupTeamLink.teamId;
      jsonData.status += 'TASK_GROUP_TEAM_LINK_UPDATED_OR_CREATED ';
      const taskKeys = Object.keys(taskGroupTeamLink);
      const taskValues = Object.values(taskGroupTeamLink);
      for (let i = 0; i < taskKeys.length; i++) {
        jsonData[taskKeys[i]] = taskValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving taskGroupTeamLink:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-type-list-retrieve
 * Retrieve a list of TaskTypes (categories).
 */
exports.taskTypeListRetrieve = async (request, response) => {
  const jsonData = {
    taskTypeList: [],
    status: '',
    success: true,
  };
  try {
    const taskTypeList = await findTaskTypeListByParams({});
    jsonData.taskTypeList = taskTypeList;
    jsonData.status += 'TASK_TYPE_LIST_FOUND ';
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-type-save
 * Create or update a TaskType (category).
 */
exports.taskTypeSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskTypeId = convertToInteger(queryParams.get('taskTypeId'));
  const taskTypeChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_TYPE_FIELDS_ACCEPTED);

  const jsonData = {
    taskTypeCreated: false,
    taskTypeId: -1,
    taskTypeUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.taskTypeId = taskTypeId;
    const keys = Object.keys(taskTypeChangeDict);
    const values = Object.values(taskTypeChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (taskTypeId >= 0) {
      taskTypeChangeDict.id = taskTypeId;
      const taskType = await saveTaskType(taskTypeChangeDict);
      jsonData.taskTypeUpdated = true;
      jsonData.taskTypeId = taskTypeId;
      jsonData.status += 'TASK_TYPE_UPDATED ';
      const modifiedTaskTypeDict = removeProtectedFieldsFromTaskType(taskType);
      Object.entries(modifiedTaskTypeDict).forEach(([k, v]) => { jsonData[k] = v; });
    } else {
      if (!taskTypeChangeDict.taskTypeName || taskTypeChangeDict.taskTypeName.length === 0) {
        jsonData.status += 'taskTypeName_MISSING ';
        jsonData.success = false;
      } else {
        const taskType = await createTaskType(taskTypeChangeDict);
        jsonData.taskTypeCreated = true;
        jsonData.taskTypeId = taskType.id;
        jsonData.status += 'TASK_TYPE_CREATED ';
        const modifiedTaskTypeDict = removeProtectedFieldsFromTaskType(taskType);
        Object.entries(modifiedTaskTypeDict).forEach(([k, v]) => { jsonData[k] = v; });
      }
    }
  } catch (err) {
    console.error('Error while saving taskType:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/task-type-delete
 * Delete a TaskType (category).
 */
exports.taskTypeDelete = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const taskTypeId = convertToInteger(queryParams.get('taskTypeId'));

  const jsonData = {
    taskTypeId,
    taskTypeDeleted: false,
    status: '',
    success: true,
  };
  try {
    if (taskTypeId >= 0) {
      await deleteOneTaskType(taskTypeId);
      jsonData.taskTypeDeleted = true;
      jsonData.status += 'TASK_TYPE_DELETED ';
    } else {
      jsonData.status += 'taskTypeId_MISSING ';
      jsonData.success = false;
    }
  } catch (err) {
    console.error('Error while deleting taskType:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/task-save
 *
 */
exports.taskSave = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  const taskDefinitionId = convertToInteger(queryParams.get('taskDefinitionId'));
  const taskGroupId = convertToInteger(queryParams.get('taskGroupId'));
  // We aren't bringing in taskType as a URL variable at this time. We might need to in future?
  const taskChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, TASK_FIELDS_ACCEPTED_DICT);
  // console.log('== AFTER extractVariablesToChangeFromIncomingParams taskChangeDict:', taskChangeDict);
  // Set up the default JSON response.
  const jsonData = {
    taskCreated: false,
    personId: -1,
    taskDefinitionId: -1,
    taskGroupId: -1,
    taskUpdated: false,
    taskType: '',
    status: '',
    success: true,
    updateErrors: [],
  };
  let taskDone = false;
  try {
    jsonData.personId = personId;
    jsonData.taskDefinitionId = taskDefinitionId;
    jsonData.taskGroupId = taskGroupId;
    jsonData.success = true;
    const keys = Object.keys(taskChangeDict);
    const values = Object.values(taskChangeDict);
    // console.log('keys:', keys, ', values:', values);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
      if (keys[i] === 'statusDone' && (values[i] === 'true' || values[i] === true)) {
        taskDone = true;
      }
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    let requiredFieldsExist = true;
    if (personId < 0) {
      jsonData.status += 'personId_MISSING ';
      requiredFieldsExist = false;
    }
    if (taskDefinitionId < 0) {
      jsonData.status += 'taskDefinitionId_MISSING ';
      requiredFieldsExist = false;
    }
    if (taskGroupId < 0) {
      jsonData.status += 'WARNING_taskGroupId_MISSING ';
    }

    if (requiredFieldsExist) {
      const task = await updateOrCreateTask(personId, taskDefinitionId, taskGroupId, taskChangeDict);
      // taskId = task.id;
      // console.log('Created new task:', task);
      jsonData.taskCreated = true;
      jsonData.taskPersonId = task.personId;
      jsonData.taskDefinitionId = task.taskDefinitionId;
      jsonData.taskGroupId = task.taskGroupId;
      jsonData.taskType = task.taskType;
      jsonData.status += 'TASK_UPDATED_OR_CREATED ';
      const modifiedTaskDict = removeProtectedFieldsFromTask(task);
      const taskKeys = Object.keys(modifiedTaskDict);
      const taskValues = Object.values(modifiedTaskDict);
      for (let i = 0; i < taskKeys.length; i++) {
        jsonData[taskKeys[i]] = taskValues[i];
      }
    } else {
      jsonData.success = false;
    }
  } catch (err) {
    console.error('Error while saving task:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  // When a task is marked as completed, update the corresponding Person table field, as
  //  defined in TASK_DEFINITION_FIELDS_TO_MAP_TO_PERSON_FIELDS.
  const taskDoneFinal = jsonData.success && taskDone && taskDefinitionId;
  // console.log('taskDoneFinal:', taskDoneFinal, ', jsonData.success:', jsonData.success, ', taskDone:', taskDone, ', taskDefinitionId:', taskDefinitionId);
  if (taskDoneFinal) {
    // Now go on to update Person table
    const taskDefinition = await findTaskDefinitionById(taskDefinitionId);
    // console.log('taskDefinition:', taskDefinition);
    // If the field in taskDefinition is true and matches a key found in TASK_DEFINITION_FIELDS_TO_MAP_TO_PERSON_FIELDS,
    // then update the corresponding field in Person table.
    const personUpdateDict = {};
    let personUpdateFound = false;
    // eslint-disable-next-line no-restricted-syntax
    for (const [taskDefinitionField, personField] of Object.entries(TASK_DEFINITION_FIELDS_TO_MAP_TO_PERSON_FIELDS)) {
      if (personField && taskDefinition && taskDefinitionField) {
        // console.log('exports.taskSave taskDefinitionField:', taskDefinitionField, ', personField:', personField);
        if (taskDefinitionField === 'statusOfferDecisionNeededSetFalse') {
          if (taskDefinition[taskDefinitionField] === true) {
            personUpdateDict[personField] = false;
            personUpdateFound = true;
          }
        } else if (taskDefinition[taskDefinitionField] === true) {
          // console.log('Updating person field:', personField, ' with TRUE');
          personUpdateDict[personField] = true;
          personUpdateFound = true;
        }
      } else {
        console.log('MISSING_TASKDONE_VARIABLE ');
      }
    }
    if (personUpdateFound) {
      personUpdateDict.id = personId;
      // console.log('Save changes to Person table:', personUpdateDict);
      await savePerson(personUpdateDict);
    }
  }

  response.json(jsonData);
};
