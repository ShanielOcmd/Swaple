import './style.css'; 

// ==========================================
// 1. GAME CONFIGURATION & WORD BANK
// ==========================================
const WORD_BANK = [
  { word: "VITE", hint: "A blazing fast modern frontend build tool" },
  { word: "GRID", hint: "A two-dimensional CSS layout system" },
  { word: "NODE", hint: "JavaScript environment outside the browser" },
  { word: "CODE", hint: "Instructions written for a computer" },
  { word: "SCRIPT", hint: "The code file that drives web interactions" },
  { word: "COMPILER", hint: "Translates high-level code to machine code" }
];

const START_TIME = 60;   

// ==========================================
// 2. EXPANDED DYNAMIC GAME STATE
// ==========================================
let gameState = {
  slots: [], 
  currentLetter: "",
  letterBag: [],          
  swapsLeft: 5,
  timeLeft: START_TIME,
  timerId: null,
  gameActive: true,
  anchorIndex: null,      

  // HOT TILE / BOMB VARIABLES
  hotTileIndex: null,     
  hotTileTurns: 0,        

  // PROGRESSION & HINT TRACKING VARIABLES
  currentLevel: 1,
  score: 0,
  activeSolution: "",     
  activeHint: "",          
  hintsUsedThisLevel: 0,

  // MECHANICS STATE VARIABLES
  swapsUsedThisLevel: 0,         
  comboMultiplier: 1,            
  lastCorrectPlacementTime: 0,    
  freezeActive: false,
  freezeTimerId: null             
};

let selectedSlotIndex = null;

// ==========================================
// 3. DOM ELEMENTS & DYNAMIC UI INJECTIONS
// ==========================================
const slotsBoard = document.getElementById("slots-board");
const currentLetterDiv = document.getElementById("current-letter");
const swapBtn = document.getElementById("swap-btn");
const timerDisplay = document.getElementById("timer-display");
const solveInput = document.getElementById("solve-input");
const solveBtn = document.getElementById("solve-btn");

// UPDATE HEADER TITLE TO "SWAPLE"
const headerTitle = document.querySelector("h1");
if (headerTitle) {
  headerTitle.textContent = "SWAPLE";
}

// CLEANUP LEFTOVER ELEMENTS FROM VITE HOT-RELOADING
["inline-next-btn", "inline-retry-btn", "combo-display", "freeze-btn", "hint-container", "arcade-toast", "mechanic-notice", "juice-styles"].forEach(id => {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
});

// ARCADE TOAST NOTIFICATION BANNER
const arcadeToast = document.createElement("div");
arcadeToast.id = "arcade-toast";
arcadeToast.style.fontSize = "1rem";
arcadeToast.style.fontWeight = "bold";
arcadeToast.style.textAlign = "center";
arcadeToast.style.padding = "10px 14px";
arcadeToast.style.margin = "10px auto";
arcadeToast.style.maxWidth = "450px";
arcadeToast.style.borderRadius = "6px";
arcadeToast.style.backgroundColor = "#1e293b";
arcadeToast.style.color = "#f8fafc";
arcadeToast.style.border = "2px solid #3b82f6";
arcadeToast.style.display = "none";
arcadeToast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
slotsBoard.parentNode.insertBefore(arcadeToast, slotsBoard);

function showArcadeToast(message, type = "info", duration = 3500) {
  arcadeToast.textContent = message;
  arcadeToast.style.display = "block";
  
  if (type === "error" || type === "bomb") {
    arcadeToast.style.backgroundColor = "#7f1d1d";
    arcadeToast.style.borderColor = "#ef4444";
  } else if (type === "success") {
    arcadeToast.style.backgroundColor = "#14532d";
    arcadeToast.style.borderColor = "#22c55e";
  } else {
    arcadeToast.style.backgroundColor = "#1e293b";
    arcadeToast.style.borderColor = "#3b82f6";
  }

  clearTimeout(arcadeToast.timeoutId);
  if (duration > 0) {
    arcadeToast.timeoutId = setTimeout(() => {
      arcadeToast.style.display = "none";
    }, duration);
  }
}

// MECHANIC EXPLANATION BANNER INJECTION
const mechanicNotice = document.createElement("div");
mechanicNotice.id = "mechanic-notice";
mechanicNotice.style.fontSize = "0.95rem";
mechanicNotice.style.fontWeight = "bold";
mechanicNotice.style.textAlign = "center";
mechanicNotice.style.margin = "8px auto";
mechanicNotice.style.minHeight = "24px";
slotsBoard.parentNode.insertBefore(mechanicNotice, slotsBoard);

// INLINE ACTION BAR TARGET CONTAINER FOR CONTEXT INJECTIONS
const inputGroupContainer = solveBtn.parentNode;
inputGroupContainer.style.display = "flex";
inputGroupContainer.style.gap = "8px";
inputGroupContainer.style.alignItems = "center";
inputGroupContainer.style.justifyContent = "center";

