// src/services/nlpService.ts
import { pipeline, TextClassificationPipeline } from '@xenova/transformers';

let classifier: TextClassificationPipeline | undefined;

// Classify the input text using a pre-trained sentiment analysis model
export async function classifyCommand(text: string): Promise<any> {
  if (!classifier) {
    console.log("Loading classifier...");
    classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    console.log("Classifier loaded.");
  }
  const result = await classifier(text);
  return result;
}

// A simple rule-based parser (hybrid approach) to extract actions from the command
export function parseCommandHybrid(command: string): Array<any> {
  const actions: Array<any> = [];
  console.log('Processing command:', command);

  // Split by "and" or "then" to separate multiple actions
  const parts = command.split(/\b(?:and|then)\b/i);

  for (let part of parts) {
    part = part.trim();

    // Look for a "go to" command
    const urlMatch = part.match(/go to (https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      actions.push({ type: "goto", url: urlMatch[1] });
      continue;
    }

    // Look for "search for ..." command
    const searchForMatch = part.match(/search for (.+)/i);
    if (searchForMatch) {
      actions.push({ type: "search", query: searchForMatch[1].trim() });
      continue;
    }

    // Catch generic "search ..."
    const searchMatch = part.match(/search (.+)/i);
    if (searchMatch) {
      actions.push({ type: "search", query: searchMatch[1].trim() });
      continue;
    }
  }

  console.log('Extracted actions:', actions);
  return actions;
}

