
# ZAHRAA™ Teacher Decision Lab

### AI suggests. Teachers decide.

ZAHRAA™ Teacher Decision Lab is a human-centered pedagogical decision-support system that helps teachers move from classroom challenges to evidence-grounded instructional decisions.

Instead of asking generative AI to immediately produce a lesson plan, the system introduces a structured decision workflow:

**Situation → Curriculum Evidence → Alternatives → Teacher Approval → Traceable Implementation**

Curriculum metadata and pedagogical evidence are retrieved through DataHub and incorporated into AI-assisted reasoning before an implementation plan can be generated.

The teacher remains the final decision-maker.

---

## The Problem

Generative AI can create lesson plans in seconds.

But speed is not the same as pedagogical quality.

In many AI-assisted teaching workflows, a teacher enters a prompt and receives an answer immediately.

What is often missing is:

- evidence from the curriculum,
- alignment with learning outcomes,
- comparison of pedagogical alternatives,
- traceability of the decision,
- and explicit teacher approval.

This creates a fundamental problem:

> How can AI support teachers without replacing professional pedagogical judgment?

ZAHRAA™ Teacher Decision Lab was built around that question.

---

## Our Solution

The system deliberately separates **reasoning** from **generation**.

Before an implementation plan is created, the teacher moves through a structured decision process:

1. Analyze the teaching situation.
2. Review curriculum metadata and evidence.
3. Examine AI-generated pedagogical alternatives.
4. Compare the alternatives.
5. Explicitly approve the final decision.
6. Generate a traceable implementation plan.

AI assists throughout the process — but it cannot make the final pedagogical decision on behalf of the teacher.

## How It Works

ZAHRAA™ Teacher Decision Lab follows a structured pedagogical decision workflow rather than a prompt-to-answer workflow.

### 1. Situation Analysis
The teacher begins with a real classroom challenge or instructional situation.

### 2. Curriculum Evidence
The system retrieves relevant curriculum metadata and pedagogical evidence through DataHub, including learning outcomes, teacher guidance, assessment policy, curriculum relationships, and metadata lineage.

### 3. AI-Assisted Reasoning
Gemini uses the teaching situation together with the retrieved evidence to support pedagogical reasoning and generate relevant instructional alternatives.

### 4. Alternatives
The teacher reviews and compares pedagogical alternatives rather than receiving a single automatically generated answer.

### 5. Teacher Approval
The selected pedagogical decision must be explicitly reviewed and approved by the teacher.

The system does not allow the implementation plan to be generated before this approval.

### 6. Traceable Implementation
After teacher approval, the system generates an implementation plan linked to the decision and its supporting evidence.

The resulting workflow is:

**Situation → Metadata Evidence → AI-Assisted Reasoning → Alternatives → Teacher Approval → Traceable Implementation**

---

## Why DataHub?

DataHub is not used merely as a metadata catalog in ZAHRAA™ Teacher Decision Lab.

It acts as an **evidence layer for pedagogical decision-making**.

The system retrieves and surfaces curriculum evidence such as:

- Learning outcomes
- Teacher guidance
- Assessment policy
- Curriculum relationships
- Metadata lineage

This evidence can be reviewed by the teacher and incorporated into the AI-assisted reasoning process.

This creates a traceable relationship between:

**Curriculum Metadata → Pedagogical Reasoning → Teacher Decision → Implementation**

In this architecture, DataHub helps transform curriculum metadata from passive documentation into actionable evidence for instructional decision-making.

## Human-in-the-Loop Governance

ZAHRAA™ Teacher Decision Lab is designed around a simple governance principle:

> **AI suggests. Teachers decide.**

The system intentionally places a human approval gate between AI-assisted reasoning and implementation.

An implementation plan cannot be generated until the teacher:

1. Reviews the proposed pedagogical decision.
2. Reviews the supporting evidence.
3. Understands the limitations of the recommendation.
4. Explicitly approves the decision for implementation.

This creates a clear separation between:

**AI Recommendation → Human Judgment → Authorized Implementation**

The teacher therefore remains accountable for the pedagogical decision, while AI functions as a decision-support system rather than an autonomous decision-maker.

---

## System Architecture

The prototype connects three core layers:

### 1. Curriculum Evidence Layer — DataHub

DataHub provides structured curriculum metadata and evidence used during pedagogical reasoning.

Examples include:

- Learning outcomes
- Teacher guidance
- Assessment policy
- Curriculum relationships
- Metadata lineage

