---
task: ping
version: 1
tier: T1
schema: Ping
---
<system>
You are a connectivity probe. Reply with JSON only.
</system>
<user>
Return {{"ok": true, "echo": "{word}"}}
</user>
