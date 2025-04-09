// ... (diğer const tanımlamaları aynı) ...
const switchLabel = document.querySelector('.switch-label');
// ...

// Kaydedilmiş ayarları yükle
function loadSettings() {
    // document.title = browser.i18n.getMessage('popupHtmlTitle'); // Bu satırı sildik veya yorum satırı yaptık
    console.log("Popup: Loading settings (volume and enabled state)...");
    browser.storage.local.get(['volumeLevel', 'isEnabled'], (data) => {
        // ... (hata kontrolü ve storage okuma kısmı aynı) ...
        if (browser.runtime.lastError) {
            // ... (hata durumu aynı) ...
            volumeSlider.value = defaultVolume;
            updateVolumeDisplay(defaultVolume);
            enableSwitch.checked = defaultEnabled;
            updateUiState(defaultEnabled); // Hata durumunda UI'ı varsayılanla güncelle
            return;
        }
        // ... (volume ayarı aynı) ...
        const currentVolume = (data && data.volumeLevel !== undefined) ? data.volumeLevel : defaultVolume;
        volumeSlider.value = currentVolume;
        updateVolumeDisplay(currentVolume);

        const isEnabled = (data && data.isEnabled !== undefined) ? data.isEnabled : defaultEnabled;
        enableSwitch.checked = isEnabled;
        updateUiState(isEnabled); // Bu fonksiyon artık i18n KULLANMAYACAK
    });
}

// ... (updateVolumeDisplay aynı) ...

// Anahtarın durumuna göre UI'ı güncelle (İngilizce metinlerle)
function updateUiState(isEnabled) {
    sliderArea.classList.toggle('disabled', !isEnabled);
    presetButtonsArea.classList.toggle('disabled', !isEnabled);
    volumeSlider.disabled = !isEnabled;

    // Dinamik etiketi doğrudan İngilizce olarak ayarla
    switchLabel.textContent = isEnabled ? "Extension Active" : "Extension Inactive"; // Değişti: i18n kaldırıldı

    // document.body.classList.toggle('disabled-state', !isEnabled); // Opsiyonel
}

// --- Event Listeners ---
// ... (volumeSlider, enableSwitch, presetButtons olay dinleyicileri aynı) ...
// ... (saveVolumeSetting aynı) ...

// Popup açıldığında ayarları yükle
document.addEventListener('DOMContentLoaded', loadSettings);