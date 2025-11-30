SCENE 1: TERMINAL SETUP (0:00 - 0:20)
Screen Actions:
Open Terminal with split panes (left: backend, right: frontend)
In left terminal, show the command being typed
In right terminal, show the command being typed
Wait for both servers to start
What You Type:
# Left terminal
cd feedprism_main
uv run uvicorn app.main:app --reload --port 8000

# Right terminal  
cd frontend
npm run dev
Narration:
"Welcome to FeedPrism — an intelligent email intelligence system built for the Memory Over Models hackathon.

Let me start by spinning up our backend — a FastAPI server running on port 8000 — and our React frontend on port 5173.

The backend connects to Qdrant, our vector database, which is the core of FeedPrism's memory system.

Both servers are up. Let's open the app."

SCENE 2: OPENING THE APP — DEMO MODE BANNER (0:20 - 0:35)
Screen Actions:
Open browser to http://localhost:5173
Point out the "Demo Mode" banner at the top
Show the sidebar with navigation items
Point to the "Home" view being active
What You See:
Yellow/orange "Demo Mode" banner at top saying "You're viewing FeedPrism in demo mode with sample data"
Sidebar with: Home, Events, Courses, Blogs, Metrics, Settings
Main content area with Prism Overview section
Narration:
"Here's FeedPrism running in demo mode. You'll see this banner at the top indicating we're using pre-loaded sample data.

We've implemented full Gmail OAuth integration, but for this hackathon demo, we're using dummy newsletters to simplify the judging experience and avoid authentication complexity.

On the left, you see our sidebar — Home, Events, Courses, Blogs, Metrics, and Settings. Each represents a different view of the same Qdrant-backed data.

Let me show you how FeedPrism transforms messy emails into organized knowledge."

