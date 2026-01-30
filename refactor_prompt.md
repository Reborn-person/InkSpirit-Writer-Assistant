# Refactoring & Agent-Feature Implementation Prompt for Trae

**Role:** Senior Frontend Architect & AI Agent Specialist

**Objective:**
Refactor the existing Next.js "AI Novel Writer" application to improve maintainability, modularity, and implement a robust "In-App Agent" architecture.

**Context:**
The current application allows users to write novels with AI assistance (text generation, image generation).
- **Tech Stack:** Next.js (App Router), React, Tailwind CSS, LocalStorage for persistence.
- **Key Components:** `Module7Editor.tsx` (Main Editor), `FloatingAI.tsx` (Chat Assistant).
- **Current State:** Functional but monolithic components (especially `Module7Editor`).

**Tasks:**

1.  **Codebase Refactoring:**
    -   **Decompose `Module7Editor.tsx`**: Break it down into smaller, focused sub-components (e.g., `ChapterSidebar`, `EditorCanvas`, `ContextPanel`, `EditorToolbar`).
    -   **Custom Hooks**: Extract logic into reusable hooks (e.g., `useNovelContent`, `useBookshelf`, `useAICompletion`).
    -   **State Management**: Introduce a global state manager (Context API or Zustand) to handle cross-component communication, especially between the Editor and the AI Assistant.

2.  **Implement "In-App Agent" Capabilities (Frontend Only):**
    -   **Goal**: The AI Assistant (`FloatingAI`) must be able to "read" and "write" to the editor directly, with visual feedback for the user.
    -   **"Transparent Workflow"**:
        -   **Reading**: When the AI needs context, visualize it "scanning" the editor (e.g., highlighting text or a progress bar).
        -   **Writing**: When the AI generates content, allow it to "type" directly into the editor or provide a "One-click Insert" action.
    -   **Implementation**: Use React Context to expose Editor methods (`getContent`, `insertText`, `highlightRange`) to the Assistant component.

3.  **Performance & Security:**
    -   Ensure all state manipulations are efficient (avoid unnecessary re-renders).
    -   Keep data strictly local (LocalStorage/IndexedDB) unless the user configures a cloud sync.

**Constraints:**
-   Do NOT change the visual design or "Ink/Paper" aesthetic.
-   Do NOT break existing features (Novel generation, Image generation).
-   The solution must run entirely in the browser (no local file system access required yet).

**Output:**
Please analyze the codebase and propose a step-by-step refactoring plan, then execute it file by file.
