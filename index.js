import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config();

const app = express();
const port = process.env.port || 3001;
let pollingInterval;

async function createThread(apiKey) {
  try {
    const openai = new OpenAI({
      apiKey
    });
    const thread = await openai.beta.threads.create()
    return thread.id;
  } catch (error) {
    return null
  }  
}

async function addMessage(apiKey, threadId, message) {
  try {
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
  } catch (error) {
    return null
  }
}

async function runAssistant(apiKey, threadId, assistantId) {
  try {
  const openai = new OpenAI({
    apiKey
  });

  const response = await openai.beta.threads.runs.create(threadId,{
    assistant_id: assistantId,
  });
  return response;
} catch (error) {
  return null
}
}

async function checkingStatus(res, apiKey, threadId, runId) {
  try {
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
  } catch (error) {
    res.json({ message: 'Error, vuelva a intentar más tarde.' });
  }
}

app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log('Request received');
  
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/thread', (req, res) => {
  const { apiKey } = req.body;

  if (apiKey === undefined) {
    res.json({ threadId: '' });
    return;
  }

  createThread(apiKey).then((threadId) => {
    res.json({ threadId });
  });
})

app.post('/message', (req, res) => {
  const { apiKey, threadId, assistantId, message } = req.body;

  if (apiKey === undefined || threadId === undefined || assistantId === undefined || message === undefined) {
    res.json({ message: 'Error: 400' });
    return;
  }

  addMessage(apiKey, threadId, message).then(() => {
    runAssistant(apiKey, threadId, assistantId).then((response) => {
      if (!response) {
        res.json({ message: 'Error, vuelva a intentar más tarde.' });
        return;
      }

      const runId = response.id;
      pollingInterval = setInterval(() => checkingStatus(res, apiKey, threadId, runId), 5000);
    });
  });
});

app.listen(port, () => {
  console.log('Running server...');
});