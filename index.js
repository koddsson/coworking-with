#!/usr/bin/env node

const {execSync, spawnSync} = require('child_process')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
const repoHookLocation = path.resolve(cwd, ".git/hooks/commit-msg")
const hookScript = path.resolve(path.dirname(require.main.filename), "scripts/commit-msg")

const configKey = 'coworking.coauthor'

let [command, ...coauthors] = process.argv.slice(2)

const errorCodes = {
  NO_ERROR: 0,
  ALREADY_COWORKING: 2,
  USAGE: 3,
  EXISTING_HOOK: 4,
  NOT_COWORKING: 5,
  NOT_IN_REPO: 6
}

function showUsage() {
  console.log('coworking-with [-h] (start|stop) <username>...')
  process.exit(errorCodes.USAGE)
}

if (command === 'help' || command === '-h' || command === '--help') {
  showUsage()
} else if (!fs.existsSync(path.resolve(cwd, ".git"))) {
  console.log("You aren't in a git repository")
  process.exit(errorCodes.NOT_IN_REPO)
} else if (command === 'start') {
  const {stdout, status} = spawnSync('git', ['config', '--get-all', configKey], {encoding: 'utf8'})
  if (status === 0) {
    console.log(`You are already working with ${stdout.split('\n').filter(x => x).join(', ')}`)
    process.exit(errorCodes.ALREADY_COWORKING)
  }

  if (coauthors.length === 0) {
    showUsage()
  }
  
  if (fs.existsSync(repoHookLocation)) {
    // TODO: Create git hook docs.
    console.log('You are already have a `commit-msg` git hook. See [URL] for fixes.')
    process.exit(errorCodes.EXISTING_HOOK)
  }

  fs.copyFileSync(hookScript, repoHookLocation)
  for (const coauthor of coauthors) {
    spawnSync('git', ['config', '--add', configKey, coauthor])
  }
  console.log('Happy coworking!')
  process.exit(errorCodes.NO_ERROR)
} else if (command === 'stop') {
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
  showUsage()
}
