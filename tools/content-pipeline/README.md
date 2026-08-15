# Sư Tử Xanh content pipeline

This is a draft-first editorial workflow for Chelsea fan content. It collects
source metadata, prepares a Vietnamese writing prompt, validates the generated
draft, and leaves publishing to a human reviewer.

## Source policy

- `official`: facts only; use Chelsea, Premier League, UEFA/FA statements.
- `reporter` / `publisher`: link and paraphrase; treat as reported until independently confirmed.
- `community`: lead discovery only; never publish as fact without verification.

Fabrizio Romano is registered as an early-signal reporter. Do not scrape or
copy social posts; use permitted API/feed access and link to the original post.

## Try locally

```bash
node tools/content-pipeline/generate-prompt.mjs \
  tools/content-pipeline/sample-source-item.json > /tmp/su-tu-xanh-prompt.txt
```

Give that prompt to the model, save the returned JSON as `/tmp/draft.json`, then
run:

```bash
node tools/content-pipeline/validate-draft.mjs /tmp/draft.json
```

Only a validated draft should enter the admin review queue. The migration adds
`content_sources`, `content_items`, `article_drafts`, `article_draft_sources`,
`media_assets`, and `social_posts` with admin-only RLS policies. It does not
publish anything and does not store social credentials.

## Editorial safety

AI must not invent quotes, injury diagnoses, return dates or transfer certainty.
Every factual claim needs a source URL. Use original narration and licensed or
generated visuals for video; do not re-upload old match footage without rights.
