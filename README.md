# Codebase X-Ray

**An AI-powered codebase analysis and Git management platform.**

Codebase X-Ray is a full-stack developer tool that helps developers understand, visualize, analyze and manage complex codebases. It combines static code analysis, interactive dependency visualization, Git operations and AI-powered insights in one platform.

## Overview

Understanding an unfamiliar codebase can be time-consuming. Developers often need to manually trace dependencies, identify circular imports, inspect project architecture and navigate Git operations.

Codebase X-Ray brings these capabilities together to make codebase exploration and maintenance easier.

## Key Features

### 1. Codebase Analysis
- Scan and analyze project source files.
- Extract functions, classes, imports and exports.
- Identify circular dependencies.
- Detect orphan files and dependency hotspots.
- Analyze code metrics and risk scores.
- Perform impact analysis to understand dependency relationships.

### 2. Interactive Dependency Graph
- Visualize relationships between source files.
- Explore local imports and dependencies.
- Identify circular dependency chains.
- Navigate project structure through an interactive graph.

### 3. Git Management
Manage Git operations directly through the application:

- Stage and unstage changes.
- Create commits.
- Push and pull changes.
- Manage branches.
- Fetch remote updates and inspect repository status.
- Manage Git stashes.
- View and manage tags.
- Perform cherry-pick and revert operations.
- Detect and manage merge conflicts.
- Continue or abort supported Git operations.

### 4. AI-Powered Intelligence

Powered by the Gemini API, Codebase X-Ray provides four AI capabilities:

**AI Code Review**
- Analyze source files for potential bugs and security issues.
- Identify performance and code quality concerns.
- Generate severity-based findings.
- Provide explanations and suggested improvements.

**AI Project Architecture Intelligence**
- Understand project architecture.
- Identify architectural layers and key modules.
- Explain data flow.
- Highlight architectural risks and recommendations.

**AI Code Explainer**
- Explain individual functions and code symbols.
- Understand complete source files.
- Break down logic, parameters and return values.

**AI Dependency Intelligence**
- Analyze dependency health.
- Explain circular dependencies.
- Identify high-impact and orphan files.
- Highlight risky dependency relationships.
- Suggest architectural improvements.

### 5. Report Generation
- Export analysis reports in PDF format.
- Export structured analysis data in JSON format.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, TypeScript, Vite |
| Backend | Node.js, Express.js, TypeScript |
| Visualization | React Flow (`@xyflow/react`) |
| AI Integration | Google Gemini API |
| Git Integration | simple-git |
| Development | Git, npm |

## Project Architecture

```text
Codebase-X-ray/
│
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── DependencyGraph.tsx
│   │   └── ...
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── aiService.ts
│   │   ├── aiArchitectureService.ts
│   │   ├── aiExplainerService.ts
│   │   ├── aiDependencyService.ts
│   │   └── ...
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- Git
- Google Gemini API key (for AI features)

### 1. Clone the repository

```bash
git clone https://github.com/Kusum2219/Codebase-X-ray.git
cd Codebase-X-ray
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure backend environment variables

Create a `.env` file inside the `server` directory:

```env
AI_API_KEY=your_gemini_api_key
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=your_supported_gemini_model
```

Use a Gemini model available to your API key.

**Security:** Never commit your `.env` file or expose your API key in frontend code.

### 4. Start the backend

```bash
npm run dev
```

### 5. Install frontend dependencies

Open another terminal:

```bash
cd client
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Build for Production

Backend:

```bash
cd server
npm run build
```

Frontend:

```bash
cd client
npm run build
```

## Use Cases

- Understanding unfamiliar or large codebases.
- Visualizing project dependencies.
- Finding circular imports and potential code risks.
- Reviewing source code with AI assistance.
- Understanding project architecture and code logic.
- Managing common Git operations from one interface.
- Generating code analysis reports.

*Built to make codebases easier to understand, analyze and manage.*
