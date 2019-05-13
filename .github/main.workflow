workflow "Publish to GPR" {
  on = "release"
  resolves = ["Publish"]
}

action "Publish" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  env = {
    NPM_REGISTRY_URL = "https://npm.pkg.github.com"
  }
  secrets = ["NPM_AUTH_TOKEN"]
}
