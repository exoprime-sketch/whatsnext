import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const repoRoot = process.cwd();

const requiredFiles = [
  'package.json',
  'ios/WhatsNext/project.yml',
  'ios/WhatsNext/BUILD_ON_MAC.md',
  'ios/WhatsNext/App/Info.plist',
  'ios/WhatsNext/Widget/Info.plist',
  'ios/WhatsNext/App/WhatsNext.entitlements',
  'ios/WhatsNext/Widget/WhatsNextWidget.entitlements',
  'ios/WhatsNext/App/Resources/Assets.xcassets/AppIcon.appiconset/Contents.json',
  'ios/WhatsNext/App/Resources/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png',
  'APP_STORE_METADATA.md',
  'PRIVACY_POLICY.md',
  'APP_PRIVACY_ANSWERS.md',
  'REVIEW_NOTES.md',
  'RELEASE_CHECKLIST.md',
];

const hardPlaceholderChecks = [
  {
    file: 'ios/WhatsNext/project.yml',
    tokens: [
      { value: 'YOUR_TEAM_ID', label: 'Xcode signing team placeholder' },
      { value: 'support@example.com', label: 'Support email placeholder' },
      { value: 'https://example.com/privacy', label: 'Privacy policy URL placeholder' },
      { value: 'YOUR_COMPANY_NAME', label: 'Operator name placeholder' },
    ],
  },
  {
    file: 'PRIVACY_POLICY.md',
    tokens: [
      { value: 'YOUR_COMPANY_NAME', label: 'Privacy policy operator placeholder' },
      { value: 'support@example.com', label: 'Privacy policy support email placeholder' },
      { value: 'YYYY-MM-DD', label: 'Privacy policy effective date placeholder' },
    ],
  },
];

const reviewPlaceholderChecks = [
  {
    file: 'ios/WhatsNext/project.yml',
    tokens: [
      { value: 'com.todayone.whatsnext', label: 'Default app bundle identifier still set' },
      { value: 'com.todayone.whatsnext.widget', label: 'Default widget bundle identifier still set' },
      { value: 'group.com.todayone.whatsnext', label: 'Default App Group identifier still set' },
    ],
  },
  {
    file: 'ios/WhatsNext/Shared/TaskModels.swift',
    tokens: [
      { value: 'support@example.com', label: 'Fallback support email still uses example value' },
      { value: 'https://example.com/privacy', label: 'Fallback privacy URL still uses example value' },
      { value: 'YOUR_COMPANY_NAME', label: 'Fallback operator name still uses placeholder' },
      { value: 'group.com.todayone.whatsnext', label: 'Fallback App Group still uses default identifier' },
    ],
  },
];

const consistencyChecks = [
  {
    label: 'App Info.plist uses the shared App Group build setting',
    run: () =>
      read('ios/WhatsNext/App/Info.plist').includes('<string>$(WHATSNEXT_APP_GROUP_IDENTIFIER)</string>'),
  },
  {
    label: 'Widget Info.plist uses the shared App Group build setting',
    run: () =>
      read('ios/WhatsNext/Widget/Info.plist').includes('<string>$(WHATSNEXT_APP_GROUP_IDENTIFIER)</string>'),
  },
  {
    label: 'App entitlements use the shared App Group build setting',
    run: () =>
      read('ios/WhatsNext/App/WhatsNext.entitlements').includes('<string>$(WHATSNEXT_APP_GROUP_IDENTIFIER)</string>'),
  },
  {
    label: 'Widget entitlements use the shared App Group build setting',
    run: () =>
      read('ios/WhatsNext/Widget/WhatsNextWidget.entitlements').includes('<string>$(WHATSNEXT_APP_GROUP_IDENTIFIER)</string>'),
  },
  {
    label: 'XcodeGen project defines the app scheme',
    run: () => read('ios/WhatsNext/project.yml').includes('WhatsNextApp:'),
  },
  {
    label: 'XcodeGen project defines the widget scheme',
    run: () => read('ios/WhatsNext/project.yml').includes('WhatsNextWidgetExtension:'),
  },
];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function findPlaceholders(checks) {
  const findings = [];

  for (const check of checks) {
    if (!exists(check.file)) continue;
    const content = read(check.file);

    for (const token of check.tokens) {
      if (content.includes(token.value)) {
        findings.push({
          file: check.file,
          token: token.value,
          label: token.label,
        });
      }
    }
  }

  return findings;
}

