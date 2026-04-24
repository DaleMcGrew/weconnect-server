// weconnect-server/controllers/taskController.js
const { findQuestionAnswerListByParams } = require('../models/questionnaireModel');
const {
  createTask,
  findTaskDefinitionListByParams, findTaskDependencyListByParams, findTaskGroupTeamLinkListByParams, findTaskGroupListByIdList,
  findTaskGroupListByParams, findTaskListByParams,
  // TASK_DEFINITION_FIELDS_ACCEPTED,
} = require('../models/taskModel');
const { findTeamMemberListByParams } = require('../models/teamModel');
const { arrayContains } = require('../utils/arrayContains');
const { findPersonListByParams } = require('../models/personModel');

// personStatesThatIndicateThisIsNotNecessary is used to avoid creating tasks earlier in the onboarding process once we've already passed a later "gate"
const TASK_GROUP_MATCH_REQUIRED = [
  {
    personField: 'statusEmailCreated',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfEmailCreated',
  },
  {
    personField: 'statusOfferDecisionNeeded',
    personStatesThatIndicateThisIsNotNecessary: ['statusOfferLetterSigned', ''],
    taskGroupField: 'assignIfOfferDecisionNeeded',
  },
  {
    personField: 'statusOfferQuestionnaireAnswered',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferQuestionnaireAnswered',
  },
  {
    personField: 'statusOfferQuestionnaireSent',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferQuestionnaireSent',
  },
  {
    personField: 'statusOfferLetterCreated',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferLetterCreated',
  },
  {
    personField: 'statusOfferLetterSigned',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferLetterSigned',
  },
  {
    taskGroupField: 'assignIfQuestionnaireAnswered',
  },
  {
    personField: 'statusOfferApproved',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferApproved',
  },
  {
    personField: 'statusOfferWillNotBeMade',
    personStatesThatIndicateThisIsNotNecessary: [''],
    taskGroupField: 'assignIfOfferWillNotBeMade',
  },
];

