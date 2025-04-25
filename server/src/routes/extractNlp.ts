import express, { Request, Response } from 'express';
import { extractData } from '../services/extractService';
import { parseExtractPrompt } from '../services/extractNlpService';

const router = express.Router();

// POST /extract-nlp
router.post('/', async (req: Request, res: Response): Promise<any> => {
  // Accept either 'command' or 'prompt' for flexibility
  const command = req.body.command || req.body.prompt;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid command or prompt' });
  }
  try {
    const { url, selectors } = parseExtractPrompt(command);
    if (!url || !selectors) {
      return res.status(400).json({ error: 'Could not parse command. Please specify a URL and fields.' });
    }
    const data = await extractData(url, selectors);
    res.json({ data, parsed: { url, selectors } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
});

// Export the router correctly
const extractNlp = router;
export default extractNlp;