### 2. Reasoning Layer — Gemini

Gemini supports the reasoning process by combining:

- the classroom situation,
- curriculum evidence retrieved through DataHub,
- and pedagogical constraints.

Its role is to help analyze the situation and generate alternatives — not to make the final decision.

### 3. Decision & Governance Layer — Teacher

The teacher reviews the alternatives and supporting evidence before explicitly approving a pedagogical decision.

Only after approval can the system proceed to implementation-plan generation.

### Architecture Flow

```text
Classroom Situation
        ↓
DataHub Curriculum Evidence
        ↓
AI-Assisted Pedagogical Reasoning
        ↓
Pedagogical Alternatives
        ↓
Teacher Review & Approval
        ↓
Traceable Implementation Plan
...
This architecture makes curriculum evidence, AI reasoning, and human professional judgment visible as separate but connected components.

## Live Demo

Try the live prototype:

**ZAHRAA™ Teacher Decision Lab**  
https://zahraa-teacher-decision-lab-ai.vercel.app/

The demo walks through the complete pedagogical decision workflow:

1. Analyze a classroom situation.
2. Retrieve and review curriculum evidence from DataHub.
3. Generate evidence-grounded pedagogical alternatives.
4. Compare the alternatives.
5. Review the proposed decision.
6. Explicitly approve the decision as the teacher.
7. Generate a traceable implementation plan.

> The implementation plan remains locked until teacher approval is completed.

---

## Demo Scenario

The prototype demonstrates a Grade 4 mathematics scenario focused on **Equivalent Fractions**.

The classroom challenge is not sent directly to AI for lesson-plan generation.

Instead, ZAHRAA™ Teacher Decision Lab uses the challenge to initiate a structured decision process in which curriculum evidence is retrieved, pedagogical alternatives are generated and compared, and the teacher remains responsible for approving the final instructional decision.

### Example Decision Path

```text
Classroom Challenge
        ↓
Equivalent Fractions — Grade 4
        ↓
DataHub Curriculum Evidence
        ↓
AI-Assisted Pedagogical Reasoning
        ↓
Pedagogical Alternatives
        ↓
Teacher Review
        ↓
Teacher Approval
        ↓
Traceable Implementation Plan
```

This demonstrates the project's central principle:

**AI suggests. Teachers decide.**

## What Makes This Different

ZAHRAA™ Teacher Decision Lab is not simply an AI lesson-plan generator.

Its core innovation is the introduction of a **decision-governance layer** between AI reasoning and instructional generation.

### Key Design Principles

- **Evidence before generation** — curriculum evidence is reviewed before an implementation plan is created.
- **Reasoning before output** — AI first analyzes the situation and proposes pedagogical alternatives.
- **Teacher authority** — the teacher explicitly approves the pedagogical decision.
- **Traceability** — the final implementation plan can be traced back to the situation, curriculum evidence, alternatives, and teacher decision.
- **Human-centered AI** — AI supports professional judgment rather than replacing it.

The result is a workflow in which generative AI becomes part of a governed pedagogical decision process rather than a direct content-generation shortcut.

## DataHub Integration

DataHub is a core part of the decision workflow, not just a metadata catalog used for display.

ZAHRAA™ Teacher Decision Lab uses DataHub as an **evidence layer for pedagogical decision-making**.

### Evidence Flow

The prototype retrieves curriculum-related metadata through the DataHub integration and surfaces it before the teacher makes the final pedagogical decision.

Evidence includes:

- Learning outcomes
- Teacher guidance
- Assessment policy
- Curriculum relationships
- Metadata lineage

The retrieved evidence is then incorporated into the AI-assisted reasoning process so that pedagogical alternatives are grounded in curriculum context rather than generated from the classroom prompt alone.

```text
DataHub
   ↓
Curriculum Metadata
   ↓
Evidence Retrieval
   ↓
AI-Assisted Pedagogical Reasoning
   ↓
Pedagogical Alternatives
   ↓
Teacher Decision
   ↓
Traceable Implementation
...

## Gemini Integration

Gemini provides the AI-assisted pedagogical reasoning layer of ZAHRAA™ Teacher Decision Lab.

Rather than receiving only the teacher's classroom prompt, Gemini is provided with structured context that includes the teaching situation and curriculum evidence retrieved through the DataHub layer.

Gemini is used to:

- analyze the instructional situation,
- reason over relevant curriculum evidence,
- generate pedagogically distinct alternatives,
- explain the rationale behind those alternatives,
- and support generation of the implementation plan after teacher approval.

