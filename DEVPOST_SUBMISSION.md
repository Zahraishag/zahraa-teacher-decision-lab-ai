# Devpost Submission Draft

## Project name

**ZAHRAA™ Teacher Decision Lab — Decision Before Generation™**

## Tagline

A metadata-driven educational decision workflow where AI proposes pedagogical alternatives and the teacher approves the decision before any lesson plan is generated.

## Inspiration

Most AI tools for teachers begin with generation: enter a prompt and receive a lesson plan. The missing step is the pedagogical decision itself. A polished plan can still be based on the wrong instructional choice.

ZAHRAA™ Teacher Decision Lab was created to place teacher judgment before generation. It makes the hidden decision visible, comparable, reviewable, and traceable.

## What it does

The prototype guides a teacher through five stages:

1. analyze an instructional situation;
2. review curriculum metadata evidence;
3. compare three pedagogically distinct alternatives;
4. explicitly review and approve one decision;
5. generate an implementation plan derived from the approved decision.

The current scenario addresses Grade 4 mathematics students who can follow procedures but lack conceptual understanding. The system presents conceptual, diagnostic, and structured alternatives, each with its focus, best-use condition, limitation, and evidence categories.

## How we use DataHub

DataHub is modeled as the metadata and lineage layer for curriculum intelligence. Curriculum assets—such as learning outcomes, teacher guides, assessment policy, standards, grade level, and conceptual progression—are represented as related entities rather than isolated files.

The intended DataHub-powered workflow is:

- organize curriculum assets and metadata;
- expose relationships and lineage;
- retrieve evidence categories relevant to the teaching situation;
- support pedagogical reasoning over those relationships;
- trace the approved teacher decision into the final implementation plan.

This submission is a front-end, metadata-driven prototype demonstrating that workflow. It does not claim a live production DataHub integration or real-time graph queries in the current version.

## How we built it

- HTML5, CSS3, and vanilla JavaScript;
- Arabic-first RTL interface with bilingual evaluator labels;
- browser `sessionStorage` to preserve the selected alternative across the decision journey;
- static hosting on Vercel;
- metadata and lineage examples documented in the repository;
- Apache 2.0 open-source license.

## Challenges

The main design challenge was avoiding a conventional lesson-planner experience. The interface needed to show meaningful pedagogical differences without overwhelming teachers with technical metadata.

A second challenge was preserving human authority: the system must not silently select or generate a plan. The teacher approval gate therefore blocks plan generation until the decision is explicitly reviewed and approved.

## Accomplishments

- built a complete decision-before-generation workflow;
- created three genuinely different pedagogical alternatives;
- connected evidence categories to alternatives;
- implemented a formal teacher approval charter;
- produced alternative-specific lesson plans;
- made decision lineage visible across the full journey;
- delivered a bilingual, responsive live demo.

## What we learned

Educational AI needs more than good content generation. It needs decision governance, metadata context, traceability, and clear human accountability.

DataHub’s metadata and lineage model provides a strong foundation for connecting curriculum assets to explainable educational decisions.

## What’s next

- connect the prototype to a live DataHub instance;
- ingest curriculum documents and extract governed metadata;
- retrieve evidence using graph relationships and lineage;
- support multiple subjects, grades, and curricula;
- export teacher-approved decision reports;
- evaluate the impact of different pedagogical decisions.

## Built with

- DataHub metadata and lineage concepts
- HTML
- CSS
- JavaScript
- Vercel

## Links

- Live demo: https://zahraa-teacher-decision-lab-ai.vercel.app/
- Source repository: https://github.com/Zahraishag/zahraa-teacher-decision-lab-ai
- Demo video: VIDEO_URL_HERE
