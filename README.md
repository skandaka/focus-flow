# FocusFlow AI 🧠✨

A smart productivity extension that acts as your personal focus coach, helping you conquer distraction and achieve deep focus.

*Built for the Enriched CS Valley Hacks 2025.*


## About The Project

As students, our greatest challenge isn't the difficulty of the work, but the battle against distraction. A quick break turns into an hour of lost time, and deadlines loom closer, causing stress and anxiety. FocusFlow AI was built to solve this exact problem.

It's more than just a site blocker; it's an intelligent partner that understands your goals. By telling the AI what you're working on, it creates a personalized focus environment, blocking sites that are irrelevant to your task while allowing access to the ones that will help you succeed. Combined with the proven Pomodoro Technique, it helps you build better habits, reduce procrastination, and take back control of your time.

### Key Features

* **🎯 AI-Powered Site Blocking:** Leverages the OpenAI API to intelligently determine if a website is a productive tool or a distraction based on your current tasks.
* **🍅 Integrated Pomodoro Timer:** Structures your work into focused 25-minute sprints and 5-minute breaks to maximize concentration and prevent burnout.
* **✅ Simple Task Management:** A clean interface to add and view the tasks you're focusing on for the current session.
* **📊 Progress Statistics:** Tracks your completed focus sessions and blocked distractions to provide motivation and positive reinforcement.

### Built With

* HTML5
* CSS3
* JavaScript (ES6+)
* Chrome Extension API (Manifest V3)
* OpenAI API

---

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You will need an API key from OpenAI to use the core functionality.

* Get an API Key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Installation

1.  **Clone the repository** or download the project files as a ZIP.
    ```sh
    git clone [https://github.com/your_username/FocusFlow-AI.git](https://github.com/your_username/FocusFlow-AI.git)
    ```
2.  **Add your API Key:**
    * Open the `background.js` file.
    * Find the line: `const OPENAI_API_KEY = 'YOUR_API_KEY_HERE';`
    * Replace `'YOUR_API_KEY_HERE'` with your actual OpenAI API key.
    * > **Security Note:** Never commit this key to a public repository. For this hackathon, this is acceptable, but for a real-world project, use environment variables.

3.  **Load the Extension in Chrome:**
    * Open Google Chrome and navigate to `chrome://extensions`.
    * Turn on **"Developer mode"** using the toggle switch in the top-right corner.
    * Click the **"Load unpacked"** button that appears.
    * Select the folder where you saved the project files.
    * The FocusFlow AI extension will now appear in your browser's toolbar!

## Usage

1.  Click the FocusFlow AI icon in your Chrome toolbar to open the popup.
2.  Navigate to the "Tasks" view and add what you're working on.
3.  Go back to the main view and press the "Start" button.
4.  Try navigating to a distracting site (like a social media feed) and watch the AI block it.
5.  Try navigating to a productive site (like Wikipedia or a documentation page) and see how it's allowed.

## Roadmap

* [ ] Implement detailed analytics and charts for focus tracking.
* [ ] Allow users to create custom whitelists/blacklists for more control.
* [ ] Add AI-powered suggestions for productive websites based on user tasks.
* [ ] Explore caching AI decisions to improve speed and reduce API costs.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

* Thanks to the **Enriched CS Valley Hacks** team for hosting this inspiring event for students.
* The Pomodoro Technique® by Francesco Cirillo.
