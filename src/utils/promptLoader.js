const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '../../prompts');

const loadPrompt = (promptName) => {
  const filePath = path.join(PROMPTS_DIR, `${promptName}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt file not found: ${promptName}.md`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract the system prompt between ``` markers after "## System Prompt"
  const match = content.match(/## System Prompt\s*\n\s*```\n([\s\S]*?)```/);
  if (match) return match[1].trim();

  // Fallback: first code block
  const fallback = content.match(/```\n([\s\S]*?)```/);
  if (fallback) return fallback[1].trim();

  // Last fallback: everything after "## System Prompt"
  const parts = content.split('## System Prompt');
  return parts.length > 1 ? parts[1].trim() : content;
};

module.exports = { loadPrompt };
