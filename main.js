// ===== STEAM INIT =====
let steamClient = null;
try {
  const steamworks = require('steamworks.js');
  const APP_ID = 3997430;
  steamClient = steamworks.init(APP_ID);
  console.log('[Steam] Logged in as:', steamClient.localplayer.getName());
} catch (e) {
  console.warn('[Steam] Steam not initialized:', e?.message || e);
}

// Small helper to unlock an achievement safely
function unlockAchievement(apiName) {
  if (!steamClient) return false;
  const ok = steamClient.achievement.activate(apiName);
  if (steamClient.achievement.store) steamClient.achievement.store();
  return ok;
}


let titleMusic;
let musicVolume = parseFloat(localStorage.getItem("musicVolume"));
let sfxVolume = parseFloat(localStorage.getItem("sfxVolume"));
let hasSelectedStarter = !!localStorage.getItem('starterKit');



// --- Steam Cloud–ready save schema ---
function buildSaveFromCurrentState() {
  return {
    version: 1,
    starterKit: localStorage.getItem("starterKit") || '',
    playerHP,
    equipment,
    inventory,
    settings: {
      musicEnabled: localStorage.getItem("musicEnabled") === "true",
      soundEnabled: localStorage.getItem("soundEnabled") === "true",
      musicVolume: parseFloat(localStorage.getItem("musicVolume")) || 0.3,
      sfxVolume: parseFloat(localStorage.getItem("sfxVolume")) || 0.3
    }
  };
}




if (isNaN(musicVolume)) {
  musicVolume = 0.3; 
  localStorage.setItem("musicVolume", musicVolume);
}

if (isNaN(sfxVolume)) {
  sfxVolume = 0.3; // Default sound effects volume
  localStorage.setItem("sfxVolume", sfxVolume);
}

if (localStorage.getItem("musicEnabled") === null) {
  localStorage.setItem("musicEnabled", "true");
}
if (localStorage.getItem("soundEnabled") === null) {
  localStorage.setItem("soundEnabled", "true");
}

function asset(relPath) {
  // resolves against index.html location so "./assets/..." works on Win/Linux
  return new URL(relPath, window.location.href).toString();
}


function setupTitleMusic() {
    const musicEnabled = localStorage.getItem("musicEnabled") === "true";

    if (musicEnabled) {
        if (titleMusic) { 
            try { titleMusic.pause(); } catch {} 
        }
        titleMusic = new Audio(asset("sounds/titlescreenmusic.mp3"));
        titleMusic.loop = true;
        titleMusic.volume = musicVolume;
        titleMusic.play().catch((err) => {
            console.warn("Title music couldn't auto-play:", err);
        });
    }
}

function isGameVisible() {
  const gc = document.getElementById('gameContent');
  return gc && getComputedStyle(gc).display === 'block';
}


function stopTitleMusic(fadeTime = 2000) {
    if (!titleMusic) return;

    const fadeSteps = 20;
    const fadeInterval = fadeTime / fadeSteps;
    let currentStep = 0;

    const fade = setInterval(() => {
        currentStep++;
        titleMusic.volume = Math.max(0, titleMusic.volume - (musicVolume / fadeSteps));

        if (currentStep >= fadeSteps) {
            clearInterval(fade);
            titleMusic.pause();
            titleMusic.currentTime = 0;
        }
    }, fadeInterval);
}

// ---- Gameplay "Radio" (multiple tracks with gaps) ----
const GAMEPLAY_TRACKS = [
  asset("sounds/gameplay1.mp3"),
  asset("sounds/gameplay2.mp3"),
  asset("sounds/gameplay3.mp3"),
  asset("sounds/gameplay4.mp3"),
  asset("sounds/gameplay5.mp3"),
];

const gameplayRadio = {
  audio: null,
  lastIndex: -1,
  gapTimer: null,
  minGapMs: 20000, // 20s
  maxGapMs: 45000, // 45s
};

function startGameplayRadio() {
  if (localStorage.getItem("musicEnabled") !== "true") return;
  if (gameplayRadio.audio && !gameplayRadio.audio.paused) return;
  if (gameplayRadio.gapTimer) return;
  playNextGameplayTrack();
}

function stopGameplayRadio(fadeMs = 1000) {
  if (gameplayRadio.gapTimer) { clearTimeout(gameplayRadio.gapTimer); gameplayRadio.gapTimer = null; }
  const a = gameplayRadio.audio;
  if (!a) return;
  const steps = 20, step = (a.volume || musicVolume) / steps, iv = setInterval(()=>{ a.volume = Math.max(0, a.volume - step); }, fadeMs/steps);
  setTimeout(()=>{ clearInterval(iv); try{ a.pause(); }catch{} gameplayRadio.audio = null; }, fadeMs);
}

function playNextGameplayTrack() {
  if (!GAMEPLAY_TRACKS.length) return;
  let idx = Math.floor(Math.random() * GAMEPLAY_TRACKS.length);
  if (GAMEPLAY_TRACKS.length > 1 && idx === gameplayRadio.lastIndex) idx = (idx + 1) % GAMEPLAY_TRACKS.length;
  gameplayRadio.lastIndex = idx;

  if (gameplayRadio.audio) try { gameplayRadio.audio.pause(); } catch {}
  const a = new Audio(GAMEPLAY_TRACKS[idx]);
  gameplayRadio.audio = a;
  a.loop = false;
  a.volume = musicVolume;

  a.addEventListener("ended", () => {
    const gap = Math.floor(Math.random() * (gameplayRadio.maxGapMs - gameplayRadio.minGapMs + 1)) + gameplayRadio.minGapMs;
    gameplayRadio.gapTimer = setTimeout(() => {
      gameplayRadio.gapTimer = null;
      if (localStorage.getItem("musicEnabled") === "true") playNextGameplayTrack();
    }, gap);
  });

  a.play().catch(err => console.warn("Gameplay radio couldn't start:", err));
}

function startGameplayAfterFade(delayMs = 2100) {
  stopTitleMusic();
  setTimeout(() => startGameplayRadio(), delayMs);
}

// IDs you already use (adjust if yours differ)
const START_ID = 'startSelection';  // your start/menu container
const GAME_ID  = 'gameContent';   // your main game container

function $(id){ return document.getElementById(id); }

function show(el){ el.style.display = ''; }
function hide(el){ el.style.display = 'none'; }

/** Crossfade: fade to black, swap screens, fade back in */
function crossfadeSwap(swapFn) {
  const overlay = document.getElementById('transitionOverlay');
  overlay.hidden = false;          // make it participate in layout

  // Force a reflow so the browser acknowledges opacity: 0 first
  // (this ensures the next class change will animate)
  void overlay.offsetHeight;

  // Now we can fade to black
  overlay.classList.add('cover');

  const onFadeToBlack = () => {
    overlay.removeEventListener('transitionend', onFadeToBlack);

    // Do the screen swap while it's black
    swapFn();

    // Next frame: fade back in
    requestAnimationFrame(() => {
      overlay.classList.remove('cover');

      overlay.addEventListener('transitionend', () => {
        overlay.hidden = true;     // cleanup
      }, { once: true });
    });
  };

  overlay.addEventListener('transitionend', onFadeToBlack, { once: true });
}

function clearVolatileForNewGame() {
  // Timers / cooldowns
  localStorage.removeItem('gatherStartTime');

  localStorage.removeItem('prayStartTime');
  localStorage.removeItem('prayCooldownTime');
  localStorage.removeItem('prayCooldownActive');

  // Stop any running pray cooldown loop & reset UI
  if (typeof cooldownInterval !== 'undefined' && cooldownInterval) {
    clearInterval(cooldownInterval);
    cooldownInterval = null;
  }
  const prayBtn = document.getElementById('prayButton');
  if (prayBtn) { prayBtn.disabled = false; prayBtn.textContent = 'Pray'; }
  const prayCd = document.getElementById('prayCooldown');
  if (prayCd) { prayCd.style.display = 'none'; }

  // Local “save-state” bits so nothing from the old run bleeds in
  localStorage.removeItem('playerHP');
  localStorage.removeItem('inventory');
  localStorage.removeItem('equipment');
  localStorage.removeItem('starterKit');
}

/** Enter the game view with a smooth transition */
function enterGameWithTransition() {
  crossfadeSwap(() => {
    hide($(START_ID));
    show($(GAME_ID));
  });

  // start gameplay music right after the crossfade transition
  startGameplayAfterFade(0);   // 0ms because the overlay already handled the fade
}

