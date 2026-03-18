import { useState, useRef } from "preact/hooks";
import { gameState, currentScreen } from "../state/gameState";
import { navigateTo } from "../state/actions";
import { Button } from "../components/Button";
import {
  exportSave,
  importSave,
  deleteSave,
} from "../engine/saveManager";

export function Settings() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const state = gameState.value;
    if (state) {
      exportSave(state);
    }
  }

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const loadedState = await importSave(file);
      gameState.value = loadedState;
      navigateTo("dashboard");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to load save file",
      );
    }

    // Reset file input
    input.value = "";
  }

  function handleNewGame() {
    setShowConfirm(true);
  }

  function confirmNewGame() {
    deleteSave();
    gameState.value = null;
    currentScreen.value = "runner_creation";
    setShowConfirm(false);
  }

  return (
    <div class="screen settings">
      <div class="settings__back">
        <Button
          label="Back"
          onClick={() => navigateTo("stats")}
          variant="secondary"
        />
      </div>

      <h1 class="screen__header">Settings</h1>

      <div class="settings__actions">
        <Button label="Download Save" onClick={handleDownload} />

        <Button
          label="Load Save"
          onClick={handleLoadClick}
          variant="secondary"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          class="settings__file-input"
          onChange={handleFileChange}
        />

        {importError && (
          <div class="settings__warning">{importError}</div>
        )}

        <Button
          label="New Game"
          onClick={handleNewGame}
          variant="danger"
        />
      </div>

      <div class="settings__warning">
        Starting a new game will permanently delete your current save data.
        Consider downloading your save first.
      </div>

      {showConfirm && (
        <div class="settings__confirm-overlay">
          <div class="settings__confirm-dialog">
            <div class="settings__confirm-title">Are you sure?</div>
            <div class="settings__confirm-text">
              This will delete all your progress. This cannot be undone.
            </div>
            <div class="settings__confirm-actions">
              <Button
                label="Cancel"
                onClick={() => setShowConfirm(false)}
                variant="secondary"
              />
              <Button
                label="Delete & Restart"
                onClick={confirmNewGame}
                variant="danger"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
