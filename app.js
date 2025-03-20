// Global variables and starter kit logic
let equipment = {
    weapon: "Basic Sword",
    attack: 5,
    armor: "None",  // Add armor slot here
    defense: 0 // Add defense stat to track armor's effect
};
let playerHP = 100;
let inventory = {
    "Iron Ore": 5,
    "Wood": 3,
    "Leather": 2,
    "Steel Ore": 0
    // Other materials
};
let selectedStarter = ""; // Store the selected starter kit

const monsters = {
    "Slime": { hp: 20, attack: [2, 5], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 30, attack: [5, 10], drops: ["Wolf Pelt", "Sharp Fang"] },
    "Goblin": { hp: 40, attack: [6, 12], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 60, attack: [8, 15], drops: ["Orc Tooth", "Iron Shard"] }
};


const craftingRecipes = {
    "Leather Armor": {
        materials: {
            "Leather": 3,
            "Wood": 2
        },
        result: "Leather Armor",
        defenseBoost: 5
    },
    "Steel Armor": {
        materials: {
            "Steel Ore": 5,
            "Leather Armor": 1  // Requires Leather Armor as material
        },
        result: "Steel Armor",
        defenseBoost: 15
    },
    "Enchanted Armor": {
        materials: {
            "Enchanted Crystal": 1,
            "Steel Armor": 1  // Requires Steel Armor as material
        },
        result: "Enchanted Armor",
        defenseBoost: 30
    },
    // Add more upgrades here...
};

function craftItem(itemName) {
    if (craftingRecipes[itemName]) {
        const recipe = craftingRecipes[itemName];
        let canCraft = true;

        // Check if the player has enough materials and the previous item
        for (let material in recipe.materials) {
            if (inventory[material] < recipe.materials[material]) {
                canCraft = false;
                break;
            }
        }

        // Check if the previous armor exists (e.g., Leather Armor -> Steel Armor)
        if (itemName === "Steel Armor" && !inventory["Leather Armor"]) {
            canCraft = false;
        }

        // If they have enough materials, craft the item
        if (canCraft) {
            // Deduct materials from inventory
            for (let material in recipe.materials) {
                inventory[material] -= recipe.materials[material];
            }

            // Add the crafted item to the inventory
            inventory[itemName] = (inventory[itemName] || 0) + 1;

            // Apply boosts (defense)
            if (recipe.defenseBoost) {
                equipment.defense += recipe.defenseBoost;
            }

            // Upgrade equipment (if the item is armor)
            if (itemName.includes("Armor")) {
                equipment.armor = itemName;  // Equip the new armor
            }

            // Update UI and inventory
            updateInventory();
            renderEquipmentSlots(); // Update the equipment slots

            alert(`You crafted a ${itemName}!`);

            // Save the game data after crafting
            saveGameData();
        } else {
            alert("You don't have enough materials or the required previous item to craft this.");
        }
    }
}

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

function cleanupInventory() {
    // Loop through all items in the inventory
    for (let item in inventory) {
        if (inventory[item] === 0) {
            // If the item has 0 quantity, delete it from the inventory
            delete inventory[item];
        }
    }
    // After cleanup, save the updated inventory to localStorage
    localStorage.setItem("inventory", JSON.stringify(inventory));
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

    // Render initial game setup
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
function updateHealthBars(playerHP, monster, selectedMonster) {
    console.log("Updating health bars...");

    // Player Health Bar
    let playerHealthBar = document.getElementById("playerHealth");
    let playerHealthText = document.getElementById("playerHealthText");

    if (playerHealthBar && playerHealthText) {
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

    // Monster Health Bar
    let monsterHealthBar = document.getElementById("monsterHealth");
    let monsterHealthText = document.getElementById("monsterHealthText");

    if (monsterHealthBar && monsterHealthText) {
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

// Function to fight the selected monster
// Function to fight the selected monster
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

// Function to reset the game and refresh the page to start over
function startNewGame() {
    // Clear all saved data from localStorage
    localStorage.clear();

    // Reset player stats to default values
    playerHP = 100;
    inventory = {
        "Iron Ore": 5,
        "Wood": 3,
        "Leather": 2,
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

// Function to load game data from localStorage
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

    // Update UI with the loaded data
    updateInventory();           // Update inventory UI
    renderEquipmentSlots();      // Update the equipment slots (weapon + armor)
    updateHealthBars(playerHP);  // Update the player's health bar
}
window.onload = () => {
    checkStarterKitSelection(); // Load the starter kit if it's stored
    loadGameData(); // Load saved game data from localStorage
};
