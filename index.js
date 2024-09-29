import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const { OPENAI_API_KEY } = process.env;
const app = express();
const port = process.env.port;
let pollingInterval;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

async function createThread() {
  const thread = await openai.beta.threads.create()
  return thread;
}

async function addMessage(threadId, message) {
  const response = await openai.beta.threads.messages.create(
    threadId,
    {
    role: 'user',
    content: message
  }
);
  return response;
}

async function runAssistant(threadId, assistantId) {
  const response = await openai.beta.threads.runs.create(threadId,{
    assistant_id: assistantId,
  });
  return response;
}

async function checkingStatus(res, threadId, runId) {
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
  createThread().then((thread) => {
    res.json({ threadId: thread.id });
  });
})

app.post('/message', (req, res) => {
  const { threadId, assistantId, message } = req.body;

  addMessage(threadId, message).then(() => {
    runAssistant(threadId, assistantId).then((response) => {
      const runId = response.id;
      pollingInterval = setInterval(() => checkingStatus(res, threadId, runId), 5000);
    });
  });
});

app.listen(port, () => {
  console.log('Running server...');
});