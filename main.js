// Global variables and starter kit
let equipment = {
    weapon: "Basic Sword",
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
let selectedMonster = 0; 

let selectedStarter = ""; // Store the selected starter kit


// Construct of what monsters that is available
const monsters = {
    "Slime": { hp: 20, attack: [2, 5], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 30, attack: [5, 10], drops: ["Wolf Pelt", "Sharp Fang"] },
    "Goblin": { hp: 40, attack: [6, 12], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 60, attack: [8, 15], drops: ["Orc Tooth", "Iron Shard"] }

    // Add more monsters here (Make sure to add another option in HTML)
    // copy pase one of these and change the name, hp, attack and drops
};

//Updating player stats when you add a new weapon or armor dynamically
function updatePlayerStats() {
    document.getElementById("playerAttack").innerText = equipment.attack;
    document.getElementById("playerDefense").innerText = equipment.defense;
}
//Calling the update when player updates attack and defense
updatePlayerStats();

// Different Crafting recipies
const craftingRecipes = {
    "Iron Sword": {
        materials: {
            "Iron Ore": 3,
            "Wood": 2
        },
        result: "Iron Sword",
        attackBoost: 10
    },

    "Leather Armor": {
        materials: {
            "Leather": 3,
            "Iron Ore": 1
        },
        result: "Leather Armor",
        defenseBoost: 5
    },

    "Iron Armor": {
        materials: {
            "Iron Ore": 10,
            "Leather Armor": 1 // Requires Leather Armor as material
        },
        result: "Iron Armor",
        defenseBoost: 7
    },

    "Steel Armor": {
        materials: {
            "Steel Ore": 5,
            "Iron Armor": 1  // Requires Iron Armor as material
        },
        result: "Steel Armor",
        defenseBoost: 13
    },
    // Add more upgrades here...
};

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
            if (itemName.includes("Sword")) {
                equipment.weapon = recipe.result;
                equipment.attack = recipe.attackBoost;
            } else if (itemName.includes("Armor")) {
                equipment.armor = recipe.result;
                equipment.defense = recipe.defenseBoost;
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
        let recipe = craftingRecipes[itemName];
        let canCraft = true;

        // Check if player has the required items
        for (let material in recipe.materials) {
            if (inventory[material] < recipe.materials[material]) {
                canCraft = false;
                break;
            }
        }

        // Add previous item check (e.g., Steel Armor requires Leather Armor)
        if (itemName === "Steel Armor" && !inventory["Leather Armor"]) {
            canCraft = false;
        }

        // Create the UI element for this item
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("crafting-item");

        if (canCraft) {
            itemDiv.innerHTML = `<button onclick="craftItem('${itemName}')">${itemName}</button>`;
        } else {
            itemDiv.innerHTML = `<button disabled>${itemName}</button>`;
        }

        craftingDiv.appendChild(itemDiv);
    }
}

// Gathering Process

let gatherCooldown = 600; // 10 minutes in seconds
let gatherButton = document.getElementById("gatherButton");
let messageElement = document.getElementById("message");

// Function to start the cooldown and delay item rewards
function startGatherCooldown(remainingTime) {
    gatherButton.disabled = true;

    let countdown = setInterval(() => {
        if (remainingTime <= 0) {
            clearInterval(countdown);
            gatherButton.disabled = false;
            gatherButton.innerText = "Gather Resource";
            giveGatherReward();
            localStorage.removeItem("gatherStartTime"); // Clear saved time
            localStorage.removeItem("gatherRemainingTime");
        } else {
            //Ensure remaining time is always a valid number
            
            if (isNaN(remainingTime) || remainingTime < 0) {
                clearInterval(countdown);
                gatherButton.disabled = false
                gatherButton.innerText = "Gather Resource";
                return
            }

            let minutes = Math.floor(remainingTime / 60);
            let seconds = remainingTime % 60;
            gatherButton.innerText = `Gathering... (${minutes}:${seconds < 10 ? "0" : ""}${seconds})`;
            remainingTime--;

            localStorage.setItem("gatherRemainingTime", remainingTime); // Save remaining time
        }
    }, 1000);
}


