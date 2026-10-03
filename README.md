# Kids Space Brief

A weekly reading site for kids technology, parents, teachers, school, investment, research, and the rules around them.

GitHub Pages serves this folder from the `main` branch. The home page, archive, and week pages read `data/issues.json`. The source list is `sources.html`.

## Issue format

The newest issue is the first object in `issues`. Every section stays on the page. A section with no pieces renders as “No articles this week.”

Do not summarize a URL that already appears in `data/issues.json`.

```json
{
  "issues": [
    {
      "id": "2026-10-05",
      "title": "Week of October 5, 2026",
      "range": "September 29 – October 5, 2026",
      "intro": "One or two sentences on what actually moved.",
      "sections": [
        {
          "id": "new-tech",
          "items": [
            {
              "title": "Article headline",
              "url": "https://example.com/story",
              "source": "Kidscreen",
              "date": "2026-10-02",
              "rank": 1,
              "summary": "Three to five sentences. What the piece says, then why it matters for someone building for children, parents, or schools."
            }
          ]
        }
      ]
    }
  ]
}
```

Section ids, in page order: `new-tech`, `parents-teachers`, `school`, `investments`, `research`, `rules`.

Summaries have to come from pieces that were actually opened. Do not invent articles, dates, or quotes.