document.addEventListener('DOMContentLoaded', async () => {
  const mainMenu = document.getElementById('mainMenu');
  const starter  = document.getElementById('starterSelection');
  const game     = document.getElementById('gameContent');

  // Show ONLY the main menu on boot
  if (mainMenu) mainMenu.style.display = 'block';
  if (starter)  starter.style.display  = 'none';
  if (game)     game.style.display     = 'none';

  // Title music for menu
  try { setupTitleMusic?.(); } catch {}

  // Enable/disable Continue & Load depending on save presence
  let hasSave = false;
  try { hasSave = !!(await window.saveAPI?.load?.()); } catch {}

  const btnContinue = document.getElementById('btnContinue');
  // const btnLoad     = document.getElementById('btnLoad');
  if (btnContinue) btnContinue.disabled = !hasSave;
  // if (btnLoad)     btnLoad.disabled     = !hasSave;

  // Hook menu buttons
  document.getElementById('btnNewGame')?.addEventListener('click', startNewGameFromMenu);
  document.getElementById('btnContinue')?.addEventListener('click', continueFromMenu);
  // document.getElementById('btnLoad')?.addEventListener('click', continueFromMenu); // single slot for now
  document.getElementById('btnQuit')?.addEventListener('click', () => {
    if (window.electronAPI?.quitApp) window.electronAPI.quitApp();
  });

  // Wire Settings → Save Game
  const saveBtn = document.getElementById('saveNowButton');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const orig = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      try {
        await saveGameData();        // uses your existing function
        saveBtn.textContent = 'Saved ✓';
      } catch (e) {
        console.error(e);
        saveBtn.textContent = 'Save failed';
      } finally {
        setTimeout(() => { saveBtn.textContent = orig; saveBtn.disabled = false; }, 900);
      }
    });
  }

  // === Skill tooltips (unchanged) ===
  const prayBtn = document.getElementById("prayButton");
  if (prayBtn) {
    prayBtn.innerHTML = `<span class="has-tip label" data-tip="${SKILL_DESCRIPTIONS['Pray']}">Pray</span>`;
  }

  const setSkillTooltip = (id, name) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<span class="has-tip label" data-tip="${SKILL_DESCRIPTIONS[name]}">${name}</span>`;
  };

  setSkillTooltip('bulwarkButton',  'Bulwark');
  setSkillTooltip('accelButton',    'Acceleration');
  setSkillTooltip('empowerButton',  'Empower');

  // === Area & Monster modal wiring ===
  // (1) Restore last picks if present (optional)
  try {
    const sa = localStorage.getItem('selectedArea');
    const sm = localStorage.getItem('selectedMonster');
    if (sa && AREA_DEFS[sa]) selectedArea = sa;
    if (sm && monsters[sm])  applySelectedMonster(sm);
  } catch {}

  // (2) Buttons / backdrop
  const openBtn = document.getElementById('openAreaMonsterBtn');
  const closeBtn = document.getElementById('amClose');
  const cancelBtn = document.getElementById('amCancel');
  const confirmBtn = document.getElementById('amConfirm');
  const backdrop = document.getElementById('amBackdrop');

  openBtn?.addEventListener('click', openAreaMonsterModal);
  closeBtn?.addEventListener('click', closeAreaMonsterModal);
  cancelBtn?.addEventListener('click', closeAreaMonsterModal);
  backdrop?.addEventListener('click', closeAreaMonsterModal);
  confirmBtn?.addEventListener('click', confirmAreaMonster);

  // (3) Optional: if no monster yet, seed a sensible default from current area
  if (!selectedMonster) {
    const firstArea = selectedArea || Object.keys(AREA_DEFS)[0];
    const firstList = (AREA_DEFS[firstArea] || []);
    if (firstList.length) applySelectedMonster(firstList[0]);
  }

  // --- Fullscreen toggle button (Settings) ---
const fsBtn = document.getElementById('toggleFullscreenBtn');
if (fsBtn && window.electronAPI?.toggleFullScreen) {
  // initialize label to actual state (optional)
  try {
    window.electronAPI.getFullScreenState?.().then(isFull => {
      fsBtn.textContent = isFull ? 'Windowed' : 'Fullscreen';
    });
  } catch {}

  fsBtn.addEventListener('click', async () => {
    try {
      const isFull = await window.electronAPI.toggleFullScreen();
      // update label so player sees what they'll switch to next
      fsBtn.textContent = isFull ? 'Windowed' : 'Fullscreen';
    } catch (e) {
      console.error('Toggle fullscreen failed', e);
    }
  });
}

  updateSelectionStatus();
});


function applySaveToState(save) {
  try {
    playerHP  = Number(save.playerHP ?? 100);
    equipment = save.equipment ?? equipment;
    inventory = save.inventory ?? inventory;

    // mirror settings to localStorage so existing UI continues to work
    const s = save.settings || {};
    localStorage.setItem("musicEnabled", String(!!s.musicEnabled));
    localStorage.setItem("soundEnabled", String(!!s.soundEnabled));
    localStorage.setItem("musicVolume", String(s.musicVolume ?? 0.3));
    localStorage.setItem("sfxVolume",   String(s.sfxVolume   ?? 0.3));

    // refresh UI
    renderEquipmentSlots();
    renderEquipmentPanel?.();
    updatePlayerStats?.();
    updateInventory?.();
    // select current monster background if any
    if (isGameVisible()) selectMonster?.();
  } catch (e) {
    console.warn('applySaveToState failed:', e);
  }
}

async function startNewGameFromMenu() {
  // wipe existing save file 
  try { await window.saveAPI?.clear?.(); } catch {}
  // clear volatile/local state so old timers don’t carry over
  clearVolatileForNewGame();

  // reset minimal runtime state
  playerHP = 100;
  equipment = { weapon: "Stick", attack: 5, armor: "Clothes", defense: 0 };
  inventory = { "Iron Ore": 0, "Wood": 0, "Leather": 0, "Steel Ore": 0 };

  // swap to Starter screen, keep title music for now
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('starterSelection').style.display = 'block';
  document.getElementById('gameContent').style.display = 'none';
}

async function continueFromMenu() {
  const save = await window.saveAPI?.load?.();
  if (!save) return;

  applySaveToState(save); // your helper that hydrates playerHP, equipment, inventory, settings
  resumeSkillsFromSave(save.skills || JSON.parse(localStorage.getItem("saveSkills") || "{}"));
  // show game
  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('starterSelection').style.display = 'none';
  document.getElementById('gameContent').style.display = 'block';

  // refresh UI & timers
  renderEquipmentSlots?.();
  updateInventory?.();
  selectMonster?.();
  restoreGatheringCooldown?.();

  // music swap
  stopTitleMusic?.();
  startGameplayRadio?.();
}

// Global variables and starter kit
let equipment = {
    weapon: "Stick",
    attack: 5,
    armor: "Clothes",  // Add armor slot here
    defense: 0 // Add defense stat to track armor's effect
};

let playerHP = 100;

// Making sure that if Item in inventory is 0 it will now show in inventory.
let inventory = JSON.parse(localStorage.getItem("inventory")) || {
    "Iron Ore": 0,
    "Iron Ingot": 0,
    "Wood": 0,
    "Leather": 0,
    "Steel Ingot": 0,
    "Coal": 0,
    "Herb": 0,
    "Water": 0
};

let monster = {
    hp: 100 // Default monster health
};

// Example of selecting a monster
let selectedMonster = ""; 

let selectedStarter = ""; // Store the selected starter kit


const BASE_ATTACK  = 5;  // your current starting attack
const BASE_DEFENSE = 0;  // your current starting defense

function getEquipType(itemName) {
  const r = craftingRecipes[itemName];
  if (!r) return null;
  if (typeof r.attackBoost  !== "undefined") return "weapon";
  if (typeof r.defenseBoost !== "undefined") return "armor";
  return null;
}

function isEquipped(itemName) {
  const kind = getEquipType(itemName);
  if (kind === "weapon") return equipment.weapon === itemName;
  if (kind === "armor")  return equipment.armor  === itemName;
  return false;
}

function toggleEquip(itemName) {
  const r = craftingRecipes[itemName];
  if (!r) return;                       // not an equippable recipe
  const kind = getEquipType(itemName);
  if (!kind) return;

  if (kind === "weapon") {
    if (equipment.weapon === itemName) {
      // Unequip
      equipment.weapon = "None";
      equipment.attack = BASE_ATTACK;
    } else {
      // Equip this weapon
      equipment.weapon = itemName;
      equipment.attack = r.attackBoost ?? BASE_ATTACK;
    }
  } else if (kind === "armor") {
    if (equipment.armor === itemName) {
      // Unequip
      equipment.armor  = "None";
      equipment.defense = BASE_DEFENSE;
    } else {
      // Equip this armor
      equipment.armor  = itemName;
      equipment.defense = r.defenseBoost ?? BASE_DEFENSE;
    }
  }

  renderEquipmentSlots();
  renderEquipmentPanel();
  updatePlayerStats();
  saveGameData();
  updateInventory(); // refresh buttons/labels
}


// Construct of what monsters that is available
const monsters = {
    "Slime": { hp: 20, attack: [4, 8], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 40, attack: [7, 13], drops: ["Wolf Pelt", "Sharp Fang", "Meat"] },
    "Goblin": { hp: 60, attack: [10, 15], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 80, attack: [15, 20], drops: ["Orc Tooth", "Iron Shard"] },
    "Angus": { hp: 120, attack: [30, 35], drops: ["Fox Hat", "Explosive Residue", "Wheat Straw"] }

    // Add more monsters here (Make sure to add another option in HTML)
    // copy pase one of these and change the name, hp, attack and drops
};

function playSound(soundPath) {
  if (!isGameVisible()) return;                   // block sounds on menu/starter
  if (!soundPath || /\/$/.test(soundPath)) return;

  const soundEnabled = localStorage.getItem("soundEnabled") === "true";
  if (!soundEnabled) return;

  const audio = new Audio(asset(soundPath));
  audio.volume = sfxVolume;
  audio.play().catch(err => console.warn('SFX play failed:', err));
}

// Define a mapping of monsters to their background image and the monster image
const monsterDataMap = {
  'Slime': {
    background: 'url("images/cave.png")',
    monsterImage: 'images/slime.png',
    sound: 'sounds/slime.mp3'
  },
  'Wolf': {
    background: 'url("images/fantasy-forest.png")',
    monsterImage: 'images/wolf.png',
    sound: ''
  },
  'Goblin': {
    background: 'url("images/goblin-camp.png")',
    monsterImage: 'images/goblin.png',
    sound: ''
  },
  'Orc': {
    background: 'url("images/orc-camp.png")',
    monsterImage: 'images/orc.png',
    sound: ''
  },
  'Angus': {
    background: 'url("images/angusfields.png")',
    monsterImage: 'images/angus.png',
    sound: ''
  }
};

const AREA_DEFS = {
  "Cave":           ["Slime"],
  "Forest":         ["Wolf"],
  "Goblin Camp":    ["Goblin"],
  "Orc Camp":       ["Orc"],
  "Field Overlook": ["Angus"], // Boss here
};

const AREA_BG = {
  "Cave":           'url("images/cave.png")',
  "Forest":         'url("images/fantasy-forest.png")',
  "Goblin Camp":    'url("images/goblin-camp.png")',
  "Orc Camp":       'url("images/orc-camp.png")',
  "Field Overlook": 'url("images/angusfields.png")',
};

let selectedArea = Object.keys(AREA_DEFS)[0] || null; // current/last used area
let tempArea = selectedArea;          // temp selection inside modal
let tempMonster = null;               // temp monster in modal

function selectMonster() {
    if (!isGameVisible()) return;

    const selectElement = document.getElementById("monsterSelect");
    if (!selectElement) return; // safe if you removed the dropdown

    const monsterName = selectElement.value;

    if (monsters[monsterName]) {
        selectedMonster = monsterName;
        monster.hp = monsters[monsterName].hp;

        // Update monster HP label and values
        document.getElementById("monsterHPLabel").textContent = `${monsterName}'s HP`;
        document.getElementById("monsterHealthText").textContent = monster.hp;
        document.getElementById("monsterHealth").style.width = "100%";

        // Update background & monster image
        const monsterData = monsterDataMap[monsterName];
        document.body.style.backgroundImage = monsterData.background;
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.querySelector('.monster-image img').src = monsterData.monsterImage;

        // Play monster sound (if available)
        playSound(monsterData.sound);
    }
}

function applySelectedMonster(monsterName){
  if (!monsters[monsterName]) return;

  selectedMonster = monsterName;
  monster.hp = monsters[monsterName].hp;

  // UI: HP bar + labels
  document.getElementById("monsterHPLabel").textContent = `${monsterName}'s HP`;
  document.getElementById("monsterHealthText").textContent = monster.hp;
  document.getElementById("monsterHealth").style.width = "100%";

  // Background: prefer area image
  const data = monsterDataMap[monsterName];
  const bg = (typeof selectedArea === 'string' && AREA_BG?.[selectedArea])
    ? AREA_BG[selectedArea]
    : data.background;

  document.body.style.backgroundImage = bg;
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundSize  = 'cover';

  // Monster image
  document.querySelector('.monster-image img').src = data.monsterImage;

  // SFX
  playSound(data.sound);
  updateSelectionStatus();
}

function renderAreasList(){
  const wrap = document.getElementById('amAreas');
  if (!wrap) return;
  wrap.innerHTML = '';

  Object.keys(AREA_DEFS).forEach(area=>{
    const b = document.createElement('button');
    b.className = 'am-area';
    b.type = 'button';
    b.textContent = area;
    b.setAttribute('aria-pressed', String(tempArea === area));
    b.onclick = () => { tempArea = area; tempMonster = null; renderAreasList(); renderMonstersGrid(); };
    wrap.appendChild(b);
  });
}

function renderMonstersGrid(){
  const title = document.getElementById('amMonstersTitle');
  const grid  = document.getElementById('amGrid');
  if (!grid || !title) return;

  title.textContent = `Monsters in “${tempArea}”`;
  grid.innerHTML = '';

  const names = AREA_DEFS[tempArea] || [];
  names.forEach(name=>{
    if (!monsterDataMap[name]) return;
    const card = document.createElement('button');
    card.className = 'am-card';
    card.type = 'button';
    card.setAttribute('aria-pressed', String(tempMonster === name));

    const img = document.createElement('img');
    img.src = monsterDataMap[name].monsterImage;
    img.alt = name;

    const label = document.createElement('div');
    label.className = 'name';
    label.textContent = name;

    card.appendChild(img); card.appendChild(label);
    card.onclick = () => {
      tempMonster = name;
      document.querySelectorAll('.am-card').forEach(c=>c.setAttribute('aria-pressed','false'));
      card.setAttribute('aria-pressed','true');
    };

    grid.appendChild(card);
  });

  // auto pick first if none selected
  if (!tempMonster && names.length){
    tempMonster = names[0];
    const first = grid.querySelector('.am-card');
    if (first) first.setAttribute('aria-pressed','true');
  }
}

function openAreaMonsterModal(){
  const modal = document.getElementById('amModal');
  const back  = document.getElementById('amBackdrop');
  if (!modal || !back) return;

  // seed temps from current selection
  tempArea = selectedArea || Object.keys(AREA_DEFS)[0];
  // if current selectedMonster not in area, tempMonster will be set by render
  tempMonster = (AREA_DEFS[tempArea] || []).includes(selectedMonster) ? selectedMonster : null;

  renderAreasList();
  renderMonstersGrid();

  modal.hidden = false;
  back.hidden = false;

  // basic focus & esc
  setTimeout(()=>document.getElementById('amClose')?.focus(), 0);
  document.addEventListener('keydown', escCloseHandler);
}

