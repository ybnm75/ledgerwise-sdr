param(
  [string]$OutputDirectory = ".demo-video\narration"
)

$ErrorActionPreference = "Stop"
$resolvedOutput = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
  [System.IO.Path]::GetFullPath($OutputDirectory)
}
else {
  [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
}
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$scenes = @(
  [ordered]@{
    id = "01-intro"
    title = "Ledgerwise Sales Desk"
    subtitle = "A bounded, evidence-grounded SDR workflow"
    narration = "Ledgerwise Sales Desk is a production-deployed SDR workspace for researching ecommerce companies, preparing grounded outreach, supervising inbound conversations, and booking calls. The important design choice is not maximum autonomy. It is bounded autonomy. The interface makes policy, missing evidence, human decisions, and provider failures visible. This recording is automated and read-only, so it demonstrates the complete workflow without sending another email or creating another calendar event."
  },
  [ordered]@{
    id = "02-research"
    title = "Research with verifiable evidence"
    subtitle = "Exact excerpts, public sources, and qualification gates"
    narration = "Research begins with a queue of real candidate companies. Each lead has a weighted qualification score, public source links, exact excerpts, and explicit gaps. Nulo is the qualified example. Its location, decision maker, commerce activity, current trigger, and scale signal are backed by durable citations. A reviewer may add evidence, but the server re-fetches the public page and accepts the claim only when the exact excerpt is present. Unknown facts are never guessed, and a blocked source stays visibly blocked."
  },
  [ordered]@{
    id = "03-agent"
    title = "Bounded SDR agent"
    subtitle = "Retrieve, qualify, draft, check policy, then stop"
    narration = "The outreach desk exposes the bounded SDR agent workflow. It loads the selected lead, retrieves only server-verified citations, evaluates mandatory qualification gates, generates an immutable grounded draft, and runs policy checks for unsupported claims, pricing, disclosure, and approval boundaries. The inspector reports citations, model, token usage, latency, cash cost, and LangSmith trace status. The final agent step is deliberately human approval. The agent cannot deliver an email, and editing an approved revision makes the new revision pending again."
  },
  [ordered]@{
    id = "04-conversations"
    title = "Conversation safety"
    subtitle = "Disclosure, suppression, booking, and human handoff"
    narration = "The conversation desk models the reply agent as a state machine. Questions about automation receive an honest disclosure. Remove-me requests create durable suppression and no outgoing reply. Scheduling intent is routed to calendar availability rather than inventing a time. Pricing, compliance, and prompt-injection requests are handed to a person. An operator can take ownership of a thread, after which the agent is prevented from replying until ownership is explicitly returned. These transitions are auditable rather than hidden inside a prompt."
  },
  [ordered]@{
    id = "05-bookings"
    title = "Deterministic scheduling"
    subtitle = "Live Google Calendar availability with a final conflict check"
    narration = "Bookings use live Google Calendar availability. Business hours, notice, meeting length, buffer, and the Algeria time zone are deterministic application rules. When a reviewer chooses a returned slot, the server checks free-busy again immediately before creating the event. A booking is not recorded as confirmed until Google succeeds. The end-to-end integration has been verified with a real calendar invitation, while this automated recording only displays the confirmed workflow and does not create a duplicate meeting."
  },
  [ordered]@{
    id = "06-audit"
    title = "Auditability and architecture"
    subtitle = "Human and agent actions remain attributable"
    narration = "The activity ledger records consequential actions from people, agents, and providers: evidence decisions, draft generation and approval, delivery, ownership changes, suppression, replies, and bookings. The architecture keeps secrets and provider calls server-side, stores durable state in Turso, runs the Next.js application on Vercel, uses Resend sandbox delivery and Google Calendar, and traces model work in LangSmith. Deterministic gates surround Groq inference, and idempotency protects provider operations from accidental repetition."
  },
  [ordered]@{
    id = "07-evidence"
    title = "Verification and honest limits"
    subtitle = "Production evidence, zero-cost architecture, explicit demo boundaries"
    narration = "The implementation is backed by seventy-four JavaScript and TypeScript tests, five Python crawler tests, a successful production build, six migrations, twenty out of twenty local benchmark smoke cases, and one hundred fifty out of one hundred fifty LangSmith release cases. Desktop and mobile production verification cover all six desks. All thirty named candidates were processed: twenty-nine have durable exact-source evidence, while one was safely rejected when ecommerce activity was not supported. The stack stays within free tiers. Remaining limitations are explicit: outbound delivery is restricted to the configured test recipient, conversations are simulated, and consequential actions require human approval."
  },
  [ordered]@{
    id = "08-close"
    title = "Ledgerwise is ready for review"
    subtitle = "Live app, public repository, reproducible evidence"
    narration = "Ledgerwise demonstrates a practical agentic system: useful automation where evidence is strong, deterministic safety where consequences matter, and a human checkpoint before delivery. The live application, public repository, architecture notes, deployment guide, benchmark artifacts, and this repeatable recording workflow are ready for review."
  }
)

$voice = New-Object -ComObject SAPI.SpVoice
$selected = $voice.GetVoices() | Where-Object { $_.GetDescription() -like "Microsoft Zira*" } | Select-Object -First 1
if ($selected) { $voice.Voice = $selected }
$voice.Rate = 0
$voice.Volume = 100

$manifest = @()
foreach ($scene in $scenes) {
  $wavPath = Join-Path $resolvedOutput ($scene.id + ".wav")
  $stream = New-Object -ComObject SAPI.SpFileStream
  try {
    $stream.Open($wavPath, 3, $false)
    $voice.AudioOutputStream = $stream
    [void]$voice.Speak($scene.narration)
  }
  finally {
    $stream.Close()
  }
  $manifest += [ordered]@{
    id = $scene.id
    title = $scene.title
    subtitle = $scene.subtitle
    narration = $scene.narration
    audio = $wavPath
  }
}

$manifestPath = Join-Path $resolvedOutput "manifest.json"
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
Write-Output "Generated $($manifest.Count) narration scenes at $resolvedOutput"
