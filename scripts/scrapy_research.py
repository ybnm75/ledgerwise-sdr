"""Respectful first-party evidence discovery for the Ledgerwise research job."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from html import unescape
from urllib.parse import urlparse

import scrapy
from scrapy.crawler import CrawlerProcess


TARGET_TERMS = (
    "about", "story", "team", "leadership", "founder", "company", "contact",
    "location", "store", "press", "news", "media", "blog", "journal", "career",
    "job", "hiring", "investor", "funding", "expansion", "warehouse", "retail"
)
BLOCKED_TERMS = (
    "privacy", "terms", "policy", "account", "login", "cart", "checkout", "search",
    "collections/", "products/", "cdn-cgi", "wp-json", "feed"
)
SEED_PATHS = (
    "", "about", "about-us", "pages/about", "pages/about-us", "our-story",
    "pages/our-story", "team", "leadership", "contact", "pages/contact",
    "press", "news", "blogs/news", "careers", "jobs", "locations", "stores"
)


def root_domain(hostname: str) -> str:
    value = (hostname or "").lower().strip(".")
    return value[4:] if value.startswith("www.") else value


def same_site(url: str, domain: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and root_domain(parsed.hostname or "") == root_domain(domain)


def url_score(url: str) -> int:
    path = urlparse(url).path.lower()
    if any(term in path for term in BLOCKED_TERMS):
        return -100
    return sum(5 for term in TARGET_TERMS if term in path) - path.count("/")


def page_rank(url: str) -> int:
    path = urlparse(url).path.lower().rstrip("/")
    if not path:
        return 1000
    groups = (
        (("leadership", "founder", "team", "about", "story"), 900),
        (("career", "jobs", "hiring", "opportunities"), 850),
        (("contact", "location", "stores"), 800),
        (("press", "news", "media", "blog", "journal"), 700),
    )
    return next((base + url_score(url) for terms, base in groups if any(term in path for term in terms)), url_score(url))


def select_pages(pages: list[dict[str, str]], limit: int) -> list[dict[str, str]]:
    unique = {page["url"]: page for page in pages}
    return sorted(unique.values(), key=lambda page: page_rank(page["url"]), reverse=True)[:limit]


def clean_text(parts: list[str]) -> str:
    return re.sub(r"\s+", " ", unescape(" ".join(parts))).strip()


def page_text(response) -> str:
    text_xpath = ".//text()[not(ancestor::script) and not(ancestor::style) and not(ancestor::noscript)]"
    for selector in ("//main", "//article", "//*[@role='main']"):
        roots = response.xpath(selector)
        if not roots:
            continue
        text = clean_text(roots.xpath(text_xpath).getall())
        if len(text) >= 40:
            return text
    return clean_text(response.xpath("//body").xpath(text_xpath).getall())


class EvidenceSpider(scrapy.Spider):
    name = "ledgerwise_evidence"

    custom_settings = {
        "ROBOTSTXT_OBEY": True,
        "USER_AGENT": "LedgerwiseResearch/2.0 (+case-study; evidence discovery)",
        "CONCURRENT_REQUESTS": 8,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "DOWNLOAD_DELAY": 0.35,
        "DOWNLOAD_TIMEOUT": 15,
        "RETRY_TIMES": 1,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 1.0,
        "LOG_ENABLED": False,
        "COOKIES_ENABLED": False,
        "TELNETCONSOLE_ENABLED": False,
    }

    def __init__(self, domains: list[str], max_pages: int = 8, result_store=None, **kwargs):
        super().__init__(**kwargs)
        self.domains = [root_domain(domain) for domain in domains]
        self.allowed_domains = [item for domain in self.domains for item in (domain, f"www.{domain}")]
        self.max_pages = max_pages
        self.crawl_limit = min(max_pages + 4, 12)
        self.results: dict[str, list[dict[str, str]]] = result_store if result_store is not None else defaultdict(list)
        self.seen: dict[str, set[str]] = defaultdict(set)
        self.xml_seen: dict[str, int] = defaultdict(int)

    def _initial_requests(self):
        for domain in self.domains:
            for path in SEED_PATHS:
                url = f"https://{domain}/{path}".rstrip("/") + ("/" if not path else "")
                yield self._request(url, domain, priority=100 + url_score(url))
            yield self._request(f"https://{domain}/sitemap.xml", domain, callback=self.parse_sitemap, priority=120)

    async def start(self):
        for request in self._initial_requests():
            yield request

    def start_requests(self):
        return self._initial_requests()

    def _request(self, url: str, domain: str, callback=None, priority: int = 0):
        return scrapy.Request(
            url,
            callback=callback or self.parse_page,
            errback=self.ignore_failure,
            meta={"research_domain": domain},
            priority=priority,
        )

    def ignore_failure(self, _failure):
        return None

    def parse_sitemap(self, response):
        domain = response.meta["research_domain"]
        if not same_site(response.url, domain) or self.xml_seen[domain] >= 4:
            return
        self.xml_seen[domain] += 1
        locations = response.xpath("//*[local-name()='loc']/text()").getall()
        nested = [url.strip() for url in locations if url.strip().lower().endswith((".xml", ".xml.gz"))]
        for url in nested[:3]:
            if same_site(url, domain):
                yield self._request(url, domain, callback=self.parse_sitemap, priority=110)
        ranked = sorted(
            (url.strip() for url in locations if same_site(url.strip(), domain) and not url.strip().lower().endswith((".xml", ".xml.gz"))),
            key=url_score,
            reverse=True,
        )
        for url in [item for item in ranked if url_score(item) > 0][: self.max_pages * 3]:
            yield self._request(url, domain, priority=80 + url_score(url))

    def parse_page(self, response):
        domain = response.meta["research_domain"]
        if not same_site(response.url, domain) or len(self.results[domain]) >= self.crawl_limit:
            return
        canonical = response.url.split("#", 1)[0]
        if canonical in self.seen[domain]:
            return
        self.seen[domain].add(canonical)
        content_type = response.headers.get("Content-Type", b"").decode("latin-1").lower()
        if "html" not in content_type:
            return
        text = page_text(response)
        if len(text) >= 150:
            title = clean_text(response.css("title::text").getall()) or domain
            self.results[domain].append({"url": canonical, "title": title[:300], "content": text[:100_000]})
        links = []
        for href in response.css("a::attr(href)").getall():
            absolute = response.urljoin(href).split("#", 1)[0]
            if same_site(absolute, domain) and url_score(absolute) > 0:
                links.append(absolute)
        for url in sorted(set(links), key=url_score, reverse=True)[: self.max_pages * 2]:
            yield self._request(url, domain, priority=60 + url_score(url))


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--domains", required=True)
    parser.add_argument("--max-pages", type=int, default=8)
    args = parser.parse_args()
    domains = [root_domain(item) for item in args.domains.split(",") if item.strip()]
    result_store: dict[str, list[dict[str, str]]] = defaultdict(list)
    process = CrawlerProcess(settings={"LOG_ENABLED": False})
    crawler = process.create_crawler(EvidenceSpider)
    process.crawl(crawler, domains=domains, max_pages=max(1, min(args.max_pages, 12)), result_store=result_store)
    process.start()
    selected = {domain: select_pages(pages, max(1, min(args.max_pages, 12))) for domain, pages in result_store.items()}
    print(json.dumps({"domains": selected}, ensure_ascii=False))


if __name__ == "__main__":
    main()