function closeAreaMonsterModal(){
  const modal = document.getElementById('amModal');
  const back  = document.getElementById('amBackdrop');
  if (!modal || !back) return;
  modal.hidden = true;
  back.hidden = true;
  document.removeEventListener('keydown', escCloseHandler);
}

function escCloseHandler(e){
  if (e.key === 'Escape') closeAreaMonsterModal();
}

function confirmAreaMonster(){
  if (!tempMonster) return; // require a monster
  selectedArea = tempArea;
  applySelectedMonster(tempMonster);
  // optional persistence
  try { localStorage.setItem('selectedArea', selectedArea); } catch {}
  try { localStorage.setItem('selectedMonster', selectedMonster); } catch {}
  closeAreaMonsterModal();
  updateSelectionStatus();
}


const quitBtn = document.getElementById("quitGameButton");
if (quitBtn) {
  quitBtn.addEventListener("click", () => {
    if (window.electronAPI?.quitApp) {
      window.electronAPI.quitApp();
    } else {
      // dev fallback if preload didn’t load for some reason
      window.close();
    }
  });
}

//Updating player stats when you add a new weapon or armor dynamically
function updatePlayerStats() {
    document.getElementById("playerAttack").innerText = equipment.attack;
    document.getElementById("playerDefense").innerText = equipment.defense;
}
//Calling the update when player updates attack and defense
updatePlayerStats();

// Different Crafting recipies
const craftingRecipes = {
    // Weapons
    "Training Sword": {
        materials: {
            "Wood": 3,
            "Leather": 2
        },
        result: "Training Sword",
        attackBoost: 7
    },

    "Slime Sword": {
        materials: {
            "Slime Goo": 3,
            "Sticky Residue": 2
        },
        result: "Slime Sword",
        attackBoost: 9
    },

    "Iron Sword": {
        materials: {
            "Iron Ingot": 5,
            "Wood": 3,
            "Leather": 3,
            "Training Sword": 1
        },
        result: "Iron Sword",
        attackBoost: 14
    },

    "Sharp-Fanged Blade": {
        materials: {
            "Sharp Fang": 3,
            "Wood": 2,
            "Iron Ingot": 5
        },
        result: "Sharp-Fanged Blade",
        attackBoost: 16
    },

    "Sharpend Goblin Blade": {
        materials: {
            "Rusty Dagger": 3,
            "Sticky Residue": 2,
            "Wood": 3,
            "Iron Ingot": 10
        },
        result: "Sharpend Goblin Blade",
        attackBoost: 20
    },

    "Steel Sword": {
        materials: {
            "Steel Ingot": 5,
            "Leather": 3,
            "Iron Sword": 1
        },
        result: "Steel Sword",
        attackBoost: 25
    },

    "Orcish Blade": {
        materials: {
            "Orc Tooth": 5,
            "Iron Shard": 10,
            "Steel Ingot": 10

        },
        result: "Orcish Blade",
        attackBoost: 30
    },

    "Explosive Blade (Legendary)": {
        materials: {
            "Fox Hat": 5,
            "Explosive Residue": 10,
            "Wheat Straw": 15
        },
        result: "Explosive Blade (Legendary)",
        attackBoost: 40
    },
    
    // Armor
    "Leather Armor": {
        materials: {
            "Leather": 3,
            "Iron Ingot": 1
        },
        result: "Leather Armor",
        defenseBoost: 5
    },
    "Slime Armor": {
        materials: {
            "Slime Goo": 10,
            "Sticky Residue": 5
        },
        result: "Slime Armor",
        defenseBoost: 9
    },

    "Iron Armor": {
        materials: {
            "Iron Ingot": 10,
            "Leather Armor": 1 // Requires Leather Armor as material
        },
        result: "Iron Armor",
        defenseBoost: 13
    },

    "Wolf Armor": {
        materials: {
            "Wolf Pelt": 10,
            "Iron Ingot": 10,
            "Leather": 5
        },
        result: "Wolf Armor",
        defenseBoost: 16
    },

    "Goblin-Made Armor": {
        materials: {
            "Rusty Dagger": 5,
            "Sticky Residue": 2,
            "Iron Ingot": 5,
            "Steel Ingot": 10
        },
        result: "Goblin-Made Armor",
        defenseBoost: 20
    },

    "Steel Armor": {
        materials: {
            "Steel Ingot": 10,
            "Iron Armor": 1  // Requires Iron Armor as material
        },
        result: "Steel Armor",
        defenseBoost: 24
    },

    "Orcish Armor": {
        materials: {
            "Leather": 5,
            "Orc Tooth": 10,
            "Iron Shard": 10,
            "Steel Ingot": 10
        },
        result: "Orcish Armor",
        defenseBoost: 27
    },

    "Special Fox Hat (Legendary)": {
        materials: {
            "Fox Hat": 1,
            "Explosive Residue": 5,
            "Wheat Straw": 1
        },
        result: "Special Fox Hat (Legendary)",
        defenseBoost: 35
    },
    
    // Consumables

    "Health Potion": {
        materials: {
          "Herb": 3,
          "Water": 1
        },
        result: "Health Potion",
        consumable: true,
        effect: { heal: 20 }
    },
     "Major Health Potion": {
        materials: {
          "Herb": 5,
          "Water": 3,
          "Slime Goo": 3
        },
        result: "Major Health Potion",
        consumable: true,
        effect: { heal: 50 }
    },
    "Grand Health Potion": {
        materials: {
          "Herb": 10,
          "Water": 5,
          "Slime Goo": 5
        },
        result: "Grand Health Potion",
        consumable: true,
        effect: { heal: 75 }
    },

    "Strength Stew": {
      materials: {
        "Wolf Pelt": 1,
        "Meat": 2
      },
      result: "Strength Stew",
      consumable: true,
      effect: { buffAttack: 5, duration: 60 } // +5 attack for 60s
    },

    // Smelting
    "Coal": {
      category: "smelting",
      materials: {
        "Wood": 1
      },
      result: "Coal"
    },

     "Iron Ingot": {
      category: "smelting",
      materials: {
        "Iron Ore": 2,
        "Coal": 1
      },
      result: "Iron Ingot"
    },

    "Steel Ingot": {
      category: "smelting",
      materials: {
        "Iron Ingot": 5,
        "Coal": 1
      },
      result: "Steel Ingot"
    }
    // Add more upgrades here...
};

const ITEM_DESCRIPTIONS = {
  // materials
  "Iron Ore": "Material found underground, perfect for making weapons and armor from.",
  "Steel Ingot": "Made as a bi-product in ironmaking. A much better material",
  "Wood": "A strong material well-suited for many different uses.",
  "Herb": "A fragrant plant, with strange properties",
  "Meat": "Good source of protein. Fills up your stomach well",
  "Water": "Refreshing. Perfect for a nice cold drink",
  "Coal": "After a long time underground, under constant pressure, it’s well suited for many applications",
  "Leather": "Gathered from various animals and processed into a usable material.",
  "Iron Ingot": "A material perfectly suited for those in need of either tools, weapons or armor",
  "Slime Goo": "Remnants of Slimes. Kinda springy and bouncy",
  "Sticky Residue": "Perfect for putting two things together that shouldn’t move",
  "Wolf Pelt": "A full usable pelt. Works well in making things",
  "Sharp Fang": "Ouch! Its really sharp, be careful",
  "Goblin Ear": "It’s long and it’s green. Just don’t eat it",
  "Rusty Dagger": "Not sharp, but make sure you don’t get cut by it",
  "Orc Tooth": "A gnarly looking tooth, not well kept",
  "Iron Shard": "Collect enough and you’ll almost have something useful",
  "Fox Hat": "It’s weird…It almost looks good",
  "Explosive Residue": "What even is this? Some kind of powder?",
  "Wheat Straw": "Eugh, it’s so…wet…",

  // weapons
  "Training Sword": "A good piece of equipment for those just starting out",
  "Slime Sword": "Strangely, it doesn’t cut as much as it…dissolves whatever it touches.",
  "Iron Sword": "A fine weapon for an Adventurer",
  "Sharp-Fanged Blade": "Made from the teeth of ferocious wolves. Packs an extra bite",
  "Sharpend Goblin Blade": "A small, crude but very sharp knife, perfect for cutting other creatures",
  "Steel Sword": "Sharp, well-balanced and all around a fine weapon",
  "Orcish Blade": "A large blade, made with function over form.",
  "Explosive Blade (Legendary)": "Is this….Isnt this just dynamite on a stick?",

  // armor
  "Leather Armor": "Provides adequate protection against basic weapons",
  "Slime Armor": "Strikes seem to simply bounce off of you",
  "Iron Armor": "Heavy, but offers better protection",
  "Wolf Armor": "Faster, stronger and even better. But not harder",
  "Goblin-Made Armor": "Strangely, you wear less, but feel more protected",
  "Steel Armor": "High-.quality craftsmanship. Keeps you protected very well",
  "Orcish Armor": "Abit outlandish, but feels great to wear",
  "Special Fox Hat (Legendary)": "What is pain? There is only chaos. It kinda smells funny too",

  // consumables
  "Health Potion": "A thick, red liquid. Doesn’t taste too bad (Heals for 25 HP)",
  "Major Health Potion": "A thick red liquid, with what seems to be some sparkles in it (Heals for 50 HP)",
  "Grand Health Potion": "A thick red liquid, containing some kind of magic (Heals for 75 HP)",
  "Strength Stew": "A mix of vegetables and meat. Fills the stomach and warms the heart(Increases damage dealt by 5 for 5 minutes)",
};

// Descriptions for skills
const SKILL_DESCRIPTIONS = {
  "Pray": "Pray to regain 50 HP instantly.",
  "Bulwark":"Raise your guard, halving incoming damage for 30s.",
  "Acceleration": "Act twice each second for 15s.",
  "Empower": "Gain +10 attack for 20s.",

  // add more as you add skills
};

// Small helper: map item -> icon path (add/extend as you add art)
const ITEM_ICONS = {
  "Iron Ore": "images/items/iron-ore.png",
  "Iron Ingot": "images/items/iron-ingot.png",
  "Steel Ingot": "images/items/steel-ingot.png",
  "Wood": "images/items/wood.png",
  "Leather": "images/items/leather.png",
  "Water": "images/items/water-drop.png",
  "Herb": "images/items/herb.png",
  "Coal": "images/items/coal.png",
  "Slime Goo": "images/items/slime-goo.png",
  "Sticky Residue": "images/items/sticky-res.png",
  "Wolf Pelt": "images/items/wolf-pelt.png",
  "Sharp Fang": "images/items/sharp-fang.png",
  "Goblin Ear": "images/items/goblin-ear.png",
  "Rusty Dagger": "images/items/rusty-dagger.png",
  "Iron Shard": "images/items/iron-shard.png",
  "Orc Tooth": "images/items/orc-tooth.png",
  "Wheat Straw": "images/items/wheat.png",
  "Explosive Residue": "images/items/explosive.png",

  // crafted gear
  "Training Sword": "images/items/training-sword.png",
  "Slime Sword": "images/items/slime-sword.png",
  "Iron Sword": "images/items/iron-sword.png",
  "Sharp-Fanged Blade": "images/items/fang-sword.png",
  "Sharpend Goblin Blade": "images/items/goblin-blade.png",
  "Steel Sword": "images/items/steel-sword.png",
  "Orcish Blade": "images/items/orc-blade.png",
  "Explosive Blade (Legendary)": "images/items/explosive-blade.png",

  "Leather Armor": "images/items/leather-armor.png",
  "Slime Armor": "images/items/slime-armor.png",
  "Iron Armor": "images/items/iron-armor.png",
  "Wolf Armor": "images/items/wolf-armor.png",
  "Goblin-Made Armor": "images/items/goblin-armor.png",
  "Steel Armor": "images/items/steel-armor.png",
  "Orcish Armor": "images/items/orc-armor.png",
  "Special Fox Hat (Legendary)": "images/items/fox-hat.png",

  // consumables
  "Health Potion": "images/items/health-potion.png",
  "Major Health Potion": "images/items/health-potion.png",
  "Grand Health Potion": "images/items/health-potion.png",
  "Strength Stew": "images/items/fox-hat.png",
};

