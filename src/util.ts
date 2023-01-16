import { getOctokit } from '@actions/github'

export type LogFn = (msg: string) => void

export type Logger = {
  debug: LogFn
  info: LogFn
  warning: LogFn
}

export type OctokitInstance = ReturnType<typeof getOctokit>
