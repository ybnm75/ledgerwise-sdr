import unittest

from scrapy.http import HtmlResponse

from scrapy_research import clean_text, page_text, same_site, select_pages, url_score


class ScrapyResearchTests(unittest.TestCase):
    def test_same_site_accepts_www_but_rejects_external_hosts(self):
        self.assertTrue(same_site("https://www.example.com/about", "example.com"))
        self.assertFalse(same_site("https://example.com.evil.test/about", "example.com"))

    def test_research_pages_rank_above_transactional_pages(self):
        self.assertGreater(url_score("https://example.com/pages/our-story"), 0)
        self.assertLess(url_score("https://example.com/collections/shoes"), 0)

    def test_text_cleanup_is_stable(self):
        self.assertEqual(clean_text([" Ledgerwise ", "&amp;", " research\n"]), "Ledgerwise & research")

    def test_page_text_prefers_main_content_over_navigation(self):
        response = HtmlResponse(
            url="https://example.com/news",
            body=b"<html><body><nav>Shop Account Cart</nav><main><h1>Expansion news</h1><p>The company opened three US stores.</p></main></body></html>",
            encoding="utf-8",
        )
        self.assertEqual(page_text(response), "Expansion news The company opened three US stores.")

    def test_page_selection_keeps_homepage_and_evidence_page_diversity(self):
        pages = [
            {"url": "https://example.com/blogs/news/item", "content": "news"},
            {"url": "https://example.com/pages/careers", "content": "jobs"},
            {"url": "https://example.com/", "content": "shop"},
            {"url": "https://example.com/pages/about", "content": "about"},
        ]
        selected = select_pages(pages, 3)
        self.assertEqual(selected[0]["url"], "https://example.com/")
        self.assertIn("https://example.com/pages/about", [page["url"] for page in selected])


if __name__ == "__main__":
    unittest.main()
