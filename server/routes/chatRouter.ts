import { Router } from 'express';
import { processAgentMessage } from '../agent/inventoryAgent.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A non-empty "message" string is required.',
      });
    }

    const agentResult = await processAgentMessage(message, history || []);

    res.json({
      success: true,
      data: agentResult,
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Agent failed to process message',
    });
  }
});
