#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const cwd = process.cwd();
const repoHookLocation = path.resolve(cwd, ".git/hooks/commit-msg");
const hookScript = path.resolve(
  path.dirname(require.main.filename),
  "scripts/commit-msg"
);
const dummyPackageJSON = path.resolve(
  path.dirname(require.main.filename),
  "scripts/dummy-package.json"
);

const configKey = "coworking.coauthor";

let [...args] = process.argv.slice(2);

const errorCodes = {
  NO_ERROR: 0,
  ALREADY_COWORKING: 2,
  USAGE: 3,
  EXISTING_HOOK: 4,
  NOT_COWORKING: 5,
  NOT_IN_REPO: 6,
  COAUTHOR_NO_FOUND: 7,
};

function showUsage() {
  console.log("coworking-with [-h] [--stop] <username>...");
  process.exit(errorCodes.USAGE);
}

async function getUserInfoFromGitHub(username) {
  const response = await fetch(
    `https://api.github.com/search/commits?q=author:${username}&user:${username}&per_page=1`,
    { headers: { Accept: "application/vnd.github.cloak-preview" } }
  );
  const json = await response.json();
  return json.items[0] && json.items[0].commit.author;
}

async function generateSignature(coauthor) {
  // First try to get the signature from the git log.
  const { stdout } = spawnSync(
    "git",
    ["log", "--no-merges", "-1", "--author", coauthor, "--format=%an <%ae>"],
    { encoding: "utf8" }
  );
  if (stdout) {
    return stdout.trim();
  }

  // Try to get the signature from the GitHub API.
  try {
    const { name, email } = await getUserInfoFromGitHub(coauthor);
    return `${name} <${email}>`;
  } catch (error) {
    console.log(
      "An error occured when searching for the user in the GitHub API"
    );
  }
}

async function main() {
  const { stdout, status } = spawnSync(
    "git",
    ["config", "--get-all", configKey],
    { encoding: "utf8" }
  );
  if (status === 0) {
    console.log(
      `You are already working with ${stdout
        .split("\n")
        .filter((x) => x)
        .join(", ")}`
    );
    process.exit(errorCodes.ALREADY_COWORKING);
  }

  if (args.length === 0) {
    showUsage();
  }

  if (fs.existsSync(repoHookLocation)) {
    // TODO: Create git hook docs.
    console.log(
      "You are already have a `commit-msg` git hook. See [URL] for fixes."
    );
    process.exit(errorCodes.EXISTING_HOOK);
  }

  const signatures = [];

  // Generate all the signatures
  for (const coauthor of args) {
    signatures.push(await generateSignature(coauthor));
  }

  // If we don't have the number of signatures we expected, exit.
  if (signatures.length !== args.length) {
    console.log("Coworking session failed to start.");
    process.exit(errorCodes.COAUTHOR_NO_FOUND);
  }

  fs.copyFileSync(hookScript, repoHookLocation);
  fs.copyFileSync(
    dummyPackageJSON,
    path.resolve(cwd, ".git/hooks/package.json")
  );
  for (const coworker of signatures) {
    spawnSync("git", ["config", "--add", configKey, coworker]);
  }
  console.log("Happy coworking!");
  process.exit(errorCodes.NO_ERROR);
}

if (args.includes("-h") || args.includes("--help")) {
  showUsage();
} else if (!fs.existsSync(path.resolve(cwd, ".git"))) {
  console.log("You aren't in a git repository");
  process.exit(errorCodes.NOT_IN_REPO);
} else if (args.includes("--stop")) {
  const { status } = spawnSync("git", ["config", configKey]);
  if (status !== 0) {
    console.log("You weren't coworking!");
    process.exit(errorCodes.NOT_COWORKING);
  }
  execSync(`git config --unset-all ${configKey}`);
  if (fs.existsSync(repoHookLocation)) {
    fs.unlinkSync(repoHookLocation);
    fs.unlinkSync(path.resolve(cwd, ".git/hooks/package.json"));
  }
  console.log("Hope you had a good time!");
  process.exit(errorCodes.NO_ERROR);
}

main();
