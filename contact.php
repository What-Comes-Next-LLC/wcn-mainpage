<?php
/**
 * Contact form handler for whatcomesnextllc.ai
 * Sends two emails via Resend API:
 *   1. Alert to Jason (Ghostbusters-style)
 *   2. Auto-reply to the sender
 *
 * Expects JSON POST: { name, email, intent, message }
 * Returns JSON: { success: true } or { error: "..." }
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

// ── Config ────────────────────────────────────────────────────────────────────
define('RESEND_API_KEY', getenv('RESEND_API_KEY') ?: '');
define('FROM_ADDRESS',   'coach@whatcomesnextllc.ai');
define('FROM_NAME',      'What Comes Next? LLC');
define('ALERT_TO',       'jrashaad@whatcomesnextllc.ai');
define('ALLOWED_ORIGIN', 'https://whatcomesnextllc.ai');

// ── Helpers ───────────────────────────────────────────────────────────────────

function json_error(string $msg, int $status = 400): never {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

function json_ok(): never {
    http_response_code(200);
    echo json_encode(['success' => true]);
    exit;
}

/** Send one email through Resend. Returns true on success. */
function resend_send(string $to, string $subject, string $html, string $text): bool {
    $payload = json_encode([
        'from'    => FROM_NAME . ' <' . FROM_ADDRESS . '>',
        'to'      => [$to],
        'subject' => $subject,
        'html'    => $html,
        'text'    => $text,
    ]);

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . RESEND_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $httpCode >= 200 && $httpCode < 300;
}

// ── Intent labels (for display in emails) ────────────────────────────────────

function intent_label(string $intent): string {
    return match ($intent) {
        'coaching'  => 'Coaching Inquiry',
        '100days'   => '100 Days to Summer',
        'speaking'  => 'Speaking & Collaboration',
        'investor'  => 'Investor Inquiry',
        default     => 'General Inquiry',
    };
}

// ── Alert email (to Jason) ────────────────────────────────────────────────────

function alert_html(string $name, string $email, string $intent, string $message): string {
    $label     = htmlspecialchars(intent_label($intent));
    $safeName  = htmlspecialchars($name);
    $safeEmail = htmlspecialchars($email);
    $safeMsg   = nl2br(htmlspecialchars($message));
    $ts        = (new DateTimeImmutable('now', new DateTimeZone('America/New_York')))->format('l, F j, Y \a\t g:i A T');

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WE GOT ONE!</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#000;">
  <div style="max-width:600px;margin:0 auto;background:#000;">

    <div style="background:linear-gradient(135deg,#000 0%,#333 50%,#000 100%);padding:40px 20px;text-align:center;border-bottom:3px solid #ff6b35;">
      <div style="font-size:64px;margin-bottom:16px;">👻</div>
      <h1 style="color:#ff6b35;margin:0;font-size:32px;font-weight:bold;">WE GOT ONE!</h1>
      <p style="color:#fff;margin:10px 0 0;font-size:16px;font-style:italic;">"I'm Janine Melnitz. We got one!" 📞</p>
    </div>

    <div style="background:#fff;padding:40px 30px;">
      <div style="background:linear-gradient(135deg,#ff6b35,#ffa726);color:#fff;padding:20px;border-radius:8px;text-align:center;margin-bottom:28px;">
        <h2 style="margin:0;font-size:22px;font-weight:bold;">🚨 NEW CONTACT FORM SUBMISSION 🚨</h2>
      </div>

      <div style="background:#f8f9fa;border-left:5px solid #216869;padding:24px;border-radius:4px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:600;width:110px;">Name</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#111;">{$safeName}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:600;">Email</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><a href="mailto:{$safeEmail}" style="color:#216869;font-weight:600;">{$safeEmail}</a></td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#374151;font-weight:600;">Re:</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;color:#111;">{$label}</td></tr>
          <tr><td style="padding:8px 0;color:#374151;font-weight:600;">Received</td><td style="padding:8px 0;color:#636e72;font-size:13px;">{$ts}</td></tr>
        </table>
      </div>

      <div style="background:#f8f9fa;padding:20px;border-radius:4px;margin-bottom:28px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.08em;">Message</p>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.65;">{$safeMsg}</p>
      </div>

      <div style="text-align:center;">
        <a href="mailto:{$safeEmail}" style="display:inline-block;background:#216869;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:4px;">Reply to {$safeName} &rarr;</a>
      </div>
    </div>

    <div style="background:#1f2937;color:#9ca3af;padding:20px;text-align:center;font-size:13px;">
      <p style="margin:0;">What Comes Next? LLC &mdash; Contact Alert<br><em>"Who you gonna call? Your new lead!"</em></p>
    </div>
  </div>
</body>
</html>
HTML;
}

function alert_text(string $name, string $email, string $intent, string $message): string {
    $label = intent_label($intent);
    $ts    = (new DateTimeImmutable('now', new DateTimeZone('America/New_York')))->format('l, F j, Y \a\t g:i A T');
    return "WE GOT ONE! 👻\n\nName: {$name}\nEmail: {$email}\nRe: {$label}\nReceived: {$ts}\n\n---\n{$message}\n\n---\nWhat Comes Next? LLC — Contact Alert";
}

// ── Auto-reply email (to sender) ──────────────────────────────────────────────

