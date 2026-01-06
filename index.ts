#!/usr/bin/env bun
import { $ } from "bun";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const targetDir = Bun.argv[2] || "docs/api";
const root = path.resolve(targetDir);

// 1. Scaffold Bruno Files locally
console.log(`📂 Creating Bruno collection in: ${targetDir}...`);
await mkdir(root, { recursive: true });
await mkdir(path.join(root, "environments"), { recursive: true });

await writeFile(
    path.join(root, "bruno.json"),
    JSON.stringify(
        {
            version: "1",
            name: "API Spec",
            type: "collection",
            ignore: ["node_modules", ".git"],
        },
        null,
        2,
    ),
);
await writeFile(
    path.join(root, "environments/dev.bru"),
    "vars {\n  baseUrl: http://localhost:3000\n}",
);
await writeFile(
    path.join(root, "README.md"),
    "# API Specifications\nShared via Bruno.",
);

// 2. Setup the Submodule Remote
const remoteUrl = await prompt("Enter the GITHUB URL for this new spec repo: ");

if (remoteUrl) {
    console.log("🚀 Initializing remote spec repository...");

    // Create a temporary git repo in the folder to push the initial state
    await $`git init`.cwd(root);
    await $`git add .`.cwd(root);
    await $`git commit -m "initial: setup bruno spec"`.cwd(root);
    await $`git branch -M main`.cwd(root);
    await $`git remote add origin ${remoteUrl}`.cwd(root);

    // Push to the NEW repo
    await $`git push -u origin main`.cwd(root);

    // 3. Transform local folder into a Submodule
    console.log("🔗 Attaching as submodule to current project...");

    // We must remove the local folder we just made to let git submodule add do its work
    await rm(root, { recursive: true, force: true });

    // Add it back as a submodule
    await $`git submodule add ${remoteUrl} ${targetDir}`;

    console.log(
        `\n✅ Done! Spec is now at ${targetDir} and linked to ${remoteUrl}`,
    );
} else {
    console.log(
        "⚠️ No remote URL provided. Files created locally but not as a submodule.",
    );
}

async function prompt(question: string) {
    process.stdout.write(question);
    for await (const line of console) return line.trim();
}
