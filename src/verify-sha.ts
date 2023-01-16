import { Logger } from './util'
import { execSync } from 'node:child_process'

let repoShas: string[] | undefined

export const verifySha = async (
  logger: Logger,
  sha: string,
): Promise<boolean> => {
  if (!repoShas) {
    try {
      const cmd = `git log --format=format:%H`
      logger.info(`Getting list of SHAs in repo via command "${cmd}"`)

      repoShas = execSync(cmd).toString().trim().split('\n')

      logger.debug(`Retrieved ${repoShas.length} SHAs`)
    } catch (e: any) {
      repoShas = []
      logger.warning(
        `Error while attempting to get list of SHAs: ${e?.message}`,
      )

      return false
    }
  }

  logger.info(`Looking for SHA ${sha} in repo SHAs`)

  return repoShas.includes(sha)
}