const missingFiles = requiredFiles.filter((file) => !exists(file));
const hardBlockers = findPlaceholders(hardPlaceholderChecks);
const reviewFlags = findPlaceholders(reviewPlaceholderChecks);
const failedConsistencyChecks = consistencyChecks
  .map((check) => ({ label: check.label, ok: Boolean(check.run()) }))
  .filter((check) => !check.ok);

const failed = strict && (missingFiles.length > 0 || hardBlockers.length > 0 || failedConsistencyChecks.length > 0);

const lines = [];
lines.push('# Release Readiness Report');
lines.push('');
lines.push(`- Strict mode: ${strict ? 'on' : 'off'}`);
lines.push(`- Hard blockers: ${hardBlockers.length}`);
lines.push(`- Review flags: ${reviewFlags.length}`);
lines.push(`- Missing required files: ${missingFiles.length}`);
lines.push(`- Consistency failures: ${failedConsistencyChecks.length}`);
lines.push('');

lines.push('## Required Files');
if (missingFiles.length === 0) {
  lines.push('- All required release files are present.');
} else {
  for (const file of missingFiles) {
    lines.push(`- Missing: \`${file}\``);
  }
}
lines.push('');

lines.push('## Consistency Checks');
if (failedConsistencyChecks.length === 0) {
  lines.push('- App Group wiring, schemes, and core project references look consistent.');
} else {
  for (const check of failedConsistencyChecks) {
    lines.push(`- Failed: ${check.label}`);
  }
}
lines.push('');

lines.push('## Hard Blockers');
if (hardBlockers.length === 0) {
  lines.push('- No hard placeholder blockers were found in release-critical files.');
} else {
  for (const blocker of hardBlockers) {
    lines.push(`- \`${blocker.file}\` still contains \`${blocker.token}\` (${blocker.label})`);
  }
}
lines.push('');

lines.push('## Review Flags');
if (reviewFlags.length === 0) {
  lines.push('- No review-only defaults were found.');
} else {
  for (const flag of reviewFlags) {
    lines.push(`- \`${flag.file}\` still contains \`${flag.token}\` (${flag.label})`);
  }
}
lines.push('');

lines.push('## Result');
if (failed) {
  lines.push('- FAIL: strict release readiness is blocked until the items above are resolved.');
} else if (hardBlockers.length > 0 || failedConsistencyChecks.length > 0 || missingFiles.length > 0) {
  lines.push('- WARN: CI can continue, but App Store release is not ready yet.');
} else if (reviewFlags.length > 0) {
  lines.push('- PASS WITH REVIEW FLAGS: builds can proceed, but identifiers and fallback defaults should be reviewed before submission.');
} else {
  lines.push('- PASS: release-critical files and checks are in a good state.');
}
lines.push('');

const report = `${lines.join('\n')}\n`;
process.stdout.write(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
}

if (process.env.GITHUB_ACTIONS) {
  for (const blocker of hardBlockers) {
    process.stdout.write(`::error file=${blocker.file}::${blocker.label}\n`);
  }
  for (const check of failedConsistencyChecks) {
    process.stdout.write(`::error::${check.label}\n`);
  }
  for (const file of missingFiles) {
    process.stdout.write(`::error file=${file}::Required release file is missing\n`);
  }
  for (const flag of reviewFlags) {
    process.stdout.write(`::warning file=${flag.file}::${flag.label}\n`);
  }
}

if (failed) {
  process.exitCode = 1;
}
