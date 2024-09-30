import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const app = express();
const port = process.env.por || 3001;
let pollingInterval;

async function createThread(apiKey) {
  const thread = await openai.beta.threads.create()
  const openai = new OpenAI({
    apiKey
  });

  return thread;
}

async function addMessage(apiKey, threadId, message) {
  const openai = new OpenAI({
    apiKey
  });

  const response = await openai.beta.threads.messages.create(
    threadId,
    {
    role: 'user',
    content: message
  }
);
  return response;
}

async function runAssistant(apiKey, threadId, assistantId) {
  const openai = new OpenAI({
    apiKey
  });

  const response = await openai.beta.threads.runs.create(threadId,{
    assistant_id: assistantId,
  });
  return response;
}

async function checkingStatus(res, apiKey, threadId, runId) {
  const openai = new OpenAI({
    apiKey,
  });

  const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);

  const status = runObject.status;
  if (status === 'completed') {
    clearInterval(pollingInterval);

    const messagesList = await openai.beta.threads.messages.list(threadId);
    const message = messagesList.data[0].content;

    res.json({ message: message[0].text.value });
  }
}

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/thread', (req, res) => {
  const { apiKey } = req.body;

  createThread(apiKey).then((thread) => {
    res.json({ threadId: thread.id });
  });
})

app.post('/message', (req, res) => {
  const { apiKey, threadId, assistantId, message } = req.body;

  addMessage(apiKey, threadId, message).then(() => {
    runAssistant(apiKey, threadId, assistantId).then((response) => {
      const runId = response.id;
      pollingInterval = setInterval(() => checkingStatus(res, apiKey, threadId, runId), 5000);
    });
  });
});

app.listen(port, () => {
  console.log('Running server...');
});