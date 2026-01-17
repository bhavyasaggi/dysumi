# dysumi

Medium/Notion-like application that supports vscode like environment, github-flavoured markdown, and frontend playground with local-first (offline) and distributed philosophy.
Supports case-insensitive paths, nested-categories (folders), file-meta
Search limited to filename search
Each file has a consistency-hash, and all files's hash is maintained for dirty-state
Optional Local AI Support.

- \*: Native Hex Editor => loads large files in chunks => Virtualized view
- .md: supports Github flavored markdown, (marked vs markdown-it)
  - math/latex support
  - SpeechSynthesis (whisper via web-llm), and native-TTS support.
  - linking relative multimedia to markdown!
- .mmd: mermaid for charts, kanban
- .png/.jpg: Image Editor
- .bmp: MS Paint (Easter Egg)
- .mp3/.mp4: Player (with exif/metadata)
- .pdf: PDF Editor/Modifier (pdf.js, pdf-lib)
- code for html, xml, js, jsx, ts, tsx.
- TableData view for json, csv.
- Calendar/Gantt/Event View for ics, vcs
- Phonebook for vcf
- Inbox for mbox
- HOT EXIT: to be avoided. All edits are live.
- (Needs Discovery) allows p2p sync (local account with webAuthn | global account)
  - starts a webrtc sync server [OT, CRDT] (gun-db)
  - syncs to S3, Supabase, github-gists, google drive (rsync?)
- (Future) Import from Notion, Confluence, Github Gists.

**Shortcuts**:

- ctrl+s => save current file, if untitled -> prompt
- ctrl+shift+s... => save as...
- ctrl+o => open
- ctrl+n => new file
- ctrl+f => find

## Roadmap

- Scaffold Skeletal UI (vscode-elements)
- write and save single text file
- Create/Read/Write text files to OPFS
- nested-accordion file structure
- For Markdown Files: Use tiptap to inline edit & preview using markdown
- For Text/Development files: Raw mode using monaco-editor
- For Hex data files: A hex-editor

> IDEA:
> S3 compatible storage API! for File System Access API & service worker, to sync with remote storage.

## Prior Art

- worker-comlink
- tiptap (@tiptap/markdown)
- <https://github.com/js1016/txt-reader>
- <https://www.inkdrop.app/>
- <https://github.com/chenxiaoyao6228/code-studio>
- <https://github.com/AndyBitz/0xhexer>, <https://github.com/michbil/hex-works>
- <https://github.com/tomayac/opfs-explorer>
- <https://github.com/mlc-ai/web-llm>
- <https://github.com/vscode-elements>
- <https://github.com/steven-tey/novel>
- <https://github.com/addyosmani/chatty>
  - <https://github.com/mlc-ai/web-llm>
- <https://github.com/addyosmani/say>
- <https://github.com/steveseguin/tts.rocks>
  - <https://github.com/KittenML/KittenTTS>
- <https://github.com/jdan/notes>, <https://github.com/udecode/plate>
- <https://github.com/souvikinator/notion-to-md>
- <https://github.com/awran5/react-simple-typewriter>
- <https://github.com/google/arb-editor>
- <https://github.com/microsoft/vscode-hexeditor>