// CONTEXT-AWARE NEXT LEVEL INLINE BUTTON
const inlineNextBtn = document.createElement("button");
inlineNextBtn.id = "inline-next-btn";
inlineNextBtn.type = "button";
inlineNextBtn.textContent = "Next Level ➔";
inlineNextBtn.style.backgroundColor = "#3b82f6"; 
inlineNextBtn.style.color = "#ffffff";
inlineNextBtn.style.fontWeight = "bold";
inlineNextBtn.style.display = "none"; 
inlineNextBtn.style.padding = "10px 16px";
inlineNextBtn.style.border = "none";
inlineNextBtn.style.borderRadius = "4px";
inlineNextBtn.style.cursor = "pointer";
inputGroupContainer.appendChild(inlineNextBtn);

// CONTEXT-AWARE INLINE RETRY/PLAY AGAIN BUTTON
const inlineRetryBtn = document.createElement("button");
inlineRetryBtn.id = "inline-retry-btn";
inlineRetryBtn.type = "button";
inlineRetryBtn.style.color = "#ffffff";
inlineRetryBtn.style.fontWeight = "bold";
inlineRetryBtn.style.display = "none"; 
inlineRetryBtn.style.padding = "10px 16px";
inlineRetryBtn.style.border = "none";
inlineRetryBtn.style.borderRadius = "4px";
inlineRetryBtn.style.cursor = "pointer";
inputGroupContainer.appendChild(inlineRetryBtn);

// COMBO MULTIPLIER FLOATING CONTAINER
const comboDisplay = document.createElement("div");
comboDisplay.id = "combo-display";
comboDisplay.style.fontSize = "1.2rem";
comboDisplay.style.fontWeight = "bold";
comboDisplay.style.color = "#22c55e"; 
comboDisplay.style.textAlign = "center";
comboDisplay.style.margin = "5px 0";
comboDisplay.textContent = "Combo: x1";
timerDisplay.parentNode.insertBefore(comboDisplay, timerDisplay.nextSibling);

// TACTICAL FREEZE BUTTON ASSEMBLY
const freezeBtn = document.createElement("button");
freezeBtn.id = "freeze-btn";
freezeBtn.type = "button";
freezeBtn.textContent = "❄️ Freeze Clock (-1 Swap, -10s)";
freezeBtn.style.backgroundColor = "#06b6d4"; 
freezeBtn.style.color = "#ffffff";
freezeBtn.style.margin = "10px auto";
freezeBtn.style.display = "block";
swapBtn.parentNode.insertBefore(freezeBtn, swapBtn.nextSibling);

// INITIALIZE INLINE ANIMATION & VISUAL WEIGHT STYLESHEET
const juiceStyles = document.createElement("style");
juiceStyles.id = "juice-styles";
juiceStyles.innerHTML = `
  @keyframes tensionShake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    10% { transform: translate(-1px, -2px) rotate(-1deg); }
    20% { transform: translate(-3px, 0px) rotate(1deg); }
    30% { transform: translate(0px, 2px) rotate(0deg); }
    40% { transform: translate(1px, -1px) rotate(1deg); }
    50% { transform: translate(-1px, 2px) rotate(-1deg); }
    60% { transform: translate(-3px, 1px) rotate(0deg); }
    70% { transform: translate(2px, 1px) rotate(-1deg); }
    80% { transform: translate(-1px, -1px) rotate(1deg); }
    90% { transform: translate(2px, 2px) rotate(0deg); }
    100% { transform: translate(1px, -2px) rotate(-1deg); }
  }
  .tension-active {
    color: #ef4444 !important;
    font-size: 1.5rem !important;
    font-weight: bold !important;
    animation: tensionShake 0.5s infinite;
    display: inline-block;
  }

  /* SCREEN SHAKE ANIMATION FOR BOMB EXPLOSIONS */
  @keyframes screenShake {
    0% { transform: translate(0, 0) rotate(0deg); }
    20% { transform: translate(-10px, 8px) rotate(-1.5deg); }
    40% { transform: translate(10px, -8px) rotate(1.5deg); }
    60% { transform: translate(-8px, -6px) rotate(0deg); }
    80% { transform: translate(8px, 6px) rotate(1deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }
  .screen-shake-active {
    animation: screenShake 0.4s ease-in-out !important;
  }
  
  .slot {
    position: relative;
    transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.3s;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .slot.selected {
    z-index: 10;
    box-shadow: 0 0 15px #3b82f6;
  }

  .slot.correct-glow {
    background-color: #22c55e !important;
    color: #ffffff !important;
    box-shadow: 0 0 12px #22c55e;
  }

  .slot.bomb-tile {
    border: 2px dashed #ef4444;
  }
  
  .heavy-weight-indicator {
    font-size: 0.8rem;
    line-height: 1;
    margin-top: 2px;
    display: block;
  }

  .bomb-counter-indicator {
    font-size: 0.7rem;
    font-weight: bold;
    color: #ef4444;
    margin-top: 1px;
    display: block;
  }

  #current-letter {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 80px;
    min-width: 80px;
    transition: min-width 0.3s ease, padding 0.3s ease;
  }
  #current-letter.warning-mode {
    min-width: 280px; 
    padding: 0 16px;
  }
  .preview-heavy-bag {
    font-size: 1rem;
    margin-top: 4px;
    display: block;
  }

  @keyframes successWave {
    0% { transform: scale(1); background-color: #22c55e; }
    50% { transform: scale(1.15); background-color: #4ade80; }
    100% { transform: scale(1); background-color: #22c55e; }
  }
  .wave-running {
    animation: successWave 0.6s ease-in-out;
  }

  .confetti-particle {
    position: fixed;
    width: 8px;
    height: 8px;
    z-index: 9999;
    pointer-events: none;
    animation: confettiFall linear forwards;
  }
  @keyframes confettiFall {
    0% { transform: translateY(-5vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(105vh) rotate(360deg); opacity: 0.3; }
  }
`;
document.head.appendChild(juiceStyles);

