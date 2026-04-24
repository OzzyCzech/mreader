#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { read, readFromHtml } from "./index.js";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("-")));
const positional = args.filter((a) => !a.startsWith("-"));

if (flags.has("-h") || flags.has("--help") || positional.length === 0) {
	console.log(`mreader — extract clean Markdown from any URL

Usage:
  mreader <url>            Extract article and print Markdown
  mreader <url> -o out.md  Save to file
  mreader -                Read HTML from stdin (requires --url)

Options:
  -o, --output <file>   Write output to file instead of stdout
  -j, --json            Output as JSON (title, author, content, etc.)
  --url <url>           Base URL for stdin mode
  -h, --help            Show this help
  -v, --version         Show version`);
	process.exit(0);
}

if (flags.has("-v") || flags.has("--version")) {
	const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
	console.log(pkg.version);
	process.exit(0);
}

const json = flags.has("-j") || flags.has("--json");
const outputIndex = args.indexOf("-o") !== -1 ? args.indexOf("-o") : args.indexOf("--output");
const output = outputIndex !== -1 ? args[outputIndex + 1] : null;
const urlFlagIndex = args.indexOf("--url");
const baseUrl = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : null;

const input = positional[0]!;

try {
	let article;

	if (input === "-") {
		if (!baseUrl) {
			console.error("Error: --url is required when reading from stdin");
			process.exit(1);
		}
		const html = readFileSync("/dev/stdin", "utf-8");
		article = await readFromHtml(html, baseUrl);
	} else {
		article = await read(input);
	}

	const result = json ? JSON.stringify(article, null, 2) : article.content;

	if (output) {
		writeFileSync(output, result + "\n");
		console.error(`Saved to ${output}`);
	} else {
		console.log(result);
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : error}`);
	process.exit(1);
}
