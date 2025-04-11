// src/routes/interact.ts
import { Router, Request, Response } from 'express';
import { classifyCommand, parseCommandHybrid } from '../services/nlpService';
// Uncomment the next line if you want to execute automation actions
import { executeAutomation } from '../services/automationService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { command } = req.body as { command: string };
    console.log("req.body", req.body)

    // Use Hugging Face transformer to classify the command
    const classification = await classifyCommand(command);

    // Use a simple hybrid parser to extract actions
    const actions = parseCommandHybrid(command);

    // Optionally, execute the automation actions using Playwright
    const automationResult = await executeAutomation(actions);

    res.json({ success: true, classification, actions, automationResult });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process command', details: err.message });
  }
});

export { router as interact };
