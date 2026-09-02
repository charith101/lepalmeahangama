# Le Palme Ahangama — Hotel PMS

## Important
- Make as many subagents as required and do the implementation accurately.
- Loop over a plan until you get the correct, accurate output.
- Plan tasks are sequential within each file — do not skip ahead until the current task's verification passes.
- Use graphify to reduce token usage.(Generate the graph if it is not the lastest)
- Before starting any task, auto-discover relevant skills using `skill: "using-agent-skills"`.
- After completing any coding task, commit changes automatically using `skill: "git-workflow-and-versioning"`. Never auto-push.
- When you complete a task and when you are giving the final verdict or summary use i-have-adhd skill.

## Skills

- `skill: "using-agent-skills"` — auto-discover and apply the right skill for each task.
- `skill: "ponytail"` — load before writing any server action or component. Forces simplest implementation (direct Supabase, no ORM/service layers, default shadcn styles).
- `skill: "graphify"` — troubleshooting aid for confusing errors or file relationships.
- `skill: "shadcn"` — when adding or debugging shadcn/ui components.
- `skill: "supabase"` — before any Supabase schema/query work.
- `skill: "frontend-design"` — before building UI to apply the DESIGN.md system.

