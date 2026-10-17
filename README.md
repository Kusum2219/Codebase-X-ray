Codebase X-Ray

Understand your codebase. Trace dependencies. Assess the impact of code changes.

Codebase X-Ray is a developer tool designed to help engineers understand unfamiliar codebases and investigate the potential consequences of modifying source files.

The goal is to transform a repository's source code into an interactive architecture map, making dependencies, affected modules, and relevant tests easier to discover.

«Project status: Early development. The repository currently contains the frontend scaffold. The code analysis engine, dependency graph, and impact analysis features are planned.»

The Problem

When developers work in a large or unfamiliar application, a change to one file can affect multiple components, modules, API routes, or tests.

Understanding these relationships manually can be time-consuming and error-prone.

Codebase X-Ray aims to help developers answer questions such as:

- Which modules depend on this file or function?
- What parts of the application could be affected by a proposed change?
- Which tests are relevant to the modified code?
- Where are the dependencies and architectural boundaries of this repository?

Project Vision

The platform is being designed around four core capabilities:

1. Repository Architecture Mapping

Analyze source files and build an interactive dependency graph showing relationships between modules.

2. Change Impact Analysis

Compare code changes and trace their potential impact through the dependency graph.

3. Test Discovery

Identify existing tests connected to modified modules and highlight areas where test coverage may be missing.

4. Codebase Exploration

Allow developers to navigate from a graph node to its source file and inspect the relationships surrounding it.

Planned Features

- GitHub repository integration
- Source file and module dependency extraction
- Interactive architecture visualization
- Changed-file and downstream dependency analysis
- Related test discovery
- Risk indicators based on dependency depth and available test information
- Repository analysis history
- Optional AI-assisted explanations grounded in analyzed source code

The initial implementation will focus on JavaScript and TypeScript repositories. Support for additional languages may be added later.

How It Is Intended to Work

1. A developer selects a supported repository.
2. The analysis engine scans eligible source files.
3. The engine extracts dependency relationships and builds a graph.
4. The developer selects a file or compares a code change.
5. The system displays potentially affected modules and relevant tests.

The analysis is intended to be based on actual repository structure and source-level relationships, rather than relying solely on AI-generated summaries.

Planned Technology Stack

Layer| Technology
Frontend| React, TypeScript, Vite
UI and graph visualization| Tailwind CSS, React Flow
Backend| Node.js, Express.js, TypeScript
Code analysis| TypeScript Compiler API and AST-based parsing
Database| PostgreSQL, Prisma ORM
Repository integration| Git and GitHub API
Testing| Vitest, Supertest, Playwright
Deployment| Vercel, Render, managed PostgreSQL

Technologies may evolve as the implementation and performance requirements become clearer.

Project Structure

The repository is expected to evolve into the following structure:

codebase-xray/
├── frontend/          # React application
├── backend/           # API and repository analysis
├── analyzer/          # Source parsing and dependency extraction
├── docs/              # Architecture and technical documentation
├── tests/             # Automated tests
├── .gitignore
└── README.md

Some directories are planned and may not exist yet.

Getting Started

Prerequisites

- Node.js (a supported current version)
- npm
- Git
- Visual Studio Code or another code editor

Run the current frontend scaffold

Clone the repository:

git clone https://github.com/YOUR-USERNAME/codebase-xray.git
cd codebase-xray

Install dependencies and start the frontend:

cd frontend
npm install
npm run dev

