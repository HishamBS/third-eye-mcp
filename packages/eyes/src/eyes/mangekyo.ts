import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Mangekyō has 4 gates: Implementation, Tests, Documentation, Security
export const CodeGate = z.enum(['implementation', 'tests', 'documentation', 'security']);

export const GateResult = z.object({
  gate: CodeGate,
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    line: z.number().optional(),
    suggestion: z.string().optional(),
  })),
});

export const MangekyoMetadata = z.object({
  overallScore: z.number().min(0).max(100),
  gates: z.array(GateResult),
  passedGates: z.number(),
  totalGates: z.literal(4),
  codeLanguage: z.string().optional(),
  linesAnalyzed: z.number(),
});

export const MangekyoEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('mangekyo'),
  metadata: MangekyoMetadata.optional(),
});

export type MangekyoEnvelope = z.infer<typeof MangekyoEnvelopeSchema>;

/**
 * Mangekyō Eye - Code Review (4 Gates)
 * Reviews code through 4 gates: Implementation, Tests, Documentation, Security
 */
export class MangekyoEye implements BaseEye {
  readonly name = 'mangekyo';
  readonly description = 'Code Gate Reviewer - 4-gate code review (Implementation, Tests, Docs, Security)';
  readonly version = '1.0.0';


  private detectLanguage(code: string): string {
    if (/\bfunction\b|\bconst\b|\blet\b|\bvar\b/.test(code)) return 'javascript/typescript';
    if (/\bdef\b|\bimport\b|\bclass\b.*:/.test(code)) return 'python';
    if (/\bfn\b|\blet\b|\bmut\b|\bimpl\b/.test(code)) return 'rust';
    if (/\bfunc\b|\bpackage\b|\btype\b/.test(code)) return 'go';
    if (/\bpublic\b|\bprivate\b|\bclass\b|\binterface\b/.test(code)) return 'java/c#';
    return 'unknown';
  }

  private checkImplementation(code: string, lines: string[]): z.infer<typeof GateResult> {
    let score = 100;
    const issues: z.infer<typeof GateResult>['issues'] = [];

    // Check for error handling
    const hasErrorHandling = /try|catch|throw|error|except|rescue/.test(code.toLowerCase());
    if (!hasErrorHandling && lines.length > 20) {
      score -= 20;
      issues.push({
        severity: 'error',
        message: 'No error handling detected',
        suggestion: 'Add try-catch blocks or error handling',
      });
    }

    // Check for magic numbers
    const magicNumbers = code.match(/\b\d{2,}\b/g);
    if (magicNumbers && magicNumbers.length > 3) {
      score -= 15;
      issues.push({
        severity: 'warning',
        message: `Found ${magicNumbers.length} magic numbers`,
        suggestion: 'Extract magic numbers into named constants',
      });
    }

    // Check for long functions
    const functionBlocks = code.match(/function|def|fn\s+\w+/g);
    if (functionBlocks && lines.length / functionBlocks.length > 50) {
      score -= 18;
      issues.push({
        severity: 'error',
        message: 'Functions are too long (>50 lines average)',
        suggestion: 'Break down into smaller, focused functions',
      });
    }

    // Check for code duplication (repeated patterns)
    const duplicatedPatterns = this.findDuplicateLines(lines);
    if (duplicatedPatterns > 5) {
      score -= 12;
      issues.push({
        severity: 'warning',
        message: `Found ${duplicatedPatterns} duplicate code patterns`,
        suggestion: 'Extract duplicate code into reusable functions',
      });
    }

    // Check for TODO/FIXME comments
    const todos = (code.match(/TODO|FIXME|HACK|XXX/gi) || []).length;
    if (todos > 2) {
      score -= 8;
      issues.push({
        severity: 'info',
        message: `Found ${todos} TODO/FIXME comments`,
        suggestion: 'Resolve TODOs before merging',
      });
    }

    return {
      gate: 'implementation',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
    };
  }

