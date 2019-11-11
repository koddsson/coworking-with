#!/usr/bin/env node

const {execSync, spawnSync} = require('child_process')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
const repoHookLocation = path.resolve(cwd, ".git/hooks/commit-msg")
const hookScript = path.resolve(path.dirname(require.main.filename), "scripts/commit-msg")

const configKey = 'coworking.coauthor'

let [...args] = process.argv.slice(2)

const errorCodes = {
  NO_ERROR: 0,
  ALREADY_COWORKING: 2,
  USAGE: 3,
  EXISTING_HOOK: 4,
  NOT_COWORKING: 5,
  NOT_IN_REPO: 6,
  COAUTHOR_NO_FOUND: 7
}

function showUsage() {
  console.log('coworking-with [-h] [--stop] <username>...')
  process.exit(errorCodes.USAGE)
}

if (args.includes('-h') || args.includes('--help')) {
  showUsage()
} else if (!fs.existsSync(path.resolve(cwd, ".git"))) {
  console.log("You aren't in a git repository")
  process.exit(errorCodes.NOT_IN_REPO)
} else if (args.includes('--stop')) {
  const {status} = spawnSync('git', ['config', configKey])
  if (status !== 0) {
    console.log("You weren't coworking!")
    process.exit(errorCodes.NOT_COWORKING)
  }
  execSync(`git config --unset-all ${configKey}`)
  fs.unlinkSync(repoHookLocation)
  console.log('Hope you had a good time!')
  process.exit(errorCodes.NO_ERROR)
} else {
  const {stdout, status} = spawnSync('git', ['config', '--get-all', configKey], {encoding: 'utf8'})
  if (status === 0) {
    console.log(`You are already working with ${stdout.split('\n').filter(x => x).join(', ')}`)
    process.exit(errorCodes.ALREADY_COWORKING)
  }

  if (args.length === 0) {
    showUsage()
  }

  if (fs.existsSync(repoHookLocation)) {
    // TODO: Create git hook docs.
    console.log('You are already have a `commit-msg` git hook. See [URL] for fixes.')
    process.exit(errorCodes.EXISTING_HOOK)
  }

  const coauthorMessages = []
  for (const coauthor of args) {
    const {stdout} = spawnSync('git', ['log', '--no-merges', '-1', '--author', coauthor, '--format=\'%an <%ae>\''], {encoding: 'utf8'})
    if (stdout) {
      coauthorMessages.push(`Coauthor '${coauthor}' will be attributed as ${stdout.trim()}.`)
    } else {
      missingAuthor = true
      console.log(`Coauthor '${coauthor}' was not found in git log.`)
    }
  }

  if (coauthorMessages.length === args.length) {
    fs.copyFileSync(hookScript, repoHookLocation)
    for (const coauthor of args) {
      spawnSync('git', ['config', '--add', configKey, coauthor])
    }
    console.log(coauthorMessages.join('\n'))
    console.log('Happy coworking!')
    process.exit(errorCodes.NO_ERROR)
  } else {
    console.log('Coworking session failed to start.')
    process.exit(errorCodes.COAUTHOR_NO_FOUND)
  }
}