// === SKILL DEFINITIONS ===
const SKILL_DEFS = {
  Pray: {
    icon: "icons/png/Skills.png",
    desc: "Heal 50 HP instantly. Cooldown: 5 min",
    duration: 0,       // instant
    cooldown: 300,     // seconds
    use: () => {
      const before = playerHP;
      playerHP = Math.min(100, playerHP + 50);
      updatePlayerHPUI?.();
      if (playerHP > before) playSound?.("sounds/heal.mp3");
      // start cooldown timestamp
      prayCooldownUntil = Date.now() + (SKILL_DEFS.Pray.cooldown * 1000);
    },
    getState: () => {
      const now = Date.now();
      const cdLeft = Math.max(0, Math.ceil((prayCooldownUntil - now) / 1000 || 0));
      return { activeLeft: 0, cdLeft };
    }
  },

  Bulwark: {
    icon: "icons/png/Skills.png",
    desc: "Halve incoming damage. Duration: 30s. CD: 120s",
    duration: 30,
    cooldown: 120,
    use: () => {
      const now = Date.now();
      bulwarkActiveUntil = now + (SKILL_DEFS.Bulwark.duration * 1000);
      bulwarkCooldownUntil = now + (SKILL_DEFS.Bulwark.cooldown * 1000);
    },
    getState: () => {
      const now = Date.now();
      const activeLeft = Math.max(0, Math.ceil((bulwarkActiveUntil - now) / 1000 || 0));
      const cdLeft     = Math.max(0, Math.ceil((bulwarkCooldownUntil - now) / 1000 || 0));
      return { activeLeft, cdLeft };
    }
  },

  Acceleration: {
    icon: "icons/png/Skills.png",
    desc: "Gain an extra attack each tick. Dur: 15s. CD: 90s",
    duration: 15,
    cooldown: 90,
    use: () => {
      const now = Date.now();
      accelActiveUntil = now + (SKILL_DEFS.Acceleration.duration * 1000);
      accelCooldownUntil = now + (SKILL_DEFS.Acceleration.cooldown * 1000);
    },
    getState: () => {
      const now = Date.now();
      const activeLeft = Math.max(0, Math.ceil((accelActiveUntil - now) / 1000 || 0));
      const cdLeft     = Math.max(0, Math.ceil((accelCooldownUntil - now) / 1000 || 0));
      return { activeLeft, cdLeft };
    }
  },

  Empower: {
    icon: "icons/png/Skills.png",
    desc: "+10 Attack. Duration: 20s. CD: 60s",
    duration: 20,
    cooldown: 60,
    use: () => {
      const now = Date.now();
      empowerActiveUntil = now + (SKILL_DEFS.Empower.duration * 1000);
      empowerCooldownUntil = now + (SKILL_DEFS.Empower.cooldown * 1000);
      // If your attack calc reads empowerActiveUntil elsewhere, no extra code needed here
    },
    getState: () => {
      const now = Date.now();
      const activeLeft = Math.max(0, Math.ceil((empowerActiveUntil - now) / 1000 || 0));
      const cdLeft     = Math.max(0, Math.ceil((empowerCooldownUntil - now) / 1000 || 0));
      return { activeLeft, cdLeft };
    }
  },
};

