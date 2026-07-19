import { GAME_MODES, PLAYER_CLOTHES, PLAYER_SKINS } from "../utils/constants.js";

const SKIN_STORAGE_KEY = "blade-survivor-skin";
const CLOTH_STORAGE_KEY = "blade-survivor-cloth";
const MODE_STORAGE_KEY = "blade-survivor-mode";

export function getSavedSkinId() {
  const savedSkinId = localStorage.getItem(SKIN_STORAGE_KEY);
  const hasSavedSkin = PLAYER_SKINS.some((skin) => skin.id === savedSkinId);

  return hasSavedSkin ? savedSkinId : null;
}

export function saveSkinId(skinId) {
  localStorage.setItem(SKIN_STORAGE_KEY, skinId);
}

export function getSavedClothId() {
  const savedClothId = localStorage.getItem(CLOTH_STORAGE_KEY);
  const hasSavedCloth = PLAYER_CLOTHES.some((cloth) => cloth.id === savedClothId);

  return hasSavedCloth ? savedClothId : null;
}

export function saveClothId(clothId) {
  localStorage.setItem(CLOTH_STORAGE_KEY, clothId);
}

export function getSavedModeId() {
  const savedModeId = localStorage.getItem(MODE_STORAGE_KEY);
  const hasSavedMode = GAME_MODES.some((mode) => mode.id === savedModeId);

  return hasSavedMode ? savedModeId : null;
}

export function saveModeId(modeId) {
  localStorage.setItem(MODE_STORAGE_KEY, modeId);
}

function toPercent(volume) {
  return Math.round(Math.max(0, Math.min(1, volume)) * 100);
}

function fromPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0)) / 100;
}

export class GameMenu {
  constructor({
    onPlay,
    onResume,
    onRestart,
    onMainMenu,
    onSkinChange,
    onClothChange,
    onModeChange,
    onMusicVolumeChange,
    onSfxVolumeChange,
    initialSkinId,
    initialClothId,
    initialModeId,
    initialMusicVolume = 0.32,
    initialSfxVolume = 0.85,
  }) {
    this.onPlay = onPlay;
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.onMainMenu = onMainMenu;
    this.onSkinChange = onSkinChange;
    this.onClothChange = onClothChange;
    this.onModeChange = onModeChange;
    this.onMusicVolumeChange = onMusicVolumeChange;
    this.onSfxVolumeChange = onSfxVolumeChange;
    this.selectedSkinId = initialSkinId;
    this.selectedClothId = initialClothId;
    this.selectedModeId = initialModeId;
    this.musicVolume = initialMusicVolume;
    this.sfxVolume = initialSfxVolume;
    this.syncingAudioSliders = false;

    this.mainMenu = document.querySelector("#main-menu");
    this.pauseMenu = document.querySelector("#pause-menu");
    this.gameOverMenu = document.querySelector("#game-over-menu");
    this.playButton = document.querySelector("#menu-play-btn");
    this.resumeButton = document.querySelector("#menu-resume-btn");
    this.pauseMainMenuButton = document.querySelector("#menu-pause-main-btn");
    this.restartButton = document.querySelector("#menu-restart-btn");
    this.mainMenuButton = document.querySelector("#menu-main-btn");
    this.skinOptionGroups = [
      document.querySelector("#skin-options"),
      document.querySelector("#pause-skin-options"),
    ];
    this.clothOptionGroups = [
      document.querySelector("#cloth-options"),
      document.querySelector("#pause-cloth-options"),
    ];
    this.modeOptionGroups = [
      document.querySelector("#mode-options"),
      document.querySelector("#pause-mode-options"),
    ];
    this.modeDescriptionGroups = [
      document.querySelector("#mode-description"),
      document.querySelector("#pause-mode-description"),
    ];
    this.musicVolumeInputs = [
      document.querySelector("#music-volume"),
      document.querySelector("#pause-music-volume"),
    ];
    this.sfxVolumeInputs = [
      document.querySelector("#sfx-volume"),
      document.querySelector("#pause-sfx-volume"),
    ];
    this.musicVolumeLabels = [
      document.querySelector("#music-volume-value"),
      document.querySelector("#pause-music-volume-value"),
    ];
    this.sfxVolumeLabels = [
      document.querySelector("#sfx-volume-value"),
      document.querySelector("#pause-sfx-volume-value"),
    ];

    this.playButton?.addEventListener("click", () => this.onPlay?.());
    this.resumeButton?.addEventListener("click", () => this.onResume?.());
    this.pauseMainMenuButton?.addEventListener("click", () => this.onMainMenu?.());
    this.restartButton?.addEventListener("click", () => this.onRestart?.());
    this.mainMenuButton?.addEventListener("click", () => this.onMainMenu?.());

    for (const input of this.musicVolumeInputs) {
      input?.addEventListener("input", (event) => {
        if (this.syncingAudioSliders) {
          return;
        }

        this.setMusicVolume(fromPercent(event.target.value));
      });
    }

    for (const input of this.sfxVolumeInputs) {
      input?.addEventListener("input", (event) => {
        if (this.syncingAudioSliders) {
          return;
        }

        this.setSfxVolume(fromPercent(event.target.value));
      });
    }

    this.buildSkinOptions();
    this.buildClothOptions();
    this.buildModeOptions();
    this.syncAudioControls();
  }

