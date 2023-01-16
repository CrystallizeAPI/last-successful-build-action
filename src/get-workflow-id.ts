import { OctokitInstance } from './util'

export const getWorkflowId = async (
  octokit: OctokitInstance,
  owner: string,
  repo: string,
  workflowName: string,
): Promise<number | undefined> => {
  const normalizedName = workflowName.toLowerCase()
  const iterator = octokit.paginate.iterator(
    octokit.rest.actions.listRepoWorkflows,
    { owner, repo },
  )

  for await (const response of iterator) {
    for (const workflow of response.data) {
      if (workflow.name.toLowerCase() === normalizedName) {
        return workflow.id
      }
    }
  }
}
