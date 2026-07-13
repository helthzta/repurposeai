Confidential Notice
By reading or reviewing this document, you acknowledge that its contents are confidential and proprietary. You may not use, disclose, copy, reproduce, or derive any benefit from this project scope or its ideas without the prior written consent of the owner, regardless of whether a formal agreement has been executed.

Project Scope – AI Video Repurser MVP

Project Overview

Build a web-based AI SaaS that repurposes existing advertisement videos into new brand-specific advertisements using AI.

The product is designed primarily for generating 15–30 second cinematic commercial videos in a single AI generation (no manual storyboard creation required).

The system should intelligently understand the uploaded advertisement, generate alternative scripts, allow editing, and then generate a new commercial using integrated AI video models (e.g., Seedance, Higgsfield, Veo, or future compatible providers).

---

Core Workflow

Step 1 — Upload

User uploads:

- Competitor advertisement
- Product advertisement
- Brand advertisement

Supported formats:

- MP4
- MOV
- WebM

---

Step 2 — AI Video Analysis

The AI automatically analyzes the uploaded video and extracts:

- Company / Brand
- Business Category
- Video Duration
- Hook
- Audience
- Pain Point
- Context
- Emotional Trigger
- Hero
- Marketing Strategy
- Offer
- CTA
- Narrative Structure
- Tone of Voice
- Visual Style

---

Step 3 — AI Script Generation

Generate 3 completely different repurposed scripts.

Each script should include:

- Title
- Hook
- Complete dialogue
- Scene descriptions
- Emotional direction
- CTA
- Estimated duration
- Multi-language detection

Example styles:

- Emotional
- Humorous
- High-conversion

---

Step 4 — Script Editing

User can:

- Edit any generated script
- Rewrite sections
- Add custom instructions
- Change duration
- Change tone
- Modify CTA

The AI should regenerate the script while preserving the user's edits where possible.

---

Step 5 — Video Generation

User selects:

- 15 Seconds
- 30 Seconds
- Custom Duration

The selected script is converted into an optimized prompt and submitted to the connected AI video generation provider.

Initially support one provider (e.g., Seedance), with an architecture that allows additional providers to be added later.

---

Step 6 — Output

Display:

- Generated video
- Download option
- Prompt used
- Script used
- Regenerate option

---

Admin Features

- User authentication
- Credits / usage tracking
- Project history
- API key management
- Error logging

---

Technical Stack

Frontend:

- NextJS
- React
- Tailwind CSS

Backend:

- Node.js

Automation:

- Codebase

Database:

- Supabase

Storage:

- Supabase Storage

AI:

- LLM for analysis and Gemini
  -- Gemini video reading
- Seedance API only

Intellectual Property (IP) Clause

All source code, backend logic, frontend code, prompts, workflows, automation, APIs, designs, documentation, architecture, databases, custom algorithms, business logic, UI/UX designs, and all work products created under this project shall be the exclusive intellectual property of the Client upon payment.

The developer/agency shall:

- Assign all intellectual property rights to the Client.
- Not reuse, resell, sublicense, distribute, or commercialize any part of this project.
- Keep all project information confidential.
- Not disclose prompts, workflows, business logic, or architecture to any third party.
- Deliver the complete source code, documentation, deployment files, and credentials at project completion.

Any open-source software used must comply with its respective licenses and must not affect the Client's ownership of proprietary code.

The developer shall not claim ownership, co-authorship, or licensing rights over any proprietary component developed specifically for this project.

A Non-Disclosure Agreement (NDA) shall remain in effect both during development and after project completion.
