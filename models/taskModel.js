// weconnect-server/models/taskModel.js, parallel to /prisma/schema/task.prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TASK_DEFINITION_FIELDS_ACCEPTED = {
  emailTemplateId: 'INTEGER',
  googleDriveFolderId: 'STRING',
  isForVolunteer: 'BOOLEAN',
  isGoogleDrivePermissionStep: 'BOOLEAN',
  isQuestionnaireStep: 'BOOLEAN',
  order: 'INTEGER',
  questionnaireId: 'INTEGER',
  taskGroupId: 'INTEGER',
  taskActionUrl: 'STRING',
  taskName: 'STRING',
  taskNameCompleted: 'STRING',
  taskWhatToDo: 'STRING',
  taskWhyWeDoIt: 'STRING',
};

const TASK_FIELDS_ACCEPTED = [
  'doneByPersonId',
  'googleDriveSuccess',
  'statusDone',
  'statusError',
  'statusErrorResolved',
  'statusReadyToDo',
  'statusResolvedComment',
  'statusToDoByHuman',
  'taskGroupId',
];

const TASK_FIELDS_ACCEPTED_DICT = {
  doneByPersonId: 'INTEGER',
  googleDriveSuccess: 'BOOLEAN',
  statusDone: 'BOOLEAN',
  statusError: 'BOOLEAN',
  statusErrorResolved: 'BOOLEAN',
  statusReadyToDo: 'BOOLEAN',
  statusResolvedComment: 'BOOLEAN',
  statusToDoByHuman: 'BOOLEAN',
  taskGroupId: 'INTEGER',
};

const TASK_GROUP_FIELDS_ACCEPTED = [
  'taskGroupName',
  'taskGroupDescription',
  'taskGroupIsForTeam',
];

function removeProtectedFieldsFromTask (task) {
  const modifiedTask = { ...task };
  return modifiedTask;
}

function removeProtectedFieldsFromTaskDefinition (taskDefinition) {
  const modifiedTaskDefinition = { ...taskDefinition };
  return modifiedTaskDefinition;
}

function removeProtectedFieldsFromTaskDependency (taskDependency) {
  const modifiedTaskDependency = { ...taskDependency };
  return modifiedTaskDependency;
}

function removeProtectedFieldsFromTaskGroup (taskGroup) {
  const modifiedTaskGroup = { ...taskGroup };
  return modifiedTaskGroup;
}

async function findTaskGroupById (id, includeAllData = false) {
  const taskGroup = await prisma.taskGroup.findUnique({
    where: {
      id,
    },
  });
  let modifiedTaskGroup = {};
  if (includeAllData) {
    modifiedTaskGroup = taskGroup;
  } else {
    modifiedTaskGroup = removeProtectedFieldsFromTaskGroup(taskGroup);
  }
  modifiedTaskGroup.taskGroupId = taskGroup.id;
  return modifiedTaskGroup;
}

function extractTaskGroupVariablesToChange (queryParams) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  Object.entries(queryParams).forEach(([key, value]) => {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (TASK_GROUP_FIELDS_ACCEPTED.includes(keyWithoutToBeSaved) && value) {
      if (queryParams && queryParams[`${keyWithoutToBeSaved}Changed`] === 'true') {
        updateDict[keyWithoutToBeSaved] = value;
      }
    }
  });
  return updateDict;
}

async function findTaskListByParams (params = {}, includeAllData = false) {
  const taskList = await prisma.task.findMany({
    where: params,
  });
  // console.log('findTaskListByParams taskList:', taskList);
  let modifiedTask = {};
  const modifiedTaskList = [];
  if (includeAllData) {
    taskList.forEach((task) => {
      modifiedTask = { ...task };
      // modifiedTask.taskId = task.id;
      modifiedTaskList.push(modifiedTask);
    });
  } else {
    taskList.forEach((task) => {
      modifiedTask = removeProtectedFieldsFromTask(task);
      // modifiedTask.taskId = task.id;
      modifiedTaskList.push(modifiedTask);
    });
  }
  return modifiedTaskList;
}

