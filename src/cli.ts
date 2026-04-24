#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { formatArticle, read, readFromHtml } from "./index.js";

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		output: { short: "o", type: "string" },
		json: { short: "j", type: "boolean", default: false },
		url: { type: "string" },
		help: { short: "h", type: "boolean", default: false },
		version: { short: "v", type: "boolean", default: false },
		"no-frontmatter": { type: "boolean", default: false },
		"no-content-negotiation": { type: "boolean", default: false },
	},
	allowPositionals: true,
	strict: true,
});

if (values.help || positionals.length === 0) {
	console.log(`mreader — extract clean Markdown from any URL

Usage:
  mreader <url>            Extract article and print Markdown
  mreader <url> -o out.md  Save to file
  mreader -                Read HTML from stdin (requires --url)

Options:
  -o, --output <file>   Write output to file instead of stdout
  -j, --json            Output as JSON (title, author, content, etc.)
  --no-frontmatter           Omit YAML frontmatter from output
  --no-content-negotiation   Skip Accept: text/markdown, always extract
  --url <url>                Base URL for stdin mode
  -h, --help            Show this help
  -v, --version         Show version`);
	process.exit(0);
}

if (values.version) {
	const pkg = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
	);
	console.log(pkg.version);
	process.exit(0);
}

const input = positionals[0] as string;

try {
	let article: Awaited<ReturnType<typeof read>>;

	if (input === "-") {
		if (!values.url) {
			console.error("Error: --url is required when reading from stdin");
			process.exit(1);
		}
		const html = readFileSync("/dev/stdin", "utf-8");
		article = await readFromHtml(html, values.url);
	} else {
		article = await read(input, {
			noContentNegotiation: values["no-content-negotiation"],
		});
	}

	const result = values.json
		? JSON.stringify(article, null, 2)
		: formatArticle(article, !values["no-frontmatter"]);

	if (values.output) {
		writeFileSync(values.output, `${result}\n`);
		console.error(`Saved to ${values.output}`);
	} else {
		console.log(result);
	}
} catch (error) {
	console.error(`Error: ${error instanceof Error ? error.message : error}`);
	process.exit(1);
}
