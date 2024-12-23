// weconnect-server/controllers/personApiController.js
const bcrypt = require('@node-rs/bcrypt');
const { createPerson, findPersonListByParams, PERSON_FIELDS_ACCEPTED, removeProtectedFieldsFromPerson } = require('../models/personModel');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');

/**
 * GET /api/v1/person-list-retrieve
 * Retrieve a list of people.
 */
exports.personListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jSonData = {
    isSearching: true,
    personList: [],
    success: false,
    status: '',
  };
  try {
    const params = {};

    const personList = await findPersonListByParams(params);
    jSonData.success = true;
    if (personList) {
      jSonData.personList = personList;
      jSonData.status += 'PERSON_LIST_FOUND ';
    } else {
      jSonData.status += 'PERSON_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }
  response.json(jSonData);
};

/**
 * GET /api/v1/person-save
 *
 */
exports.personSave = async (request, response) => {
  let shouldCreatePerson = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  let personId = queryParams.get('personId');
  const teamId = queryParams.get('teamId');
  const changeDict = extractVariablesToChangeFromIncomingParams(queryParams, PERSON_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jSonData = {
    personCreated: false,
    personId: '-1',
    success: false,
    status: '',
    updateErrors: [],
  };
  try {
    jSonData.personId = personId;
    jSonData.success = true;
    const keys = Object.keys(changeDict);
    const values = Object.values(changeDict);
    for (let i = 0; i < keys.length; i++) {
      jSonData[keys[i]] = values[i];
    }
  } catch (err) {
    jSonData.status += err.message;
    jSonData.success = false;
  }

  try {
    if (personId >= 0) {
      jSonData.status += 'PERSON_FOUND ';
    } else {
      // TODO make sure a person with exact firstName/lastName or emailPersonal doesn't already exist in the database
      jSonData.status += 'PERSON_TO_BE_CREATED ';
      shouldCreatePerson = true;
    }

    if (shouldCreatePerson) {
      //
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      changeDict.password = await bcrypt.hash(tempPassword, 10);
      const person = await createPerson(changeDict);
      personId = person.id;
      console.log('Created new person:', person);
      jSonData.personCreated = true;
      jSonData.personId = person.id;
      jSonData.status += 'PERSON_CREATED ';
      const modifiedPersonDict = removeProtectedFieldsFromPerson(person);
      const personKeys = Object.keys(modifiedPersonDict);
      const personValues = Object.values(modifiedPersonDict);
      for (let i = 0; i < personKeys.length; i++) {
        jSonData[personKeys[i]] = personValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving person:', err);
    jSonData.status += err.message;
    jSonData.success = false;
    jSonData.updateErrors.push('Missing required field: emailPersonal');
  }
  try {
    //
    if (personId >= 0 && teamId >= 0) {
      // Add the person to the team
    }
  } catch (err) {
    console.error('Error while adding person to team:', err);
    jSonData.status += err.message;
    jSonData.success = false;
  }

  response.json(jSonData);
};