async function findTaskListByIdList (idList, includeAllData = false) {
  const taskList = await prisma.task.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findTaskListByIdList taskList:', taskList);
  let modifiedTask = {};
  const modifiedTaskList = [];
  if (includeAllData) {
    taskList.forEach((task) => {
      modifiedTask = { ...task };
      modifiedTask.taskId = task.id;
      modifiedTaskList.push(modifiedTask);
    });
  } else {
    taskList.forEach((task) => {
      modifiedTask = removeProtectedFieldsFromTask(task);
      modifiedTask.taskId = task.id;
      modifiedTaskList.push(modifiedTask);
    });
  }
  // console.log('findTaskListByIdList modifiedTaskList:', modifiedTaskList);
  return modifiedTaskList;
}

async function findTaskDefinitionListByParams (params = {}) {
  const taskDefinitionList = await prisma.taskDefinition.findMany({
    where: params,
  });
  let modifiedTaskDefinition = {};
  const modifiedTaskDefinitionList = [];
  taskDefinitionList.forEach((taskDefinition) => {
    modifiedTaskDefinition = { ...taskDefinition };
    modifiedTaskDefinition.taskDefinitionId = taskDefinition.id;
    modifiedTaskDefinitionList.push(modifiedTaskDefinition);
  });
  return modifiedTaskDefinitionList;
}

async function findTaskDependencyListByParams (params = {}) {
  const taskDependencyList = await prisma.taskDependency.findMany({
    where: params,
  });
  let modifiedTaskDependency = {};
  const modifiedTaskDependencyList = [];
  taskDependencyList.forEach((taskDependency) => {
    modifiedTaskDependency = { ...taskDependency };
    modifiedTaskDependency.taskDependencyId = taskDependency.id;
    modifiedTaskDependencyList.push(modifiedTaskDependency);
  });
  return modifiedTaskDependencyList;
}

async function findTaskGroupListByIdList (idList, includeAllData = false) {
  const taskGroupList = await prisma.taskGroup.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findTaskGroupListByIdList taskGroupList:', taskGroupList);
  let modifiedTaskGroup = {};
  const modifiedTaskGroupList = [];
  if (includeAllData) {
    taskGroupList.forEach((taskGroup) => {
      modifiedTaskGroup = { ...taskGroup };
      modifiedTaskGroup.taskGroupId = taskGroup.id;
      modifiedTaskGroupList.push(modifiedTaskGroup);
    });
  } else {
    taskGroupList.forEach((taskGroup) => {
      modifiedTaskGroup = removeProtectedFieldsFromTaskGroup(taskGroup);
      modifiedTaskGroup.taskGroupId = taskGroup.id;
      modifiedTaskGroupList.push(modifiedTaskGroup);
    });
  }
  // console.log('findTaskGroupListByIdList modifiedTaskGroupList:', modifiedTaskGroupList);
  return modifiedTaskGroupList;
}

async function findTaskGroupListByParams (params = {}, includeAllData = false) {
  const taskGroupList = await prisma.taskGroup.findMany({
    where: params,
  });
  let modifiedTaskGroup = {};
  const modifiedTaskGroupList = [];
  if (includeAllData) {
    taskGroupList.forEach((taskGroup) => {
      modifiedTaskGroup = { ...taskGroup };
      modifiedTaskGroup.taskGroupId = taskGroup.id;
      modifiedTaskGroupList.push(modifiedTaskGroup);
    });
  } else {
    taskGroupList.forEach((taskGroup) => {
      modifiedTaskGroup = removeProtectedFieldsFromTaskGroup(taskGroup);
      modifiedTaskGroup.taskGroupId = taskGroup.id;
      modifiedTaskGroupList.push(modifiedTaskGroup);
    });
  }
  return modifiedTaskGroupList;
}

