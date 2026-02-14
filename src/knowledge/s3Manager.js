// S3 document management for Bedrock Knowledge Base
// For hackathon, this is a placeholder — skills are stored locally in /data/skills/

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
  }
  return s3Client;
};

const uploadSkillsToS3 = async (domain, skills) => {
  if (!process.env.S3_BUCKET) return null;

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `skills/${domain}/${domain}-skills.json`,
      Body: JSON.stringify(skills, null, 2),
      ContentType: 'application/json',
    });
    await client.send(command);
    return `s3://${process.env.S3_BUCKET}/skills/${domain}/`;
  } catch (e) {
    console.error(`[S3] Upload failed for ${domain}:`, e.message);
    return null;
  }
};

module.exports = { uploadSkillsToS3 };
