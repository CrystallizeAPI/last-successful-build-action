import {
  setFailed,
  setOutput,
  getInput,
  debug,
  info,
  warning,
} from '@actions/core'
import { getOctokit } from '@actions/github'
import { getLastSuccessfulCiRunSha } from './get-last-successful-ci-run-sha'
import { Logger } from './util'
import { normalizeInput } from './normalize-input'

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

  try {
    const octokit = getOctokit(getInput('token'))
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/')
    const options = await normalizeInput(octokit, owner, repo)

    logger.info(
      options.mode === 'tags'
        ? `Getting SHA of last successful CI run for tags, ignoring tag ${options.ignore}.`
        : `Getting SHA of last successful CI run for branch ${options.branchName}.`,
    )

    const sha = await getLastSuccessfulCiRunSha(
      octokit,
      logger,
      owner,
      repo,
      options,
    )

    if (!sha) {
      warning(
        `Unable to determine SHA of last successful commit. Using fallback value "${options.fallback}".`,
      )
    }

    setOutput('sha', sha || options.fallback)
  } catch (e) {
    return setFailed(e instanceof Error ? e.message : JSON.stringify(e))
  }
}

main()
