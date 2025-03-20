import { Static, Type } from '@sinclair/typebox';
import { WithLogger } from '../logger';
import { getPrompt, setPromptByKey } from '../twitter/prompts';

export const PatchPrompt = Type.Object({
  value: Type.String(),
});
export type PatchPrompt = Static<typeof PatchPrompt>;

// Given a string, it extracts all the template variables
function extractTemplateVariableNames(content: string) {
  const template = content.match(/{{(.*?)}}/g);
  const variableNames = new Set<string>();

  if (template) {
    template.forEach(t => {
      const key = t.replace(/{{|}}/g, '');
      variableNames.add(key);
    });
  }

  return Array.from(variableNames);
}

export async function patchPrompt(
  { value, key }: PatchPrompt & { key: string },
  logger: WithLogger,
) {
  const log = logger.child({
    module: 'patchPrompt',
  });

  const currentPrompt = await getPrompt(key);

  if (currentPrompt === value) {
    log.warn(
      {
        active: currentPrompt,
        proposed: value,
      },
      'no change in prompt',
    );
    return {
      status: 'no change',
    };
  }

  // validate variables in the current prompt
  const currentVariables = extractTemplateVariableNames(currentPrompt);
  const proposedVariables = extractTemplateVariableNames(value);

  // check if the proposed prompt has the same variables as the current prompt
  if (currentVariables.length !== proposedVariables.length) {
    log.error(
      {
        currentVariables,
        proposedVariables,
      },
      'variable count mismatch',
    );
    throw new Error('Variable count mismatch');
  }

  // check if the proposed prompt has the same variables as the current prompt
  if (currentVariables.some(v => !proposedVariables.includes(v))) {
    log.error(
      {
        currentVariables,
        proposedVariables,
      },
      'variable name mismatch',
    );
    throw new Error('Variable name mismatch');
  }

  // update the prompt
  return setPromptByKey({ key, value }, logger);
}