### Human-in-the-Loop Governance

Gemini does not have authority to finalize the pedagogical decision.

The system deliberately separates responsibilities:

```text
DataHub → Evidence
Gemini → Reasoning
Teacher → Decision
ZAHRAA™ → Governance Workflow
...

The implementation plan is generated only after the teacher explicitly reviews and approves the selected pedagogical decision.

This architecture combines metadata intelligence, generative reasoning, and human professional judgment while preserving teacher agency.
---

## Tech Stack

- **DataHub** — curriculum metadata, evidence retrieval, relationships, and lineage
- **Gemini API** — AI-assisted pedagogical reasoning and generation
- **JavaScript** — application logic and API integration
- **HTML / CSS** — interactive teacher decision workflow
- **Vercel** — deployment and serverless API endpoints
- **GitHub** — source control and project repository

---

## Repository Structure

```text
zahraa-teacher-decision-lab/
│
├── api/
│ ├── datahub.js
│ └── gemini.js
│
├── docs/
├── examples/
│
├── index.html
├── scenario.html
├── alternatives.html
├── teacher-approval.html
├── implementation-plan.html
├── zahraa-datahub.html
│
├── app.js
├── styles.css
├── README.md
└── LICENSE
```

### Key Components

**`api/datahub.js`**  
Provides the DataHub evidence layer used to retrieve curriculum metadata for the decision workflow.

**`api/gemini.js`**  
Connects the curriculum evidence and classroom context to Gemini for AI-assisted pedagogical reasoning.

**`teacher-approval.html`**  
Implements the human-in-the-loop governance checkpoint. The teacher must review and explicitly approve the pedagogical decision.

**`implementation-plan.html`**  
Generates and displays the implementation plan only after teacher approval.

**`zahraa-datahub.html`**  
Surfaces the curriculum evidence used in the teacher decision workflow.
---

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/Zahraishag/zahraa-teacher-decision-lab-ai.git
cd zahraa-teacher-decision-lab-ai
```

### 2. Configure environment variables

Create a `.env.local` file in the project root and add the required API credentials.

```env
GEMINI_API_KEY=your_gemini_api_key
```

> Never commit API keys or secrets to the repository.

### 3. Run the project locally

The interface can be opened locally through a development server.

For example, using VS Code Live Server, open:

```text
index.html
```

### 4. Explore the decision workflow

Start with a classroom situation and move through the complete workflow:

```text
Classroom Situation
        ↓
Curriculum Evidence
        ↓
AI-Assisted Pedagogical Reasoning
        ↓
Pedagogical Alternatives
        ↓
Teacher Review
        ↓
Teacher Approval
        ↓
Traceable Implementation Plan
```

### Live Demo

The deployed prototype is available on Vercel:

https://zahraa-teacher-decision-lab-ai.vercel.app/
...
---

## Hackathon Evaluation

This prototype was developed as a demonstration of a human-centered AI architecture for educational decision-making.

The project highlights four core capabilities:

- **Metadata-grounded reasoning** — curriculum evidence is retrieved and surfaced through DataHub.
- **AI-assisted pedagogical reasoning** — Gemini analyzes the teaching situation and proposes pedagogically distinct alternatives.
- **Human-in-the-loop governance** — the teacher must explicitly review and approve the pedagogical decision.
- **Traceable implementation** — the final implementation plan preserves the reasoning path from curriculum evidence to teacher approval.

### Evaluation Scenario

The prototype demonstrates the workflow using an instructional challenge involving **equivalent fractions**.

Evaluators can follow the complete decision path:

```text
Teaching Challenge
        ↓
Curriculum Evidence
        ↓
AI-Assisted Reasoning
        ↓
Pedagogical Alternatives
        ↓
Teacher Review
        ↓
Explicit Teacher Approval
        ↓
Traceable Implementation Plan
```

The central evaluation question is not simply:

> Can AI generate a lesson plan?

It is:

> Can AI support pedagogical reasoning while preserving teacher authority, curriculum evidence, and decision traceability?

---

## Author

**Dr. Zahra Al-Ansari**

Founder, Zahraa Al-Ansari Academy  
Researcher and educator in AI-enabled education, pedagogical decision-making, and human-centered educational technology.

### Project Vision

**AI suggests. Teachers decide.**

ZAHRAA™ Teacher Decision Lab explores a future in which generative AI strengthens professional teacher judgment rather than replacing it.

---

## License

This project is released under the license included in this repository.