function mmss(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function renderSkills() {
  const wrap = document.getElementById("skillsBody");
  if (!wrap) return;

  wrap.innerHTML = "";

  Object.keys(SKILL_DEFS).forEach((name) => {
    const def = SKILL_DEFS[name];
    const { activeLeft, cdLeft } = def.getState();

    const card = document.createElement("div");
    card.className = "skill-card";
    card.innerHTML = `
      <img class="skill-icon" src="${def.icon}" alt="${name}">
      <div class="skill-info">
        <h3>${name}</h3>
        <p>${def.desc}</p>
      </div>
      <span id="${name}-status" class="skill-status">
        ${activeLeft > 0 ? `Active ${mmss(activeLeft)}` :
          cdLeft > 0 ? `CD ${mmss(cdLeft)}` : `Ready`}
      </span>
      <button id="${name}-btn" ${cdLeft > 0 || activeLeft > 0 ? "disabled" : ""} onclick="useSkill('${name}')">Use</button>
    `;
    wrap.appendChild(card);

    startSkillTicker(name);
  });
}

function startSkillTicker(name) {
  const def = SKILL_DEFS[name];
  const status = document.getElementById(`${name}-status`);
  const btn = document.getElementById(`${name}-btn`);
  if (!status || !btn) return;

  const t = setInterval(() => {
    const { activeLeft, cdLeft } = def.getState();
    if (activeLeft > 0) {
      status.textContent = `Active ${mmss(activeLeft)}`;
      btn.disabled = true;
      return;
    }
    if (cdLeft > 0) {
      status.textContent = `CD ${mmss(cdLeft)}`;
      btn.disabled = true;
      return;
    }
    status.textContent = "Ready";
    btn.disabled = false;
    clearInterval(t);
  }, 1000);
}

window.useSkill = function(name) {
  const def = SKILL_DEFS[name];
  if (!def) return;
  const { activeLeft, cdLeft } = def.getState();
  if (activeLeft > 0 || cdLeft > 0) return; // safety

  def.use();
  saveGameData?.();        // persist new timers
  renderSkills();          // refresh the cards
  renderBuffBar();
};

// Fallback icon element if image missing
function iconEl(name){
  const path = ITEM_ICONS[name];
  const wrap = document.createElement('div');
  wrap.className = 'item-icon';
  if (path){
    const img = document.createElement('img');
    img.src = path;
    img.alt = name;
    img.onerror = () => { wrap.innerHTML = `<div class="fallback">${name[0]||"?"}</div>`; };
    wrap.appendChild(img);
  }else{
    wrap.innerHTML = `<div class="fallback">${name[0]||"?"}</div>`;
  }
  return wrap;
}

// Function to display weapons or armor in the UI
function displayItems(itemCategory) {
  const container = document.getElementById('items-container');
  container.innerHTML = '';  // Clear previous items
  container.className = 'craft-grid'; // apply grid styling

  // Filter recipes into the chosen category
  const itemsToDisplay = Object.entries(craftingRecipes).filter(([_, recipe]) => {
    if (itemCategory === 'weapons')   return recipe.attackBoost !== undefined;
    if (itemCategory === 'armor')     return recipe.defenseBoost !== undefined;
    if (itemCategory === 'consumables') return recipe.consumable === true;
    if (itemCategory === 'smelting')    return recipe.category === 'smelting' || recipe.type === 'smelting';
    return false;
  });

  itemsToDisplay.forEach(([itemName, recipe]) => {
    let canCraft = true;
    for (let material in recipe.materials) {
      if (!inventory[material] || inventory[material] < recipe.materials[material]) {
        canCraft = false; break;
      }
    }

    const card = document.createElement('div');
    card.className = 'craft-card';

    const icon = iconEl(itemName);
    const name = document.createElement('div');
    name.className = 'item-name';
    name.textContent = itemName;

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `Materials: ${Object.entries(recipe.materials)
      .map(([mat, amt]) => `${amt} ${mat}`).join(', ')}`;

    const actions = document.createElement('div');
    actions.className = 'craft-actions';
    const btn = document.createElement('button');
    btn.className = 'btn-sm';
    btn.disabled = !canCraft;
    btn.textContent = canCraft ? `Craft` : `Can't Craft`;
    if (canCraft) btn.onclick = () => craftItem(itemName);

    card.append(icon, name, meta, actions);
    actions.appendChild(btn);
    container.appendChild(card);
  });
}



// Event listeners for "Weapons" and "Armor" buttons
document.getElementById('weapons').addEventListener('click', () => {
    displayItems('weapons');  // Display weapons
});

document.getElementById('armor').addEventListener('click', () => {
    displayItems('armor');  // Display armor
});

document.getElementById('consumables').addEventListener('click', () => {
  displayItems('consumables'); // Display Consumables
});

document.getElementById('smelting').addEventListener('click', () => {
  displayItems('smelting'); // Display Smelting
});

// Function on how to craft items
function craftItem(itemName) {
    console.log(`Attempting to craft: ${itemName}`);

    if (craftingRecipes[itemName]) {
        const recipe = craftingRecipes[itemName];
        let canCraft = true;

        // Check if the player has enough materials
        for (let material in recipe.materials) {
            if (!inventory[material] || inventory[material] < recipe.materials[material]) {
                canCraft = false;
                break; // Stop checking if any material is missing
            }
        }

        if (canCraft) {
            // Deduct materials from inventory
            for (let material in recipe.materials) {
                inventory[material] -= recipe.materials[material];
            }

            // Add the crafted item to the inventory
            inventory[recipe.result] = (inventory[recipe.result] || 0) + 1;

            // Update UI
            updateInventory();
            renderEquipmentSlots();
            updatePlayerStats();
            saveGameData();

            openInfoModal('Crafting Complete', `You crafted a ${itemName}!`);
        } else {
            const needList = Object.entries(recipe.materials)
             .map(([mat, amt]) => `${amt} ${mat}`)
            .join(', ');
            openInfoModal('Not enough materials', `You need: ${needList}`);
        }
    }
}

function useConsumable(itemName) {
  const item = craftingRecipes[itemName];
  if (!item || !item.consumable) return;
  if (!inventory[itemName] || inventory[itemName] <= 0) return;

  // Apply effects
  if (item.effect.heal) {
    playerHP = Math.min(playerHP + item.effect.heal, 100); // cap at max HP
    document.getElementById("playerHealthText").innerText = playerHP;
    document.getElementById("playerHealth").style.width = `${playerHP}%`;
  }

  if (item.effect.buffAttack) {
    equipment.attack += item.effect.buffAttack;
    updatePlayerStats();
    setTimeout(() => {
      equipment.attack -= item.effect.buffAttack;
      updatePlayerStats();
    }, item.effect.duration * 1000);
  }

  // Remove from inventory
  inventory[itemName]--;
  updateInventory();
}


// Toggling crafting menu
function toggleCrafting() {
    // Hide other sections
    document.getElementById('skillsContainer').style.display = 'none';
    document.getElementById('inventoryContainer').style.display = 'none';
    closeSettings();
    document.getElementById('lootContainer').style.display = 'none';
  
    // Toggle crafting interface
    const craftingContainer = document.getElementById('craftingContainer');
    if (craftingContainer.style.display === 'none') {
      craftingContainer.style.display = 'block';
    } else {
      craftingContainer.style.display = 'none';
    }
  }

// Checking if crafting works after adding materials
function renderCraftingUI() {
    let craftingDiv = document.getElementById("crafting");
    craftingDiv.innerHTML = "<h2>Crafting</h2>";

    // Loop through crafting recipes and display available upgrades
    for (let itemName in craftingRecipes) {
        // Skip rendering this item if it's already in the inventory (i.e., already crafted)
        if (inventory[itemName] && inventory[itemName] > 0) {
            continue;  // Skip if item is already crafted
        }

        let recipe = craftingRecipes[itemName];
        let canCraft = true;
        let buttonText = `Craft ${itemName}`;  // Default button text

        // Check if player has the required items (for crafting)
        for (let material in recipe.materials) {
            if (inventory[material] < recipe.materials[material]) {
                canCraft = false;  // Not enough materials
                buttonText = `Can't Craft ${itemName} (Not Enough Materials)`;  // Update button text
                break;
            }
        }

        // Add previous item check (e.g., Steel Armor requires Leather Armor)
        if (itemName === "Steel Armor" && !inventory["Leather Armor"]) {
            canCraft = false;  // Missing required base item
            buttonText = `Can't Craft ${itemName} (Missing Leather Armor)`;  // Update button text
        }

        // Create the UI element for this item
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("crafting-item");

        if (canCraft) {
            // Item can be crafted
            itemDiv.innerHTML = `<button onclick="craftItem('${itemName}')">${buttonText}</button>`;
        } else {
            // If not enough materials, display the message
            itemDiv.innerHTML = `<button disabled>${buttonText}</button>`;
        }

        craftingDiv.appendChild(itemDiv);
    }
}

// Gathering Process with Persistent Timer

let gatherCooldown = 600; // 10 minutes in seconds = 600
let gatherButton = document.getElementById("gatherButton");
let gatherLabel  = gatherButton.querySelector(".label");
let messageElement = document.getElementById("message");

// Function to start the cooldown and delay item rewards
function startGatherCooldown(remainingTime) {
    gatherButton.disabled = true;

    let countdown = setInterval(() => {
        
        let started = parseInt(localStorage.getItem("gatherStartTime") || "0", 10);
        let elapsedTime = Math.floor((Date.now() - started) / 1000);

        remainingTime = gatherCooldown - elapsedTime;

        if (remainingTime <= 0) {
            clearInterval(countdown);
            gatherButton.disabled = false;
            gatherLabel.textContent = "Gather"; 
            giveGatherReward();
            localStorage.removeItem("gatherStartTime");
        } else {
            if (isNaN(remainingTime) || remainingTime < 0) {
                clearInterval(countdown);
                gatherButton.disabled = false;
                gatherLabel.textContent = "Gather"; 
                return;
            }

            let minutes = Math.floor(remainingTime / 60);
            let seconds = remainingTime % 60;
            gatherLabel.textContent =
                `Gathering (${minutes}:${seconds < 10 ? "0" : ""}${seconds})`;
        }
    }, 1000);
}

function setGatherText(txt){
  const label = document.querySelector('#gatherButton .label');
  if (label) label.textContent = txt;
  else document.getElementById('gatherButton').textContent = txt; // fallback
}

function setPrayLabel(txt){
  const span = document.querySelector('#prayButton .label');
  if (span) span.textContent = txt;
  else {
    // fallback if structure changes
    const btn = document.getElementById('prayButton');
    if (btn) btn.textContent = txt;
  }
}


// Function to handle the gathering process (starts cooldown but delays rewards)
function gatherResource() {
  if (gatherButton.disabled) return;
  localStorage.setItem("gatherStartTime", Date.now().toString());
  setGatherText("Gathering");
  startGatherCooldown(gatherCooldown);
}

function giveGatherReward() {
    const availableResources = ["Iron Ore", "Wood", "Leather", "Water", "Herb"];
    let gatheredItems = {};
    let totalItems = 10; // Maximum number of items the player can receive

    // Distribute items randomly
    for (let i = 0; i < totalItems; i++) {
        let randomResource = availableResources[Math.floor(Math.random() * availableResources.length)];
        let quantity = Math.floor(Math.random() * 1) + 1; // Ensures 1 or 2 (never 0 or negative)

        if (gatheredItems[randomResource]) {
            gatheredItems[randomResource] += quantity;
        } else {
            gatheredItems[randomResource] = quantity;
        }
    }

    // Add gathered items to inventory (only if greater than 0)
    for (let resource in gatheredItems) {
        if (gatheredItems[resource] > 0) {
            inventory[resource] = (inventory[resource] || 0) + gatheredItems[resource];
        }
    }

    // Save inventory to localStorage
    localStorage.setItem("inventory", JSON.stringify(inventory));

    // Update inventory display
    updateInventory();

    // Create message only for items that are > 0
    let gatheredMessage = Object.entries(gatheredItems)
        .filter(([_, quantity]) => quantity > 0) // Filters out 0 values
        .map(([resource, quantity]) => `${quantity} ${resource}`)
        .join(", ");

    // Only display a message if something was gathered
    if (gatheredMessage) {
        openInfoModal('Gathering Complete', `You gathered: ${gatheredMessage}!`);
        if (messageElement) messageElement.style.display = "none"; // hide old text, just in case
    }
}



// Function to update inventory display
function updateInventoryDisplay() {
    const inventoryContent = document.getElementById('inventory');
    
    // Clear the inventory list
    inventoryContent.innerHTML = '<h2>Inventory</h2>';

    // Display items
    for (let resource in inventory) {
        const resourceDiv = document.createElement('div');
        resourceDiv.classList.add('inventory-item');
        resourceDiv.innerHTML = `${resource}: ${inventory[resource]}`;
        inventoryContent.appendChild(resourceDiv);
    }
}


// Initial inventory display update
updateInventoryDisplay();


function cleanupInventory() {
    console.log("Cleaning up inventory...");

    // Loop through all items in the inventory
    for (let item in inventory) {
        if (inventory[item] === 0) {
            console.log(`Item ${item} has quantity 0. Deleting...`);
            // If the item has 0 quantity, delete it from the inventory
            delete inventory[item];

            // Update the UI to remove this item visually
            let itemElement = document.getElementById(item); // Assuming item elements have the same ID as item names
            if (itemElement) {
                itemElement.style.display = 'none'; // Hide the item from the UI
            }
        }
    }

    // After cleanup, save the updated inventory to localStorage
    localStorage.setItem("inventory", JSON.stringify(inventory));

    // Log the cleaned-up inventory to verify
    console.log("Updated inventory:", inventory);
}


// Function to select starter kit
function selectStarterKit(starter) {
  // If the player already has equipment (from a previous save), don't overwrite
  const existing = JSON.parse(localStorage.getItem("equipment") || "{}");
  const hasExistingEquip = existing && (existing.weapon || existing.armor);

  if (hasExistingEquip) {
    hasSelectedStarter = true;
    selectedStarter = localStorage.getItem("starterKit");

    crossfadeSwap(() => {
      document.getElementById("starterSelection").style.display = "none";
      document.getElementById("gameContent").style.display = "block";
      restoreGatheringCooldown?.();
      selectMonster?.();              // ✅ now runs when game is visible
    });

    renderEquipmentSlots?.();
    renderEquipmentPanel?.();
    updateInventory?.();
    startGameplayAfterFade(2100);
    return;
  }

  // New game: remember the chosen starter
  localStorage.setItem("starterKit", starter);
  hasSelectedStarter = true;
  selectedStarter = starter;

  // Give starting gear
  if (starter === "Knight") {
    equipment = { weapon: "Stick", attack: 5, armor: "Clothes", defense: 0 };
  }

  unlockAchievement?.('ACH_CHOSE_STARTER');

  // Enter the game and init monster/background/sfx AFTER game is visible
  crossfadeSwap(() => {
    document.getElementById("starterSelection").style.display = "none";
    document.getElementById("gameContent").style.display = "block";

    const ms = document.getElementById("monsterSelect");
    if (ms) ms.value = "Slime";       // ✅ default selection
    restoreGatheringCooldown?.();
    selectMonster?.();                // ✅ bg + SFX now works
  });

  renderEquipmentSlots?.();
  renderEquipmentPanel?.();
  updateInventory?.();

  saveGameData?.();                   // persist starter choice

  startGameplayAfterFade(2100);
}

function checkStarterKitSelection() {
  const starterKit = localStorage.getItem("starterKit");

  if (starterKit) {
    // player already chose; do NOT reset equipment here
    hasSelectedStarter = true;
    document.getElementById("starterSelection").style.display = "none";
    document.getElementById("gameContent").style.display = "block";
    renderEquipmentSlots();
    updateInventory();      // keeps equip links
  } else {
    document.getElementById("starterSelection").style.display = "block";
    document.getElementById("gameContent").style.display = "none";
  }
}

// Function to render equipment slots (e.g., weapon)
function renderEquipmentSlots() {
    const attackDisplay = document.getElementById('playerAttack');
    const defenseDisplay = document.getElementById('playerDefense');

    if (attackDisplay) {
        attackDisplay.textContent = equipment.attack;
    }
    if (defenseDisplay) {
        defenseDisplay.textContent = equipment.defense;
    }
}

function renderEquipmentPanel() {
  const w = document.getElementById('equipPanelWeapon');
  const a = document.getElementById('equipPanelArmor');
  const atk = document.getElementById('equipPanelAttack');
  const def = document.getElementById('equipPanelDefense');

  if (!w || !a || !atk || !def) return; // guard if panel not in DOM yet

  w.textContent   = equipment.weapon || "None";
  a.textContent   = equipment.armor  || "None";
  atk.textContent = equipment.attack ?? BASE_ATTACK;
  def.textContent = equipment.defense ?? BASE_DEFENSE;
}

// ------- INVENTORY (cards + grid, still grouped by category)
function updateInventory(newLoot = "") {
  const inventoryDiv = document.getElementById("inventory");
  if (!inventoryDiv) return;

  inventoryDiv.innerHTML = "<h2>Inventory</h2>";

  // (optional) small toast-like line when you just gathered something
  if (newLoot) {
    const note = document.createElement("div");
    note.className = "inventory-item"; // reuse old style for the toast line
    note.innerHTML = `<span>You gathered: ${newLoot}</span>`;
    inventoryDiv.appendChild(note);
  }

  const categories = {
    Weapons: [],
    Armor: [],
    Consumables: [],
    Materials: []
  };

  // Sort items into categories you already use
  for (const item in inventory) {
    const qty = inventory[item] || 0;
    if (qty <= 0) continue;

    const recipe = craftingRecipes[item];
    if (recipe?.attackBoost !== undefined) categories.Weapons.push(item);
    else if (recipe?.defenseBoost !== undefined) categories.Armor.push(item);
    else if (recipe?.consumable === true) categories.Consumables.push(item);
    else categories.Materials.push(item);
  }

  // Render a section -> grid -> cards
  const makeSection = (title, list) => {
    if (!list.length) return;
    const sec = document.createElement('div');
    sec.className = 'inv-section';
    sec.innerHTML = `<h3>${title}</h3><div class="inv-grid"></div>`;
    const grid = sec.querySelector('.inv-grid');

    list.sort().forEach(item => {
      const qty = inventory[item] || 0;
      const kind = getEquipType(item); // "weapon" | "armor" | null
      const equipped = isEquipped(item);

      const card = document.createElement('div');
      card.className = 'inv-card';

      const top = iconEl(item);
      const name = document.createElement('div');
      name.className = 'item-name';
      const desc = ITEM_DESCRIPTIONS?.[item] || '';
      name.innerHTML = `<span class="has-tip" data-tip="${desc}">${item}</span>`;

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      if (kind === "weapon") meta.textContent = `Attack ${craftingRecipes[item].attackBoost}`;
      else if (kind === "armor") meta.textContent = `Defense ${craftingRecipes[item].defenseBoost}`;
      else meta.textContent = `Material`;

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = `x${qty}`;

      const actions = document.createElement('div');
      actions.className = 'inv-actions';

      // Equip/Unequip for equippables
      if (kind) {
        const btn = document.createElement('button');
        btn.className = 'btn-sm';
        btn.textContent = equipped ? 'Unequip' : 'Equip';
        btn.onclick = () => toggleEquip(item);
        actions.appendChild(btn);
      }

      // Use for consumables
      const recip = craftingRecipes[item];
      if (recip?.consumable === true) {
        const btn = document.createElement('button');
        btn.className = 'btn-sm';
        btn.textContent = 'Use';
        btn.onclick = () => useConsumable(item);
        actions.appendChild(btn);
      }

      // (Optional) Drop button
      // const drop = document.createElement('button');
      // drop.className = 'btn-sm btn-alt';
      // drop.textContent = 'Drop';
      // drop.onclick = () => { inventory[item] = Math.max(0, (inventory[item]||0) - 1); updateInventory(); saveGameData(); };
      // actions.appendChild(drop);

      card.append(top, name, meta, badge, actions);
      grid.appendChild(card);
    });

    inventoryDiv.appendChild(sec);
  };

  makeSection('Weapons', categories.Weapons);
  makeSection('Armor', categories.Armor);
  makeSection('Consumables', categories.Consumables);
  makeSection('Materials', categories.Materials);
}


// Toggle Inventory (Make Sure It Opens/Closes)
function toggleInventory() {
    document.getElementById('skillsContainer').style.display = 'none';
    document.getElementById('craftingContainer').style.display = 'none';
    closeSettings();
    document.getElementById('lootContainer').style.display = 'none';
    let inventoryContainer = document.getElementById("inventoryContainer");
    let body = document.body; // Get the body element (or any parent element)
    
    if (inventoryContainer.style.display === "none") {
        inventoryContainer.style.display = "block";
        body.classList.add("inventory-open"); // Add class to trigger blur effect
    } else {
        inventoryContainer.style.display = "none";
        body.classList.remove("inventory-open"); // Remove class to stop blur effect
    }
}

// Toggle Skill button

function toggleSkills() {
  const modal = document.getElementById('skillsModal');
  if (!modal) return;

  if (modal.hidden) {
    openSkillsModal();   // show modal + backdrop + render cards
  } else {
    closeSkillsModal();  // hide modal + backdrop
  }
}

// ==== Bulwark / Acceleration / Empower ====

let bulwarkActive = false;
let accelActive   = false;
let empowerActive = false;

// Skill deadlines (ms since epoch). 0 = none
let bulwarkActiveUntil = 0, bulwarkCooldownUntil = 0;
let accelActiveUntil   = 0, accelCooldownUntil   = 0;
let empowerActiveUntil = 0, empowerCooldownUntil = 0;
let prayCooldownUntil  = 0;

// Durations
const BULWARK_DURATION = 30;  // seconds (50% incoming damage)
const ACCEL_DURATION   = 15;  // seconds (attack twice each tick)
const EMPOWER_DURATION = 20;  // seconds (+10 attack)

// Cooldowns
let bulwarkCDLeft = 120, bulwarkCDBase = 120; // 2 min
let accelCDLeft   = 90,  accelCDBase   = 90;  // 1.5 min
let empowerCDLeft = 60,  empowerCDBase = 60;  // 1 min

let bulwarkTimer = null, accelTimer = null, empowerTimer = null;
let bulwarkCDT = null, accelCDT = null, empowerCDT = null;

// ---- helpers
function startCountdown(seconds, onTick, onDone) {
  let left = seconds;
  onTick(left);
  const t = setInterval(() => {
    left--;
    if (left > 0) onTick(left);
    else { clearInterval(t); onDone(); }
  }, 1000);
  return t;
}

function setSkillUI(idBtn, idCd, enabled, text, showCd, cdText) {
  const btn = document.getElementById(idBtn);
  const cd  = document.getElementById(idCd);

  if (btn) {
    btn.disabled = !enabled;
    const lbl = btn.querySelector('.label');
    if (lbl) lbl.textContent = text;     // keep tooltip wrapper
    else btn.textContent = text;         // fallback if wrapper missing
  }

  if (cd) {
    cd.style.display = showCd ? 'inline' : 'none';
    if (cdText) cd.textContent = cdText;
  }
}

// ---- Bulwark (50% damage taken for 30s)
function useBulwark() {
  if (bulwarkActive || bulwarkCDT) return;

  const now = Date.now();
  bulwarkActive = true;
  bulwarkActiveUntil = now + BULWARK_DURATION * 1000;

  setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark (Active)', true, 'Bulwark active');

  bulwarkTimer = startCountdown(BULWARK_DURATION, () => {}, () => {
    bulwarkActive = false;

    bulwarkCooldownUntil = Date.now() + bulwarkCDBase * 1000;
    bulwarkCDT = startCountdown(bulwarkCDBase, (s) => {
      setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark', true, `Bulwark cooldown: ${s}s`);
    }, () => {
      bulwarkCDT = null;
      bulwarkCooldownUntil = 0;
      setSkillUI('bulwarkButton','bulwarkCooldown', true, 'Bulwark', false);
      saveGameData();
    });
    saveGameData();
  });

  saveGameData();
}

// ---- Acceleration (attack twice per tick for 15s)
function useAcceleration() {
  if (accelActive || accelCDT) return;

  const now = Date.now();
  accelActive = true;
  accelActiveUntil = now + ACCEL_DURATION * 1000;

  setSkillUI('accelButton','accelCooldown', false, 'Acceleration (Active)', true, 'Acceleration active');

  accelTimer = startCountdown(ACCEL_DURATION, () => {}, () => {
    accelActive = false;

    accelCooldownUntil = Date.now() + accelCDBase * 1000;
    accelCDT = startCountdown(accelCDBase, (s) => {
      setSkillUI('accelButton','accelCooldown', false, 'Acceleration', true, `Acceleration cooldown: ${s}s`);
    }, () => {
      accelCDT = null;
      accelCooldownUntil = 0;
      setSkillUI('accelButton','accelCooldown', true, 'Acceleration', false);
      saveGameData();
    });
    saveGameData();
  });

  saveGameData();
}

// ---- Empower (+10 attack for 20s)
function useEmpower() {
  if (empowerActive || empowerCDT) return;

  const now = Date.now();
  empowerActive = true;
  empowerActiveUntil = now + EMPOWER_DURATION * 1000;

  setSkillUI('empowerButton','empowerCooldown', false, 'Empower (Active)', true, 'Empower active');

  empowerTimer = startCountdown(EMPOWER_DURATION, () => {}, () => {
    empowerActive = false;

    empowerCooldownUntil = Date.now() + empowerCDBase * 1000;
    empowerCDT = startCountdown(empowerCDBase, (s) => {
      setSkillUI('empowerButton','empowerCooldown', false, 'Empower', true, `Empower cooldown: ${s}s`);
    }, () => {
      empowerCDT = null;
      empowerCooldownUntil = 0;
      setSkillUI('empowerButton','empowerCooldown', true, 'Empower', false);
      saveGameData();
    });
    saveGameData();
  });

  saveGameData();

}

function resumeSkillsFromSave(savedSkills = {}) {
  const now = Date.now();

  // clear old timers
  if (bulwarkTimer) clearInterval(bulwarkTimer);
  if (bulwarkCDT)   clearInterval(bulwarkCDT);
  if (accelTimer)   clearInterval(accelTimer);
  if (accelCDT)     clearInterval(accelCDT);
  if (empowerTimer) clearInterval(empowerTimer);
  if (empowerCDT)   clearInterval(empowerCDT);

  // restore timestamps
  bulwarkActiveUntil   = savedSkills.bulwarkActiveUntil   || 0;
  bulwarkCooldownUntil = savedSkills.bulwarkCooldownUntil || 0;
  accelActiveUntil     = savedSkills.accelActiveUntil     || 0;
  accelCooldownUntil   = savedSkills.accelCooldownUntil   || 0;
  empowerActiveUntil   = savedSkills.empowerActiveUntil   || 0;
  empowerCooldownUntil = savedSkills.empowerCooldownUntil || 0;
  prayCooldownUntil    = savedSkills.prayCooldownUntil    || 0;

  // Bulwark
  if (bulwarkActiveUntil > now) {
    bulwarkActive = true;
    const left = Math.ceil((bulwarkActiveUntil - now)/1000);
    setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark (Active)', true, 'Bulwark active');
    bulwarkTimer = startCountdown(left, () => {}, () => {
      bulwarkActive = false;
      const cdLeft = Math.max(0, Math.ceil((bulwarkCooldownUntil - Date.now())/1000));
      if (cdLeft > 0) {
        bulwarkCDT = startCountdown(cdLeft, (s) => {
          setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark', true, `Bulwark cooldown: ${s}s`);
        }, () => {
          bulwarkCDT = null; bulwarkCooldownUntil = 0;
          setSkillUI('bulwarkButton','bulwarkCooldown', true, 'Bulwark', false);
          saveGameData();
        });
      } else setSkillUI('bulwarkButton','bulwarkCooldown', true, 'Bulwark', false);
    });
  } else {
    bulwarkActive = false;
    const cdLeft = Math.max(0, Math.ceil((bulwarkCooldownUntil - now)/1000));
    if (cdLeft > 0) {
      setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark', true, `Bulwark cooldown: ${cdLeft}s`);
      bulwarkCDT = startCountdown(cdLeft, (s) => {
        setSkillUI('bulwarkButton','bulwarkCooldown', false, 'Bulwark', true, `Bulwark cooldown: ${s}s`);
      }, () => {
        bulwarkCDT = null; bulwarkCooldownUntil = 0;
        setSkillUI('bulwarkButton','bulwarkCooldown', true, 'Bulwark', false);
        saveGameData();
      });
    } else setSkillUI('bulwarkButton','bulwarkCooldown', true, 'Bulwark', false);
  }

  // Acceleration
  if (accelActiveUntil > now) {
    accelActive = true;
    const left = Math.ceil((accelActiveUntil - now)/1000);
    setSkillUI('accelButton','accelCooldown', false, 'Acceleration (Active)', true, 'Acceleration active');
    accelTimer = startCountdown(left, () => {}, () => {
      accelActive = false;
      const cdLeft = Math.max(0, Math.ceil((accelCooldownUntil - Date.now())/1000));
      if (cdLeft > 0) {
        accelCDT = startCountdown(cdLeft, (s) => {
          setSkillUI('accelButton','accelCooldown', false, 'Acceleration', true, `Acceleration cooldown: ${s}s`);
        }, () => {
          accelCDT = null; accelCooldownUntil = 0;
          setSkillUI('accelButton','accelCooldown', true, 'Acceleration', false);
          saveGameData();
        });
      } else setSkillUI('accelButton','accelCooldown', true, 'Acceleration', false);
    });
  } else {
    accelActive = false;
    const cdLeft = Math.max(0, Math.ceil((accelCooldownUntil - now)/1000));
    if (cdLeft > 0) {
      setSkillUI('accelButton','accelCooldown', false, 'Acceleration', true, `Acceleration cooldown: ${cdLeft}s`);
      accelCDT = startCountdown(cdLeft, (s) => {
        setSkillUI('accelButton','accelCooldown', false, 'Acceleration', true, `Acceleration cooldown: ${s}s`);
      }, () => {
        accelCDT = null; accelCooldownUntil = 0;
        setSkillUI('accelButton','accelCooldown', true, 'Acceleration', false);
        saveGameData();
      });
    } else setSkillUI('accelButton','accelCooldown', true, 'Acceleration', false);
  }

  // Empower
  if (empowerActiveUntil > now) {
    empowerActive = true;
    const left = Math.ceil((empowerActiveUntil - now)/1000);
    setSkillUI('empowerButton','empowerCooldown', false, 'Empower (Active)', true, 'Empower active');
    empowerTimer = startCountdown(left, () => {}, () => {
      empowerActive = false;
      const cdLeft = Math.max(0, Math.ceil((empowerCooldownUntil - Date.now())/1000));
      if (cdLeft > 0) {
        empowerCDT = startCountdown(cdLeft, (s) => {
          setSkillUI('empowerButton','empowerCooldown', false, 'Empower', true, `Empower cooldown: ${s}s`);
        }, () => {
          empowerCDT = null; empowerCooldownUntil = 0;
          setSkillUI('empowerButton','empowerCooldown', true, 'Empower', false);
          saveGameData();
        });
      } else setSkillUI('empowerButton','empowerCooldown', true, 'Empower', false);
    });
  } else {
    empowerActive = false;
    const cdLeft = Math.max(0, Math.ceil((empowerCooldownUntil - now)/1000));
    if (cdLeft > 0) {
      setSkillUI('empowerButton','empowerCooldown', false, 'Empower', true, `Empower cooldown: ${cdLeft}s`);
      empowerCDT = startCountdown(cdLeft, (s) => {
        setSkillUI('empowerButton','empowerCooldown', false, 'Empower', true, `Empower cooldown: ${s}s`);
      }, () => {
        empowerCDT = null; empowerCooldownUntil = 0;
        setSkillUI('empowerButton','empowerCooldown', true, 'Empower', false);
        saveGameData();
      });
    } else setSkillUI('empowerButton','empowerCooldown', true, 'Empower', false);
  }
}


// ---- Settings: show/hide & UI sync ----
function syncSettingsUIFromStorage() {
  const musicToggle = document.getElementById("musicToggle");
  const soundToggle = document.getElementById("soundToggle");
  const musicSlider = document.getElementById("musicVolume");
  const sfxSlider   = document.getElementById("sfxVolume"); // <-- or "sfxVolumeSlider" if you kept that

  const musicEnabled = localStorage.getItem("musicEnabled") === "true";
  const soundEnabled = localStorage.getItem("soundEnabled") === "true";
  const savedMusicVol = parseFloat(localStorage.getItem("musicVolume") ?? 0.3);
  const savedSfxVol   = parseFloat(localStorage.getItem("sfxVolume")   ?? 0.3);

  musicToggle.checked = musicEnabled;
  soundToggle.checked = soundEnabled;
  musicSlider.value = isNaN(savedMusicVol) ? 0.3 : savedMusicVol;
  sfxSlider.value   = isNaN(savedSfxVol)   ? 0.3 : savedSfxVol;
}

// --- Live volume updates ---
const musicSlider = document.getElementById("musicVolume");
if (musicSlider) {
  musicSlider.addEventListener("input", (e) => {
    musicVolume = parseFloat(e.target.value);
    localStorage.setItem("musicVolume", String(musicVolume));

    if (titleMusic) titleMusic.volume = musicVolume;
    if (gameplayRadio?.audio) gameplayRadio.audio.volume = musicVolume; // ✅ use radio
  });
}

const sfxSlider = document.getElementById("sfxVolume");
if (sfxSlider) {
  sfxSlider.addEventListener("input", (e) => {
    sfxVolume = parseFloat(e.target.value);
    localStorage.setItem("sfxVolume", String(sfxVolume));
  });
}

function isSettingsOpen() {
  return settingsEl && !settingsEl.hasAttribute("hidden") && getComputedStyle(settingsEl).display !== "none";
}
// ---- Save toggles ----
// Music toggle
const musicToggle = document.getElementById("musicToggle");
if (musicToggle) {
  musicToggle.checked = localStorage.getItem("musicEnabled") === "true";
  musicToggle.addEventListener("change", function () {
    localStorage.setItem("musicEnabled", this.checked);

    if (this.checked) {
      if (document.getElementById("gameContent").style.display === "block") {
        startGameplayRadio();   // ✅ new
      } else {
        setupTitleMusic();
      }
    } else {
      stopTitleMusic();
      stopGameplayRadio();      // ✅ new
    }
  });
}

function markHasPlayed(){ localStorage.setItem('hasPlayed','1'); }

function startGameplayAfterFade(delayMs = 2100) {
  stopTitleMusic();
  setTimeout(() => startGameplayRadio(), delayMs);
}

document.getElementById("soundToggle").addEventListener("change", function () {
  localStorage.setItem("soundEnabled", this.checked);
});

// ---- Live volume updates ----
document.getElementById("musicVolume").addEventListener("input", function () {
  musicVolume = parseFloat(this.value);
  localStorage.setItem("musicVolume", musicVolume);
  if (titleMusic)    titleMusic.volume = musicVolume;
  if (gameplayMusic) gameplayMusic.volume = musicVolume;
});

document.getElementById("sfxVolume").addEventListener("input", function () {
  sfxVolume = parseFloat(this.value);
  localStorage.setItem("sfxVolume", sfxVolume);
});



document.getElementById("settingsCloseBtn").addEventListener("click", closeSettings);

// Update HealthBars Tick

function updateHealthBars(playerHP, monster, selectedMonster) {
    console.log("Updating health bars...");

    // Player Health Bar
    let playerHealthBar = document.getElementById("playerHealth");
    let playerHealthText = document.getElementById("playerHealthText");

    if (playerHealthBar && playerHealthText) {
        // Ensure playerHP is a valid number
        if (typeof playerHP !== 'number' || playerHP < 0) {
            console.error("Invalid playerHP value:", playerHP);
            return; // Exit if playerHP is invalid
        }

        let playerHealthPercentage = (playerHP / 100) * 100; // Percentage of player's health
        playerHealthBar.style.width = playerHealthPercentage + "%"; // Update width of the bar
        playerHealthText.innerText = playerHP; // Update health number inside the bar

        // Change color based on health percentage
        if (playerHealthPercentage > 50) {
            playerHealthBar.style.backgroundColor = "green";
        } else if (playerHealthPercentage > 20) {
            playerHealthBar.style.backgroundColor = "yellow";
        } else {
            playerHealthBar.style.backgroundColor = "red";
        }
    }

    // Monster Health Bar (Ensure monster and selectedMonster are valid)
    let monsterHealthBar = document.getElementById("monsterHealth");
    let monsterHealthText = document.getElementById("monsterHealthText");

    if (monsterHealthBar && monsterHealthText) {
        if (!monster || typeof monster.hp !== 'number') {
            console.error("Invalid monster data:", monster);
            return; // Exit if monster data is invalid
        }

        let monsterHealthPercentage = (monster.hp / monsters[selectedMonster].hp) * 100; // Percentage of monster's health
        monsterHealthBar.style.width = monsterHealthPercentage + "%"; // Update width of the bar
        monsterHealthText.innerText = monster.hp; // Update health number inside the bar

        // Change color based on health percentage
        if (monsterHealthPercentage > 50) {
            monsterHealthBar.style.backgroundColor = "green";
        } else if (monsterHealthPercentage > 20) {
            monsterHealthBar.style.backgroundColor = "yellow";
        } else {
            monsterHealthBar.style.backgroundColor = "red";
        }
    }
}

function resetMonsterBar(monsterName) {
  const maxHP = monsters[monsterName].hp;
  const mBar = document.getElementById("monsterHealth");
  const mText = document.getElementById("monsterHealthText");
  if (mBar && mText) {
    mBar.style.width = "100%";
    mBar.style.backgroundColor = "green";
    mText.textContent = maxHP;
  }
}



// Fighting Function

function fightMonster() {
  // Use the globally selected monster (set by the modal)
  // Fallback: first monster of the current/first area
  const mName =
    selectedMonster ||
    (AREA_DEFS[selectedArea] || [])[0] ||
    (AREA_DEFS[Object.keys(AREA_DEFS)[0]] || [])[0];

  if (!mName || !monsters[mName]) return;

  document.getElementById("message").innerText = "";

  // Fresh working copy so we can mutate hp locally during the fight
  let monster = { ...monsters[mName], hp: monsters[mName].hp };

  const battleInterval = setInterval(() => {
    // ===== Player attacks =====
    const baseAtk = (equipment.attack || 0) + (empowerActive ? 10 : 0);
    let playerDamage = Math.floor(Math.random() * Math.max(1, baseAtk)) + 1;
    monster.hp -= playerDamage;

    // Acceleration: extra swing
    if (accelActive && monster.hp > 0) {
      const extra = Math.floor(Math.random() * Math.max(1, baseAtk)) + 1;
      monster.hp -= extra;
    }

    if (monster.hp < 0) monster.hp = 0;

    updateHealthBars(playerHP, monster, mName);

    // ===== Monster defeated? =====
    if (monster.hp === 0) {
      const drop = monster.drops[Math.floor(Math.random() * monster.drops.length)];
      openResultModal('win', mName, drop);

      // loot + UI
      inventory[drop] = (inventory[drop] || 0) + 1;
      updateInventory();

      saveGameData();
      clearInterval(battleInterval);

      // reset UI bar and achievements
      monster.hp = monsters[mName].hp;
      resetMonsterBar(mName);
      awardKillAchievements(mName);
      return;
    }

    // ===== Monster attacks =====
    const monsterDamage =
      Math.floor(Math.random() * (monster.attack[1] - monster.attack[0] + 1)) + monster.attack[0];

    // Apply defense
    let effectiveDamage = Math.max(0, monsterDamage - (equipment.defense || 0));

    // Bulwark: halve incoming damage while active
    if (bulwarkActive) {
      effectiveDamage = Math.floor(effectiveDamage * 0.5);
    }

    playerHP -= effectiveDamage;

    updateHealthBars(playerHP, monster, mName);
    saveGameData();

    // ===== Player defeated? =====
    if (playerHP <= 0) {
      playerHP = 0;
      openResultModal('lose', mName);
      saveGameData();
      clearInterval(battleInterval);
      return;
    }
  }, 1000);
}

function awardKillAchievements(monsterType) {
  switch (monsterType) {
    case 'Slime':
      unlockAchievement('ACH_FIRST_SLIME');
      break;
    case 'Wolf':
      unlockAchievement('ACH_FIRST_WOLF');
      break;
    case 'Goblin':
      unlockAchievement('ACH_FIRST_GOBLIN');
      break;
    case 'Orc':
      unlockAchievement('ACH_FIRST_ORC');
      break;
    case 'Angus': // boss
      unlockAchievement('ACH_ANGUS_SLAYER');
      break;
  }
}

// Reset button to start new game - Pop Alert

async function startNewGame() {
    if (!confirm("Reset all progress and start a new game?")) return;

    // 1) Wipe legacy storage FIRST (what your UI reads)
    localStorage.clear();

    hasSelectedStarter = false;
    try { if (window.monsterAudio) { monsterAudio.pause(); monsterAudio.currentTime = 0; } } catch(_) {}

    // 2) Wipe the cloud-synced save file (requires preload saveAPI.clear)
    try {
        await window.saveAPI?.clear?.();
    } catch (e) {
        console.warn("Could not clear save file:", e);
    }

    // 3) Reset player stats to default values
    playerHP = 100;
    inventory = {
        "Iron Ore": 0,
        "Wood": 0,
        "Leather": 0,
        "Steel Ore": 0,
        "Water": 0
    };
    equipment = {
        weapon: "None",
        attack: 5, // Default attack value
        armor: "None",
        defense: 0
    };

    // 4) Reset Pray Cooldown Variables
    prayCooldownActive = false;
    prayCooldownTime = initialPrayCooldownTime;
    localStorage.removeItem("prayStartTime");
    localStorage.removeItem("prayCooldownTime");
    localStorage.removeItem("prayCooldownActive");

    // 5) Reset Pray Button UI (guard against nulls)
    const prayBtn = document.getElementById('prayButton');
    if (prayBtn) {
        prayBtn.disabled = false;
        setPrayLabel('Pray');
    }
    const prayCd = document.getElementById('prayCooldown');
    if (prayCd) prayCd.style.display = 'none';

    // 6) Hide game content and show starter selection screen
    const game = document.getElementById("gameContent");
    if (game) game.style.display = "none";
    const starterSel = document.getElementById("starterSelection");
    if (starterSel) starterSel.style.display = "block";

    // 7) Ensure re-selection of starter
    localStorage.removeItem("starterKit");

    // 8) Default settings ON so they don’t appear “ticked off”
    localStorage.setItem("musicEnabled", "true");
    localStorage.setItem("soundEnabled", "true");
    localStorage.setItem("musicVolume", "0.3");
    localStorage.setItem("sfxVolume", "0.3");
    const musicToggle = document.getElementById("musicToggle");
    if (musicToggle) musicToggle.checked = true;
    const soundToggle = document.getElementById("soundToggle");
    if (soundToggle) soundToggle.checked = true;

    alert("The game has been reset! Choose your starter kit to begin.");

    // 9) Reload LAST (after the file is cleared) so initSaves() can’t restore the old save
    location.href = location.href;
}


// Function to save game data to localStorage
async function saveGameData() {
  // Keep old localStorage path working
  localStorage.setItem("playerHP", playerHP);
  localStorage.setItem("inventory", JSON.stringify(inventory));
  localStorage.setItem("equipment", JSON.stringify(equipment));

  // Also write a full save file for Steam Cloud
  const save = {
    version: 1,
    starterKit: localStorage.getItem("starterKit") || '',
    playerHP,
    equipment,
    inventory,
    settings: {
      musicEnabled: localStorage.getItem("musicEnabled") === "true",
      soundEnabled: localStorage.getItem("soundEnabled") === "true",
      musicVolume: parseFloat(localStorage.getItem("musicVolume")) || 0.3,
      sfxVolume: parseFloat(localStorage.getItem("sfxVolume")) || 0.3
    },
    skills: {
      bulwarkActiveUntil, bulwarkCooldownUntil,
      accelActiveUntil,   accelCooldownUntil,
      empowerActiveUntil, empowerCooldownUntil, 
      prayCooldownUntil,
    }
  };

  if (window.saveAPI?.save) await window.saveAPI.save(save);
  try { localStorage.setItem("saveSkills", JSON.stringify(save.skills)); } catch {}
}

window.addEventListener('beforeunload', () => {
  try { saveGameData(); } catch {}
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { try { saveGameData(); } catch {} }
});

window.addEventListener('load', initSaves);

async function initSaves() {
  let loaded = null; // <-- hoisted so we can read it after try/catch

  try {
    const fileSave = await window.saveAPI?.load?.();
    if (fileSave) {
      loaded = fileSave; // <-- keep a reference for later

      // hydrate localStorage so your old code still works
      localStorage.setItem("starterKit", fileSave.starterKit || '');
      localStorage.setItem("playerHP", String(fileSave.playerHP ?? 100));
      localStorage.setItem("inventory", JSON.stringify(fileSave.inventory || {}));
      localStorage.setItem("equipment", JSON.stringify(fileSave.equipment || {}));

      const s = fileSave.settings || {};
      localStorage.setItem("musicEnabled", String(!!s.musicEnabled));
      localStorage.setItem("soundEnabled", String(!!s.soundEnabled));
      localStorage.setItem("musicVolume", String(s.musicVolume ?? 0.3));
      localStorage.setItem("sfxVolume", String(s.sfxVolume ?? 0.3));

      // hydrate globals
      playerHP  = fileSave.playerHP ?? 100;
      equipment = fileSave.equipment || equipment;
      inventory = fileSave.inventory || inventory;
    } else {
      // first run → migrate current localStorage
      await saveGameData();
    }
  } catch (e) {
    console.warn("initSaves failed, fallback to localStorage only:", e);
  }

  // Kick off normal startup (guard if helpers don't exist yet)
  try { updateHealthBars?.(playerHP); } catch {}

  // Resume skills: prefer cloud save (loaded), fallback to localStorage mirror
  const savedSkills =
    loaded?.skills ??
    JSON.parse(localStorage.getItem("saveSkills") || "{}");

  try { resumeSkillsFromSave?.(savedSkills); } catch {}
  renderBuffBar();
}


// Loading your Local Storage save

function loadGameData() {
    // Load player data (HP)
    let storedHP = localStorage.getItem("playerHP");
    if (storedHP) {
        playerHP = parseInt(storedHP);
    }

    // Load inventory
    let storedInventory = localStorage.getItem("inventory");
    if (storedInventory) {
        inventory = JSON.parse(storedInventory);
    }

    // Load equipment
    let storedEquipment = localStorage.getItem("equipment");
    if (storedEquipment) {
        equipment = JSON.parse(storedEquipment);
    }

      if (equipment.attack === undefined) {
        equipment.attack = 0;
    }
    if (equipment.defense === undefined) {
        equipment.defense = 0;
    }

    // Cleans up inventory to remove items that is 0
    cleanupInventory();

    // Update UI with the loaded data
    updateInventory();           // Update inventory UI
    renderEquipmentSlots();      // Update the equipment slots (weapon + armor)
    renderEquipmentPanel();
    updateHealthBars(playerHP);  // Update the player's health bar
}


// ------- Settings modal helpers -------
const settingsEl = document.getElementById("settingsModal"); // <- modal id
const othersToHide = ["inventoryContainer","craftingContainer","skillsContainer","lootContainer"];

function isHidden(el) {
  return el.hasAttribute("hidden") || getComputedStyle(el).display === "none";
}

// add this helper (it was missing)
function isSettingsOpen() {
  return settingsEl && !settingsEl.hasAttribute("hidden") && getComputedStyle(settingsEl).display !== "none";
}

function updateSelectionStatus(){
  const a = document.getElementById('currentArea');
  const m = document.getElementById('currentMonster');
  if (a) a.textContent = `Area: ${selectedArea || '—'}`;
  if (m) m.textContent = `Monster: ${selectedMonster || '—'}`;
}


let buffTicker = null;

function mmss(s){
  const m = Math.floor(s/60), sec = s%60;
  return `${m}:${sec<10?'0':''}${sec}`;
}

function getActiveBuffs() {
  const buffs = [];
  for (const [name, def] of Object.entries(SKILL_DEFS)) {
    // only timed buffs (duration > 0) show in HUD; Pray is instant
    if (!def || !def.getState || (def.duration || 0) === 0) continue;
    const st = def.getState();
    if ((st.activeLeft || 0) > 0) {
      buffs.push({ name, icon: def.icon, left: st.activeLeft });
    }
  }
  return buffs;
}

function renderBuffBar() {
  const bar = document.getElementById('buffBar');
  if (!bar) return;

  const buffs = getActiveBuffs();
  bar.innerHTML = ''; // reset

  // Build badges
  for (const b of buffs) {
    const el = document.createElement('div');
    el.className = 'buff-badge';
    el.setAttribute('data-buff', b.name);
    el.innerHTML = `
      <img src="${b.icon}" alt="${b.name}">
      <span class="buff-timer" id="buffTimer-${b.name.replace(/\s+/g,'')}">${mmss(b.left)}</span>
    `;
    bar.appendChild(el);
  }

  // manage ticker
  if (buffTicker) clearInterval(buffTicker);
  if (buffs.length === 0) return;

  buffTicker = setInterval(() => {
  let anyActive = false;

  // For each badge currently shown, recompute time left from SKILL_DEFS
  document.querySelectorAll('#buffBar .buff-badge').forEach(badge => {
    const name = badge.getAttribute('data-buff');  // set in render
    const def  = SKILL_DEFS[name];
    if (!def || !def.getState) return;

    const { activeLeft } = def.getState();
    const label = document.getElementById(`buffTimer-${name.replace(/\s+/g,'')}`);

    if (activeLeft > 0) {
      if (label) label.textContent = mmss(activeLeft);
      anyActive = true;
    } else {
      // remove expired badge
      badge.remove();
    }
  });

  if (!anyActive) {
    clearInterval(buffTicker);
    buffTicker = null;
  }
}, 1000);
}


function openSettings() {
  // Close Skills if it’s open
  const skills = document.getElementById('skillsModal');
  if (skills) skills.hidden = true;

  // Open Settings
  const modal = document.getElementById('settingsModal');
  const back  = document.getElementById('modalBackdrop');
  if (modal) {
    modal.style.display = '';   // <-- clear stale inline display:none
    modal.hidden = false;
  }
  if (back) back.hidden = false;
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.hidden = true;
    modal.style.display = '';   // <-- ensure we never leave display:none behind
  }

  // Keep backdrop if Skills or Result is still open
  const skillsOpen = document.getElementById('skillsModal')?.hidden === false;
  const resultOpen = document.getElementById('resultModal')?.hidden === false;

  const back = document.getElementById('modalBackdrop');
  if (back && !skillsOpen && !resultOpen) back.hidden = true;
}