// Function to handle the gathering process (starts cooldown but delays rewards)
function gatherResource() {
    if (gatherButton.disabled) return; // Prevent multiple clicks

    let startTime = Date.now();
    localStorage.setItem("gatherStartTime", startTime);
    localStorage.setItem("gatherRemainingTime", gatherCooldown); // Ensure Cooldown is stored correctly

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

    // Hide the starter selection and show the game content
    document.getElementById("starterSelection").style.display = "none";
    document.getElementById("gameContent").style.display = "block";

    // Set the equipment based on the selected starter kit
    if (starter === "Knight") {
        equipment = { 
            weapon: "Basic Sword", 
            attack: 5, 
            armor: "Common Clothing", // Start with leather armor
            defense: 0 // Leather Armor provides some defense
        };
    };

    // Render initial game
    renderEquipmentSlots();
    updateInventory();
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
    // Update Weapon Slot
    const weaponSlot = document.getElementById("weaponSlot");
    if (weaponSlot) {
        weaponSlot.innerHTML = `Weapon: ${equipment.weapon || "None"}`;
    }

    // Update Armor Slot
    const armorSlot = document.getElementById("armorSlot");
    if (armorSlot) {
        armorSlot.innerHTML = `Armor: ${equipment.armor || "None"}`;
    }
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
        itemDiv.innerHTML = `<span>${item}</span> <span class='quantity'>x${inventory[item]}</span>`;
        inventoryDiv.appendChild(itemDiv);
    }
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

function usePray() {
    if (prayCooldownActive) return; // Prevent multiple activations

    prayCooldownActive = true;
    document.getElementById('prayButton').disabled = true; // Disable the button
    document.getElementById('prayCooldown').style.display = 'inline'; // Show the cooldown message

    // Start healing
    playerHP = Math.min(playerHP + 50, 100); // Heal but not over max HP
    updateHealthBars(playerHP); // Update health bars

    // Update the Pray button text to indicate it's in use
    let prayButton = document.getElementById('prayButton');
    prayButton.textContent = 'Praying...'; // Set text while praying

    // Start the cooldown and update the timer every second
    let interval = setInterval(() => {
        console.log('Interval triggered'); // Debug log to check if the interval is working
        if (prayCooldownTime > 0) {
            prayCooldownTime--; // Decrease the cooldown time by 1 second
            document.getElementById('prayCooldown').textContent = `Pray is on cooldown: ${prayCooldownTime}s`; // Update the timer text
        } else {
            clearInterval(interval); // Stop the timer when it's done
            prayCooldownActive = false; // Reset cooldown status
            prayButton.disabled = false; // Enable the button
            prayButton.textContent = 'Pray'; // Reset the button text to 'Pray'
            document.getElementById('prayCooldown').style.display = 'none'; // Hide cooldown message

            // Reset the cooldown time for the next use
            prayCooldownTime = initialPrayCooldownTime;
        }
    }, 1000); // Update every second
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
}

// Save settings when toggled
document.getElementById("musicToggle").addEventListener("change", function() {
    localStorage.setItem("musicEnabled", this.checked);
});

document.getElementById("soundToggle").addEventListener("change", function() {
    localStorage.setItem("soundEnabled", this.checked);
});

// Automatic equip new weapons and armor

function drop(event, slot) {
    event.preventDefault(); // Prevent the default action
    let data = event.dataTransfer.getData("text");
    let draggedItem = document.getElementById(data);

    // Only allow equipment items to be dragged and dropped into equipment slots
    if (draggedItem && (draggedItem.classList.contains("inventory-item"))) {
        let itemName = draggedItem.innerText.split(" x")[0]; // Get the item name
        let itemQuantity = inventory[itemName];

        if (itemQuantity > 0) {
            // Equip the item to the correct slot (weapon or armor)
            if (slot === "weapon") {
                equipment.weapon = itemName; // Equip weapon
            } else if (slot === "armor") {
                equipment.armor = itemName; // Equip armor
            }

            inventory[itemName] -= 1; // Decrease the quantity in inventory
            updateInventory(); // Update inventory display
            renderEquipmentSlots(); // Update equipment display
        }
    }
}

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
            document.getElementById("message").innerText = `You defeated the ${selectedMonster}!`;
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
            document.getElementById("message").innerText = `You were defeated by the ${selectedMonster}!`;

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

    // If armor doesn't exist, set default armor (Leather Armor)
    if (!equipment.armor) {
        equipment.armor = "Leather Armor";
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

