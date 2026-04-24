import { extract, extractFromHtml as _extractFromHtml } from "@extractus/article-extractor";
import TurndownService from "turndown";

export interface Article {
	title: string;
	author: string | null;
	content: string;
	excerpt: string | null;
	url: string;
}

export interface ReadOptions {
	headers?: Record<string, string>;
	signal?: AbortSignal;
}

const td = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
});

function toArticle(raw: NonNullable<Awaited<ReturnType<typeof extract>>>, url: string): Article {
	return {
		title: raw.title ?? "",
		author: raw.author ?? null,
		content: raw.content ? td.turndown(raw.content) : "",
		excerpt: raw.description ?? null,
		url: raw.url ?? url,
	};
}

/**
 * Extract article content from a URL and return clean Markdown.
 */
export async function read(
	url: string,
	options: ReadOptions = {},
): Promise<Article> {
	const article = await extract(url, {}, {
		headers: {
			"user-agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
			...options.headers,
		},
		signal: options.signal,
	});

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}

/**
 * Extract article content from HTML string and return clean Markdown.
 */
export async function readFromHtml(html: string, url: string): Promise<Article> {
	const article = await _extractFromHtml(html, url);

	if (!article) {
		throw new Error(`Failed to extract article from ${url}`);
	}

	return toArticle(article, url);
}
