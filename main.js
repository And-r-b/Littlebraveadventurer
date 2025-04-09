let titleMusic;
let musicVolume = parseFloat(localStorage.getItem("musicVolume"));

if (isNaN(musicVolume)) {
  musicVolume = 0.3; // Default to 50% volume on first visit
  localStorage.setItem("musicVolume", musicVolume);
}

function setupTitleMusic() {
    const musicEnabled = localStorage.getItem("musicEnabled") === "true";

    if (musicEnabled) {
        titleMusic = new Audio("/sounds/titlescreenmusic.mp3");
        titleMusic.loop = true;
        titleMusic.volume = musicVolume;
        titleMusic.play().catch((err) => {
            console.warn("Title music couldn't auto-play:", err);
        });
    }
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

// Global variables and starter kit
let equipment = {
    weapon: "Wooden Sword",
    attack: 5,
    armor: "None",  // Add armor slot here
    defense: 0 // Add defense stat to track armor's effect
};

let playerHP = 100;

// Items you can gather with the "Gather Resources button"
const gatherableResources = [
    { name: "Iron Ore", quantity: 1 },
    { name: "Wood", quantity: 1 },
    { name: "Leather", quantity: 1 },
    { name: "Steel Ore", quantity: 1 }
];

// Making sure that if Item in inventory is 0 it will now show in inventory.
let inventory = JSON.parse(localStorage.getItem("inventory")) || {
    "Iron Ore": 0,
    "Wood": 0,
    "Leather": 0,
    "Steel Ore": 0
};

let monster = {
    hp: 100 // Default monster health
};

// Example of selecting a monster
let selectedMonster = ""; 

let selectedStarter = ""; // Store the selected starter kit


// Construct of what monsters that is available
const monsters = {
    "Slime": { hp: 20, attack: [4, 8], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 40, attack: [7, 13], drops: ["Wolf Pelt", "Sharp Fang"] },
    "Goblin": { hp: 60, attack: [10, 15], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 80, attack: [15, 20], drops: ["Orc Tooth", "Iron Shard"] },
    "Angus": { hp: 120, attack: [30, 35], drops: ["Fox Hat", "Explosive Residue", "Wheat Straw"] }

    // Add more monsters here (Make sure to add another option in HTML)
    // copy pase one of these and change the name, hp, attack and drops
};

function playSound(soundPath) {
    const soundEnabled = localStorage.getItem("soundEnabled") === "true";
    if (!soundEnabled) return;

    const audio = new Audio(soundPath);
    audio.play();
}
// Define a mapping of monsters to their background image and the monster image
const monsterDataMap = {
  'Slime': {
    background: 'url("/images/cave.png")',
    monsterImage: '/images/slime.png',
    sound: '/sounds/'
  },
  'Wolf': {
    background: 'url("/images/fantasy-forest.png")',
    monsterImage: '/images/wolf.png',
    sound: '/sounds/'
  },
  'Goblin': {
    background: 'url("/images/goblin-camp.png")',
    monsterImage: '/images/goblin.png',
    sound: '/sounds/'
  },
  'Orc': {
    background: 'url("/images/orc-camp.png")',
    monsterImage: '/images/orc.png',
    sound: '/sounds/'
  },
  'Angus': {
    background: 'url("/images/angusfields.png")',
    monsterImage: '/images/angus.png',
    sound: '/sounds/'
  }
};

function selectMonster() {
    selectedMonster = document.getElementById("monsterSelect").value;
    const monsterData = monsterDataMap[selectedMonster];

    // Background & monster image
    document.body.style.backgroundImage = monsterData.background;
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover';
    document.querySelector('.monster-image img').src = monsterData.monsterImage;

    // Sound
    playSound(monsterData.sound);
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
    "Basic Sword": {
        materials: {
            "Wood": 3,
            "Leather": 2
        },
        result: "Basic Sword",
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
            "Iron Ore": 5,
            "Wood": 3,
            "Leather": 3,
            "Basic Sword": 1
        },
        result: "Iron Sword",
        attackBoost: 14
    },

    "Sharp-Fanged Blade": {
        materials: {
            "Sharp Fang": 3,
            "Wood": 2,
            "Iron Ore": 5
        },
        result: "Sharp-Fanged Blade",
        attackBoost: 16
    },

    "Sharpend Goblin Blade": {
        materials: {
            "Rusty Dagger": 3,
            "Sticky Residue": 2,
            "Wood": 3,
            "Iron Ore": 10
        },
        result: "Sharpend Goblin Blade",
        attackBoost: 20
    },

    "Steel Sword": {
        materials: {
            "Steel Ore": 5,
            "Iron Ore": 3,
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
            "Steel Ore": 10

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
            "Iron Ore": 1
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
            "Iron Ore": 10,
            "Leather Armor": 1 // Requires Leather Armor as material
        },
        result: "Iron Armor",
        defenseBoost: 13
    },

    "Wolf Armor": {
        materials: {
            "Wolf Pelt": 10,
            "Iron Ore": 10,
            "Leather": 5
        },
        result: "Wolf Armor",
        defenseBoost: 16
    },

    "Goblin-Made Armor": {
        materials: {
            "Rusty Dagger": 5,
            "Sticky Residue": 2,
            "Iron Ore": 5,
            "Steel Ore": 10
        },
        result: "Goblin-Made Armor",
        defenseBoost: 20
    },

    "Steel Armor": {
        materials: {
            "Steel Ore": 10,
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
            "Steel Ore": 10
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
    
    // Add more upgrades here...
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

            // Equip the crafted item (if applicable)
            if (recipe.attackBoost !== undefined) {
                // It's a weapon
                if (recipe.attackBoost > (equipment.attack || 0)) {
                    equipment.weapon = recipe.result;
                    equipment.attack = recipe.attackBoost;
                }
            } else if (recipe.defenseBoost !== undefined) {
                // It's armor
                if (recipe.defenseBoost > (equipment.defense || 0)) {
                    equipment.armor = recipe.result;
                    equipment.defense = recipe.defenseBoost;
                }
            }

            // Update UI
            updateInventory();
            renderEquipmentSlots();
            updatePlayerStats();
            saveGameData();

            alert(`You crafted a ${itemName}!`);
        } else {
            alert("You don't have enough materials to craft this.");
        }
    }
}

  
//   // Event listener for "Weapons" button
//   document.getElementById('weapons').addEventListener('click', showWeapons);
  
