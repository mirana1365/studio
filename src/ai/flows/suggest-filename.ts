'use server';

/**
 * @fileOverview Filename suggestion flow.
 *
 * - suggestFilename - A function that suggests a filename based on the content of the file and a short description.
 * - SuggestFilenameInput - The input type for the suggestFilename function.
 * - SuggestFilenameOutput - The return type for the suggestFilename function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFilenameInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "The file to be uploaded, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('A short description of the file.'),
});
export type SuggestFilenameInput = z.infer<typeof SuggestFilenameInputSchema>;

const SuggestFilenameOutputSchema = z.object({
  suggestedFilename: z.string().describe('The suggested filename for the file.'),
});
export type SuggestFilenameOutput = z.infer<typeof SuggestFilenameOutputSchema>;

export async function suggestFilename(input: SuggestFilenameInput): Promise<SuggestFilenameOutput> {
  return suggestFilenameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFilenamePrompt',
  input: {schema: SuggestFilenameInputSchema},
  output: {schema: SuggestFilenameOutputSchema},
  prompt: `You are an expert at suggesting filenames for files. You will be provided with a file and a short description of the file.

  Based on the content of the file and the description, you will suggest a filename for the file.

  Description: {{{description}}}
  File: {{media url=fileDataUri}}

  Please suggest a filename for the file:
  `,
});

const suggestFilenameFlow = ai.defineFlow(
  {
    name: 'suggestFilenameFlow',
    inputSchema: SuggestFilenameInputSchema,
    outputSchema: SuggestFilenameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