function autoreply_html(string $name, string $intent): string {
    $firstName = htmlspecialchars(explode(' ', trim($name))[0]);
    $label     = htmlspecialchars(intent_label($intent));

    $contextLine = match ($intent) {
        'coaching'  => "I'm looking forward to learning more about your goals and exploring how the Evolutions methodology might support your journey.",
        '100days'   => "The 100 Days to Summer cohorts kick off April 27, 2026 — I'll be in touch shortly with eligibility details and next steps.",
        'speaking'  => "Speaking, academic collaboration, and podcast conversations are always welcome. I'll follow up to find a time that works.",
        'investor'  => "Thank you for your interest in What Comes Next? LLC. I'll be in touch soon to share more about where we are and where we're headed.",
        default     => "Whatever brought you here, I'm glad you reached out. I'll follow up soon.",
    };

    return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanks for reaching out</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">

    <div style="background:#216869;padding:32px 30px;text-align:center;border-bottom:4px solid #f4a261;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">What Comes Next? LLC</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;letter-spacing:0.02em;">whatcomesnextllc.ai</p>
    </div>

    <div style="padding:40px 30px;">
      <h2 style="color:#2d3436;margin:0 0 20px;font-size:22px;font-weight:700;">Hi {$firstName},</h2>

      <p style="color:#374151;margin:0 0 18px;font-size:16px;line-height:1.65;">
        Thank you for reaching out regarding <strong>{$label}</strong>. I received your message and will get back to you within 1&ndash;2 business days.
      </p>

      <p style="color:#374151;margin:0 0 28px;font-size:16px;line-height:1.65;">
        {$contextLine}
      </p>

      <div style="background:#f0f9f6;border-left:4px solid #216869;padding:18px 20px;margin:0 0 28px;border-radius:0 4px 4px 0;">
        <p style="margin:0;color:#216869;font-size:15px;font-weight:600;font-style:italic;">
          "A coach and a client sitting together, looking over a notebook. The AI makes the notebook smarter."
        </p>
      </div>

      <p style="color:#374151;margin:0 0 6px;font-size:16px;line-height:1.65;">
        Talk soon,<br>
        <strong style="color:#2d3436;">Jason Rashaad</strong><br>
        <span style="color:#636e72;font-size:14px;">Founder &amp; CEO, What Comes Next? LLC</span>
      </p>
    </div>

    <div style="background:#f8f9fa;border-top:1px solid #e5e7eb;padding:20px 30px;text-align:center;color:#9ca3af;font-size:13px;">
      <p style="margin:0 0 6px;">
        <a href="https://whatcomesnextllc.ai" style="color:#216869;text-decoration:none;font-weight:600;">whatcomesnextllc.ai</a>
        &nbsp;&middot;&nbsp;
        <a href="https://linkedin.com/in/jasonrashaad" style="color:#216869;text-decoration:none;font-weight:600;">LinkedIn</a>
        &nbsp;&middot;&nbsp;
        Ardmore, PA
      </p>
      <p style="margin:0;">You're receiving this because you submitted the contact form at whatcomesnextllc.ai.</p>
    </div>
  </div>
</body>
</html>
HTML;
}

function autoreply_text(string $name, string $intent): string {
    $firstName = explode(' ', trim($name))[0];
    $label     = intent_label($intent);
    return "Hi {$firstName},\n\nThank you for reaching out regarding {$label}. I received your message and will get back to you within 1–2 business days.\n\nTalk soon,\nJason Rashaad\nFounder & CEO, What Comes Next? LLC\nwhatcomesnextllc.ai";
}

// ── Request handling ──────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

if (!RESEND_API_KEY) {
    error_log('contact.php: RESEND_API_KEY not set');
    json_error('Server configuration error', 500);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body)) {
    json_error('Invalid request body');
}

$name    = trim($body['name']    ?? '');
$email   = trim($body['email']   ?? '');
$intent  = trim($body['intent']  ?? '');
$message = trim($body['message'] ?? '');

// Validate
if (!$name || !$email || !$intent || !$message) {
    json_error('All fields are required');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Invalid email address');
}
$allowed_intents = ['coaching', '100days', 'speaking', 'investor', 'other'];
if (!in_array($intent, $allowed_intents, true)) {
    json_error('Invalid intent value');
}
// Basic length guards
if (strlen($name) > 120 || strlen($message) > 4000) {
    json_error('Input exceeds maximum length');
}

// Send alert to Jason
$alertSent = resend_send(
    ALERT_TO,
    '🚨 WE GOT ONE! — ' . intent_label($intent) . ' from ' . $name,
    alert_html($name, $email, $intent, $message),
    alert_text($name, $email, $intent, $message)
);

if (!$alertSent) {
    error_log("contact.php: Resend alert failed for {$email}");
    json_error('Failed to send message. Please email jrashaad@whatcomesnextllc.ai directly.', 500);
}

// Send auto-reply to sender (non-critical — log failure but don't surface to user)
$replySent = resend_send(
    $email,
    'Got your message — What Comes Next? LLC',
    autoreply_html($name, $intent),
    autoreply_text($name, $intent)
);

if (!$replySent) {
    error_log("contact.php: Resend auto-reply failed for {$email}");
}

json_ok();
