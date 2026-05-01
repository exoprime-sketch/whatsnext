import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const issues = [];

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function addIssue(message) {
  issues.push(message);
}

function parseSource(relativePath, scriptKind) {
  if (!existsSync(path.join(ROOT, relativePath))) {
    addIssue(`Missing required file: ${relativePath}`);
    return null;
  }

  const text = read(relativePath);
  const sourceFile = ts.createSourceFile(relativePath, text, ts.ScriptTarget.Latest, true, scriptKind);

  if (sourceFile.parseDiagnostics.length > 0) {
    const detail = sourceFile.parseDiagnostics
      .map((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
        return `${relativePath}: ${message}`;
      })
      .join('\n');
    addIssue(`Parse diagnostics found:\n${detail}`);
  }

  return { text, sourceFile };
}

function checkImportBlock(relativePath, sourceFile, text) {
  let sawNonImport = false;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (sawNonImport) {
        addIssue(`${relativePath}: import declaration found after non-import code.`);
      }
      continue;
    }

    if (!ts.isEmptyStatement(statement)) {
      sawNonImport = true;
    }
  }

  const bomIndex = text.indexOf('\ufeff');
  if (bomIndex > 0) {
    addIssue(`${relativePath}: unexpected BOM character found away from file start.`);
  }
}

function collectTopLevelNames(functionBody) {
  const functionCounts = new Map();
  const variableCounts = new Map();

  for (const statement of functionBody.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const current = functionCounts.get(statement.name.text) ?? 0;
      functionCounts.set(statement.name.text, current + 1);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          const current = variableCounts.get(declaration.name.text) ?? 0;
          variableCounts.set(declaration.name.text, current + 1);
        }
      }
    }
  }

  return { functionCounts, variableCounts };
}

function checkAppIntegrity() {
  const parsed = parseSource('src/App.tsx', ts.ScriptKind.TSX);
  if (!parsed) {
    return;
  }

  const { text, sourceFile } = parsed;
  checkImportBlock('src/App.tsx', sourceFile, text);

  const appDeclarations = sourceFile.statements.filter(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'App'
  );

  if (appDeclarations.length !== 1) {
    addIssue(`src/App.tsx: expected exactly one App component declaration, found ${appDeclarations.length}.`);
    return;
  }

  const appDeclaration = appDeclarations[0];
  if (!appDeclaration.body) {
    addIssue('src/App.tsx: App component is missing a function body.');
    return;
  }

  const { functionCounts, variableCounts } = collectTopLevelNames(appDeclaration.body);

  const requiredFunctions = [
    'renderNowView',
    'renderUpcomingView',
    'renderTasksView',
    'renderCaptureView',
    'renderSettingsView'
  ];

  for (const name of requiredFunctions) {
    const count = functionCounts.get(name) ?? 0;
    if (count !== 1) {
      addIssue(`src/App.tsx: expected ${name} to be declared once, found ${count}.`);
    }
  }

  const keyVariables = [
    'recommendation',
    'sortedTasks',
    'visibleTasks',
    'activeTasks',
    'selectedCaptureCandidates',
    'selectedCaptureCalendarReadyCount',
    'selectedCaptureReviewCounts'
  ];

  for (const name of keyVariables) {
    const count = variableCounts.get(name) ?? 0;
    if (count !== 1) {
      addIssue(`src/App.tsx: expected top-level App variable "${name}" once, found ${count}.`);
    }
  }

  if ((text.match(/<BottomNav\b/g) ?? []).length !== 1) {
    addIssue(`src/App.tsx: expected exactly one <BottomNav /> usage.`);
  }

  if ((text.match(/<NowCard\b/g) ?? []).length !== 1) {
    addIssue(`src/App.tsx: expected exactly one <NowCard /> usage.`);
  }
}

function checkUiScriptIntegrity() {
  const relativePath = 'scripts/ci/check-ui-readiness.mjs';
  const parsed = parseSource(relativePath, ts.ScriptKind.JS);
  if (!parsed) {
    return;
  }

  const { text, sourceFile } = parsed;
  checkImportBlock(relativePath, sourceFile, text);

  const requiredPatterns = [
    { regex: /\bconst FORBIDDEN\b/g, label: 'FORBIDDEN array' },
    { regex: /\bconst uiFiles\b/g, label: 'uiFiles list' },
    { regex: /\bconst requiredPaths\b/g, label: 'requiredPaths list' },
    { regex: /\bconst issues\b/g, label: 'issues array' },
    { regex: /\bfunction walk\b/g, label: 'walk() function' }
  ];

  for (const { regex, label } of requiredPatterns) {
    const count = (text.match(regex) ?? []).length;
    if (count !== 1) {
      addIssue(`${relativePath}: expected ${label} exactly once, found ${count}.`);
    }
  }

  if (!/process\.exit\(1\)/.test(text)) {
    addIssue(`${relativePath}: expected process.exit(1) on failure.`);
  }

  if (!/UI readiness checks passed/.test(text)) {
    addIssue(`${relativePath}: success message is missing.`);
  }
}

function checkCaptureIntegrity() {
  const relativePath = 'src/lib/capture.ts';
  const parsed = parseSource(relativePath, ts.ScriptKind.TS);
  if (!parsed) {
    return;
  }

  const { text, sourceFile } = parsed;
  checkImportBlock(relativePath, sourceFile, text);

  const requiredFunctions = [
    'extractLocationText',
    'inferItemType',
    'splitCompoundFragment',
    'buildTitle',
    'extractCaptureCandidates'
  ];

  for (const name of requiredFunctions) {
    const count = sourceFile.statements.filter(
      (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name
    ).length;

    if (count !== 1) {
      addIssue(`${relativePath}: expected ${name} to be declared once, found ${count}.`);
    }
  }
}

checkAppIntegrity();
checkUiScriptIntegrity();
checkCaptureIntegrity();

if (issues.length > 0) {
  console.error('Code integrity checks failed:\n');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log('Code integrity checks passed.');