exports.generateTaskStatusListForAllPeople = async () => {
  let status = '';
  let success = true;
  // console.log('generateTaskStatusListForAllPeople started');

  // Find out which questionnaires have been answered by which people
  const questionnaireAnsweredDict = {};
  try {
    const paramsQuestionAnswerList = {};
    const questionAnswerList = await findQuestionAnswerListByParams(paramsQuestionAnswerList);
    questionAnswerList.forEach((answer) => {
      if (!questionnaireAnsweredDict[answer.personId]) {
        questionnaireAnsweredDict[answer.personId] = {};
      }
      questionnaireAnsweredDict[answer.personId][answer.questionnaireId] = true;
    });
  } catch (err) {
    status += `Error while fetching questionnaireAnswerList: ${err.message} `;
    console.error(status);
    success = false;
  }
  // console.log('questionnaireAnsweredDict:', questionnaireAnsweredDict);

  // Get all existing tasks
  const taskListDictByPersonId = {};
  try {
    const paramsTaskList = {};
    const taskList = await findTaskListByParams(paramsTaskList);
    // console.log('generateTaskStatusListForAllPeople taskList.length:', taskList.length);
    for (let i = 0; i < taskList.length; i++) {
      // If task is not found, we create it
      if (!taskListDictByPersonId[taskList[i].personId]) {
        taskListDictByPersonId[taskList[i].personId] = [];
      }
      taskListDictByPersonId[taskList[i].personId].push(taskList[i]);
    }
  } catch (err) {
    status += `Error while fetching taskList: ${err.message} `;
    console.error(status);
    success = false;
  }

  // Get all task definitions (even if turned off)
  const paramsTaskDefinitionList = {};
  const taskDefinitionList = await findTaskDefinitionListByParams(paramsTaskDefinitionList);

  // Get all task dependencies
  const paramsTaskDependencyList = {};
  const taskDependencyList = await findTaskDependencyListByParams(paramsTaskDependencyList);

  // Get all task groups
  const paramsTaskGroupList = {};
  const taskGroupList = await findTaskGroupListByParams(paramsTaskGroupList);
  const taskGroupDict = taskGroupList.reduce((acc, taskGroup) => {
    acc[taskGroup.id] = taskGroup;
    return acc;
  }, {});

  // Assemble which teams are associated with each task group when taskGroupIsForTeam is true
  const taskGroupTeamIdLists = {}; // key = taskGroupId, value = [teamId1, teamId2,...]
  try {
    const paramsTaskGroupTeamLink = {};
    const taskGroupTeamLinkList = await findTaskGroupTeamLinkListByParams(paramsTaskGroupTeamLink);
    // console.log('generateTaskStatusListForAllPeople taskGroupTeamLinkList:', taskGroupTeamLinkList);
    for (let i = 0; i < taskGroupTeamLinkList.length; i++) {
      // If taskGroupId is not found in dict, we create it
      if (!taskGroupTeamIdLists[taskGroupTeamLinkList[i].taskGroupId]) {
        taskGroupTeamIdLists[taskGroupTeamLinkList[i].taskGroupId] = [];
      }
      taskGroupTeamIdLists[taskGroupTeamLinkList[i].taskGroupId].push(taskGroupTeamLinkList[i].teamId);
    }
    // console.log('generateTaskStatusListForAllPeople taskGroupTeamIdLists:', taskGroupTeamIdLists);
  } catch (err) {
    status += `Error while fetching taskGroupIsForTeam: ${err.message} `;
    console.error(status);
    success = false;
  }

  // Get all team members so for each person, we can tell which team(s) they are in
  const paramsTeamMemberInfoList = {};
  const TeamMemberInfoList = await findTeamMemberListByParams(paramsTeamMemberInfoList);
  const teamMemberDict = {};
  TeamMemberInfoList.forEach((teamMember) => {
    if (!teamMemberDict[teamMember.personId]) {
      teamMemberDict[teamMember.personId] = {};
    }
    teamMemberDict[teamMember.personId][teamMember.teamId] = true;
  });

  // Add params that look for values in person records that imply tasks needs to be generated?
  const paramsPersonList = { statusActive: true };
  const personList = await findPersonListByParams(paramsPersonList);
  // const personDict = personList.reduce((acc, person) => {
  //   acc[person.id] = person;
  //   return acc;
  // }, {});
  // console.log('personDict[1]:', personDict[1]);
  let taskListForPerson = [];
  for (let i = 0; i < personList.length; i++) {
    // console.log('personList[i]:', personList[i]);
    try {
      taskListForPerson = taskListDictByPersonId[personList[i].id] || [];
    } catch (err) {
      taskListForPerson = [];
    }
    const questionnairesAnsweredByThisPerson = questionnaireAnsweredDict[personList[i].id] || {};
    const teamsForThisPerson = teamMemberDict[personList[i].id] || {};
    // console.log('questionnairesAnsweredByThisPerson:', questionnairesAnsweredByThisPerson);
    const generateResults = exports.generateTasksForPerson(
      personList[i],
      questionnairesAnsweredByThisPerson,
      taskListForPerson,
      taskDefinitionList,
      taskGroupDict,
      teamsForThisPerson,
      taskGroupTeamIdLists,
    );
    status += generateResults.status;
    if (generateResults.success === false) {
      success = false;
    }
    if (generateResults.newTasksCreated) {
      ({ taskListForPerson } = generateResults);
      // console.log('taskListModified:', taskListForPerson);
    }

    // const taskListUpdated =
    exports.updateTaskStatusesForPerson(
      personList[i],
      taskListForPerson,
      taskDefinitionList,
      taskDependencyList,
    );
    // console.log('taskListUpdated:', taskListUpdated);
  }
  return {
    status,
    success,
  };
};

