# AutoBrowser: Natural Language Browser Automation

AutoBrowser is a full-stack application that lets you control and automate a web browser using natural language prompts. It features a modern React frontend with light/dark mode and a Node.js/Express backend powered by Playwright for browser automation and NLP for command understanding.

---

## Features
- **Chat-based UI**: Interact with the browser using natural language commands (e.g., "Go to google.com and search for cats").
- **Persistent Browser Session**: The browser stays open after each command, allowing for multi-step workflows.
- **Rich Feedback**: The app replies with detailed summaries of what happened for each command.
- **Light/Dark Mode**: Easily toggle between light and dark themes.
- **Robust Automation**: Supports navigation, clicks, form filling, search, login, and more.

---

## System Design & Workflow

### 🟦 Low-Level System Design / Workflow

1. **User Interaction (Frontend)**
   - **React Frontend**
     - User logs in and accesses a dashboard.
     - User configures an automation task: selects a target website, specifies actions (e.g., login, fill form), or enters a natural language command.
     - User submits the automation job via the UI.

2. **API Request Handling (Backend)**
   - **Express.js REST API**
     - Receives the automation job as a POST request.
     - Validates and parses the request.
     - If the request contains a natural language command, forwards it to the LLM service.

3. **LLM Integration**
   - **Xenova Transformers (BERT/GPT-2, etc.)**
     - Processes the user’s natural language command.
     - Converts it into a structured automation action list (e.g., “Go to URL, fill username, click login”).
     - Sends the structured actions back to the backend.

4. **Automation Orchestration**
   - **TypeScript Orchestrator**
     - Receives the action list.
     - Schedules and manages browser automation tasks.
     - Handles concurrency, error retries, and logging.

5. **Browser Automation Engine**
   - **Playwright Automation Service**
     - Launches a headless (or visible) browser instance.
     - Performs the actions (navigate, fill, click, etc.) on the target website.
     - Handles dynamic elements, waits, and fallback strategies.
     - Captures screenshots and logs for debugging.

6. **Result & Monitoring**
   - **Backend**
     - Collects results, screenshots, and logs.
     - Updates the job status (success, failure, errors).
     - Sends real-time updates or final results to the frontend via API/WebSocket.
   - **Frontend**
     - Displays job progress, logs, and results to the user.
     - Allows users to download logs/screenshots or re-run failed jobs.

#### 🗂️ Component Diagram (Textual)

```
[User] 
   │
   ▼
[React Frontend] 
   │ REST API (job config, status)
   ▼
[Express.js Backend] 
   │
   ├──> [Xenova Transformers LLM Service]  (for NL to actions)
   │
   └──> [Automation Orchestrator (TypeScript)]
             │
             ▼
      [Playwright Automation Service]
             │
             ▼
      [Target Website]
             │
             ▼
      [Results/Logs/Screenshots]
             │
             ▼
      [Frontend Dashboard]
```

#### 🛠️ Key Technologies
- **Frontend:** React, JavaScript/TypeScript
- **Backend:** Node.js, Express.js, TypeScript
- **Automation:** Playwright
- **LLM:** Xenova Transformers (BERT, GPT-2, etc.)
- **Logging:** Winston
- **Testing:** Jest

---

## Directory Structure
```
Browser-automation/
├── client/      # React frontend (Vite + Tailwind CSS)
├── server/      # Express/Node backend (TypeScript + Playwright)
└── README.md    # This file
```

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Browser-automation
```

### 2. Install Dependencies
#### Backend
```bash
cd server
npm install
```
#### Frontend
```bash
cd ../client
npm install
```

### 3. Run the Application
#### Start the Backend
```bash
cd ../server
npm run dev
```
The backend will start on [http://localhost:3001](http://localhost:3001)

#### Start the Frontend
```bash
cd ../client
npm run dev
```
The frontend will start on [http://localhost:5173](http://localhost:5173)

---

## Usage
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. Type a natural language command (e.g., "Go to www.google.com and search for openai").
3. See the browser open and perform the actions. The chat will display a summary of what happened.
4. Continue sending commands—the browser stays open for multi-step workflows.
5. Use the sun/moon icon in the header to toggle light/dark mode.

---

## Example Commands
- `Go to www.google.com`
- `Search for browser automation`
- `Click the first result`
- `Go to https://www.codechef.com/login and click login`
- `Fill username as johndoe and password as secret`

---

## Tech Stack & Tools

### Frontend
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Lucide Icons** 

### Backend
- **Node.js** 
- **Express** 
- **TypeScript**
- **Playwright** (browser automation)
- **Hugging Face Transformers** (NLP model for command classification/parsing, e.g. DistilBERT via @xenova/transformers)



