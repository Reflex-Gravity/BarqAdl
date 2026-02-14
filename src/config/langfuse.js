const { Langfuse } = require('langfuse');

let langfuse = null;

const getLangfuse = () => {
  if (!langfuse) {
    langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    });
  }
  return langfuse;
};

const shutdownLangfuse = async () => {
  if (langfuse) {
    await langfuse.shutdownAsync();
  }
};

module.exports = { getLangfuse, shutdownLangfuse };
