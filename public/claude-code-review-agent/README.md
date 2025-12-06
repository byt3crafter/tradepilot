# Claude Code Review Agents

A collection of specialized subagents for Claude Code that provide expert code review from different perspectives.

## Agents Included

| Agent | Description | Auto-invoked when... |
|-------|-------------|---------------------|
| **code-reviewer** | Bugs, best practices, code quality, performance | Reviewing code, PR reviews, checking quality |
| **code-simplifier** | Complexity reduction, DRY, readability, refactoring | Simplifying code, refactoring, cleaning up |
| **security-reviewer** | Vulnerabilities, auth, OWASP, data exposure | Security audits, handling sensitive data |
| **tech-lead** | Architecture, scalability, tech debt, standards | Architectural reviews, design decisions |
| **ux-reviewer** | Error messages, a11y, loading states, forms | Frontend reviews, accessibility audits |

## Installation

### Option 1: Project-level (share with your team)

```bash
# Copy the agents folder to your project
cp -r .claude/agents/ /path/to/your/project/.claude/agents/
```

### Option 2: User-level (available in all your projects)

```bash
# Copy to your home directory
cp -r .claude/agents/ ~/.claude/agents/
```

## How It Works

These are **subagents** that Claude Code can automatically delegate to based on the task. You don't need to invoke them manually - Claude will use them when appropriate.

### Automatic Invocation

Claude will automatically use these agents when you say things like:

```
"Review this code for security issues"
→ Uses security-reviewer agent

"Can you simplify this function?"
→ Uses code-simplifier agent

"Do a code review of the auth module"
→ Uses code-reviewer agent

"Check the accessibility of this component"
→ Uses ux-reviewer agent

"Is this architecture scalable?"
→ Uses tech-lead agent
```

### Explicit Invocation

You can also explicitly ask for a specific agent:

```
"Use the security-reviewer agent to audit this file"

"Have the tech-lead agent review this PR"

"Ask the ux-reviewer to check this form"
```

## Agent Details

### Code Reviewer
**Tools**: Read, Grep, Glob (read-only)

Focuses on:
- Logic errors and bugs
- Code style and consistency
- Performance issues
- Error handling
- SOLID principles

### Code Simplifier
**Tools**: Read, Write, Edit, Grep, Glob

Focuses on:
- Breaking down complex functions
- Eliminating duplicate code
- Improving naming and readability
- Removing dead code
- Reducing cyclomatic complexity

### Security Reviewer
**Tools**: Read, Grep, Glob, Bash

Focuses on:
- OWASP Top 10 vulnerabilities
- Injection attacks (SQL, XSS, etc.)
- Authentication & authorization
- Data exposure risks
- Dependency vulnerabilities

### Tech Lead
**Tools**: Read, Grep, Glob, Bash

Focuses on:
- Architectural fit
- Scalability implications
- Technical debt assessment
- Team standards compliance
- API design quality

### UX Reviewer
**Tools**: Read, Grep, Glob (read-only)

Focuses on:
- User-friendly error messages
- Loading states and feedback
- Accessibility (WCAG compliance)
- Form validation UX
- Responsive design

## Customization

Edit the `.md` files to:
- Add your company's coding standards
- Include framework-specific checks
- Adjust the tools each agent can use
- Change the model (sonnet, opus, haiku)
- Add custom output formats

### Agent Configuration

Each agent file uses YAML frontmatter:

```yaml
---
name: agent-name
description: When to use this agent (important for auto-invocation)
tools: Read, Write, Edit, Grep, Glob, Bash
model: sonnet
---
```

## Managing Agents

Use Claude Code's built-in agent management:

```bash
# In Claude Code, run:
/agents
```

This opens an interactive interface to:
- View all agents
- Enable/disable agents
- Modify tool access
- Edit system prompts

## Tips

1. **Let Claude choose**: Usually, just describe what you want and let Claude pick the right agent.

2. **Combine agents**: Ask for a comprehensive review and Claude may use multiple agents.

3. **Customize for your stack**: Add framework-specific checks to make agents more useful.

4. **Share with team**: Check agents into version control so everyone benefits.

## License

MIT - Feel free to use, modify, and share.
