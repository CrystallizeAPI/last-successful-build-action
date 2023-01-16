import { getWorkflowId } from './get-workflow-id'
import { Logger, OctokitInstance } from './util'
import { verifySha } from './verify-sha'

export const getLastSuccessfulCiRunSha = async (
  octokit: OctokitInstance,
  logger: Logger,
  owner: string,
  repo: string,
  workflowName: string,
  branch: string,
  verify: boolean,
): Promise<string | undefined> => {
  const workflowId = await getWorkflowId(octokit, owner, repo, workflowName)

  logger.debug(`ID for workflow "${workflowName}" is ${workflowId}`)

  if (!workflowId) {
    throw new WorkflowNotFoundError(workflowName)
  }

  const iterator = octokit.paginate.iterator(
    octokit.rest.actions.listWorkflowRuns,
    {
      owner,
      repo,
      ...(branch && branch.trim().length > 0 && { branch: branch.trim() }),
      status: 'success',
      workflow_id: workflowId,
      per_page: 50,
    },
  )

  for await (const response of iterator) {
    const runs = response.data.sort(
      (r1, r2) =>
        new Date(r2.created_at).getTime() - new Date(r1.created_at).getTime(),
    )

    for (const run of runs) {
      const sha = run.head_sha

      if (verify && !(await verifySha(logger, sha))) {
        logger.warning(`Failed to verify commit ${run.head_sha}. Skipping.`)
        continue
      }

      logger.info(
        verify
          ? `Commit ${run.head_sha} from run ${run.html_url} verified as last successful CI run.`
          : `Using ${run.head_sha} from run ${run.html_url} as last successful CI run.`,
      )

      return sha
    }
  }
}

export class WorkflowNotFoundError extends Error {
  constructor(name: string) {
    super(`No workflow id found for workflow named "${name}"`)
  }
}
