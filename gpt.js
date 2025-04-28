import OpenAI from 'openai';
const pollingIntervals = new Map();

export async function createThread(apiKey) {
  try {
    const openai = new OpenAI({ apiKey });
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    return null;
  }
}

export async function addMessage(apiKey, threadId, message) {
  try {
    const openai = new OpenAI({ apiKey });
    return await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
  } catch (error) {
    return null;
  }
}

export async function runAssistant(apiKey, threadId, assistantId) {
  try {
    const openai = new OpenAI({ apiKey });
    return await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
  } catch (error) {
    return null;
  }
}

export async function checkStatus(apiKey, threadId, runId) {
  try {
    const openai = new OpenAI({ apiKey });
    const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);
    return runObject.status;
  } catch (error) {
    return null;
  }
}

export async function getLatestMessage(apiKey, threadId) {
  try {
    const openai = new OpenAI({ apiKey });
    const messagesList = await openai.beta.threads.messages.list(threadId);
    return messagesList.data[0]?.content?.[0]?.text?.value || null;
  } catch (error) {
    return null;
  }
}