exports.generateTasksForPerson = async (
  person,
  questionnairesAnsweredByThisPerson,
  taskListForPerson,
  taskDefinitionList,
  taskGroupDict,
  teamsForThisPerson,
  taskGroupTeamIdLists,
) => {
  let newTasksCreated = false;
  let status = '';
  let success = true;
  // Organize TaskDefinitions into a dict based on id
  const taskDefinitionDictByDefinitionId = {};
  for (let i = 0; i < taskDefinitionList.length; i++) {
    if (!taskDefinitionDictByDefinitionId[taskDefinitionList[i].id]) {
      taskDefinitionDictByDefinitionId[taskDefinitionList[i].id] = taskDefinitionList[i];
    }
  }
  // Organize tasks for the person into a dict based on taskDefinitionId
  const taskDictByDefinitionIdForThisPerson = {};
  for (let i = 0; i < taskListForPerson.length; i++) {
    if (!taskDictByDefinitionIdForThisPerson[taskListForPerson[i].taskDefinitionId]) {
      taskDictByDefinitionIdForThisPerson[taskListForPerson[i].taskDefinitionId] = taskListForPerson[i];
    }
  }
  // console.log('taskDefinitionDictByDefinitionId:', taskDefinitionDictByDefinitionId);
  // Create an array of promises for creating new tasks
  // Loop through all TaskDefinitions and if a task doesn't already exist for the person, and it should exist, create it
  const newTaskPromises = taskDefinitionList.map((taskDefinition) => {
    try {
      if (taskDictByDefinitionIdForThisPerson[taskDefinition.id]) {
        // Already exists, so we don't need to create a new one
        // console.log('Task already exists taskDefinition.id:', taskDefinition.id);
        return null;
      } else if (person.statusOnLeave === true || person.statusResigned === true) {
        // Person is on leave or resigned, so we don't create this task for this person
        return null;
      } else if (taskDefinition.statusActive === false) {
        // Task is turned off, so we don't create this task for this person
        // console.log('Task is turned off taskDefinition.id:', taskDefinition.id);
        return null;
      }
      // console.log('=== Task does NOT exist taskDefinition.id:', taskDefinition.id);
      // Check here if the task should be created for this person
      if (taskDefinition.taskGroupId) {
        // Currently we require all tasks to be organized within a task group
        const taskGroup = taskGroupDict[taskDefinition.taskGroupId];
        if (taskGroup.statusActive !== true) {
          // Task group is turned off
          return null;
        } else {
          if (taskGroup.taskGroupIsForTeam === true) {
            // console.log(`== generateTasksForPerson person, taskGroupIsForTeam, taskGroupId: ${taskDefinition.taskGroupId} ${person.firstName} ${person.lastName}`);
            // If this taskGroup is for a team, it will only apply if the person is in that team.
            const teamIdListForThisTaskGroup = taskGroupTeamIdLists[taskGroup.id] || [];
            // console.log('==== teamIdListForThisTaskGroup:', teamIdListForThisTaskGroup);
            // console.log('==== teamsForThisPerson:', teamsForThisPerson);
            if (teamIdListForThisTaskGroup.length === 0) {
              // If teamIdListForThisTaskGroup is empty, always return null when taskGroupIsForTeam === true
              return null;
            }
            const personIsInTaskGroupTeam = teamIdListForThisTaskGroup.some((teamId) => teamsForThisPerson[teamId]);
            // console.log('==== personIsInTaskGroupTeam:', personIsInTaskGroupTeam);

            if (!personIsInTaskGroupTeam) {
              // If the person is not in any of the teams for this task group, skip this task
              return null;
            }
          }
          // console.log('Task group is active:', taskGroup);
          for (let i = 0; i < TASK_GROUP_MATCH_REQUIRED.length; i++) {
            let createThisTaskForThisPerson = false;
            const taskGroupMatchField = TASK_GROUP_MATCH_REQUIRED[i].taskGroupField;
            const personMatchField = (TASK_GROUP_MATCH_REQUIRED[i]) ? TASK_GROUP_MATCH_REQUIRED[i].personField : '';
            // console.log('==== taskGroupMatchField:', taskGroupMatchField);
            if (taskGroupMatchField === 'assignIfQuestionnaireAnswered' && taskGroup.assignIfQuestionnaireAnswered === true) {
              // Do we have a questionnaire response for this person?
              // console.log(`== generateTasksForPerson person: ${person.firstName} ${person.lastName}`);
              // console.log('==== questionnairesAnsweredByThisPerson:', questionnairesAnsweredByThisPerson);
              // console.log('==== Checking questionnaire:', taskGroup.questionnaireId, 'taskGroup:', taskGroup);
              if (questionnairesAnsweredByThisPerson && questionnairesAnsweredByThisPerson[`${taskGroup.questionnaireId}`]) {
                createThisTaskForThisPerson = true;
                // console.log('===== questionnaire answered:', taskGroup.questionnaireId);
              }
              // Note that if the questionnaire has isOfferQuestionnaire set to true,
              // the field taskGroup.assignIfOfferQuestionnaireAnswered (which is linked to person.statusOfferQuestionnaireAnswered),
              //  could also set createThisTaskForThisPerson to true.
            } else if (taskGroup[taskGroupMatchField] === true && person[personMatchField] === true) {
              createThisTaskForThisPerson = true;
              // console.log(`== generateTasksForPerson person (loop 2): ${person.firstName} ${person.lastName}`);
              // console.log('==== Task should be created:', taskGroupMatchField, personMatchField);
            }
            if (createThisTaskForThisPerson) {
              const taskChangeDict = {
                personId: person.id,
                taskDefinitionId: taskDefinition.id,
                taskGroupId: taskDefinition.taskGroupId,
                taskType: taskDefinition.taskType,
              };
              // console.log('==== Creating new task for person:', person.firstName, person.lastName, ':', taskChangeDict);
              // Set a flag to indicate that a new task has been created, so we don't try to create again
              taskDictByDefinitionIdForThisPerson[taskDefinition.id] = true;
              return createTask(taskChangeDict);
            }
          }
        }
        return null;
      } else return null;
    } catch (err) {
      console.error('Error creating task:', err);
      status += `Error creating task: ${err.message}\n`;
      success = false;
      return null;
    }
  }).filter(Boolean);

  // Wait for all new tasks to be created
  const newTasks = await Promise.all(newTaskPromises);
  newTasksCreated = newTasks.length > 0;

  // Add new tasks to taskListForPerson and taskDictByDefinitionIdForThisPerson
  newTasks.forEach((task) => {
    taskListForPerson.push(task);
    taskDictByDefinitionIdForThisPerson[task.taskDefinitionId] = task;
  });

  // console.log('generateTasksForPerson taskListForPerson:', taskListForPerson);

  // Check dependencies and update task status
  // TODO especially for assignIfQuestionnaireAnswered

  // console.log('person.firstName:', person.firstName);
  return {
    status,
    success,
    newTasksCreated,
    taskListForPerson,
  };
};

