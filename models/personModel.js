// weconnect-server/models/personModel.js, parallel to /prisma/schema/person.prisma

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('@node-rs/bcrypt');

const prisma = new PrismaClient();

const PERSON_AWAY_FIELDS_ACCEPTED = {
  awayDescription: 'STRING',
  awayDescriptionForTeamLeads: 'STRING',
  dateEnd: 'DATE',
  dateEndEstimated: 'DATE',
  dateStart: 'DATE',
  dateSubmitted: 'DATE',
  personId: 'INTEGER',
  reportedByPersonId: 'INTEGER',
  isLeaveOfAbsence: 'BOOLEAN',
  isNotFeelingWell: 'BOOLEAN',
  isNonResponsive: 'BOOLEAN',
  isNotAttending: 'BOOLEAN',
  isResigned: 'BOOLEAN',
  isVacation: 'BOOLEAN',
  isWorkTrip: 'BOOLEAN',
};

const PERSON_FIELDS_ACCEPTED = {
  dateStarted: 'DATE',
  firstName: 'STRING',
  firstNamePreferred: 'STRING',
  emailOfficial: 'STRING',
  emailPersonal: 'STRING',
  emailPreferred: 'STRING',
  hoursPerWeekEstimate: 'INTEGER',
  jazzHrUrl: 'STRING',
  jobTitle: 'STRING',
  lastName: 'STRING',
  linkedInUrl: 'STRING',
  location: 'STRING',
  password: 'STRING',
  stateCode: 'STRING',
  zipCode: 'STRING',
};
const PERSON_FIELDS_ACCEPTED_ADMIN = {
  ...PERSON_FIELDS_ACCEPTED,
  ...{
    isAdmin: 'BOOLEAN',
    isHRAdmin: 'BOOLEAN',
    isHROfferAdmin: 'BOOLEAN',
    isHRGeneralist1: 'BOOLEAN',
    isHRGeneralist2: 'BOOLEAN',
    isHiringManager: 'BOOLEAN',
    isIntern: 'BOOLEAN',
    isTeamLead: 'BOOLEAN',
    statusActive: 'BOOLEAN',
    statusOnLeave: 'BOOLEAN',
    statusResigned: 'BOOLEAN',
  },
};

const ACCESS_RIGHTS_OPTIONS = [
  'canAddPerson', 'canAddPersonDataAnyone', 'canAddTeam',
  'canAddTeamMemberAnyTeam', 'canCreateOrgEmailAccount', 'canDoAnythingIsAdmin',
  'canEditPermissionsAnyone', 'canEditPersonAnyone',
  'canEditTeamAnyTeam',
  'canRemoveTeam', 'canRemoveTeamMemberAnyTeam',
  'canSendOfferLetter', 'canSendOfferQuestionnaire',
  'canViewSystemSettings', 'canViewTeamMembersAnyTeam',
];

const getAccessRightsForPerson = (person) => {
  const accessRightsDict = {};
  if (!person || !person.id) {
    console.error('Undefined person in getAccessRightsForPerson');
    return accessRightsDict;
  }
  // Add all ACCESS_RIGHTS_OPTIONS to the accessRightsDict with false values
  for (let i = 0; i < ACCESS_RIGHTS_OPTIONS.length; i++) {
    accessRightsDict[ACCESS_RIGHTS_OPTIONS[i]] = false;
  }
  // If person is an admin, set all access rights to true
  if (person.isAdmin) {
    for (let i = 0; i < ACCESS_RIGHTS_OPTIONS.length; i++) {
      accessRightsDict[ACCESS_RIGHTS_OPTIONS[i]] = true;
    }
  } else {
    if (person.isHRAdmin) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canEditPersonAnyone = true;
      accessRightsDict.canRemoveTeamMemberAnyTeam = true;
      accessRightsDict.canSendOfferLetter = true;
      accessRightsDict.canViewSystemSettings = true;
      accessRightsDict.canViewTeamMembersAnyTeam = true;
    } else if (person.isHRGeneralist2) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canEditPersonAnyone = true;
      accessRightsDict.canEditTeamAnyTeam = true;
      // accessRightsDict.canRemoveTeamMemberAnyTeam = true;
      accessRightsDict.canViewSystemSettings = true;
      accessRightsDict.canViewTeamMembersAnyTeam = true;
    } else if (person.isHRGeneralist1) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
      accessRightsDict.canAddTeamMemberAnyTeam = true;
      accessRightsDict.canViewSystemSettings = true;
    }
    if (person.isHROfferAdmin) {
      accessRightsDict.canSendOfferLetter = true;
    }
    if (person.isHiringManager) {
      accessRightsDict.canAddPerson = true;
      accessRightsDict.canAddPersonDataAnyone = true;
    }
  }
  return accessRightsDict;
};

function removeProtectedFieldsFromPerson (person) {
  const modifiedPerson = { ...person };
  delete modifiedPerson.emailVerificationToken;
  delete modifiedPerson.password;
  delete modifiedPerson.passwordResetExpires;
  delete modifiedPerson.passwordResetToken;
  return modifiedPerson;
}

function removeProtectedFieldsFromPersonAway (personAway) {
  const modifiedPersonAway = { ...personAway };
  return modifiedPersonAway;
}

async function findPersonById (id, includeAllData = false) {
  const person = await prisma.person.findUnique({
    where: {
      id,
    },
  });
  if (!person) {    // If the person has not been stored yet, during person creation
    return {
      id: 0,
      personId: 0,
    };
  }
  let modifiedPerson;
  if (includeAllData) {
    modifiedPerson = person;
  } else {
    modifiedPerson = removeProtectedFieldsFromPerson(person);
  }
  modifiedPerson.personId = person.id;
  return modifiedPerson;
}

