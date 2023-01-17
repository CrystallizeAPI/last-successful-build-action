import { OctokitInstance } from './util'
import { getBooleanInput, getInput } from '@actions/core'

export const normalizeInput = async (
  octokit: OctokitInstance,
  owner: string,
  repo: string,
): Promise<NormalizedOptions> => {
  const tagsOnly = getBooleanInput('tagsOnly')
  const branch = getInput('branch', { trimWhitespace: true })

  if (!branch) {
    throw new NoBranchNameSpecifiedError()
  }

  return {
    workflow: getInput('workflow', { trimWhitespace: true }),
    verify: getBooleanInput('verify'),
    fallback: await determineFallbackValue(
      octokit,
      owner,
      repo,
      tagsOnly,
      branch,
    ),
    ...(tagsOnly
      ? {
          mode: 'tags',
          ignore: branch,
        }
      : {
          mode: 'branch',
          branchName: branch,
        }),
  }
}

const determineFallbackValue = async (
  octokit: OctokitInstance,
  owner: string,
  repo: string,
  tagsOnly: boolean,
  ignoredTag: string,
): Promise<string> => {
  let fallback: string = getInput('fallback')?.trim()

  if (fallback) {
    return fallback
  }

  if (!tagsOnly) {
    return 'origin/main'
  }

  const iterator = octokit.paginate.iterator(octokit.rest.repos.listTags, {
    owner,
    repo,
  })

  for await (const result of iterator) {
    for (const t of result.data) {
      if (t.name !== ignoredTag) {
        return t.name
      }
    }
  }

  return process.env.GITHUB_SHA as string
}

export class NoBranchNameSpecifiedError extends Error {
  constructor() {
    super(
      'Branch name needs to be a non empty string, unless tagsOnly is set to true.',
    )
  }
}

type BranchModeInput = {
  mode: 'branch'
  branchName: string
}

type TagModeInput = {
  mode: 'tags'
  ignore: string
}

export type NormalizedOptions = {
  workflow: string
  verify: boolean
  fallback: string
} & (BranchModeInput | TagModeInput)
