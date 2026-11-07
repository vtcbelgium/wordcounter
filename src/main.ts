import "./style.css";
import { analyzeText } from "./counter";

const input = document.getElementById("input-text") as HTMLTextAreaElement | null;
const wordsEl = document.getElementById("metric-words");
const charsEl = document.getElementById("metric-characters");
const charsNoSpaceEl = document.getElementById("metric-chars-nospace");
const sentencesEl = document.getElementById("metric-sentences");
const paragraphsEl = document.getElementById("metric-paragraphs");
const readingTimeEl = document.getElementById("metric-reading-time");
const speakingTimeEl = document.getElementById("metric-speaking-time");
const readabilityEl = document.getElementById("metric-readability");
const readingLevelEl = document.getElementById("metric-reading-level");
const clearBtn = document.getElementById("btn-clear");
const copyBtn = document.getElementById("btn-copy");

function updateStats(): void {
  if (!input) return;
  const stats = analyzeText(input.value);

  if (wordsEl) wordsEl.textContent = stats.words.toLocaleString();
  if (charsEl) charsEl.textContent = stats.characters.toLocaleString();
  if (charsNoSpaceEl) charsNoSpaceEl.textContent = stats.charactersNoSpaces.toLocaleString();
  if (sentencesEl) sentencesEl.textContent = stats.sentences.toLocaleString();
  if (paragraphsEl) paragraphsEl.textContent = stats.paragraphs.toLocaleString();
  if (readingTimeEl) readingTimeEl.textContent = `${stats.readingTimeMinutes} min`;
  if (speakingTimeEl) speakingTimeEl.textContent = `${stats.speakingTimeMinutes} min`;
  if (readabilityEl) readabilityEl.textContent = stats.ariScore.toFixed(1);
  if (readingLevelEl) readingLevelEl.textContent = stats.readingLevel;
}

if (input) {
  input.addEventListener("input", updateStats);
}

if (clearBtn && input) {
  clearBtn.addEventListener("click", () => {
    input.value = "";
    updateStats();
    input.focus();
  });
}

if (copyBtn && input) {
  copyBtn.addEventListener("click", async () => {
    if (!input.value) return;
    try {
      await navigator.clipboard.writeText(input.value);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    } catch {
      // Fallback or ignore
    }
  });
}

// Initial calculation
updateStats();
