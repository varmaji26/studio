import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = configureGenkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export default ai;
