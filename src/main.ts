import {
  setFailed,
  setOutput,
  getInput,
  debug,
  info,
  warning,
  getBooleanInput,
} from '@actions/core'
import { getOctokit } from '@actions/github'
import { getLastSuccessfulCiRunSha } from './get-last-successful-ci-run-sha'
import { Logger } from './util'

const logger: Logger = {
  debug,
  info,
  warning,
}

export const main = async (): Promise<void> => {
  if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_SHA) {
    setFailed(
      'GITHUB_REPOSITORY or GITHUB_SHA env vars not set. Are you running in GH Actions?',
    )

    return
  }

  const fallback = getInput('fallback')?.trim() || process.env.GITHUB_SHA

  try {
    const octokit = getOctokit(getInput('token'))
    const repository = process.env.GITHUB_REPOSITORY
    const [owner, repo] = repository.split('/')

    const sha = await getLastSuccessfulCiRunSha(
      octokit,
      logger,
      owner,
      repo,
      getInput('workflow'),
      getInput('branch'),
      getBooleanInput('verify'),
    )

    if (!sha) {
      warning(
        `Unable to determine SHA of last successful commit. Using fallback value "${fallback}".`,
      )
    }

    setOutput('sha', sha || fallback)
  } catch (e) {
    setFailed(e instanceof Error ? e.message : JSON.stringify(e))
  }
}

main()
