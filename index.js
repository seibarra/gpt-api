import express from 'express';
import bodyParser from 'body-parser';
import { addMessage, checkStatus, createThread, getLatestMessage, runAssistant } from './gpt.js';
import extraerMensajesNuevosConInicio from './extraerMensajes.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Rutas

app.post('/api/extraer-mensaje', (req, res) => {
  const { texto_notificacion, new_data } = req.body;

  const mensajesNuevos = extraerMensajesNuevosConInicio(
    texto_notificacion,
    new_data
  );

  res.status(200).json({ mensajesNuevos });
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