function toggleSettings() {
  isHidden(settingsEl) ? openSettings() : closeSettings();
}

function updatePlayerHPUI() {
  const bar  = document.getElementById("playerHealth");
  const text = document.getElementById("playerHealthText");
  const clamped = Math.max(0, Math.min(100, Number(playerHP) || 0));
  if (bar)  bar.style.width = clamped + "%";
  if (text) text.textContent = clamped;
}

function openSkillsModal() {
  // hide non-modal panels
  document.getElementById('inventoryContainer')?.style && (document.getElementById('inventoryContainer').style.display = 'none');
  document.getElementById('craftingContainer')?.style  && (document.getElementById('craftingContainer').style.display  = 'none');
  document.getElementById('lootContainer')?.style      && (document.getElementById('lootContainer').style.display      = 'none');

  // IMPORTANT: hide Settings using the hidden attribute
  const settings = document.getElementById('settingsModal');
  if (settings) settings.hidden = true;

  // show backdrop + skills modal
  const back = document.getElementById('modalBackdrop');
  if (back) back.hidden = false;

  const modal = document.getElementById('skillsModal');
  if (modal) {
    modal.hidden = false;
    renderSkills();
  }
}

function closeSkillsModal() {
  const modal = document.getElementById('skillsModal');
  if (modal) modal.hidden = true;

  // keep backdrop if another modal is open
  const settingsOpen = document.getElementById('settingsModal')?.hidden === false;
  const resultOpen   = document.getElementById('resultModal')?.hidden === false;
  if (!settingsOpen && !resultOpen) {
    const back = document.getElementById('modalBackdrop');
    if (back) back.hidden = true;
  }
}

