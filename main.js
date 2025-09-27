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

let gameplayMusic;

function setupGameplayMusic() {
    const musicEnabled = localStorage.getItem("musicEnabled") === "true";

    if (musicEnabled) {
        gameplayMusic = new Audio("/sounds/gameplaymusic.mp3"); // put your gameplay music path here
        gameplayMusic.loop = true;
        gameplayMusic.volume = musicVolume;
        gameplayMusic.play().catch((err) => {
            console.warn("Gameplay music couldn't auto-play:", err);
        });
    }
}

function stopGameplayMusic(fadeTime = 2000) {
    if (!gameplayMusic) return;

    const fadeSteps = 20;
    const fadeInterval = fadeTime / fadeSteps;
    let currentStep = 0;

    const fade = setInterval(() => {
        currentStep++;
        gameplayMusic.volume = Math.max(0, gameplayMusic.volume - (musicVolume / fadeSteps));

        if (currentStep >= fadeSteps) {
            clearInterval(fade);
            gameplayMusic.pause();
            gameplayMusic.currentTime = 0;
        }
    }, fadeInterval);
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
  setTimeout(() => setupGameplayMusic?.(), 200);
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

function selectMonster() {
    if (!isGameVisible()) return;

    const selectElement = document.getElementById("monsterSelect");
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
     "Good Health Potion": {
        materials: {
          "Herb": 5,
          "Water": 3,
          "Slime Goo": 3
        },
        result: "Good Health Potion",
        consumable: true,
        effect: { heal: 50 }
    },
    "Best Health Potion": {
        materials: {
          "Herb": 10,
          "Water": 5,
          "Slime Goo": 5
        },
        result: "Best Health Potion",
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
      materials: {
        "Wood": 1
      },
      result: "Coal"
    },

     "Iron Ingot": {
      materials: {
        "Iron Ore": 2,
        "Coal": 1
      },
      result: "Iron Ingot"
    },

    "Steel Ingot": {
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
  "Steel Ingot": "No description yet.",
  "Wood": "A strong material well-suited for many different uses.",
  "Herb": "No description yet.",
  "Water": "No description yet.",
  "Coal": "No description yet.",
  "Leather": "Gathered from various animals and processed into a usable material.",
  "Iron Ingot": "No description yet.",
  "Slime Goo": "No description yet.",
  "Sticky Residue": "No description yet.",
  "Wolf Pelt": "No description yet.",
  "Sharp Fang": "No description yet.",
  "Goblin Ear": "No description yet.",
  "Rusty Dagger": "No description yet.",
  "Orc Tooth": "No description yet.",
  "Iron Shard": "No description yet.",
  "Fox Hat": "No description yet.",
  "Explosive Residue": "No description yet.",
  "Wheat Straw": "No description yet.",

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
  "Health Potion": "No description yet.",
  "Good Health Potion": "No description yet.",
  "Best Health Potion": "No description yet.",
  "Strength Stew": "No description yet.",
};

// Function to display weapons or armor in the UI
function displayItems(itemCategory) {
    const container = document.getElementById('items-container');
    container.innerHTML = '';  // Clear previous items

    // Dynamically collect items based on category
    const itemsToDisplay = Object.entries(craftingRecipes)
        .filter(([_, recipe]) => {
            if (itemCategory === 'weapons') return recipe.attackBoost !== undefined;
            if (itemCategory === 'armor') return recipe.defenseBoost !== undefined;
            if (itemCategory === 'consumables') return recipe.consumable === true;
            if (itemCategory === 'smelting') {
                return (
                    recipe.attackBoost === undefined &&
                    recipe.defenseBoost === undefined &&
                    recipe.consumable !== true
                );
            }
            return false;
        });

    // Loop through filtered items
    itemsToDisplay.forEach(([itemName, recipe]) => {
        let canCraft = true;

        for (let material in recipe.materials) {
            if (!inventory[material] || inventory[material] < recipe.materials[material]) {
                canCraft = false;
                break;
            }
        }

        const itemDiv = document.createElement("div");
        itemDiv.classList.add("crafting-item");

        itemDiv.innerHTML = `
            <h3>${itemName}</h3>
            <p>Materials: ${Object.entries(recipe.materials).map(([mat, amt]) => `${amt} ${mat}`).join(', ')}</p>
            <button ${canCraft ? `onclick="craftItem('${itemName}')"` : "disabled"}>
                ${canCraft ? `Craft ${itemName}` : "Can't Craft"}
            </button>
        `;

        container.appendChild(itemDiv);
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
    document.getElementById('settingsModal').style.display = 'none';
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

let gatherCooldown = 1; // 10 minutes in seconds
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

    stopTitleMusic?.();
    setTimeout(() => setupGameplayMusic?.(), 2100);
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

  stopTitleMusic?.();
  setTimeout(() => setupGameplayMusic?.(), 2100);
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

// Function to update the inventory display
function updateInventory(newLoot = "") {
  const inventoryDiv = document.getElementById("inventory");
  inventoryDiv.innerHTML = "<h2>Inventory</h2>";

  if (newLoot) {
    const newLootDiv = document.createElement("div");
    newLootDiv.classList.add("inventory-item");
    newLootDiv.innerHTML = `<span>You gathered: ${newLoot}</span>`;
    inventoryDiv.appendChild(newLootDiv);
  }

  for (const item in inventory) {
    if (inventory[item] <= 0) continue;

    const div = document.createElement("div");
    div.className = "inventory-item";

    // --- Consumable handling ---
    const recipe = craftingRecipes[item];
    if (recipe && recipe.consumable === true) {
      const tip = ITEM_DESCRIPTIONS[item] || "";
      div.innerHTML = `
        <span class="has-tip" data-tip="${tip}">${item}</span>
        <span class='quantity'>x${inventory[item]}</span>
        <button onclick="useConsumable('${item}')">Use</button>
      `;
      inventoryDiv.appendChild(div);
      continue; // skip further handling for this item
    }

    // --- Equipment handling (weapon/armor) ---
    const kind = getEquipType(item);
    if (!kind) {
      // Plain material/loot
      const tip = ITEM_DESCRIPTIONS[item] || "";
      div.innerHTML = `
        <span class="has-tip" data-tip="${tip}">${item}</span>
        <span class='quantity'>x${inventory[item]}</span>
      `;
    } else {
      const equipped = isEquipped(item);
      const btnText = equipped ? "Unequip" : "Equip";
      const tip = ITEM_DESCRIPTIONS[item] || "";
      div.innerHTML = `
        <span class="has-tip" data-tip="${tip}">${item}${equipped ? " (equipped)" : ""}</span>
        <span class='quantity'>x${inventory[item]}</span>
        <button style="margin-left:8px" onclick="toggleEquip('${item}')">${btnText}</button>
      `;
    }

    inventoryDiv.appendChild(div);
  }

  renderEquipmentPanel();
}

// Toggle Inventory (Make Sure It Opens/Closes)
function toggleInventory() {
    document.getElementById('skillsContainer').style.display = 'none';
    document.getElementById('craftingContainer').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';
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
    // Hide other menus
    document.getElementById('inventoryContainer').style.display = 'none';
    document.getElementById('craftingContainer').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('lootContainer').style.display = 'none';

    let skillsContainer = document.getElementById('skillsContainer');
    
    // Toggle visibility
    if (skillsContainer.style.display === 'none') {
        skillsContainer.style.display = 'block';
    } else {
        skillsContainer.style.display = 'none';
    }
}

// Skill Pray - Healing 50 HP - Cooldown of 5 minutes

let prayCooldownActive = false;
let prayCooldownTime = 300; // 5 minutes in seconds
let initialPrayCooldownTime = prayCooldownTime; // Store the original cooldown time
let cooldownInterval; // Track the interval to prevent multiple intervals

// When the game loads, check if there's a saved cooldown state in localStorage
window.addEventListener('load', function () {
    if (localStorage.getItem('prayCooldownTime') && localStorage.getItem('prayCooldownActive') === 'true') {
        prayCooldownTime = parseInt(localStorage.getItem('prayCooldownTime'));
        prayCooldownActive = true;
        document.getElementById('prayButton').disabled = true; // Disable the button
        document.getElementById('prayCooldown').style.display = 'inline'; // Show cooldown message
        updateCooldownDisplay();
        startCooldown();
        if (isGameVisible()) selectMonster();
    }
});

// Listen for visibility changes (tab switching or browser focus change)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // When the game loses focus, save the current cooldown time to localStorage
        localStorage.setItem('prayCooldownTime', prayCooldownTime);
        localStorage.setItem('prayCooldownActive', prayCooldownActive.toString());
    } else {
        // When the game regains focus, continue the cooldown
        if (prayCooldownActive) {
            // Don't start a new interval if it's already running
            if (!cooldownInterval) {
                startCooldown();
            }
        }
    }
});

function usePray() {
    if (prayCooldownActive) return; // Prevent multiple activations

    prayCooldownActive = true;
    document.getElementById('prayButton').disabled = true; // Disable the button
    document.getElementById('prayCooldown').style.display = 'inline'; // Show the cooldown message

    // Start healing
    playerHP = Math.min(playerHP + 50, 100); // Heal but not over max HP
    updateHealthBars(playerHP); // Update health bars

    // Save HP to localStorage to persist after refresh
    localStorage.setItem('playerHP', playerHP);

    saveGameData();

    // Update the Pray button text to indicate it's in use
    let prayButton = document.getElementById('prayButton');
    prayButton.textContent = 'Praying...'; // Set text while praying

    // Save the initial time when prayer is used
    localStorage.setItem('prayStartTime', Date.now());

    // Start the cooldown and update the timer every second
    startCooldown();
}

function startCooldown() {
    // If the start time exists, calculate the elapsed time
    const startTime = localStorage.getItem('prayStartTime');
    if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000); // Calculate elapsed time in seconds
        prayCooldownTime = Math.max(initialPrayCooldownTime - elapsed, 0); // Ensure cooldown doesn't go negative
    }

    // Only start the interval if it's not already running
    if (!cooldownInterval) {
        cooldownInterval = setInterval(() => {
            if (prayCooldownTime > 0) {
                prayCooldownTime--; // Decrease the cooldown time by 1 second
                updateCooldownDisplay();
                localStorage.setItem('prayCooldownTime', prayCooldownTime); // Store updated time in localStorage
            } else {
                clearInterval(cooldownInterval); // Stop the timer when it's done
                cooldownInterval = null; // Reset the interval tracker
                prayCooldownActive = false; // Reset cooldown status
                localStorage.setItem('prayCooldownActive', 'false'); // Update status in localStorage
                document.getElementById('prayButton').disabled = false; // Enable the button
                document.getElementById('prayButton').textContent = 'Pray'; // Reset the button text to 'Pray'
                document.getElementById('prayCooldown').style.display = 'none'; // Hide cooldown message

                // Reset the cooldown time for the next use
                prayCooldownTime = initialPrayCooldownTime;
                localStorage.removeItem('prayStartTime'); // Remove start time
            }
        }, 1000); // Update every second
    }
}