// HINT SYSTEM LAYOUT BUILD
const hintContainer = document.createElement("div");
hintContainer.id = "hint-container";
hintContainer.style.margin = "15px auto";
hintContainer.style.width = "100%";
hintContainer.style.maxWidth = "500px";
hintContainer.style.textAlign = "center";

const hintBtn = document.createElement("button");
hintBtn.id = "hint-btn";
hintBtn.type = "button";
hintBtn.textContent = "💡 Get Hint (-10s)";
hintBtn.style.backgroundColor = "#eab308"; 
hintBtn.style.color = "#000";
hintBtn.style.width = "100%"; 
hintBtn.style.padding = "12px";
hintBtn.style.fontSize = "1rem";
hintBtn.style.fontWeight = "bold";

const hintTextDisplay = document.createElement("p");
hintTextDisplay.id = "hint-text-display";
hintTextDisplay.style.fontStyle = "italic";
hintTextDisplay.style.color = "#a1a1aa";
hintTextDisplay.style.marginTop = "8px";

hintContainer.appendChild(hintBtn);
hintContainer.appendChild(hintTextDisplay);
slotsBoard.parentNode.insertBefore(hintContainer, slotsBoard.nextSibling);

// ==========================================
// 4. HELPER UTILITIES & JUICE GENERATORS
// ==========================================
function triggerScreenShake() {
  document.body.classList.remove("screen-shake-active");
  void document.body.offsetWidth; 
  document.body.classList.add("screen-shake-active");
  
  setTimeout(() => {
    document.body.classList.remove("screen-shake-active");
  }, 400);
}

function isHeavyTile(letter) {
  if (!letter) return false;
  const target = letter.toUpperCase();
  return ["Q", "W", "X", "Z"].includes(target);
}

function renderSlotContents(element, character, isHot, hotTurns, isCorrectMatch = false) {
  element.innerHTML = ""; 
  
  if (isHot) {
    element.classList.add("bomb-tile");
    if (character !== "") {
      element.innerHTML = `<div>${character}</div>`;
    }
    const bombIndicator = document.createElement("span");
    bombIndicator.classList.add("bomb-counter-indicator");
    bombIndicator.textContent = `💣 ${hotTurns}`;
    element.appendChild(bombIndicator);
  } else {
    element.classList.remove("bomb-tile");
    if (character !== "") {
      element.innerHTML = `<div>${character}</div>`;
    }
  }

  if (character !== "" && isHeavyTile(character)) {
    element.classList.add("heavy-tile");
    const weightIcon = document.createElement("span");
    weightIcon.classList.add("heavy-weight-indicator");
    weightIcon.textContent = "🏋️";
    element.appendChild(weightIcon);
  } else {
    element.classList.remove("heavy-tile");
  }

  if (isCorrectMatch) {
    element.classList.add("correct-glow");
  } else {
    element.classList.remove("correct-glow");
  }
}

function triggerConfettiRain() {
  const colors = ["#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ec4899", "#f97316"];
  for (let i = 0; i < 100; i++) {
    const particle = document.createElement("div");
    particle.classList.add("confetti-particle");
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = Math.random() * 100 + "vw";
    
    const duration = Math.random() * 2 + 1.5;
    particle.style.animationDuration = duration + "s";
    particle.style.transform = `scale(${Math.random() * 1.2 + 0.6})`;
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), duration * 1000);
  }
}

function triggerSuccessWave() {
  const slots = Array.from(document.querySelectorAll(".slot"));
  slots.forEach((slot, index) => {
    setTimeout(() => {
      slot.classList.add("wave-running");
      slot.style.backgroundColor = "#22c55e"; 
      slot.style.color = "#ffffff";
      
      slot.addEventListener("animationend", () => {
        slot.classList.remove("wave-running");
      });
    }, index * 120); 
  });
}

// ==========================================
// 5. CORE STATE INTERACTION HANDLERS
// ==========================================
function loadLevelWord() {
  const wordIndex = (gameState.currentLevel - 1) % WORD_BANK.length;
  const levelData = WORD_BANK[wordIndex];
  
  gameState.activeSolution = levelData.word;
  gameState.activeHint = levelData.hint;
  
  const wordLength = gameState.activeSolution.length;
  if (wordLength <= 4) {
    gameState.swapsLeft = 3;
  } else if (wordLength >= 5 && wordLength <= 7) {
    gameState.swapsLeft = 5;
  } else {
    gameState.swapsLeft = 7;
  }
}