document.getElementById('skillsCloseBtn')?.addEventListener('click', closeSkillsModal);

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const skillsOpen = document.getElementById('skillsModal')?.hidden === false;
  if (skillsOpen) { closeSkillsModal(); e.preventDefault(); }
}, true);

// make button onclick work
window.toggleSettings = toggleSettings;

// ✖ close button
document.getElementById("settingsCloseBtn")?.addEventListener("click", closeSettings);

// ESC toggles modal (now safe)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (isSettingsOpen()) closeSettings(); else openSettings();
  e.preventDefault();
  e.stopPropagation();
})



// ===== Battle Result Modal helpers =====
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultText  = document.getElementById('resultText');
const resultPrimary   = document.getElementById('resultPrimary');   // OK
const modalBackdrop   = document.getElementById('modalBackdrop');

function openResultModal(outcome, monsterName, dropName = null) {
  // outcome: 'win' | 'lose'
  const won = outcome === 'win';
  resultTitle.textContent = won ? 'Victory!' : 'Defeated';
  resultText.textContent  = won
    ? `You defeated ${monsterName}!${dropName ? ' You found: ' + dropName + '.' : ''}`
    : `You were defeated by ${monsterName}!`;

  // wire buttons each time (simple and safe)
  resultPrimary.onclick = closeResultModal; // OK just closes

  // show
  modalBackdrop.hidden = false;
  resultModal.hidden = false;
  document.body.classList.add('modal-open');
}