  buildColorOptions(groups, items, selectedId, dataKey, callback) {
    for (const container of groups) {
      if (!container) {
        continue;
      }

      container.replaceChildren();

      for (const item of items) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "skin-option";
        button.dataset[dataKey] = item.id;
        button.title = item.label;
        button.setAttribute("aria-label", `${item.label} color`);
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(item.id === selectedId));
        button.style.setProperty("--skin-color", `#${item.color.toString(16).padStart(6, "0")}`);
        button.addEventListener("click", () => callback(item.id));
        container.appendChild(button);
      }
    }
  }

  buildSkinOptions() {
    this.buildColorOptions(
      this.skinOptionGroups,
      PLAYER_SKINS,
      this.selectedSkinId,
      "skinId",
      (skinId) => this.selectSkin(skinId),
    );
    this.updateSkinSelection();
  }

  buildClothOptions() {
    this.buildColorOptions(
      this.clothOptionGroups,
      PLAYER_CLOTHES,
      this.selectedClothId,
      "clothId",
      (clothId) => this.selectCloth(clothId),
    );
    this.updateClothSelection();
  }

  buildModeOptions() {
    for (const container of this.modeOptionGroups) {
      if (!container) {
        continue;
      }

      container.replaceChildren();

      for (const mode of GAME_MODES) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mode-option";
        button.dataset.modeId = mode.id;
        button.textContent = mode.label;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-checked", String(mode.id === this.selectedModeId));
        button.addEventListener("click", () => this.selectMode(mode.id));
        container.appendChild(button);
      }
    }

    this.updateModeSelection();
  }

  selectSkin(skinId) {
    if (this.selectedSkinId === skinId) {
      return;
    }

    this.selectedSkinId = skinId;
    saveSkinId(skinId);
    this.updateSkinSelection();
    this.onSkinChange?.(skinId);
  }

  selectCloth(clothId) {
    if (this.selectedClothId === clothId) {
      return;
    }

    this.selectedClothId = clothId;
    saveClothId(clothId);
    this.updateClothSelection();
    this.onClothChange?.(clothId);
  }

  selectMode(modeId) {
    if (this.selectedModeId === modeId) {
      return;
    }

    this.selectedModeId = modeId;
    saveModeId(modeId);
    this.updateModeSelection();
    this.onModeChange?.(modeId);
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.syncAudioControls();
    this.onMusicVolumeChange?.(this.musicVolume);
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.syncAudioControls();
    this.onSfxVolumeChange?.(this.sfxVolume);
  }

  syncAudioControls() {
    this.syncingAudioSliders = true;
    const musicPercent = toPercent(this.musicVolume);
    const sfxPercent = toPercent(this.sfxVolume);

    for (const input of this.musicVolumeInputs) {
      if (input) {
        input.value = String(musicPercent);
      }
    }

    for (const input of this.sfxVolumeInputs) {
      if (input) {
        input.value = String(sfxPercent);
      }
    }

    for (const label of this.musicVolumeLabels) {
      if (label) {
        label.textContent = `${musicPercent}%`;
      }
    }

    for (const label of this.sfxVolumeLabels) {
      if (label) {
        label.textContent = `${sfxPercent}%`;
      }
    }

    this.syncingAudioSliders = false;
  }

  updateSkinSelection() {
    for (const container of this.skinOptionGroups) {
      if (!container) {
        continue;
      }

      for (const button of container.querySelectorAll(".skin-option")) {
        const isSelected = button.dataset.skinId === this.selectedSkinId;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-checked", String(isSelected));
      }
    }
  }

  updateClothSelection() {
    for (const container of this.clothOptionGroups) {
      if (!container) {
        continue;
      }

      for (const button of container.querySelectorAll(".skin-option")) {
        const isSelected = button.dataset.clothId === this.selectedClothId;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-checked", String(isSelected));
      }
    }
  }

  updateModeSelection() {
    const selectedMode = GAME_MODES.find((mode) => mode.id === this.selectedModeId);

    for (const container of this.modeOptionGroups) {
      if (!container) {
        continue;
      }

      for (const button of container.querySelectorAll(".mode-option")) {
        const isSelected = button.dataset.modeId === this.selectedModeId;
        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-checked", String(isSelected));
      }
    }

    for (const description of this.modeDescriptionGroups) {
      if (description && selectedMode) {
        description.textContent = selectedMode.description;
      }
    }
  }

  showMainMenu() {
    this.setMenuOpen(true);
    this.mainMenu?.classList.remove("is-hidden");
    this.pauseMenu?.classList.add("is-hidden");
    this.gameOverMenu?.classList.add("is-hidden");
  }

  showPauseMenu() {
    this.setMenuOpen(true);
    this.mainMenu?.classList.add("is-hidden");
    this.pauseMenu?.classList.remove("is-hidden");
    this.gameOverMenu?.classList.add("is-hidden");
  }

  showGameOver() {
    this.setMenuOpen(true);
    this.mainMenu?.classList.add("is-hidden");
    this.pauseMenu?.classList.add("is-hidden");
    this.gameOverMenu?.classList.remove("is-hidden");
  }

  hideAll() {
    this.setMenuOpen(false);
    this.mainMenu?.classList.add("is-hidden");
    this.pauseMenu?.classList.add("is-hidden");
    this.gameOverMenu?.classList.add("is-hidden");
  }

  setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
  }
}
