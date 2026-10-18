# Prototyping things that are not screens

Same rules as screen prototypes: standalone HTML, brand tokens, realistic data,
one hash per state, `data-focus` on what will be discussed.

## Push notifications and SMS

Show a sequence on a phone lock screen, ordered in time. The decision is
usually about timing, wording and frequency, so make those visible.

```html
<!-- states: #day-before, #morning-of, #running-late, #all (default) -->
<div class="phone" style="width:390px">
  <div class="notif" data-focus="n-day-before" data-state="day-before">
    <b>Acme Field</b> · yesterday 18:00
    <p>Boiler service tomorrow 09:00–11:00. Ali Karimi will come. Reply 1 to reschedule.</p>
  </div>
  <div class="notif" data-focus="n-running-late" data-state="running-late">
    <b>Acme Field</b> · 09:20
    <p>Ali is running about 30 minutes late. New arrival: 09:50.</p>
  </div>
</div>
```

Tips: put a timeline next to the phone ("−1 day 18:00", "−0 h 08:00"). Show the
character count for SMS (160 limit). Show the worst case (5 messages in a day).

## Email

Render the email inside a simple mail-client frame: sender, subject, preview
text, body. Show it in light mode and, if the audience cares, at mobile width.

```html
<article class="mail" data-focus="mail-reminder">
  <header><b>Acme Field for Harbor Bakery</b> &lt;visits@acme-field.example&gt;
    <div>Subject: Your boiler service on Fri 14 Nov</div>
    <div class="muted">Preview: Ali Karimi arrives between 09:00 and 11:00 …</div>
  </header>
  <section>…</section>
</article>
```

## Voice and phone flows

Write the flow as a transcript with branches; add a play button that uses the
browser's speech synthesis so people can hear tone and length.

```html
<ol data-focus="voice-flow">
  <li><b>Bot:</b> <span class="say">Hello, this is Acme Field for Harbor Bakery. Your boiler service is tomorrow at nine.</span></li>
  <li><b>Caller:</b> "Can we do Friday instead?"</li>
  <li><b>Bot:</b> <span class="say">Friday, the 15th, between nine and eleven. Shall I book it?</span></li>
</ol>
<button onclick="document.querySelectorAll('.say').forEach(s => speechSynthesis.speak(new SpeechSynthesisUtterance(s.textContent)))">Play</button>
```

One hash per branch (`#happy-path`, `#no-slot-free`, `#caller-hangs-up`).

## Documents and PDFs

An A4 page (`width: 210mm; min-height: 297mm; padding: 20mm`) with print
styles. Good for service reports, quotes, invoices. Mark the parts under
discussion with `data-focus` (`signature-block`, `parts-table`).

## Automations and agents

Show the run as a log or a timeline: trigger, what the system read, what it
decided, what it did, what a human sees. Each step gets `data-focus`, so a deck
can ask "should the system do this step on its own, or ask first?"

```html
<ol class="timeline">
  <li data-focus="trigger">14 Oct 06:00 — nightly run</li>
  <li data-focus="create">Created 42 visits for Nov–Jan (3 months ahead)</li>
  <li data-focus="conflict">2 visits on a public holiday → moved to next working day</li>
  <li data-focus="notify">Dispatcher sees: "42 new visits, 2 moved" in the morning summary</li>
</ol>
```

## API payloads and webhooks

When integrators are the users: show request and response side by side in
monospace, with realistic values, plus the error case. Decks can then compare
payload shapes as options.
