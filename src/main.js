import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game-canvas");
const statusElement = document.querySelector("#game-status");

try {
  const game = new Game(canvas);
  await game.start();
  statusElement?.classList.add("is-hidden");
} catch (error) {
  console.error(error);

  if (statusElement) {
    statusElement.textContent =
      "The 3D scene failed to start. Please open this project through http://localhost:5173, not directly as a file.";
  }
}
