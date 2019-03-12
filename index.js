#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const coworkingFile = path.resolve(__dirname, ".coauthoring-with")
const repoHookLocation = path.resolve(__dirname, ".git/hooks/commit-msg")
const hookScript = path.resolve(path.dirname(require.main.filename), "scripts/commit-msg")

let [command, ...coauthors] = process.argv.slice(2)

const errorCodes = {
  NO_ERROR: 0,
  ALREADY_COWORKING: 2,
  USAGE: 3,
  EXISTING_HOOK: 4,
  NOT_COWORKING: 5
}

function showUsage() {
  console.log('Usage goes here')
  process.exit(errorCodes.USAGE)
}

if (command === 'start') {
  if (fs.existsSync(coworkingFile)) {
    coauthors = fs.readFileSync(path.resolve(__dirname, coworkingFile), 'UTF-8').split('\n')
    console.log(`You are already working with ${coauthors.join(',')}`)
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

  fs.symlinkSync(repoHookLocation, hookScript)
  fs.writeFileSync(coworkingFile, coauthors.join('\n'))
  console.log('Happy coworking!')
  process.exit(errorCodes.NO_ERROR)
} else if (command === 'stop') {
  if (!fs.existsSync(coworkingFile)) {
    console.log("You weren't coworking!")
    process.exit(errorCodes.NOT_COWORKING)
  }
  fs.unlinkSync(repoHookLocation)
  fs.unlinkSync(coworkingFile)
  console.log('Hope you had a good time!')
  process.exit(errorCodes.NO_ERROR)
} else {
  showUsage()
}