function processBombTurn() {
  if (gameState.hotTileIndex !== null) {
    if (gameState.slots[gameState.hotTileIndex] === gameState.activeSolution[gameState.hotTileIndex]) {
      gameState.hotTileIndex = null;
      return;
    }

    gameState.hotTileTurns--;

    if (gameState.hotTileTurns <= 0) {
      triggerScreenShake();

      gameState.timeLeft = Math.max(0, gameState.timeLeft - 10);
      gameState.swapsLeft = Math.max(0, gameState.swapsLeft - 1);

      const correctChar = gameState.activeSolution[gameState.hotTileIndex];
      gameState.slots[gameState.hotTileIndex] = correctChar;

      const bagIdx = gameState.letterBag.indexOf(correctChar);
      if (bagIdx !== -1) {
        gameState.letterBag.splice(bagIdx, 1);
      } else if (gameState.currentLetter === correctChar) {
        gameState.currentLetter = "";
      }

      showArcadeToast("💥 BOOM! Bomb exploded! Penalty: -10s & -1 Swap. Correct letter auto-placed!", "bomb", 5000);
      gameState.hotTileIndex = null;

      if (gameState.timeLeft <= 0) {
        endGame(false, "Time ran out from a bomb explosion!");
      }
    }
  }
}

function initGame() {
  clearInterval(gameState.timerId);
  clearInterval(gameState.freezeTimerId); 
  selectedSlotIndex = null;
  arcadeToast.style.display = "none";

  loadLevelWord();

  gameState.slots = Array(gameState.activeSolution.length).fill("");
  gameState.timeLeft = START_TIME;
  gameState.gameActive = true;
  gameState.hintsUsedThisLevel = 0; 
  gameState.swapsUsedThisLevel = 0;
  gameState.comboMultiplier = 1;
  gameState.lastCorrectPlacementTime = 0;
  gameState.freezeActive = false;

  gameState.anchorIndex = Math.floor(Math.random() * gameState.activeSolution.length);
  gameState.slots[gameState.anchorIndex] = gameState.activeSolution[gameState.anchorIndex];

  gameState.hotTileIndex = null;
  gameState.hotTileTurns = 0;
  
  if (gameState.currentLevel >= 10 && Math.random() < 0.5) {
    let validHotIndices = [];
    for (let i = 0; i < gameState.slots.length; i++) {
      if (i !== gameState.anchorIndex) {
        validHotIndices.push(i);
      }
    }
    if (validHotIndices.length > 0) {
      gameState.hotTileIndex = validHotIndices[Math.floor(Math.random() * validHotIndices.length)];
      gameState.hotTileTurns = 4; 
    }
  }

  let remainingNeeded = [];
  gameState.activeSolution.split("").forEach((letter, index) => {
    if (index !== gameState.anchorIndex) {
      remainingNeeded.push(letter);
    }
  });
  gameState.letterBag = remainingNeeded.sort(() => Math.random() - 0.5);

  let notices = [];
  if (gameState.hotTileIndex !== null) {
    notices.push("🔥 Bomb Active: Place the correct letter tile into the bomb slot within 4 moves to defuse it!");
  }
  const hasHeavy = gameState.activeSolution.split("").some(letter => isHeavyTile(letter)) || 
                   gameState.letterBag.some(letter => isHeavyTile(letter));
  if (hasHeavy) {
    notices.push("🏋️ Heavy Tile: Q, W, X, Z cost 2 swaps to move!");
  }

  if (notices.length > 0) {
    mechanicNotice.style.color = "#f97316";
    mechanicNotice.textContent = notices.join(" | ");
  } else {
    mechanicNotice.textContent = "";
  }

  solveInput.value = "";
  solveInput.placeholder = `Level ${gameState.currentLevel} - Type guess...`; 
  solveInput.disabled = false;
  solveBtn.disabled = false;
  swapBtn.disabled = true; 
  hintBtn.disabled = false;
  freezeBtn.disabled = false;
  freezeBtn.textContent = "❄️ Freeze Clock (-1 Swap, -10s)";
  freezeBtn.style.backgroundColor = "#06b6d4";
  
  inlineNextBtn.style.display = "none"; 
  inlineRetryBtn.style.display = "none"; 

  hintTextDisplay.textContent = ""; 
  hintBtn.textContent = "💡 Get Hint (-10s)";
  timerDisplay.classList.remove("tension-active");

  slotsBoard.innerHTML = "";
  gameState.slots.forEach((letter, index) => {
    const slotElement = document.createElement("div");
    slotElement.classList.add("slot");
    slotElement.dataset.index = index; 
    slotElement.addEventListener("click", handleSlotClick);

    if (index === gameState.anchorIndex) {
      slotElement.classList.add("filled", "anchor");
    }
    
    const isHot = (index === gameState.hotTileIndex);
    const isCorrect = (letter !== "" && letter === gameState.activeSolution[index]);
    renderSlotContents(slotElement, letter, isHot, gameState.hotTileTurns, isCorrect);
    slotsBoard.appendChild(slotElement);
  });

  generateNextLetter();
  startTimer();
  updateUI();
}

