# Create New Command

## Overview
Interactive process to create a custom command based on user needs through Q&A session.

## Todo List

1. **Understand the use case**
   - Ask the user what task or workflow they want to automate
   - Identify the frequency and context of use
   - Determine if it's for personal use, team, or project-specific

2. **Gather requirements through Q&A**
   - What is the main goal of this command?
   - What steps should be included?
   - Are there any specific outputs expected?
   - Should it include checklists or validation steps?
   - What parameters or context might be needed?

3. **Design the command structure**
   - Choose an appropriate command name (short, descriptive, kebab-case)
   - Outline the main sections: Overview, Steps, Checklist
   - Identify any categories or sub-tasks
   - Plan any conditional logic or variations

4. **Generate the command content**
   - Write clear Overview section explaining purpose
   - Break down Steps with actionable instructions
   - Add relevant checklists for verification (use `- [ ] Item description` format)
   - Include examples if applicable
   - Use proper Markdown formatting

5. **Create the command file**
   - Suggest filename: `task-{command-name}.md`
   - Recommend location:
     - Project: `.cursor/commands/` for project-specific
     - Global: `~/.cursor/commands/` for personal use
     - Team: Via Cursor Dashboard for team sharing
   - Generate complete file content

6. **Provide usage instructions**
   - Show how to invoke: `/command-name [optional parameters]`
   - Explain any parameters or variations
   - Suggest related commands if applicable

## Q&A Template

Ask user these questions:
1. What task do you want to automate?
2. How often will you use this command?
3. What are the key steps involved?
4. What should be the final outcome?
5. Do you need any checklists or validation?
6. Should this be shared with your team?

## Output Format

Provide:
- ✅ Suggested command name
- 📝 Complete Markdown content
- 📁 Recommended file location
- 💡 Usage examples
- 🔗 Related commands to consider

## Example Interaction

User: "I need a command to help me write commit messages"

Response:
- Command name: `task-write-commit`
- Location: `.cursor/commands/task-write-commit.md`
- Content includes:
  - Analyze git diff
  - Follow conventional commits format
  - Generate descriptive message
  - Include breaking changes if any
- Usage: `/task-write-commit for the authentication refactor`