async function findOneTaskGroup (params, includeAllData = false) {   // Find one with array
  const taskGroup = await prisma.taskGroup.findUnique({
    where: params,
  });
  let modifiedTaskGroup = {};
  if (includeAllData) {
    modifiedTaskGroup = taskGroup;
  } else {
    modifiedTaskGroup = removeProtectedFieldsFromTaskGroup(taskGroup);
  }
  modifiedTaskGroup.taskGroupId = taskGroup.id;
  return modifiedTaskGroup;
}

async function deleteOneTaskGroup (id) {
  await prisma.taskGroup.delete({
    where: {
      id,
    },
  });
}

async function saveTask (task) {
  // console.log('saveTask task:', task);
  const updateTask = await prisma.task.update({
    where: {
      id: task.id,
    },
    data: task,
  });
  // console.log(updateTask);
  return updateTask;
}

async function saveTaskDefinition (taskDefinition) {
  // console.log('saveTaskDefinition taskDefinition:', taskDefinition);
  const updateTaskDefinition = await prisma.taskDefinition.update({
    where: {
      id: taskDefinition.id,
    },
    data: taskDefinition,
  });
  // console.log(updateTaskDefinition);
  return updateTaskDefinition;
}

async function saveTaskDependency (taskDependency) {
  // console.log('saveTaskDependency taskDependency:', taskDependency);
  const updateTaskDependency = await prisma.taskDependency.update({
    where: {
      id: taskDependency.id,
    },
    data: taskDependency,
  });
  // console.log(updateTaskDependency);
  return updateTaskDependency;
}

async function saveTaskGroup (taskGroup) {
  // console.log('saveTaskGroup taskGroup:', taskGroup);
  const updateTaskGroup = await prisma.taskGroup.update({
    where: {
      id: taskGroup.id,
    },
    data: taskGroup,
  });
  // console.log(updateTaskGroup);
  return updateTaskGroup;
}

async function createTask (updateDict) {
  const task = await prisma.task.create({ data: updateDict });
  return task;
}

async function createTaskDefinition (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const taskDefinition = await prisma.taskDefinition.create({ data: updateDict });
  return taskDefinition;
}

async function createTaskDependency (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const taskDependency = await prisma.taskDependency.create({ data: updateDict });
  return taskDependency;
}

async function createTaskGroup (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const taskGroup = await prisma.taskGroup.create({ data: updateDict });
  return taskGroup;
}

function updateOrCreateTask (personId, taskDefinitionId, taskGroupId, updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const createDict = Object.assign({}, { personId, taskDefinitionId, taskGroupId }, updateDict);
  try {
    const upResult =  prisma.task.upsert({
      where: {
        taskDefinitionIdPersonId: {
          personId,
          taskDefinitionId,
        },
      },
      update: { ...updateDict },
      create: { ...createDict },
    });
    return upResult;
  } catch (err) {
    console.log('updateOrCreateTask: ERROR ', err);
    return null;
  }
}

module.exports = {
  createTask,
  createTaskDefinition,
  createTaskDependency,
  createTaskGroup,
  deleteOneTaskGroup,
  extractTaskGroupVariablesToChange,
  findTaskDefinitionListByParams,
  findTaskDependencyListByParams,
  findTaskListByIdList,
  findTaskListByParams,
  findTaskGroupById,
  findTaskGroupListByIdList,
  findTaskGroupListByParams,
  findOneTaskGroup,
  TASK_DEFINITION_FIELDS_ACCEPTED,
  TASK_FIELDS_ACCEPTED,
  TASK_FIELDS_ACCEPTED_DICT,
  TASK_GROUP_FIELDS_ACCEPTED,
  removeProtectedFieldsFromTask,
  removeProtectedFieldsFromTaskDefinition,
  removeProtectedFieldsFromTaskDependency,
  removeProtectedFieldsFromTaskGroup,
  saveTask,
  saveTaskDefinition,
  saveTaskDependency,
  saveTaskGroup,
  updateOrCreateTask,
}; // Export the functions
