import {
  createKbEntry,
  deleteKbEntry,
  editKbEntry,
  getKbEntries,
} from './api/manual-kb';
import {
  createControlPlaneKbEntry,
  createOrganization,
  deleteControlPlaneKbEntry,
  editControlPlaneKbEntry,
  getControlPlaneKbEntries,
  getControlPlanePromptByKey,
  getControlPlanePromptKeys,
  getControlPlanePromptVersions,
  getOrganization,
  getOrgs,
  revertControlPlanePromptVersion,
  updateControlPlanePromptByKey,
} from './controlplane-api/router';
import { router } from './trpc';

export const appRouter = router({
  createKbEntry,
  editKbEntry,
  deleteKbEntry,
  getKbEntries,
  createOrganization,
  getOrganization,
  getControlPlanePromptKeys,
  getControlPlanePromptByKey,
  getOrgs,
  updateControlPlanePromptByKey,
  getControlPlanePromptVersions,
  revertControlPlanePromptVersion,
  getControlPlaneKbEntries,
  createControlPlaneKbEntry,
  editControlPlaneKbEntry,
  deleteControlPlaneKbEntry,
});

export type AppRouter = typeof appRouter;
