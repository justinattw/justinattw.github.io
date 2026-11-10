import importlib.util
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlparse

spec = importlib.util.spec_from_file_location("update_reading", Path(__file__).with_name("update-reading.py"))
reading = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reading)


def feed(count=7):
    return ("<rss><channel>" + "".join(
        f"<item><title>Book {index} &amp; notes</title><author_name>Author {index}</author_name><book_id>{100 + index}</book_id></item>"
        for index in range(count)
    ) + "</channel></rss>").encode()


class ReadingTests(unittest.TestCase):
    def test_reads_most_recent_five_in_feed_order(self):
        requests = []

        def fetch(url):
            requests.append(url)
            return feed()

        data, warnings, failures = reading.sync(fetch, "private-key")
        self.assertEqual(len(data["recentlyRead"]["books"]), 5)
        self.assertEqual(data["recentlyRead"]["books"][0]["title"], "Book 0 & notes")
        self.assertEqual(len(data["currentlyReading"]["books"]), 7)
        self.assertEqual(parse_qs(urlparse(requests[1]).query)["sort"], ["date_read"])
        self.assertEqual(parse_qs(urlparse(requests[1]).query)["order"], ["d"])
        self.assertNotIn("private-key", str(data) + str(warnings) + str(failures))
        self.assertEqual(failures, [])

    def test_public_profile_fallback_and_hidden_unavailable_recent_shelf(self):
        def fetch(url):
            if url == reading.PROFILE_URL:
                return b"""<div id="currentlyReadingReviews"><div>
                  <a class="bookTitle" href="/book/show/123-a-title">A title</a>
                  <a class="authorName">An author</a></div></div>"""
            raise HTTPError(url, 404, "Not Found", None, None)

        data, warnings, failures = reading.sync(fetch)
        self.assertTrue(data["currentlyReading"]["synced"])
        self.assertFalse(data["recentlyRead"]["synced"])
        self.assertEqual(data["recentlyRead"]["books"], [])
        self.assertEqual(len(warnings), 2)
        self.assertEqual(failures, [])

    def test_network_failure_hides_both_shelves_and_reports_errors(self):
        def fetch(url):
            raise TimeoutError()

        data, _, failures = reading.sync(fetch)
        self.assertFalse(data["currentlyReading"]["synced"])
        self.assertFalse(data["recentlyRead"]["synced"])
        self.assertEqual(len(failures), 2)

    def test_empty_feed_is_synced_without_inventing_books(self):
        data, _, failures = reading.sync(lambda url: feed(0))
        self.assertTrue(data["recentlyRead"]["synced"])
        self.assertEqual(data["recentlyRead"]["books"], [])
        self.assertEqual(failures, [])

    def test_rejects_non_rss_or_missing_book_metadata(self):
        for content in [b"<html>Sign in</html>", b"<rss><channel><item><title>Missing data</title></item></channel></rss>"]:
            with self.assertRaises(ValueError):
                reading.rss_books(content)

    def test_escapes_entities_but_rejects_external_book_urls(self):
        self.assertEqual(reading.rss_books(feed(1))[0]["title"], "Book 0 & notes")
        with self.assertRaises(ValueError):
            reading.book("Title", "Author", "https://example.com/book/show/123")


if __name__ == "__main__":
    unittest.main()
