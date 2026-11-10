import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROFILE_ID = "189566647"
PROFILE_URL = f"https://www.goodreads.com/user/show/{PROFILE_ID}"
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "reading.json"


def fetch(url):
    request = Request(url, headers={"User-Agent": "JustinStudyReadingSync/1.0"})
    with urlopen(request, timeout=30) as response:
        content = response.read(2_000_001)
    if len(content) > 2_000_000:
        raise ValueError("Goodreads response exceeded the size limit")
    return content


def book(title, author, url):
    title = " ".join(title.split())
    author = " ".join(author.split())
    if not title or len(title) > 300 or not author or len(author) > 150:
        raise ValueError("Goodreads returned an invalid title or author")
    match = re.fullmatch(r"https://www\.goodreads\.com/book/show/(\d+)(?:[.\-][^/?#]*)?(?:[?#].*)?", url)
    if not match:
        raise ValueError("Goodreads returned an invalid book link")
    return {"title": title, "author": author, "url": f"https://www.goodreads.com/book/show/{match[1]}"}


def rss_books(content, limit=None):
    if b"<!DOCTYPE" in content.upper() or b"<!ENTITY" in content.upper():
        raise ValueError("Unsupported declarations in Goodreads RSS")
    root = ET.fromstring(content)
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise ValueError("Goodreads did not return an RSS feed")
    result = []
    seen = set()
    for item in channel.findall("item"):
        identifier = item.findtext("book_id", "").strip()
        if not identifier.isdigit():
            raise ValueError("Goodreads RSS is missing a book ID")
        entry = book(item.findtext("title", ""), item.findtext("author_name", ""),
                     f"https://www.goodreads.com/book/show/{identifier}")
        if identifier not in seen:
            result.append(entry)
            seen.add(identifier)
    return result if limit is None else result[:limit]


class CurrentReads(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.found = False
        self.capture = None
        self.text = []
        self.title = None
        self.url = None
        self.books = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div":
            if attrs.get("id") == "currentlyReadingReviews":
                self.found = True
                self.depth = 1
            elif self.depth:
                self.depth += 1
        if self.depth and tag == "a":
            classes = attrs.get("class", "").split()
            kind = "title" if "bookTitle" in classes else "author" if "authorName" in classes else None
            if kind:
                self.capture, self.text = kind, []
                if kind == "title":
                    href = attrs.get("href", "")
                    self.url = f"https://www.goodreads.com{href}" if href.startswith("/") else href

    def handle_data(self, data):
        if self.capture:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == "a" and self.capture:
            text = "".join(self.text)
            if self.capture == "title":
                self.title = text
            elif self.title:
                self.books.append(book(self.title, text, self.url))
                self.title = None
            self.capture = None
        if tag == "div" and self.depth:
            self.depth -= 1


def current_books(content):
    parser = CurrentReads()
    parser.feed(content.decode("utf-8"))
    if not parser.found or not parser.books:
        raise ValueError("The public profile did not expose a current-reading list")
    return parser.books


def sync(fetcher=fetch, key=None):
    shelves = {}
    warnings = []
    failures = []
    for field, shelf, limit in [
        ("currentlyReading", "currently-reading", None),
        ("recentlyRead", "read", 5),
    ]:
        query = {"shelf": shelf, "sort": "date_read", "order": "d", "per_page": 100}
        if key:
            query["key"] = key
        try:
            entries = rss_books(fetcher(f"https://www.goodreads.com/review/list_rss/{PROFILE_ID}?{urlencode(query)}"), limit)
            shelves[field] = {"synced": True, "books": entries}
        except (HTTPError, URLError, TimeoutError, ValueError, ET.ParseError, UnicodeError) as error:
            if isinstance(error, HTTPError):
                error.close()
            if field == "currentlyReading":
                try:
                    entries = current_books(fetcher(PROFILE_URL))
                    shelves[field] = {"synced": True, "books": entries}
                    warnings.append("Current reads were obtained from the public profile because RSS was unavailable.")
                    continue
                except (HTTPError, URLError, TimeoutError, ValueError, UnicodeError):
                    failures.append("Currently reading is unavailable; its shelf is decorative until the next successful sync.")
            elif key or not isinstance(error, HTTPError) or error.code != 404:
                failures.append("Recently read could not be fetched; its shelf is decorative until the next successful sync.")
            else:
                warnings.append("Recently read is unavailable. Add the GOODREADS_RSS_KEY Actions secret to enable it.")
            shelves[field] = {"synced": False, "books": []}
    return {"profile": PROFILE_URL, "updatedAt": datetime.now(timezone.utc).isoformat(), **shelves}, warnings, failures


def main():
    data, warnings, failures = sync(key=os.environ.get("GOODREADS_RSS_KEY"))
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    for message in warnings:
        print(f"::warning::{message}")
    for message in failures:
        print(f"::error::{message}")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as output:
            output.write("## Goodreads sync\n\n")
            for name in ("currentlyReading", "recentlyRead"):
                shelf = data[name]
                state = f"{len(shelf['books'])} books" if shelf["synced"] else "not synced, hidden on the site"
                output.write(f"* {name}: {state}\n")
            for message in warnings + failures:
                output.write(f"\n{message}\n")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
