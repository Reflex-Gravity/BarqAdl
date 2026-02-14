const { readJSON, writeJSON } = require('../config/db');

const getSkills = (domain) => {
  const data = readJSON(`skills/${domain}.json`);
  return data?.skills || [];
};

const saveSkills = (domain, skillsData) => {
  writeJSON(`skills/${domain}.json`, skillsData);
};

const addSkill = (domain, skill) => {
  const data = readJSON(`skills/${domain}.json`) || { domain, skills_found: 0, skills: [] };
  data.skills.push(skill);
  data.skills_found = data.skills.length;
  writeJSON(`skills/${domain}.json`, data);
  return data;
};

const getSkillCount = (domain) => {
  const data = readJSON(`skills/${domain}.json`);
  return data?.skills?.length || 0;
};

module.exports = { getSkills, saveSkills, addSkill, getSkillCount };
