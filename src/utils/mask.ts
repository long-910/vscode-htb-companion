const FLAG_PATTERN = /HTB\{[^}]+\}/g;
const PASSWORD_PATTERN = /(?:password|passwd|pass|pwd)\s*[=:]\s*\S+/gi;
const SSH_KEY_PATTERN = /-----BEGIN[A-Z ]+PRIVATE KEY-----[\s\S]+?-----END[A-Z ]+PRIVATE KEY-----/g;

export function maskSensitive(text: string): string {
  return text
    .replace(FLAG_PATTERN, 'HTB{***REDACTED***}')
    .replace(PASSWORD_PATTERN, (m) => m.replace(/=.*|:.*/, '=***'))
    .replace(
      SSH_KEY_PATTERN,
      '-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----',
    );
}