//   // Event listener for "Armor" button
//   document.getElementById('armor').addEventListener('click', showArmor);


// Toggling crafting menu
function toggleCrafting() {
    // Hide other sections
    document.getElementById('inventoryContainer').style.display = 'none';
    document.getElementById('settingsContainer').style.display = 'none';
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

let gatherCooldown = 600; // 10 minutes in seconds
let gatherButton = document.getElementById("gatherButton");
let messageElement = document.getElementById("message");

// Function to start the cooldown and delay item rewards
function startGatherCooldown(remainingTime) {
    gatherButton.disabled = true;

    let countdown = setInterval(() => {
        let elapsedTime = Math.floor((Date.now() - localStorage.getItem("gatherStartTime")) / 1000);
        remainingTime = gatherCooldown - elapsedTime;

        if (remainingTime <= 0) {
            clearInterval(countdown);
            gatherButton.disabled = false;
            gatherButton.innerText = "Gather Resource";
            giveGatherReward();
            localStorage.removeItem("gatherStartTime"); // Clear saved time
        } else {
            // Ensure remaining time is always a valid number
            if (isNaN(remainingTime) || remainingTime < 0) {
                clearInterval(countdown);
                gatherButton.disabled = false;
                gatherButton.innerText = "Gather Resource";
                return;
            }

            let minutes = Math.floor(remainingTime / 60);
            let seconds = remainingTime % 60;
            gatherButton.innerText = `Gathering... (${minutes}:${seconds < 10 ? "0" : ""}${seconds})`;
        }
    }, 1000);
}


// Function to handle the gathering process (starts cooldown but delays rewards)
function gatherResource() {
    if (gatherButton.disabled) return; // Prevent multiple clicks

    let startTime = Date.now();
    localStorage.setItem("gatherStartTime", startTime);

    startGatherCooldown(gatherCooldown); // Start cooldown
}

function giveGatherReward() {
    const availableResources = ["Iron Ore", "Wood", "Leather", "Steel Ore"];
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
    updateInventoryDisplay();

    // Create message only for items that are > 0
    let gatheredMessage = Object.entries(gatheredItems)
        .filter(([_, quantity]) => quantity > 0) // Filters out 0 values
        .map(([resource, quantity]) => `${quantity} ${resource}`)
        .join(", ");

    // Only display a message if something was gathered
    if (gatheredMessage) {
        messageElement.innerText = `You gathered: ${gatheredMessage}!`;
        messageElement.style.display = "block";
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
    // Store the selected starter in localStorage
    localStorage.setItem("starterKit", starter);

    // Store the selected starter in the global variable
    selectedStarter = starter;

    const selectedMonster = 'Slime';

    // Set the equipment based on the selected starter kit
    if (starter === "Knight") {
        equipment = { 
            weapon: "Wooden Sword", 
            attack: 5, 
            armor: "Common Clothing", // Start with leather armor
            defense: 0 // Leather Armor provides some defense
        };
    }


    // Remove the background image after class selection (using JavaScript to remove it)
    document.getElementById("starterSelection").style.backgroundImage = ''; // Remove background

    // Hide the starter selection screen and show the game content
    document.getElementById("starterSelection").style.display = "none";
    document.getElementById("gameContent").style.display = "block";

    // Set the selected monster (Slime) as default
    document.getElementById("monsterSelect").value = selectedMonster;

    // Render initial game
    renderEquipmentSlots();
    updateInventory();
    selectMonster();
    stopTitleMusic();
}

function checkStarterKitSelection() {
    // Retrieve starter kit from localStorage if any
    let starterKit = localStorage.getItem("starterKit");

    if (starterKit) {
        // If a starter kit is saved, automatically select it
        selectStarterKit(starterKit);
    } else {
        // Ensure starter selection screen is visible if no kit is selected
        document.getElementById("starterSelection").style.display = "block";
        document.getElementById("gameContent").style.display = "none"; // Hide game until a kit is selected
    }
}

// Function to render equipment slots (e.g., weapon)
function renderEquipmentSlots() {
    const weaponSlot = document.getElementById('weaponSlot');
    const armorSlot = document.getElementById('armorSlot');
    const attackDisplay = document.getElementById('playerAttack');
    const defenseDisplay = document.getElementById('playerDefense');

    // Update weapon slot
    if (equipment.weapon) {
        weaponSlot.textContent = `Weapon: ${equipment.weapon}`;
    } else {
        weaponSlot.textContent = "Weapon: None";
    }

    // Update armor slot
    if (equipment.armor) {
        armorSlot.textContent = `Armor: ${equipment.armor}`;
    } else {
        armorSlot.textContent = "Armor: None";
    }

    // Update the player's attack and defense stats in the health bar section
    attackDisplay.textContent = equipment.attack;  // Update attack value
    defenseDisplay.textContent = equipment.defense; // Update defense value
}
// Function to update the inventory display
function updateInventory(newLoot = "") {
    let inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = "<h2>Inventory</h2>"; // Ensure title stays

    // If a new item is gathered, show a message
    if (newLoot) {
        let newLootDiv = document.createElement("div");
        newLootDiv.classList.add("inventory-item");
        newLootDiv.innerHTML = `<span>You gathered: ${newLoot}</span>`;
        inventoryDiv.appendChild(newLootDiv);
    }

    // Loop through each item in the inventory and display it
    for (let item in inventory) {
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("inventory-item");
        itemDiv.innerHTML = `<span class="equip-link" onclick="tryEquip('${item}')">${item}</span> <span class='quantity'>x${inventory[item]}</span>`;
        inventoryDiv.appendChild(itemDiv);
    }
}

function tryEquip(itemName) {
    const recipe = craftingRecipes[itemName];
    if (!recipe) return;

    if (recipe.attackBoost !== undefined) {
        equipment.weapon = itemName;
        equipment.attack = recipe.attackBoost;
        alert(`${itemName} equipped as your weapon!`);
    } else if (recipe.defenseBoost !== undefined) {
        equipment.armor = itemName;
        equipment.defense = recipe.defenseBoost;
        alert(`${itemName} equipped as your armor!`);
    }

    renderEquipmentSlots();
    updatePlayerStats();
    saveGameData();
}


// Toggle Inventory (Make Sure It Opens/Closes)
function toggleInventory() {
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
    document.getElementById('settingsContainer').style.display = 'none';
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

// Toggle Settings Buttons

function toggleSettings() {
    const settingsContainer = document.getElementById("settingsContainer");
    if (settingsContainer.style.display === "none") {
        settingsContainer.style.display = "block"; // Show the container
    } else {
        settingsContainer.style.display = "none"; // Hide the container
    }

    // Load previously saved settings
    const musicToggle = document.getElementById("musicToggle");
    const soundToggle = document.getElementById("soundToggle");

    // Set the toggle states based on saved settings
    musicToggle.checked = localStorage.getItem("musicEnabled") === "true";
    soundToggle.checked = localStorage.getItem("soundEnabled") === "true";
    document.getElementById("musicVolume").value = musicVolume;
}

document.getElementById("musicVolume").addEventListener("input", function () {
    musicVolume = parseFloat(this.value);
    localStorage.setItem("musicVolume", musicVolume);
    if (titleMusic) {
        titleMusic.volume = musicVolume;
    }
});

// Save settings when toggled
document.getElementById("musicToggle").addEventListener("change", function() {
    localStorage.setItem("musicEnabled", this.checked);
});

document.getElementById("soundToggle").addEventListener("change", function() {
    localStorage.setItem("soundEnabled", this.checked);
});


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
            document.getElementById("message").innerText = `You defeated ${selectedMonster}!`;
            let drop = monster.drops[Math.floor(Math.random() * monster.drops.length)]; // Random drop from the monster
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
            return; // Exit the interval callback function
        }

        // Monster attacks
        let monsterDamage = Math.floor(Math.random() * (monster.attack[1] - monster.attack[0] + 1)) + monster.attack[0];

        // Apply defense: Subtract the player's defense from the monster's damage
        let effectiveDamage = Math.max(0, monsterDamage - equipment.defense); // Ensure damage isn't negative

        playerHP -= effectiveDamage; // Decrease player's HP based on effective damage after defense

        // Check if the player is defeated
        if (playerHP <= 0) {
            playerHP = 0; // Ensure HP is set to 0 if the player is defeated
            document.getElementById("message").innerText = `You were defeated by ${selectedMonster}!`;

            // Save the game data after the battle (even if the player loses)
            saveGameData();

            // Stop the battle once the player is defeated
            clearInterval(battleInterval);
            return; // Exit the interval callback function
        }

        // Update the player's current HP display after the monster attacks
        document.getElementById("playerHP").innerText = `HP: ${playerHP}`;

    }, 1000); // Run the battle tick every second (1000 milliseconds)

    // Show the "Play Again" button after the battle is over
    document.getElementById("playAgainButton").style.display = "inline-block";

    // Hide "Fight Monster" button
    document.querySelector("button[onclick='fightMonster()']").style.display = "none";
}

