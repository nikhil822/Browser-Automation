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