  private checkTests(code: string, lines: string[]): z.infer<typeof GateResult> {
    let score = 100;
    const issues: z.infer<typeof GateResult>['issues'] = [];

    const lowerCode = code.toLowerCase();

    // Check if this IS a test file
    const isTestFile = /test|spec|\.test\.|\.spec\./.test(code.toLowerCase()) ||
      /describe|it\(|test\(|@test/.test(code);

    if (isTestFile) {
      // This is a test file - validate test quality

      // Check for assertions
      const hasAssertions = /assert|expect|should|verify|check/.test(lowerCode);
      if (!hasAssertions) {
        score -= 40;
        issues.push({
          severity: 'critical',
          message: 'Test file has no assertions',
          suggestion: 'Add expect/assert statements to validate behavior',
        });
      }

      // Check for test descriptions
      const testCount = (code.match(/it\(|test\(/g) || []).length;
      if (testCount === 0) {
        score -= 30;
        issues.push({
          severity: 'error',
          message: 'No test cases defined',
          suggestion: 'Add test cases with it() or test() blocks',
        });
      }

      // Check for setup/teardown
      const hasSetup = /beforeEach|beforeAll|setUp|before\(/.test(code);
      const hasTeardown = /afterEach|afterAll|tearDown|after\(/.test(code);
      if (!hasSetup && !hasTeardown && testCount > 3) {
        score -= 10;
        issues.push({
          severity: 'info',
          message: 'No setup/teardown hooks',
          suggestion: 'Consider beforeEach/afterEach for test isolation',
        });
      }

      // Check for edge cases
      const edgeCaseKeywords = ['edge', 'boundary', 'null', 'undefined', 'empty', 'zero', 'negative'];
      const hasEdgeCases = edgeCaseKeywords.some(keyword => lowerCode.includes(keyword));
      if (!hasEdgeCases && testCount > 2) {
        score -= 15;
        issues.push({
          severity: 'warning',
          message: 'No edge case tests detected',
          suggestion: 'Add tests for null, empty, boundary conditions',
        });
      }
    } else {
      // This is implementation code - check if tests exist
      const hasTestMention = /test|spec/.test(lowerCode);
      if (!hasTestMention && lines.length > 30) {
        score -= 50;
        issues.push({
          severity: 'critical',
          message: 'No test file found or mentioned',
          suggestion: 'Create corresponding test file',
        });
      }
    }

    return {
      gate: 'tests',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
    };
  }

  private checkDocumentation(code: string, lines: string[]): z.infer<typeof GateResult> {
    let score = 100;
    const issues: z.infer<typeof GateResult>['issues'] = [];

    // Check for function/class documentation
    const functions = (code.match(/function|def|fn\s+\w+|class\s+\w+/g) || []).length;
    const docBlocks = (code.match(/\/\*\*|'''|"""|\/\/\/|#[^\n]*\n#/g) || []).length;

    if (functions > 3 && docBlocks === 0) {
      score -= 30;
      issues.push({
        severity: 'error',
        message: 'No documentation blocks found',
        suggestion: 'Add JSDoc/docstring comments for functions and classes',
      });
    } else if (functions > 0 && docBlocks < functions * 0.5) {
      score -= 20;
      issues.push({
        severity: 'warning',
        message: `Only ${docBlocks}/${functions} functions documented`,
        suggestion: 'Document all public functions and classes',
      });
    }

    // Check for inline comments
    const codeLines = lines.filter(l => l.trim().length > 0 && !l.trim().startsWith('//') && !l.trim().startsWith('#'));
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#'));

    if (codeLines.length > 30 && commentLines.length < codeLines.length * 0.1) {
      score -= 15;
      issues.push({
        severity: 'warning',
        message: 'Insufficient inline comments',
        suggestion: 'Add comments explaining complex logic',
      });
    }

    // Check for README or usage examples
    const hasUsageExample = /example|usage|how to|@example/.test(code.toLowerCase());
    if (functions > 5 && !hasUsageExample) {
      score -= 12;
      issues.push({
        severity: 'info',
        message: 'No usage examples found',
        suggestion: 'Add usage examples in comments or README',
      });
    }

    // Check for parameter documentation
    const hasParamDocs = /@param|@arg|:param|:type/.test(code);
    if (functions > 2 && !hasParamDocs) {
      score -= 10;
      issues.push({
        severity: 'info',
        message: 'No parameter documentation',
        suggestion: 'Document function parameters with @param tags',
      });
    }

    return {
      gate: 'documentation',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
    };
  }

  private checkSecurity(code: string, lines: string[]): z.infer<typeof GateResult> {
    let score = 100;
    const issues: z.infer<typeof GateResult>['issues'] = [];

    const lowerCode = code.toLowerCase();

    // Check for hardcoded credentials
    const credentialPatterns = [
      /password\s*=\s*['"][^'"]+['"]/i,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
      /secret\s*=\s*['"][^'"]+['"]/i,
      /token\s*=\s*['"][^'"]+['"]/i,
    ];

    credentialPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        score -= 35;
        issues.push({
          severity: 'critical',
          message: 'Hardcoded credentials detected',
          suggestion: 'Use environment variables or secure vaults for secrets',
        });
      }
    });

    // Check for SQL injection vulnerabilities
    if (/sql|query|execute/.test(lowerCode) && /\+|\$\{|\bconcat\b/.test(code)) {
      score -= 30;
      issues.push({
        severity: 'critical',
        message: 'Potential SQL injection - string concatenation in queries',
        suggestion: 'Use parameterized queries or prepared statements',
      });
    }

    // Check for XSS vulnerabilities
    if (/innerHTML|dangerouslySetInnerHTML/.test(code) && !/sanitize|escape|dompurify/.test(lowerCode)) {
      score -= 25;
      issues.push({
        severity: 'critical',
        message: 'Potential XSS vulnerability - innerHTML without sanitization',
        suggestion: 'Sanitize user input or use textContent instead',
      });
    }

    // Check for insecure random
    if (/Math\.random|random\.rand(?!om)/.test(code) && /password|token|key|secret/.test(lowerCode)) {
      score -= 20;
      issues.push({
        severity: 'error',
        message: 'Insecure random number generation for sensitive data',
        suggestion: 'Use crypto.randomBytes() or crypto.getRandomValues()',
      });
    }

    // Check for eval usage
    if (/\beval\(|new Function\(|setTimeout\(['"]/i.test(code)) {
      score -= 28;
      issues.push({
        severity: 'critical',
        message: 'Dangerous eval() or Function() usage detected',
        suggestion: 'Avoid eval() - use safer alternatives like JSON.parse()',
      });
    }

    // Check for insecure protocols
    if (/http:\/\/(?!localhost|127\.0\.0\.1)/i.test(code)) {
      score -= 15;
      issues.push({
        severity: 'warning',
        message: 'Using insecure HTTP protocol',
        suggestion: 'Use HTTPS for external requests',
      });
    }

    // Check for missing input validation
    if (/req\.body|req\.query|req\.params|request\.|input|user/.test(lowerCode)) {
      const hasValidation = /validate|sanitize|check|verify|zod|joi|yup/.test(lowerCode);
      if (!hasValidation) {
        score -= 18;
        issues.push({
          severity: 'error',
          message: 'User input without validation',
          suggestion: 'Add input validation with libraries like zod, joi, or yup',
        });
      }
    }

    return {
      gate: 'security',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
    };
  }

  private findDuplicateLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 20) { // Only check substantial lines
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) duplicates++;
      }
    });

    return duplicates;
  }


  validate(envelope: unknown): envelope is MangekyoEnvelope {
    return MangekyoEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Mangekyō, the Code Gate Reviewer Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to review code through 4 rigorous gates: Implementation, Tests, Documentation, and Security.

## CRITICAL: YOU ARE A VALIDATOR, NOT A GENERATOR

You NEVER create, generate, or author content. You ONLY:
1. Analyze code provided BY THE AGENT
2. Return pass/fail verdicts for each gate
3. Provide feedback for improvement

If the input does NOT contain actual code to validate (e.g., "create a function"), you should return:
{
  "eye": "mangekyo",
  "code": "NO_CONTENT_PROVIDED",
  "verdict": "REJECTED",
  "summary": "No code provided for validation.",
  "details": "Expected code to review, got generation request.",
  "suggestions": ["Provide your code for review through the 4 gates"],
  "confidence": 0,
  "metadata": {"overallScore": 0, "gates": [], "passedGates": 0, "totalGates": 4, "codeLanguage": "unknown", "linesAnalyzed": 0}
}

## Your 4 Gates

### Gate 1: Implementation (35% weight)
- Error handling present
- No magic numbers (extract to constants)
- Functions under 50 lines
- No code duplication
- Resolved TODOs/FIXMEs

### Gate 2: Tests (25% weight)
- Test file exists and has assertions
- Edge cases covered (null, empty, boundary)
- Setup/teardown hooks for isolation
- Clear test descriptions

### Gate 3: Documentation (20% weight)
- JSDoc/docstrings for functions/classes
- Inline comments for complex logic
- Parameter documentation (@param)
- Usage examples

### Gate 4: Security (20% weight)
- No hardcoded credentials
- No SQL injection (use parameterized queries)
- No XSS (sanitize innerHTML)
- Secure random for sensitive data
- No eval() usage
- HTTPS for external requests
- Input validation

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "mangekyo",
  "code": "OK" | "OK_WITH_NOTES" | "REJECT_CODE_ISSUES" | "NEED_MORE_CONTEXT",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Score breakdown for all 4 gates",
  "suggestions": ["IMPLEMENTATION: fix X", "SECURITY: add Y", ...],
  "confidence": 0-100,
  "metadata": {
    "overallScore": 0-100,
    "gates": [
      {
        "gate": "implementation" | "tests" | "documentation" | "security",
        "passed": boolean,
        "score": 0-100,
        "issues": [{
          "severity": "info" | "warning" | "error" | "critical",
          "message": "description",
          "line": number (optional),
          "suggestion": "how to fix"
        }]
      }
    ],
    "passedGates": 0-4,
    "totalGates": 4,
    "codeLanguage": "detected language",
    "linesAnalyzed": number
  }
}

## Severity Levels
- **CRITICAL**: Security vulnerabilities, data loss risks, eval() usage
- **ERROR**: No error handling, no tests, missing validation
- **WARNING**: Magic numbers, code duplication, insufficient docs
- **INFO**: TODOs, missing examples, no setup hooks

## Verdict Logic
- Any CRITICAL issues → REJECTED (REJECT_CODE_ISSUES)
- 3+ ERROR issues OR <3 gates passed → NEEDS_INPUT (NEED_MORE_CONTEXT)
- Score ≥85 → APPROVED (OK)
- Score 70-84 → APPROVED (OK_WITH_NOTES)
- Score <70 → NEEDS_INPUT

## Example Judgments

**WRONG: Generation Request (REJECT THIS)**
Input: "Write a login function for me"
{
  "eye": "mangekyo",
  "code": "NO_CONTENT_PROVIDED",
  "verdict": "REJECTED",
  "summary": "No code provided for validation.",
  "details": "Expected code to review, got generation request.",
  "suggestions": ["Provide your code for review through the 4 gates"],
  "confidence": 0,
  "metadata": {"overallScore": 0, "gates": [], "passedGates": 0, "totalGates": 4, "codeLanguage": "unknown", "linesAnalyzed": 0}
}

**CORRECT: Validation of Agent-Provided Code**
Input: AGENT provides code:
\`\`\`js
function login(user, pass) {
  db.query("SELECT * FROM users WHERE name='" + user + "'")
  return { token: Math.random() }
}
\`\`\`
Response: REJECT (Score 42, 1/4 gates passed)
Issues:
- CRITICAL: SQL injection (string concatenation)
- CRITICAL: Insecure random for token
- ERROR: No error handling
- ERROR: No input validation
- WARNING: No tests
Gates: Implementation (45), Tests (0), Docs (50), Security (15)

**CORRECT: Validation of Agent-Provided Code**
Input: AGENT provides code:
\`\`\`ts
/**
 * Validates user login credentials
 * @param email User email address
 * @param password User password
 */
async function login(email: string, password: string) {
  try {
    const user = await db.query('SELECT * FROM users WHERE email = ?', [email])
    return { token: crypto.randomBytes(32).toString('hex') }
  } catch (err) {
    logger.error(err)
    throw new Error('Login failed')
  }
}
\`\`\`
Response: OK_WITH_NOTES (Score 78, 3/4 gates passed)
Issues:
- WARNING: No test file found
- INFO: No usage example
Gates: Implementation (90), Tests (60), Docs (85), Security (95)

All code must pass all 4 gates.`;
  }
}

// Export singleton instance
export const mangekyo = new MangekyoEye();