function generateNextLetter() {
  const boardIsFull = !gameState.slots.includes("");
  
  if (boardIsFull) {
    gameState.currentLetter = "";
    
    const currentGuess = gameState.slots.join("");
    if (currentGuess !== gameState.activeSolution) {
      currentLetterDiv.classList.add("warning-mode");
      // LARGER, BOLDER WARNING TEXT IN THE GREEN TILE CONTAINER
      currentLetterDiv.innerHTML = `<div style="font-size: 1.05rem; font-weight: 800; color: #ef4444; text-align: center; line-height: 1.3; white-space: nowrap; text-transform: uppercase;">⚠️ Incorrect Word<br>Swap Letters!</div>`;
    } else {
      currentLetterDiv.classList.remove("warning-mode");
      currentLetterDiv.textContent = "-";
    }
    return;
  }

  currentLetterDiv.classList.remove("warning-mode");

  if (gameState.letterBag.length === 0) {
    let remainingNeeded = [];
    gameState.activeSolution.split("").forEach((letter, index) => {
      if (gameState.slots[index] === "") {
        remainingNeeded.push(letter);
      }
    });
    gameState.letterBag = remainingNeeded.sort(() => Math.random() - 0.5);
  }

  gameState.currentLetter = gameState.letterBag.pop();
  
  currentLetterDiv.innerHTML = `<div>${gameState.currentLetter}</div>`;
  if (isHeavyTile(gameState.currentLetter)) {
    const previewWeight = document.createElement("span");
    previewWeight.classList.add("preview-heavy-bag");
    previewWeight.textContent = "🏋️";
    currentLetterDiv.appendChild(previewWeight);
  }
}

function startTimer() {
  gameState.timerId = setInterval(() => {
    if (!gameState.gameActive) return;

    if (!gameState.freezeActive) {
      gameState.timeLeft--;
      
      if (gameState.timeLeft <= 10 && gameState.timeLeft > 0) {
        timerDisplay.classList.add("tension-active");
      } else {
        timerDisplay.classList.remove("tension-active");
      }

      updateUI();

      if (gameState.timeLeft <= 0) {
        timerDisplay.classList.remove("tension-active");
        endGame(false, "Time's up!");
      }
    }
  }, 1000);
}

