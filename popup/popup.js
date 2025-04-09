// popup.js

const volumeSlider = document.getElementById('volumeSlider');
const volumeValueDisplay = document.getElementById('volumeValue');
const enableSwitch = document.getElementById('enableSwitch');
const switchLabel = document.querySelector('.switch-label');
const sliderArea = document.getElementById('sliderArea');
const presetButtonsArea = document.getElementById('presetButtonsArea');
const presetButtons = document.querySelectorAll('.preset-button');
const defaultVolume = 0.05;
const defaultEnabled = true;

// Kaydedilmiş ayarları yükle
function loadSettings() {
    console.log("Popup: Loading settings...");
    browser.storage.local.get(['volumeLevel', 'isEnabled'], (data) => {
        if (browser.runtime.lastError) {
            console.error("Popup: Error loading settings:", browser.runtime.lastError);
            // Hata durumunda UI'ı varsayılanlarla güncelle
            volumeSlider.value = defaultVolume;
            updateVolumeDisplay(defaultVolume);
            enableSwitch.checked = defaultEnabled;
            updateUiState(defaultEnabled);
            return;
        }
        console.log("Popup: Settings loaded from storage:", data);

        const currentVolume = (data && data.volumeLevel !== undefined) ? data.volumeLevel : defaultVolume;
        volumeSlider.value = currentVolume;
        updateVolumeDisplay(currentVolume);

        const isEnabled = (data && data.isEnabled !== undefined) ? data.isEnabled : defaultEnabled;
        // ÖNCE switch'in durumunu ayarla, SONRA UI'ı güncelle
        enableSwitch.checked = isEnabled;
        console.log(`Popup: Setting initial UI state based on isEnabled: ${isEnabled}`);
        updateUiState(isEnabled); // UI'ı yüklemede güncelle
    });
    // document.title = "Instagram Volume Control"; // Title'ı doğrudan ayarlayabiliriz
}

// Ses seviyesi göstergesini güncelle
function updateVolumeDisplay(value) {
    const percentage = Math.round(value * 100);
    volumeValueDisplay.textContent = `${percentage}%`;
}

// Anahtarın durumuna göre UI'ı güncelle (İngilizce metinlerle)
function updateUiState(isEnabled) {
    console.log(`Popup: Updating UI state. isEnabled: ${isEnabled}`);
    // toggleClass ikinci parametre true ise ekler, false ise kaldırır.
    // !isEnabled (true ise disabled ekle)
    sliderArea.classList.toggle('disabled', !isEnabled);
    presetButtonsArea.classList.toggle('disabled', !isEnabled);
    volumeSlider.disabled = !isEnabled;

    // Dinamik etiketi doğrudan İngilizce olarak ayarla
    switchLabel.textContent = isEnabled ? "Extension Active" : "Extension Inactive";
    console.log(`Popup: Switch label set to: ${switchLabel.textContent}`);
}

// --- Event Listeners ---

// Kaydırıcı değeri değiştiğinde
volumeSlider.addEventListener('input', (event) => {
    if (!enableSwitch.checked) return;
    const newVolume = parseFloat(event.target.value);
    updateVolumeDisplay(newVolume);
    saveVolumeSetting(newVolume);
});

// Anahtar durumu değiştiğinde
enableSwitch.addEventListener('change', (event) => {
    const isEnabled = event.target.checked;
    console.log(`Popup: Switch changed by user. New state: ${isEnabled}`);
    updateUiState(isEnabled); // Önce UI'ı güncelle
    // Yeni durumu kaydet
    browser.storage.local.set({ isEnabled: isEnabled }, () => {
        if (browser.runtime.lastError) {
            console.error("Popup: Error saving isEnabled state:", browser.runtime.lastError);
        } else {
            console.log("Popup: Saved isEnabled state:", isEnabled);
        }
    });
});

// Preset Butonlarına Tıklama Olayı
presetButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        if (!enableSwitch.checked) return;
        const newVolume = parseFloat(event.target.dataset.volume);
        console.log("Popup: Preset button clicked. New volume:", newVolume);
        volumeSlider.value = newVolume;
        updateVolumeDisplay(newVolume);
        saveVolumeSetting(newVolume);
    });
});

// Ses seviyesini kaydetme fonksiyonu
function saveVolumeSetting(volume) {
    browser.storage.local.set({ volumeLevel: volume }, () => {
        if (browser.runtime.lastError) {
            console.error("Popup: Error saving volumeLevel:", browser.runtime.lastError);
        }
        // console.log("Popup: Volume saved:", volume);
    });
}

// --- Storage Değişikliklerini Dinle (Popup açıkken UI güncellemesi için) ---
browser.storage.onChanged.addListener((changes, areaName) => {
    // Popup açıkken storage değişirse UI'ı güncelle
    console.log("Popup: Storage listener fired. Area:", areaName, "Changes:", changes); // Dinleyici çalışıyor mu?
    if (areaName === 'local') {
        if (changes.volumeLevel) {
            const newVolume = changes.volumeLevel.newValue;
            console.log("Popup (via storage listener): Volume changed to", newVolume);
            volumeSlider.value = newVolume;
            updateVolumeDisplay(newVolume);
        }
        if (changes.isEnabled) {
            const newIsEnabled = changes.isEnabled.newValue;
            console.log("Popup (via storage listener): Enabled state changed to", newIsEnabled);
            // Sadece switch'in 'checked' durumunu değil, tüm UI'ı güncelle
            enableSwitch.checked = newIsEnabled; // Switch'i güncelle
            updateUiState(newIsEnabled);       // Diğer UI elemanlarını (label, disabled state) güncelle
        }
    }
});
// --- Storage Dinleyici Bitiş ---

// Popup açıldığında ayarları yükle
document.addEventListener('DOMContentLoaded', loadSettings);