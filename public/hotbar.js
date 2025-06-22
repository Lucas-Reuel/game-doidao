const hotbarSlots = document.querySelectorAll("#hotbar .slot");
let selectedSlot = 0;

function updateHotbar() {
  hotbarSlots.forEach((slot, i) => {
    slot.style.borderColor = i === selectedSlot ? "yellow" : "#555";
  });
}

// Inicializa hotbar
updateHotbar();

// Trocar slot com as teclas 1,2,3,4
window.addEventListener("keydown", e => {
  if (e.key >= "1" && e.key <= "4") {
    selectedSlot = parseInt(e.key) - 1;
    updateHotbar();
  }
});
