// Global variables and starter kit logic
let equipment = {};
let playerHP = 100;
let inventory = {};

const monsters = {
    "Slime": { hp: 20, attack: [2, 5], drops: ["Slime Goo", "Sticky Residue"] },
    "Wolf": { hp: 30, attack: [5, 10], drops: ["Wolf Pelt", "Sharp Fang"] },
    "Goblin": { hp: 40, attack: [6, 12], drops: ["Goblin Ear", "Rusty Dagger"] },
    "Orc": { hp: 60, attack: [8, 15], drops: ["Orc Tooth", "Iron Shard"] }
};

// Function to select starter kit
function selectStarterKit(starter) {
    // Hide the starter selection and show the game content
    document.getElementById("starterSelection").style.display = "none";
    document.getElementById("gameContent").style.display = "block";

    // Set the equipment based on the selected starter kit
    if (starter === "Knight") {
        equipment = { weapon: "Basic Sword", attack: 5 };
    } else if (starter === "Ranger") {
        equipment = { weapon: "Bow", attack: 7 };
    } else if (starter === "Thief") {
        equipment = { weapon: "Dagger", attack: 4 };
    }

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

// Function to fight the selected monster
function fightMonster() {
    let selectedMonster = document.getElementById("monsterSelect").value;
    let monster = { ...monsters[selectedMonster] }; // Create a copy of the selected monster's stats
    
    // While both the player and the monster are still alive
    while (playerHP > 0 && monster.hp > 0) {
        // Player attacks
        let playerDamage = Math.floor(Math.random() * equipment.attack) + 1; // Random damage based on player's attack power
        monster.hp -= playerDamage; // Decrease monster's HP

        if (monster.hp <= 0) {
            document.getElementById("message").innerText = `You defeated the ${selectedMonster}!`;
            let drop = monster.drops[Math.floor(Math.random() * monster.drops.length)]; // Random drop from the monster
            if (inventory[drop]) {
                inventory[drop] += 1; // Increase the count of the drop in inventory
            } else {
                inventory[drop] = 1; // Add the drop to inventory
            }
            updateInventory(); // Update the displayed inventory
            return; // Exit the function once the monster is defeated
        }

        // Monster attacks
        let monsterDamage = Math.floor(Math.random() * (monster.attack[1] - monster.attack[0] + 1)) + monster.attack[0];
        playerHP -= monsterDamage; // Decrease player's HP based on monster's attack range

        if (playerHP <= 0) {
            document.getElementById("message").innerText = `You were defeated by the ${selectedMonster}!`;
            playerHP = 0; // Prevent negative HP
        }
    }

    // Update the player's current HP display
    document.getElementById("playerHP").innerText = `HP: ${playerHP}`;
}