exports.retrieveTaskStatusListByPersonIdList = async (personIdList) => {
  // const personAnswersByPersonId = {};
  let taskList = [];
  const taskDefinitionIdList = [];
  let taskDefinitionList = [];
  const taskGroupIdList = [];
  let taskGroupList = [];
  let status = '';
  let success = true;

  try {
    // To be moved
    await exports.generateTaskStatusListForAllPeople();
  } catch (err) {
    status += err.message;
    success = false;
  }
  // Start with the task data received for personIds in personIdList
  // console.log('personIdList:', personIdList);
  try {
    let params = {};
    if (personIdList && personIdList.length > 0) {
      params = {
        personId: { in: personIdList },
      };
    }
    taskList = await findTaskListByParams(params);
    success = true;
    // console.log('== AFTER findTaskListByParams taskList:', taskList);
    if (taskList) {
      status += 'TASK_LIST_FOUND ';
    } else {
      status += 'TASK_LIST_NOT_FOUND ';
    }
  } catch (err) {
    // console.log('=== Error retrieving findTaskListByParams:', err);
    status += err.message;
    success = false;
  }
  if (success && taskList.length > 0) {
    const keys = Object.keys(taskList);
    const values = Object.values(taskList);
    for (let i = 0; i < keys.length; i++) {
      // const onePersonId = values[i].personId;
      const oneTaskDefinitionId = values[i].taskDefinitionId;
      if (!arrayContains(oneTaskDefinitionId, taskGroupIdList)) {
        taskGroupIdList.push(oneTaskDefinitionId);
      }
      const oneTaskGroupId = values[i].taskGroupId;
      if (!arrayContains(oneTaskGroupId, taskGroupIdList)) {
        taskGroupIdList.push(oneTaskGroupId);
      }
    }
    // console.log('== AFTER findTaskListByParams taskGroupIdList:', taskGroupIdList);
  }

  if (success) {
    try {
      let params = {};
      if (taskDefinitionIdList && taskDefinitionIdList.length > 0) {
        params = {
          id: { in: taskDefinitionIdList },
        };
      }
      taskDefinitionList = await findTaskDefinitionListByParams(params);
      success = true;
      // console.log('== AFTER findTaskDefinitionListByParams taskDefinitionList:', taskDefinitionList);
      if (taskDefinitionList) {
        status += 'TASK_DEFINITION_LIST_FOUND ';
      } else {
        status += 'TASK_DEFINITION_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findTaskDefinitionListByParams:', err);
      status += err.message;
      success = false;
    }
  }

  // Retrieve the taskGroups so we can organize the tasks by taskGroup
  if (success && taskGroupIdList.length > 0) {
    try {
      taskGroupList = await findTaskGroupListByIdList(taskGroupIdList);
      success = true;
      // console.log('== AFTER findTaskGroupListByIdList taskGroupList:', taskGroupList);
      if (taskGroupList) {
        status += 'TASK_GROUP_LIST_FOUND ';
      } else {
        status += 'TASK_GROUP_LIST_NOT_FOUND ';
      }
    } catch (err) {
      // console.log('=== Error retrieving findTaskGroupListByIdList:', err);
      status += err.message;
      success = false;
    }
  }
  return {
    taskList,
    taskDefinitionList,
    taskGroupList,
    success,
    status,
  };
};

exports.updateTaskStatusesForPerson = async (
  person,
  taskListForPerson,
  // taskDefinitionList,
  // taskDependencyList,
) => {
  // console.log('updateTaskStatusesForPerson person.firstName:', person.firstName);
  // Organize tasks into a dict based on taskDefinitionId
  const taskDictByDefinitionId = {};
  for (let i = 0; i < taskListForPerson.length; i++) {
    if (!taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId]) {
      taskDictByDefinitionId[taskListForPerson[i].taskDefinitionId] = taskListForPerson[i];
    }
  }
  // console.log('taskDictByDefinitionId:', taskDictByDefinitionId);

  // console.log('updateTaskStatusesForPerson taskListForPerson:', taskListForPerson);

  // Check dependencies and update task status
};
