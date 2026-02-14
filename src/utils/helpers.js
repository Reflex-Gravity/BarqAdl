const { v4: uuidv4 } = require('uuid');

const generateId = () => uuidv4();

const safeJsonParse = (text) => {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    return JSON.parse(text);
  } catch (e) {
    // Try to find JSON object in the text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { generateId, safeJsonParse, sleep };