function extractPersonVariablesToChange (queryParams) {
  let keyWithoutToBeSaved = '';
  const updateDict = {};
  Object.entries(queryParams).forEach(([key, value]) => {
    // console.log('==== key:', key, ', value:', value);
    keyWithoutToBeSaved = key.replace('ToBeSaved', '');
    if (PERSON_FIELDS_ACCEPTED.includes(keyWithoutToBeSaved) && value) {
      if (queryParams && queryParams.get(`${keyWithoutToBeSaved}Changed`) === 'true') {
        updateDict[keyWithoutToBeSaved] = value;
      }
    }
  });
  return updateDict;
}

async function findPersonListByIdList (idList, includeAllData = false) {
  const personList = await prisma.person.findMany({
    where: {
      id: { in: idList },
    },
  });
  // console.log('findPersonListByIdList personList:', personList);
  let modifiedPerson = {};
  let modifiedPersonList = [];
  if (includeAllData) {
    modifiedPersonList = personList;
  } else {
    personList.forEach((person) => {
      modifiedPerson = removeProtectedFieldsFromPerson(person);
      modifiedPerson.personId = person.id;
      modifiedPersonList.push(modifiedPerson);
    });
  }
  // console.log('findPersonListByIdList modifiedPersonList:', modifiedPersonList);
  return modifiedPersonList;
}

async function findPersonListByParams (params = {}, includeAllData = false) {
  const personList = await prisma.person.findMany({
    where: params,
  });
  let modifiedPerson = {};
  let modifiedPersonList = [];
  if (includeAllData) {
    modifiedPersonList = personList;
  } else {
    personList.forEach((person) => {
      modifiedPerson = removeProtectedFieldsFromPerson(person);
      modifiedPerson.personId = person.id;
      modifiedPersonList.push(modifiedPerson);
    });
  }
  return modifiedPersonList;
}

async function findOnePerson (params, includeAllData = false) {   // Find one with array
  const person = await prisma.person.findUnique({
    where: params,
  });
  let modifiedPerson;
  if (includeAllData) {
    modifiedPerson = person;
  } else {
    modifiedPerson = removeProtectedFieldsFromPerson(person);
  }
  if (person) {    // allows us to check for the existence of a person, allows a null return
    modifiedPerson.personId = person.id;
  }
  return modifiedPerson;
}

async function deleteOne (id) {
  await prisma.person.delete({
    where: {
      id,
    },
  });
}

async function savePerson (person) {
  // console.log('savePerson person:', person?.id, person);
  const updatePerson = await prisma.person.update({
    where: {
      id: person.id,
    },
    data: person,
  });
  // console.log(updatePerson);
  return updatePerson;
}

async function savePersonAway (personAway) {
  // console.log('savePersonAway personAway:', personAway);
  const updatePersonAway = await prisma.personAway.update({
    where: {
      id: personAway.id,
    },
    data: personAway,
  });
  // console.log(updatePersonAway);
  return updatePersonAway;
}

async function updatePersonByPersonId (personId, person) {
  const updatePerson = await prisma.person.update({
    where: {
      personId,
    },
    data: person,
  });
  // console.log(updatePerson);
  return updatePerson;
}

function isoFutureDateDays (days) {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + days);
  return futureDate;
}

// For required fields that we want to include, even if not passed from the interface.
const personObjTemplate = {
  // birthdayMonthAndDay: '',
  // emailOfficial: '',
  // emailOfficialAlternate: '',
  // emailPersonal: '',
  // emailPersonalAlternate: '',
  // emailPreferred: '',
  firstName: '',
  // firstNamePreferred: '',
  // gender: '',
  // hoursPerWeekEstimate: 0,
  // hoursVolunteered: 0,
  // howLongAtOrg: 0,
  // jobTitle: '',
  lastName: '',
  // location: '',
  // staffKind: '',
  // stateCode: '',
  // uploadedImageUrlLarge: '',
  // uploadedImageUrlSmall: '',
  // zipCode: '',

  password: '',
  passwordResetToken: '',
  passwordResetExpires: isoFutureDateDays(365),
  emailVerificationToken: '',
  emailVerified: false,

  // bluesky: '',
  // facebookUrl: '',
  // githubUrl: '',
  // jazzHrUrl: '',
  // linkedInUrl: '',
  // portfolioUrl: '',
  // snapchat: '',
  // tokens: {},
  // twitch: '',
  // twitterHandle: '',
  // websiteUrl: '',
};

async function createPerson (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedPerson = Object.assign({}, personObjTemplate, updateDict);
  const person = await prisma.person.create({ data: mergedPerson });
  return person;
}

async function createPersonAway (updateDict) {
  const personAway = await prisma.personAway.create({ data: updateDict });
  return personAway;
}

async function comparePassword (person, candidatePassword, cb) {
  try {
    const verified = await bcrypt.verify(candidatePassword, person.password);
    cb(null, verified, person.password);
  } catch (err) {
    cb(err);
  }
}

module.exports = {
  PERSON_AWAY_FIELDS_ACCEPTED,
  PERSON_FIELDS_ACCEPTED,
  PERSON_FIELDS_ACCEPTED_ADMIN,
  comparePassword,
  createPerson,
  createPersonAway,
  deleteOne,
  extractPersonVariablesToChange,
  findOnePerson,
  findPersonById,
  findPersonListByIdList,
  findPersonListByParams,
  getAccessRightsForPerson,
  isoFutureDateDays,
  removeProtectedFieldsFromPerson,
  removeProtectedFieldsFromPersonAway,
  savePerson,
  savePersonAway,
  updatePersonByPersonId,
}; // Export the functions