// ==========================================
// 6. ACTION INTERACTION ROUTINES & SINGLE-PASS SWAP ANIMATION
// ==========================================
function handleSlotClick(event) {
  if (!gameState.gameActive) return;

  const boardIsFull = !gameState.slots.includes("");
  let clickedSlot = event.target;
  
  if (!clickedSlot.classList.contains("slot")) {
    clickedSlot = clickedSlot.closest(".slot");
  }
  
  const index = parseInt(clickedSlot.dataset.index);

  if (index === gameState.anchorIndex) {
    showArcadeToast("This tile is locked as an anchor! It cannot be changed or moved.", "info", 2500);
    return; 
  }

  if (selectedSlotIndex !== null || (gameState.slots[index] !== "" && (boardIsFull || index === gameState.hotTileIndex || selectedSlotIndex !== null))) {
    
    if (selectedSlotIndex === null) {
      selectedSlotIndex = index;
      clickedSlot.classList.add("selected"); 
      return; 
    } 
    
    if (selectedSlotIndex === index) {
      selectedSlotIndex = null;
      clickedSlot.classList.remove("selected");
      return;
    } 

    const firstSlotElement = document.querySelector(`.slot[data-index="${selectedSlotIndex}"]`);
    
    const sourceChar = gameState.slots[selectedSlotIndex];
    const targetChar = gameState.slots[index];
    const swapCost = (isHeavyTile(sourceChar) || isHeavyTile(targetChar)) ? 2 : 1;

    if (gameState.swapsLeft < swapCost) {
      showArcadeToast(`Insufficient Swaps! Moving a Heavy Tile requires 2 swaps. You have ${gameState.swapsLeft}.`, "error", 3000);
      firstSlotElement.classList.remove("selected");
      selectedSlotIndex = null;
      return;
    }

    gameState.comboMultiplier = 1;
    updateUI();

    const rectA = firstSlotElement.getBoundingClientRect();
    const rectB = clickedSlot.getBoundingClientRect();

    const deltaXA = rectB.left - rectA.left;
    const deltaYA = rectB.top - rectA.top;
    const deltaXB = rectA.left - rectB.left;
    const deltaYB = rectA.top - rectB.top;

    const temp = gameState.slots[selectedSlotIndex];
    gameState.slots[selectedSlotIndex] = gameState.slots[index];
    gameState.slots[index] = temp;

    firstSlotElement.style.transform = `translate(${deltaXA}px, ${deltaYA}px)`;
    clickedSlot.style.transform = `translate(${deltaXB}px, ${deltaYB}px)`;

    const oldSelectedIdx = selectedSlotIndex;
    selectedSlotIndex = null; 
    firstSlotElement.classList.remove("selected");

    setTimeout(() => {
      firstSlotElement.style.transition = "none";
      clickedSlot.style.transition = "none";
      
      firstSlotElement.style.transform = "";
      clickedSlot.style.transform = "";

      processBombTurn();

      [oldSelectedIdx, index].forEach(idx => {
        const el = document.querySelector(`.slot[data-index="${idx}"]`);
        if (!el) return;
        
        let isHot = (idx === gameState.hotTileIndex);
        if (idx === gameState.hotTileIndex && gameState.slots[idx] === gameState.activeSolution[idx]) {
          gameState.hotTileIndex = null;
          isHot = false;
        }
        
        const isCorrect = (gameState.slots[idx] !== "" && gameState.slots[idx] === gameState.activeSolution[idx]);
        renderSlotContents(el, gameState.slots[idx], isHot, gameState.hotTileTurns, isCorrect);
      });

      if (gameState.hotTileIndex !== null) {
        const bombEl = document.querySelector(`.slot[data-index="${gameState.hotTileIndex}"]`);
        if (bombEl) {
          const isCorrectBomb = (gameState.slots[gameState.hotTileIndex] !== "" && gameState.slots[gameState.hotTileIndex] === gameState.activeSolution[gameState.hotTileIndex]);
          renderSlotContents(bombEl, gameState.slots[gameState.hotTileIndex], true, gameState.hotTileTurns, isCorrectBomb);
        }
      }

      setTimeout(() => {
        firstSlotElement.style.transition = "";
        clickedSlot.style.transition = "";
      }, 20);

      gameState.swapsLeft = Math.max(0, gameState.swapsLeft - swapCost);
      gameState.swapsUsedThisLevel += swapCost;
      updateUI();

      const currentGuess = gameState.slots.join("");
      if (currentGuess === gameState.activeSolution) {
        endGame(true, "You solved the word!");
        return;
      }

      generateNextLetter();

      if (gameState.swapsLeft <= 0 && gameState.slots.join("") !== gameState.activeSolution) {
        endGame(false, "Out of swaps!");
      }
    }, 400); 

    return; 
  }

  if (gameState.slots[index] !== "") {
    showArcadeToast("That slot is already filled! Click a filled box to start a swap, or use an empty box.", "info", 2500);
    return;
  }

  if (gameState.currentLetter === "") return;

  const placedLetter = gameState.currentLetter;
  const isCorrectLetter = (placedLetter === gameState.activeSolution[index]);

  gameState.slots[index] = placedLetter;
  clickedSlot.classList.add("filled");

  processBombTurn();

  if (isCorrectLetter) {
    const rightNow = Date.now();
    if (gameState.lastCorrectPlacementTime > 0 && (rightNow - gameState.lastCorrectPlacementTime) <= 3000) {
      gameState.comboMultiplier++;
    } else {
      gameState.comboMultiplier = 1;
    }
    gameState.lastCorrectPlacementTime = rightNow;
    gameState.score += 20 * gameState.comboMultiplier;
  } else {
    gameState.comboMultiplier = 1;
  }
  updateUI();

  const currentBombIdx = gameState.hotTileIndex;
  slotsBoard.querySelectorAll(".slot").forEach(slotEl => {
    const sIdx = parseInt(slotEl.dataset.index);
    const isHot = (sIdx === currentBombIdx);
    const isCorrect = (gameState.slots[sIdx] !== "" && gameState.slots[sIdx] === gameState.activeSolution[sIdx]);
    renderSlotContents(slotEl, gameState.slots[sIdx], isHot, gameState.hotTileTurns, isCorrect);
  });

  const updatedBoardIsFull = !gameState.slots.includes("");
  if (updatedBoardIsFull) {
    solveInput.disabled = true;
    solveBtn.disabled = true;
    solveInput.placeholder = "Slots full - Swaps only!";
    solveInput.value = ""; 
    
    const finalGuess = gameState.slots.join("");
    if (finalGuess === gameState.activeSolution) {
      endGame(true, "You solved the word!");
      return;
    }
  }

  checkWinCondition();
  generateNextLetter();
  updateUI();
}

