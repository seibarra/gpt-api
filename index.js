import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 3001;

const pollingIntervals = new Map();

async function createThread(apiKey) {
  try {
    const openai = new OpenAI({ apiKey });
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    return null;
  }
}

async function addMessage(apiKey, threadId, message) {
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

async function runAssistant(apiKey, threadId, assistantId) {
  try {
    const openai = new OpenAI({ apiKey });
    return await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });
  } catch (error) {
    return null;
  }
}

async function checkStatus(apiKey, threadId, runId) {
  try {
    const openai = new OpenAI({ apiKey });
    const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);
    return runObject.status;
  } catch (error) {
    return null;
  }
}

async function getLatestMessage(apiKey, threadId) {
  try {
    const openai = new OpenAI({ apiKey });
    const messagesList = await openai.beta.threads.messages.list(threadId);
    return messagesList.data[0]?.content?.[0]?.text?.value || null;
  } catch (error) {
    return null;
  }
}

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/thread', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    res.status(400).json({ threadId: '' });
    return;
  }

  const threadId = await createThread(apiKey);
  res.json({ threadId });
});

app.post('/message', async (req, res) => {
  const { apiKey, threadId, assistantId, message } = req.body;

  if (!apiKey || !threadId || !assistantId || !message) {
    return res.status(400).json({ message: 'Error: 400' });
  }

  const messageResponse = await addMessage(apiKey, threadId, message);
  if (!messageResponse) {
    return res.status(500).json({ message: 'Error: 500' });
  }

  const runResponse = await runAssistant(apiKey, threadId, assistantId);
  if (!runResponse) {
    return res.status(500).json({ message: 'Error: 500' });
  }

  const runId = runResponse.id;

  try {
    let status;
    do {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      status = await checkStatus(apiKey, threadId, runId);
    } while (status !== 'completed');

    const latestMessage = await getLatestMessage(apiKey, threadId);
    return res.json({ message: latestMessage || 'Error de conexión, vuelva a intentarlo más tarde.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error: 500' });
  }
});


app.listen(port, () => {
  console.log(`Server running.`);
});
