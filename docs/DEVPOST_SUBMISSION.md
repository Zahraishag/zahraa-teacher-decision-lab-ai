# Devpost Submission — Copy-Ready Draft

## Project Name

ZAHRAA™ Teacher Decision Lab

## Tagline

Decision Before Generation™ — AI suggests. Teachers decide.

## One-Sentence Summary

A metadata-driven educational decision prototype that helps teachers compare traceable pedagogical alternatives and explicitly approve a decision before an implementation plan is generated.

## Inspiration

Generative AI has made lesson planning faster, but speed can hide the most important step: the pedagogical decision itself. Many tools produce one plan immediately, leaving the teacher to review content after assumptions have already been embedded. ZAHRAA™ Teacher Decision Lab was created to place professional reasoning, visible evidence, and teacher authority before generation.

## What It Does

The prototype guides the teacher through a structured workflow:

1. analyze the instructional situation;
2. represent relevant curriculum metadata and evidence categories;
3. compare three pedagogically distinct alternatives, including their limitations;
4. require explicit teacher review and approval;
5. generate a matching implementation plan with visible provenance and decision lineage.

The current demo uses a Grade 4 Mathematics scenario in which students can follow procedures but do not understand the underlying concept. The final plan changes according to the alternative approved by the teacher.

## How We Use DataHub

The project is designed around DataHub's metadata graph, relationships, governance, and lineage capabilities. In the intended architecture, curriculum assets—learning outcomes, teacher guides, assessment policies, grade-level expectations, and curriculum relationships—are organized in DataHub. An educational reasoning agent can then retrieve connected evidence, create distinct alternatives, preserve their provenance, and link the teacher-approved decision to the final plan.

The submitted repository contains a front-end metadata-driven prototype of this workflow. It demonstrates the reasoning stages, evidence representation, human approval gate, state transfer, and traceability experience. Live DataHub ingestion and graph querying are planned next integration steps and are not presented as already implemented.

## How We Built It

- HTML5 and CSS3 for the responsive Arabic-first interface.
- Vanilla JavaScript for interactions, approval logic, and plan generation.
- Browser `sessionStorage` to preserve the selected decision across pages.
- Separate plan objects for each pedagogical alternative.
- Vercel for the hosted demonstration.
- GitHub for public source code and Apache 2.0 licensing.

## Challenges

The main design challenge was avoiding a conventional chatbot or lesson-generator experience. The workflow had to make pedagogical reasoning visible without overwhelming the teacher. A second challenge was separating system-represented evidence from human professional approval, so the implementation plan remains locked until the teacher explicitly approves the decision.

## Accomplishments

- Built a complete decision-before-generation journey.
- Created three alternatives that reflect genuinely different pedagogical philosophies.
- Preserved the selected alternative across approval and implementation pages.
- Added evidence verification, decision lineage, and plan provenance.
- Produced an Arabic-first bilingual experience suitable for teachers and evaluators.
- Kept the teacher as the accountable final decision-maker.

## What We Learned

Trustworthy educational AI requires more than better prompts. It requires metadata, relationships, visible limitations, governance, lineage, and a clear human decision gate. DataHub provides the foundation for turning dispersed curriculum assets into a governed evidence layer for educational reasoning.

## What's Next

- Build a live DataHub ingestion pipeline for curriculum documents and policies.
- Define and emit curriculum metadata entities and relationships.
- Add graph and lineage queries through a backend service.
- Connect an agent to DataHub evidence retrieval.
- Persist teacher decisions and export decision reports.
- Extend the prototype to multiple subjects, grades, and curricula.

## Links

- Live demo: https://zahraa-teacher-decision-lab-ai.vercel.app/
- Public repository: https://github.com/Zahraishag/zahraa-teacher-decision-lab-ai
- Demo video: **REPLACE WITH PUBLIC YOUTUBE/VIMEO/YOUKU URL**

## Challenge Category

**REPLACE WITH THE SINGLE CATEGORY SELECTED ON DEVPOST**
