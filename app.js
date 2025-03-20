// Global variables and starter kit logic
let equipment = {};
let playerHP = 100;
let inventory = {};
let selectedStarter = ""; // Store the selected starter kit

const monsters = {
    "Slime": { hp: 20, attack: [2, 5], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 30, attack: [5, 10], drops: ["Wolf Pelt", "Sharp Fang"] },
    "Goblin": { hp: 40, attack: [6, 12], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 60, attack: [8, 15], drops: ["Orc Tooth", "Iron Shard"] }
};

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
        equipment = { weapon: "Basic Sword", attack: 5 };
    };

    // Render initial game setup
    renderEquipmentSlots();
    updateInventory();
}

// Function to render equipment slots (e.g., weapon)
function renderEquipmentSlots() {
    const weaponSlot = document.getElementById("weaponSlot");
    if (weaponSlot) {
        weaponSlot.innerHTML = `Weapon: ${equipment.weapon || "None"}`;
    }
}

// Function to update the inventory display
function updateInventory() {
    let inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = ""; // Clear the inventory display before updating

    for (let item in inventory) {
        let itemDiv = document.createElement("div");
        itemDiv.classList.add("inventory-item");
        itemDiv.innerHTML = `<span>${item}</span> <span class='quantity'>x${inventory[item]}</span>`;
        inventoryDiv.appendChild(itemDiv);
    }
}

// Function to handle dragging and dropping items into equipment slots
function allowDrop(event) {
    event.preventDefault(); // Allow the drop by preventing the default behavior
}

function drag(event) {
    event.dataTransfer.setData("text", event.target.id); // Set the dragged item data
}

function drop(event, slot) {
    event.preventDefault(); // Prevent the default action
    let data = event.dataTransfer.getData("text");
    let draggedItem = document.getElementById(data);

    // Only allow equipment items to be dragged and dropped into equipment slots
    if (draggedItem && (draggedItem.classList.contains("inventory-item"))) {
        let itemName = draggedItem.innerText.split(" x")[0]; // Get the item name
        let itemQuantity = inventory[itemName];

        if (itemQuantity > 0) {
            equipment[slot] = itemName; // Equip the item
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
function fightMonster() {
    let selectedMonster = document.getElementById("monsterSelect").value;

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

            // Stop the battle once the monster is defeated
            clearInterval(battleInterval);
            return; // Exit the interval callback function
        }

        // Monster attacks
        let monsterDamage = Math.floor(Math.random() * (monster.attack[1] - monster.attack[0] + 1)) + monster.attack[0];
        playerHP -= monsterDamage; // Decrease player's HP based on monster's attack range

        // Check if the player is defeated
        if (playerHP <= 0) {
            playerHP = 0; // Ensure HP is set to 0 if the player is defeated
            document.getElementById("message").innerText = `You were defeated by the ${selectedMonster}!`;

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

// Function to reset the game and start over
function startNewGame() {
    // Reset player stats
    playerHP = 100;
    inventory = {};
    equipment = {};
    document.getElementById("playerHP").innerText = `HP: ${playerHP}`;
    document.getElementById("message").innerText = "";

    // Reset monster stats and other elements
    let monsterSelect = document.getElementById("monsterSelect");
    if (monsterSelect) {
        monsterSelect.value = ""; // Clear selected monster
    }

    // Reset other elements (e.g., hide Play Again button, reset inventory, etc.)
    document.getElementById("playAgainButton").style.display = "none"; // Hide Play Again button
    document.querySelector("button[onclick='fightMonster()']").style.display = "inline-block"; // Show Fight Monster button

    // Hide the game content and show the starter selection screen
    document.getElementById("gameContent").style.display = "none";
    document.getElementById("starterSelection").style.display = "block";

    // Remove starter kit from localStorage to allow re-selection
    localStorage.removeItem("starterKit");
}

// Call the checkStarterKitSelection function when the page loads
window.onload = checkStarterKitSelection;