function updateCooldownDisplay() {
    document.getElementById('prayCooldown').textContent = `Pray is on cooldown: ${prayCooldownTime}s`;
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

function isSettingsOpen() {
  return settingsEl && !settingsEl.hasAttribute("hidden") && getComputedStyle(settingsEl).display !== "none";
}
// ---- Save toggles ----
document.getElementById("musicToggle").addEventListener("change", function () {
  localStorage.setItem("musicEnabled", this.checked);
  if (this.checked) {
    // start whichever music should be active
    if (document.getElementById("gameContent").style.display === "block") {
      setupGameplayMusic();
    } else {
      setupTitleMusic();
    }
  } else {
    stopTitleMusic();
    stopGameplayMusic();
  }
});

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
    let selectedMonster = document.getElementById("monsterSelect").value;

    // Clear any previous message before starting the fight
    document.getElementById("message").innerText = "";

    // Create a fresh copy of the monster's stats each time the fight starts
    let monster = { ...monsters[selectedMonster] }; // New copy of monster with full health

    // Make sure the monster's health is reset to its max
    monster.hp = monsters[selectedMonster].hp;

    // Set up the interval for the fight (simulate ticks)
    let battleInterval = setInterval(() => {
        // Player attacks
        let playerDamage = Math.floor(Math.random() * equipment.attack) + 1; // Random damage based on player's attack power
        monster.hp -= playerDamage; // Decrease monster's HP

        // Ensure monster HP doesn't go below 0
        if (monster.hp < 0) monster.hp = 0;

        // Update the health bars after the player's attack
        updateHealthBars(playerHP, monster, selectedMonster);

        // Check if the monster is defeated
        if (monster.hp === 0) {
            // Display victory message and drop item
            let drop = monster.drops[Math.floor(Math.random() * monster.drops.length)]; // Random drop from the monster
            openResultModal('win', selectedMonster, drop);
            if (inventory[drop]) {
                inventory[drop] += 1; // Increase the count of the drop in inventory
            } else {
                inventory[drop] = 1; // Add the drop to inventory
            }
            updateInventory(); // Update the displayed inventory

            // Save the game data after the battle
            saveGameData();

            // Stop the battle once the monster is defeated
            clearInterval(battleInterval);

            monster.hp = monsters[selectedMonster].hp;   // refresh model
            resetMonsterBar(selectedMonster);
            

            awardKillAchievements(selectedMonster);
            return; // Exit the interval callback function
        }

        // Monster attacks
        let monsterDamage = Math.floor(Math.random() * (monster.attack[1] - monster.attack[0] + 1)) + monster.attack[0];

        // Apply defense: Subtract the player's defense from the monster's damage
        let effectiveDamage = Math.max(0, monsterDamage - equipment.defense); // Ensure damage isn't negative

        playerHP -= effectiveDamage; // Decrease player's HP based on effective damage after defense

        updateHealthBars(playerHP, monster, selectMonster);
        saveGameData();
        // Check if the player is defeated
        if (playerHP <= 0) {
            playerHP = 0; // Ensure HP is set to 0 if the player is defeated
            openResultModal('lose', selectedMonster);

            // Save the game data after the battle (even if the player loses)
            saveGameData();

            // Stop the battle once the player is defeated
            clearInterval(battleInterval);
            return; // Exit the interval callback function
        }

    }, 1000); // Run the battle tick every second (1000 milliseconds)

    // Show the "Play Again" button after the battle is over
    //document.getElementById("playAgainButton").style.display = "inline-block";

    // Hide "Fight Monster" button
    //document.querySelector("button[onclick='fightMonster()']").style.display = "none";
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
        prayBtn.textContent = "Pray";
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
    }
  };

  if (window.saveAPI?.save) await window.saveAPI.save(save);
}