// FREEZE POWER-UP WITH ACTIVE 8-SECOND COUNTDOWN TICKER AFTER PRESSING
freezeBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!gameState.gameActive || gameState.freezeActive) return;

  if (gameState.swapsLeft < 1) {
    showArcadeToast("Not enough swaps left to sacrifice for Freeze power!", "error", 2500);
    return;
  }

  gameState.swapsLeft -= 1;
  gameState.swapsUsedThisLevel += 1;
  gameState.timeLeft = Math.max(0, gameState.timeLeft - 10);

  if (gameState.timeLeft <= 0) {
    timerDisplay.textContent = `Time: 0s | Score: ${gameState.score}`;
    endGame(false, "Time ran out while freezing the clock!");
    return;
  }

  gameState.freezeActive = true;
  freezeBtn.disabled = true;
  freezeBtn.style.backgroundColor = "#64748b"; 
  timerDisplay.classList.remove("tension-active");
  
  timerDisplay.textContent = `❄️ FROZEN (${gameState.timeLeft}s) | Score: ${gameState.score}`;
  updateUI();

  let freezeSecondsRemaining = 8;
  freezeBtn.textContent = `❄️ Unfreezing in ${freezeSecondsRemaining}s...`;

  clearInterval(gameState.freezeTimerId);
  gameState.freezeTimerId = setInterval(() => {
    freezeSecondsRemaining--;
    if (freezeSecondsRemaining > 0) {
      freezeBtn.textContent = `❄️ Unfreezing in ${freezeSecondsRemaining}s...`;
    } else {
      clearInterval(gameState.freezeTimerId);
    }
  }, 1000);

  setTimeout(() => {
    gameState.freezeActive = false;
    clearInterval(gameState.freezeTimerId);
    
    freezeBtn.textContent = "❄️ Freeze Clock (-1 Swap, -10s)";
    freezeBtn.style.backgroundColor = "#06b6d4";
    
    if (gameState.gameActive) {
      freezeBtn.disabled = false;
      if (gameState.timeLeft <= 10 && gameState.timeLeft > 0) {
        timerDisplay.classList.add("tension-active");
      }
    }
    updateUI();
  }, 8000);
});

function checkWinCondition() {
  const currentGuess = gameState.slots.join("");
  if (currentGuess === gameState.activeSolution) {
    endGame(true, "You solved the word!");
  }
}

function endGame(isWin, message) {
  gameState.gameActive = false;
  clearInterval(gameState.timerId);
  clearInterval(gameState.freezeTimerId);
  timerDisplay.classList.remove("tension-active");
  
  swapBtn.disabled = true;
  solveBtn.disabled = true;
  solveInput.disabled = true;
  hintBtn.disabled = true;
  freezeBtn.disabled = true;

  if (isWin) {
    let scoreEarned = 100 * gameState.currentLevel;
    let perfectBuildAwarded = false;

    if (gameState.swapsUsedThisLevel === 0) {
      scoreEarned += 500;
      perfectBuildAwarded = true;
    }

    gameState.score += scoreEarned; 
    gameState.currentLevel++; 

    triggerSuccessWave();
    triggerConfettiRain();

    inlineNextBtn.style.display = "inline-block";

    let victoryText = `🎉 Victory! ${message}`;
    if (perfectBuildAwarded) {
      victoryText += " | 🌟 FLAWLESS BUILD BONUS (+500 PTS)!";
    }
    showArcadeToast(victoryText, "success", 0);

  } else {
    inlineRetryBtn.textContent = `Try Again (Level ${gameState.currentLevel}) ↻`;
    inlineRetryBtn.style.backgroundColor = "#ef4444"; 
    inlineRetryBtn.style.display = "inline-block";
    
    const allSlots = document.querySelectorAll(".slot");
    allSlots.forEach(slot => {
      if (slot.textContent && slot.textContent !== "" && !slot.classList.contains("anchor")) {
        slot.style.backgroundColor = "#ef4444";
      }
    });

    showArcadeToast(`😢 Game Over: ${message}`, "error", 0);
  }
}

function updateUI() {
  timerDisplay.textContent = `Time: ${gameState.timeLeft}s | Score: ${gameState.score}`;
  comboDisplay.textContent = `Combo: x${gameState.comboMultiplier}`;
  
  if (gameState.freezeActive) {
    timerDisplay.textContent = `❄️ FROZEN (${gameState.timeLeft}s) | Score: ${gameState.score}`;
  }

  const boardIsFull = !gameState.slots.includes("");
  if (boardIsFull) {
    swapBtn.textContent = `Swaps Remaining: ${gameState.swapsLeft}`;
    swapBtn.style.opacity = "1";
  } else {
    swapBtn.textContent = `Swaps Available Later: ${gameState.swapsLeft}`;
    swapBtn.style.opacity = "0.6"; 
  }
}

