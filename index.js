const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const toml = require("toml");

const pluggies = {};
const dp17 = path.join(__dirname, "DalamudPluginsD17");

function scan(dir) {
  const fullPath = path.join(dp17, dir);
  const folders = fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const folder of folders) {
    if (folder in pluggies) continue;

    let manifestPath = path.join(fullPath, folder, "manifest.toml");
    if (!fs.existsSync(manifestPath)) {
      manifestPath = path.join(fullPath, folder, `${folder}.toml`);
    }

    if (!fs.existsSync(manifestPath)) continue;

    const manifest = toml.parse(fs.readFileSync(manifestPath, "utf8"));

    pluggies[folder] = {
      repo: manifest.plugin.repository,
      commit: manifest.plugin.commit
    };
  }
}

function exec(cmd) {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

async function main() {
  scan("stable");
  scan("testing/live");

  for (const [pluggy, info] of Object.entries(pluggies)) {
    console.log(`Adding ${pluggy}...`);
    const dir = path.join(__dirname, "plugins", pluggy);
    if (fs.existsSync(dir)) {
      console.log(`  Already exists, skipping.`);
      continue;
    }

    try {
      await exec(`git submodule add ${info.repo} plugins/${pluggy}`);
      //await exec(`git -C plugins/${pluggy} checkout ${info.commit}`);
    } catch (err) {
      console.error(err);
    }
  }
}

main();
