import { IS_LOCAL } from '@/lib/const';
import { z } from 'zod';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FLY_APP_TOKEN = (() => {
  if (!process.env.FLY_APP_TOKEN) {
    throw new Error('FLY_APP_TOKEN is not defined');
  }
  return process.env.FLY_APP_TOKEN;
})();
export const CF_AUDIENCE = (() => {
  if (!IS_LOCAL) return '';
  if (!process.env.CF_AUDIENCE) {
    throw new Error('CF_AUDIENCE is not set in your .env');
  }
  return process.env.CF_AUDIENCE;
})();
export const CF_TEAM_DOMAIN = (() => {
  if (!IS_LOCAL) return '';
  if (!process.env.CF_TEAM_DOMAIN) {
    throw new Error('CF_TEAM_DOMAIN is not set in your .env');
  }
  return process.env.CF_TEAM_DOMAIN;
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

async function getMachineList() {
  const res = await fetch(`${API_BASE}/apps/${APP_NAME}/machines`, {
    method: 'GET',
    headers: { authorization: API_KEY },
  });

  if (!res.ok) {
    const message = await res.text();
    console.error({ message }, 'Failed to fetch machines');
    throw new Error(`Failed to fetch machine: ${res.statusText} - ${message}`);
  }

  const data = await res.json();
  const parsedData = await MachinesResponse.safeParseAsync(data);
  if (!parsedData.success) {
    console.error(`Failed to parse machines: ${parsedData.error}`);
    throw new Error(`Failed to parse machines: ${parsedData.error}`);
  }

  return parsedData.data;
}

async function restartMachines() {
  const machines = await getMachineList();

  console.log({ machines });

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
      console.error(`Failed to restart machine ${machine.name}`, message);
      throw new Error(`Failed to restart machine ${machine.name}: ${message}`);
    }

    console.log(`Scheduled restart for machine ${machine.name}`);

    const statusRes = await fetch(
      `${API_BASE}/apps/${APP_NAME}/machines/${machine.id}/wait?state=started`,
      {
        method: 'GET',
        headers: { authorization: API_KEY },
      },
    );

    if (!statusRes.ok) {
      const message = await statusRes.text();
      console.error('Failed to wait for machine status', machine.name, message);
      throw new Error(
        `Failed to wait for machine status ${machine.name}: ${message}`,
      );
    }

    console.log(`Machine ${machine.name} is started`);
  }
}

export async function POST(request: Request) {
  if (!IS_LOCAL) {
    const token = request.headers.get('cf-authorization-token');
    // Make sure that the incoming request has our token header
    if (!token || typeof token !== 'string') {
      console.error(`missing required cf authorization token`);
      return Response.json(
        { message: 'missing required cf authorization token' },
        { status: 403 },
      );
    }

    // Your CF Access team domain
    const CERTS_URL = `${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`;
    const JWKS = createRemoteJWKSet(new URL(CERTS_URL));

    try {
      const result = await jwtVerify(token, JWKS, {
        issuer: CF_TEAM_DOMAIN,
        audience: CF_AUDIENCE,
      });
      console.log({ result }, 'valid cf authorization token');
    } catch (error) {
      console.error(`invalid cf authorization token ${error}`);
      return Response.json(
        { message: 'invalid cf authorization token' },
        { status: 403 },
      );
    }
  }

  try {
    await restartMachines();
    return Response.json({ message: 'Restarted machines' }, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 },
    );
  }
}
