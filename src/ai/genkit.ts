import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { geminiPro } from '@genkit-ai/googleai';

export const ai = configureGenkit({
  plugins: [googleAI()],
  //   model: 'googleai/gemini-pro',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export default ai;
