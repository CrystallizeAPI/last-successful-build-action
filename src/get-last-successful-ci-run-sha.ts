import { getWorkflowId } from './get-workflow-id'
import { Logger, OctokitInstance } from './util'
import { verifySha } from './verify-sha'
import { NormalizedOptions } from './normalize-input'

export const getLastSuccessfulCiRunSha = async (
  octokit: OctokitInstance,
  logger: Logger,
  owner: string,
  repo: string,
  options: NormalizedOptions,
): Promise<string | undefined> => {
  const workflowId = await getWorkflowId(octokit, owner, repo, options.workflow)

  logger.debug(`ID for workflow "${options.workflow}" is ${workflowId}`)

  if (!workflowId) {
    throw new WorkflowNotFoundError(options.workflow)
  }

  const getSha = (branchOrTag: string) =>
    getFirstSuccessfulRunForBranch(
      octokit,
      logger,
      owner,
      repo,
      workflowId,
      options.verify,
      branchOrTag,
    )

  if (options.mode === 'tags') {
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listTags, {
      owner,
      repo,
    })

    for await (const response of iterator) {
      for (const tag of response.data) {
        if (tag.name === options.ignore) {
          continue
        }

        const sha = await getSha(tag.name)

        if (sha) {
          return sha
        }
      }
    }

    logger.warning('No successful CI runs found for any tags.')

    return
  }

  return await getSha(options.branchName)
}

const getFirstSuccessfulRunForBranch = async (
  octokit: OctokitInstance,
  logger: Logger,
  owner: string,
  repo: string,
  workflowId: number,
  verify: boolean,
  branch: string,
): Promise<string | undefined> => {
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
