import express, { Request, Response } from 'express';
import { extractData } from '../services/extractService';

const router = express.Router();

// POST /extract
router.post('/', async (req: Request, res: Response): Promise<any> => {
  const { url, selectors } = req.body;
  if (!url || !selectors || typeof selectors !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid url or selectors' });
  }
  try {
    const data = await extractData(url, selectors);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Extraction failed' });
  }
});

export { router as extract };