// Reset button to start new game - Pop Alert

function startNewGame() {
    // Clear all saved data from localStorage
    localStorage.clear();

    // Reset player stats to default values
    playerHP = 100;
    inventory = {
        "Iron Ore": 0,
        "Wood": 0,
        "Leather": 0,
        "Steel Ore": 0
    };
    equipment = {
        weapon: "None",
        attack: 5, // Default attack value
        armor: "None",
        defense: 0
    };

    //  Reset Pray Cooldown Variables
    prayCooldownActive = false;
    prayCooldownTime = initialPrayCooldownTime;
    localStorage.removeItem("prayStartTime");  // Remove cooldown start time
    localStorage.removeItem("prayCooldownTime"); // Remove stored cooldown time
    localStorage.removeItem("prayCooldownActive"); // Remove stored cooldown state

    //  Reset Pray Button UI
    document.getElementById('prayButton').disabled = false;
    document.getElementById('prayButton').textContent = "Pray"; // Reset button text
    document.getElementById('prayCooldown').style.display = 'none'; // Hide cooldown message

    // Hide game content and show starter selection screen
    document.getElementById("gameContent").style.display = "none";
    document.getElementById("starterSelection").style.display = "block";

    // Remove starter kit from localStorage to allow re-selection
    localStorage.removeItem("starterKit");

    // Optionally reset settings (e.g., reset music and sound preferences)
    localStorage.setItem("musicEnabled", "true");
    localStorage.setItem("soundEnabled", "true");

    // Reset the UI for music and sound settings
    document.getElementById("musicToggle").checked = true;
    document.getElementById("soundToggle").checked = true;

    // Alert the player that the game has been reset
    alert("The game has been reset! Choose your starter kit to begin.");

    // Directly reload the page by setting location.href
    location.href = location.href;  // Reloads the page
}


// Function to save game data to localStorage
function saveGameData() {
    localStorage.setItem("playerHP", playerHP);
    localStorage.setItem("inventory", JSON.stringify(inventory));
    localStorage.setItem("equipment", JSON.stringify(equipment));
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
    updateHealthBars(playerHP);  // Update the player's health bar
}

// Checking onload
window.onload = function() {
    checkStarterKitSelection(); 
    loadGameData(); 
    setupTitleMusic();

    // Restore gathering cooldown
    let savedTime = localStorage.getItem("gatherStartTime");
    if (savedTime) {
        let elapsedTime = Math.floor((Date.now() - savedTime) / 1000);
        let remainingTime = gatherCooldown - elapsedTime;

        if (remainingTime > 0) {
            startGatherCooldown(remainingTime);
        } else {
            gatherButton.disabled = false;
            gatherButton.innerText = "Gather Resource";
        }
    }
};

