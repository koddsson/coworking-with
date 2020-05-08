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
    `https://api.github.com/users/${username}/events/public`
  );
  const json = await response.json();

  // Only push events contain commits
  const pushEvents = json.filter((event) => event.type === "PushEvent");
  // Only commits contain user info that we need
  const commits = pushEvents
    .map((event) => event.payload && event.payload.commits)
    .filter((x) => x)
    .flat();

  // Find a commit that has a author
  const { author } = commits.find(
    ({ author }) => author && author.name && author.email
  );

  return author;
}

const coworkers = [];

async function main() {
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
    fs.unlinkSync(repoHookLocation);
    console.log("Hope you had a good time!");
    process.exit(errorCodes.NO_ERROR);
  } else {
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

    for (const coauthor of args) {
      const { stdout } = spawnSync(
        "git",
        [
          "log",
          "--no-merges",
          "-1",
          "--author",
          coauthor,
          "--format=%an <%ae>",
        ],
        { encoding: "utf8" }
      );
      if (stdout) {
        coworkers.push(stdout.trim());
      } else {
        console.log(
          `Coauthor '${coauthor}' was not found in git log. Trying to fetch info from GitHub..`
        );
        try {
          const { name, email } = await getUserInfoFromGitHub(coauthor);
          console.log(`Found the user in GitHub!`);
          coworkers.push(`${name} <${email}>`);
        } catch (error) {
          console.log("Failed finding the user in GitHub");
        }
      }
    }

    if (coworkers.length === args.length) {
      fs.copyFileSync(hookScript, repoHookLocation);
      for (const coworker of coworkers) {
        spawnSync("git", ["config", "--add", configKey, coworker]);
      }
      console.log("Happy coworking!");
      process.exit(errorCodes.NO_ERROR);
    } else {
      console.log("Coworking session failed to start.");
      process.exit(errorCodes.COAUTHOR_NO_FOUND);
    }
  }
}

main();
