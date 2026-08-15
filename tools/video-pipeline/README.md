# Sư Tử Xanh video generator (MVP)

This local tool turns a short script and approved media assets into a validated
vertical-video plan, voice-over text, social caption and an HTML preview. It is
intentionally export-only: it does not publish to TikTok, Facebook or YouTube.

## Token-minimum design

The default path is `local` mode: you provide the short script and the tool
does timeline, captions, CTA, social copy and preview without an AI request.
That means rendering a video plan costs zero model tokens.

Voice can also stay human: set `voice_source` to `own_recording` and provide an
MP3/WAV path. A real voice gives the channel a recognizable identity and avoids
TTS cost. `voice_actor` is another option. `tts` is optional fallback only; do
not clone Drogba or another real person's voice without clear permission.

If AI is added later, keep three explicit modes:

- `local`: no model call; use templates and fixed captions.
- `assist`: one small-model call for a batch of 5–10 scripts; send only compact facts.
- `review`: one stronger-model call only for a high-risk transfer/injury fact check.

Keep the stable instructions first and the changing source facts last so prompt
caching can reuse the prefix. Cache by a hash of the source facts and never send
the same article or asset twice. For routine copy, cap the response to a short
JSON schema; do not send full webpages or old conversation history.

## Try it

```bash
node tools/video-pipeline/create-video-plan.mjs \
  tools/video-pipeline/sample-video-config.json
```

The output directory contains:

- `video-plan.json`: timeline for a future renderer.
- `voiceover.txt`: text for a TTS provider or your own recording.
- `social-copy.json`: caption and hashtags.
- `preview.html`: a quick visual preview in a browser.

## Asset rules

Every asset must declare a non-`unknown` license: `owned`, `licensed`,
`generated`, or `official_embed`. Do not put downloaded match footage or
unlicensed player photos in the config. Voice-over and analysis must be
original. YouTube's monetization review can reject repetitive or reused content
even when a video has small edits, and copyright still applies separately.

## Next renderer step

The plan is ready to connect to FFmpeg, Remotion or a managed video-rendering
service. FFmpeg is not installed in this workspace, so this MVP does not create
an MP4 yet. Once a renderer is chosen, it can render 9:16 MP4s from the same
`video-plan.json` without changing the content workflow.