// ==========================================
// 7. INPUT LISTENERS & INIT RUNS
// ==========================================
solveInput.addEventListener("input", () => {
  if (!gameState.gameActive) return;

  let userGuess = solveInput.value.toUpperCase().replace(/[^A-Z]/g, "");
  if (userGuess.length > gameState.activeSolution.length) {
    userGuess = userGuess.slice(0, gameState.activeSolution.length);
  }
  solveInput.value = userGuess;

  if (selectedSlotIndex !== null) {
    const priorSel = document.querySelector(`.slot[data-index="${selectedSlotIndex}"]`);
    if (priorSel) priorSel.classList.remove("selected");
    selectedSlotIndex = null;
  }

  for (let i = 0; i < gameState.slots.length; i++) {
    const slotDomElement = document.querySelector(`.slot[data-index="${i}"]`);
    if (!slotDomElement) continue;

    if (i === gameState.anchorIndex) continue;

    if (i < userGuess.length) {
      const typedChar = userGuess[i];
      gameState.slots[i] = typedChar;
      slotDomElement.classList.add("filled");

      const isHot = (i === gameState.hotTileIndex);
      const isCorrect = (typedChar === gameState.activeSolution[i]);
      renderSlotContents(slotDomElement, typedChar, isHot, gameState.hotTileTurns, isCorrect);
    } else {
      gameState.slots[i] = "";
      slotDomElement.classList.remove("filled");

      const isHot = (i === gameState.hotTileIndex);
      renderSlotContents(slotDomElement, "", isHot, gameState.hotTileTurns, false);
    }
  }

  if (userGuess === gameState.activeSolution) {
    if (gameState.hotTileIndex !== null) {
      const hotTileDom = document.querySelector(`.slot[data-index="${gameState.hotTileIndex}"]`);
      if (hotTileDom) {
        hotTileDom.classList.remove("bomb-tile");
        renderSlotContents(hotTileDom, gameState.activeSolution[gameState.hotTileIndex], false, 0, true);
      }
      gameState.hotTileIndex = null;
    }
    endGame(true, "You solved the word instantly via typing!");
  } else if (!gameState.slots.includes("")) {
    currentLetterDiv.classList.add("warning-mode");
    // LARGER, BOLDER WARNING TEXT IN THE GREEN TILE CONTAINER
    currentLetterDiv.innerHTML = `<div style="font-size: 1.05rem; font-weight: 800; color: #ef4444; text-align: center; line-height: 1.3; white-space: nowrap; text-transform: uppercase;">⚠️ Incorrect Word<br>Swap Letters!</div>`;
  }
});

solveBtn.addEventListener("click", () => {
  const finalGuess = solveInput.value.toUpperCase().trim();

  if (finalGuess.length < gameState.activeSolution.length) {
    showArcadeToast("Not enough letters typed to submit a guess!", "error", 2500);
    return; 
  }
  
  if (finalGuess === gameState.activeSolution) {
    endGame(true, "You solved the word!");
  } else {
    gameState.timeLeft = Math.max(0, gameState.timeLeft - 15);
    gameState.comboMultiplier = 1; 
    showArcadeToast("Incorrect word guess submission! -15 seconds! Combo reset.", "error", 3000);
    
    solveInput.value = "";
    solveInput.dispatchEvent(new Event('input')); 
    updateUI();
  }
});

hintBtn.addEventListener("click", () => {
  if (!gameState.gameActive) return;

  gameState.timeLeft = Math.max(0, gameState.timeLeft - 10);
  updateUI();

  if (gameState.timeLeft <= 0) {
    endGame(false, "Time ran out while requesting a hint!");
    return;
  }

  if (gameState.hintsUsedThisLevel === 0) {
    hintTextDisplay.textContent = `Definition: ${gameState.activeHint}`;
    hintBtn.textContent = "💡 Get Letter Hint (-10s)";
    gameState.hintsUsedThisLevel++;
  } 
  else {
    let unfilledIndexes = [];
    gameState.activeSolution.split("").forEach((letter, idx) => {
      if (gameState.slots[idx] !== letter) {
        unfilledIndexes.push(idx);
      }
    });

    if (unfilledIndexes.length > 0) {
      const randomIdx = unfilledIndexes[Math.floor(Math.random() * unfilledIndexes.length)];
      const targetLetter = gameState.activeSolution[randomIdx];

      const bagIndex = gameState.letterBag.indexOf(targetLetter);
      if (bagIndex !== -1) {
        gameState.letterBag.splice(bagIndex, 1);
      } else if (gameState.currentLetter === targetLetter) {
        gameState.currentLetter = "";
      }

      gameState.slots[randomIdx] = targetLetter;

      const slotDomElement = document.querySelector(`.slot[data-index="${randomIdx}"]`);
      if (slotDomElement) {
        slotDomElement.classList.remove("bomb-tile");
        slotDomElement.classList.add("filled"); 
        renderSlotContents(slotDomElement, targetLetter, false, 0, true);
      }

      if (randomIdx === gameState.hotTileIndex) {
        gameState.hotTileIndex = null; 
      }

      showArcadeToast(`Revealed a letter! "${targetLetter}" added to the board.`, "info", 2500);
      
      const currentGuess = gameState.slots.join("");
      if (currentGuess === gameState.activeSolution) {
        endGame(true, "You solved the word!");
        return;
      }
      
      if (gameState.gameActive && gameState.currentLetter === "") {
        generateNextLetter();
      }
      
      updateUI();
    } else {
      showArcadeToast("All correct letters are already placed on the board layout!", "info", 2500);
    }
  }
});

swapBtn.addEventListener("click", (e) => {
  e.preventDefault(); 
  showArcadeToast("Click a filled block to pick it up, then click another block to swap!", "info", 2500);
});

inlineNextBtn.addEventListener("click", initGame);
inlineRetryBtn.addEventListener("click", initGame);

initGame();