// Generic info modal (reuse the same DOM)
function openInfoModal(title, text, primaryLabel = "OK") {
  resultTitle.textContent = title;
  resultText.textContent  = text;
  resultPrimary.textContent = primaryLabel;
  resultPrimary.onclick = closeResultModal;

  modalBackdrop.hidden = false;
  resultModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeResultModal() {
  resultModal.hidden = true;
  modalBackdrop.hidden = true;
  document.body.classList.remove('modal-open');
}

function restoreGatheringCooldown() {
  const btn   = document.getElementById('gatherButton');
  const label = document.querySelector('#gatherButton .label');

  // Guard if UI isn't on screen yet
  if (!btn) return;

  const saved = parseInt(localStorage.getItem("gatherStartTime") || "0", 10);

  if (!saved) {
    btn.disabled = false;
    if (label) label.textContent = "Gather";
    if (typeof setGatherText === 'function') setGatherText("Gather");
    return;
  }

  const elapsed   = Math.floor((Date.now() - saved) / 1000);
  const remaining = Math.max(0, (typeof gatherCooldown === 'number' ? gatherCooldown : 0) - elapsed);

  if (remaining > 0) {
    startGatherCooldown(remaining);
  } else {
    btn.disabled = false;
    if (label) label.textContent = "Gather";
    if (typeof setGatherText === 'function') setGatherText("Gather");
    localStorage.removeItem("gatherStartTime");
  }
}


// Make functions visible to inline HTML event handlers
Object.assign(window, {
  // starter & flow
  selectStarterKit,
  startNewGame,

  // combat
  selectMonster,      // only if your HTML calls selectMonster()
  fightMonster,

  // UI toggles
  toggleSettings,
  toggleInventory,
  toggleCrafting,
  toggleSkills,

  // gameplay actions
  gatherResource,

  // crafting (only if called from HTML)
  renderCraftingUI,
  craftItem
});