window.addEventListener('beforeunload', () => {
  try { saveGameData(); } catch {}
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { try { saveGameData(); } catch {} }
});

window.addEventListener('load', initSaves);

async function initSaves() {
  try {
    const fileSave = await window.saveAPI?.load?.();
    if (fileSave) {
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
      playerHP = fileSave.playerHP ?? 100;
      equipment = fileSave.equipment || equipment;
      inventory = fileSave.inventory || inventory;
    } else {
      // first run → migrate current localStorage
      await saveGameData();
    }
  } catch (e) {
    console.warn("initSaves failed, fallback to localStorage only:", e);
  }

  // kick off your normal startup
  updateHealthBars(playerHP); // ✅ make the UI show saved HP immediately
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


function openSettings() {
  othersToHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  settingsEl.removeAttribute("hidden");
  settingsEl.style.display = "block";

  if (typeof syncSettingsUIFromStorage === "function") {
    syncSettingsUIFromStorage();
  }
}

function closeSettings() {
  const backdrop = document.getElementById("modalBackdrop");
  if (backdrop) backdrop.hidden = true;

  settingsEl.setAttribute("hidden", "");
  settingsEl.style.display = "none";
}

function toggleSettings() {
  isHidden(settingsEl) ? openSettings() : closeSettings();
}

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
  usePray,

  // crafting (only if called from HTML)
  renderCraftingUI,
  craftItem
});
