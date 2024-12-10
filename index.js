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
    res.status(400).json({ message: 'Error: 400' });
    return;
  }

  const messageResponse = await addMessage(apiKey, threadId, message);
  if (!messageResponse) {
    res.status(500).json({ message: 'Error adding message.' });
    return;
  }

  const runResponse = await runAssistant(apiKey, threadId, assistantId);
  if (!runResponse) {
    res.status(500).json({ message: 'Error running assistant.' });
    return;
  }

  const runId = runResponse.id;

  const intervalId = setInterval(async () => {
    const status = await checkStatus(apiKey, threadId, runId);

    if (status === 'completed') {
      clearInterval(intervalId);
      pollingIntervals.delete(threadId);

      const latestMessage = await getLatestMessage(apiKey, threadId);
      res.json({ message: latestMessage || 'No message content available.' });
    }
  }, 5000);

  pollingIntervals.set(threadId, intervalId);

  req.on('close', () => {
    if (pollingIntervals.has(threadId)) {
      clearInterval(pollingIntervals.get(threadId));
      pollingIntervals.delete(threadId);
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
