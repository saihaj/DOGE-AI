import { z } from 'zod';
import { WithLogger } from '../logger';

const FLY_APP_TOKEN = (() => {
  if (!process.env.FLY_APP_TOKEN) {
    throw new Error('FLY_APP_TOKEN is not defined');
  }
  return process.env.FLY_APP_TOKEN;
})();

const API_BASE = 'https://api.machines.dev/v1';
const APP_NAME = 'dogeai-agent';
const API_KEY = `Bearer ${FLY_APP_TOKEN}`;

const MachinesResponse = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    region: z.string(),
    instance_id: z.string(),
  }),
);

async function getMachineList(log: WithLogger) {
  const res = await fetch(`${API_BASE}/apps/${APP_NAME}/machines`, {
    method: 'GET',
    headers: { authorization: API_KEY },
  });

  if (!res.ok) {
    const message = await res.text();
    log.error({ message }, 'Failed to fetch machines');
    throw new Error(`Failed to fetch machine: ${res.statusText} - ${message}`);
  }

  const data = await res.json();
  const parsedData = await MachinesResponse.safeParseAsync(data);
  if (!parsedData.success) {
    log.error({ data, errors: parsedData.error }, 'Failed to parse machines');
    throw new Error(`Failed to parse machines: ${parsedData.error}`);
  }

  return parsedData.data;
}

export async function restartMachines(log: WithLogger) {
  const machines = await getMachineList(log);

  log.info({ machines }, 'got machines');

  for (const machine of machines) {
    const res = await fetch(
      `${API_BASE}/apps/${APP_NAME}/machines/${machine.id}/restart`,
      {
        method: 'POST',
        headers: { authorization: API_KEY },
      },
    );

    if (!res.ok) {
      const message = await res.text();
      log.error(
        { machine },
        `Failed to restart machine ${machine.name}: ${message}`,
      );
      throw new Error(`Failed to restart machine ${machine.name}: ${message}`);
    }

    log.info({ machine }, `scheduled restart for machine ${machine.name}`);

    const statusRes = await fetch(
      `${API_BASE}/apps/${APP_NAME}/machines/${machine.id}/wait?state=started`,
      {
        method: 'GET',
        headers: { authorization: API_KEY },
      },
    );

    if (!statusRes.ok) {
      const message = await statusRes.text();
      log.error(
        { machine },
        `Failed to wait for machine status ${machine.name}: ${message}`,
      );
      throw new Error(
        `Failed to wait for machine status ${machine.name}: ${message}`,
      );
    }

    log.info({ machine }, `machine ${machine.name} is started`);
  }
}
