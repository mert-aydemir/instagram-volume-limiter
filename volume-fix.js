// volume-fix.js

console.log("Instagram Volume Limiter: Content script injected!");

let targetVolume = 0.05; // Başlangıç varsayılanı
let isExtensionEnabled = true; // Varsayılan olarak aktif

// Ayarları yükle (hem ses hem de aktiflik)
function loadSettings() {
  console.log("VolumeFix: Attempting to load settings...");
  browser.storage.local.get(['volumeLevel', 'isEnabled'], (data) => {
    if (browser.runtime.lastError) {
      console.error("VolumeFix: Error loading settings:", browser.runtime.lastError);
      // Hata olsa bile varsayılanlarla devam et, ama kaydetme
      targetVolume = 0.05;
      isExtensionEnabled = true;
      applyVolumeIfEnabled(); // Yeni fonksiyon
      return;
    }

    console.log("VolumeFix: Storage result:", data);

    // Aktiflik durumunu oku veya varsayılanı ata (kaydetme)
    if (data && data.isEnabled !== undefined) {
      isExtensionEnabled = data.isEnabled;
    } else {
      isExtensionEnabled = true; // Varsayılan aktif
      // İlk çalıştırmada varsayılanı kaydetmek istersen background.js daha uygun
      // browser.storage.local.set({ isEnabled: isExtensionEnabled }); // <-- BURADA KAYDETME!
    }
    console.log(`VolumeFix: Extension enabled state loaded: ${isExtensionEnabled}`);

    // Ses seviyesini oku veya varsayılanı ata (kaydetme)
    if (data && data.volumeLevel !== undefined) {
      targetVolume = parseFloat(data.volumeLevel);
      console.log(`VolumeFix: Volume loaded from storage: ${targetVolume}`);
    } else {
      targetVolume = 0.05; // Varsayılan ses
      // browser.storage.local.set({ volumeLevel: targetVolume }); // <-- BURADA KAYDETME!
      console.log(`VolumeFix: No saved volume found. Using default: ${targetVolume}`);
    }

    // Ayarlar yüklendikten sonra videolara uygula (eğer aktifse)
    applyVolumeIfEnabled(); // Yeni fonksiyon
  });
}

// Sesi sadece eklenti aktifse uygula
function applyVolumeIfEnabled() {
    if (isExtensionEnabled) {
        console.log("VolumeFix: Extension is enabled. Applying volume to existing videos.");
        applyVolumeToExistingVideos();
    } else {
        console.log("VolumeFix: Extension is disabled. Not applying volume.");
        // İsteğe bağlı: Eklenti kapalıysa sesi sıfırlama kodu buraya eklenebilir.
        // resetVolumeOnExistingVideos();
    }
}


// Sayfadaki mevcut videolara ses seviyesini uygula (Sadece aktifse çağrılır)
function applyVolumeToExistingVideos() {
    const videos = document.querySelectorAll("video");
    // console.log(`VolumeFix: Applying volume. Found ${videos.length} video(s).`);
    videos.forEach(setVideoVolume);
}

// Tek bir videonun sesini ayarla (Sadece aktifse çağrılır)
function setVideoVolume(video) {
  // Bu fonksiyon artık sadece isExtensionEnabled true ise çağrılacağı için
  // en baştaki if (!isExtensionEnabled) kontrolüne gerek kalmadı.

  // ... (setVideoVolume fonksiyonunun geri kalanı aynı) ...
  // Mute kontrolü, console logları vs. önceki gibi kalacak
    if (Math.abs(video.volume - targetVolume) < 0.001 && video.muted === (targetVolume === 0)) {
     return;
    }
    console.log(`VolumeFix: Setting volume to ${targetVolume} for video:`, video.src || "[No Source]");
    video.volume = targetVolume;
    if (targetVolume > 0 && video.muted) {
        console.log("VolumeFix: Unmuting video.");
        video.muted = false;
    } else if (targetVolume === 0 && !video.muted) {
        console.log("VolumeFix: Muting video as target is 0.");
        video.muted = true;
    }
    setTimeout(() => {
       if (isExtensionEnabled && (Math.abs(video.volume - targetVolume) > 0.001 || video.muted !== (targetVolume === 0))) {
           console.warn("VolumeFix: Volume/Mute state might have been reset for video:", video.src || "[No Source]", "Current:", video.volume, "Muted:", video.muted);
       }
   }, 100);
}

// DOM değişikliklerini izle
const observer = new MutationObserver((mutationsList) => {
  // Gözlemci çalışmadan önce eklentinin aktif olup olmadığını kontrol et
  if (!isExtensionEnabled) return; // Eğer kapalıysa hiçbir şey yapma

  for (const mutation of mutationsList) {
    // ... (observer'ın geri kalanı aynı) ...
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'VIDEO') {
                setVideoVolume(node);
            } else if (node.querySelectorAll) {
                const videos = node.querySelectorAll("video");
                if(videos.length > 0){
                    videos.forEach(setVideoVolume);
                }
            }
        });
    }
  }
});

// Ayar değiştiğinde haberdar ol
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    let needsVolumeUpdate = false;
    let stateChanged = false; // Durumun değişip değişmediğini takip et

    if (changes.isEnabled) {
        const newIsEnabled = changes.isEnabled.newValue;
        if (newIsEnabled !== isExtensionEnabled) { // Sadece gerçekten değiştiyse işlem yap
             isExtensionEnabled = newIsEnabled;
             console.log(`VolumeFix: Extension enabled state changed via storage to: ${isExtensionEnabled}`);
             stateChanged = true;
             if (isExtensionEnabled) {
                 needsVolumeUpdate = true; // Aktif olduysa sesi uygula
             } else {
                 // Pasif olduysa sesi sıfırlamayı düşünebiliriz veya hiçbir şey yapmayabiliriz
                 // resetVolumeOnExistingVideos();
                 console.log("VolumeFix: Extension disabled. Volume control stopped.");
                 // Pasif olduğunda observer'ı durdurmak yerine, observer içinde kontrol ediyoruz.
             }
        }
    }

    if (changes.volumeLevel) {
        const newVolume = parseFloat(changes.volumeLevel.newValue);
         if (newVolume !== targetVolume) { // Sadece gerçekten değiştiyse işlem yap
            targetVolume = newVolume;
            console.log(`VolumeFix: Target volume changed via storage to: ${targetVolume}`);
            stateChanged = true;
            if (isExtensionEnabled) { // Sadece aktifse güncelleme ihtiyacı doğurur
                needsVolumeUpdate = true;
            }
        }
    }

    // Sadece durum değiştiyse ve güncelleme gerekiyorsa/eklenti aktifse sesi uygula
    if (stateChanged && isExtensionEnabled && needsVolumeUpdate) {
        console.log("VolumeFix: Applying volume update to existing videos due to storage change.");
        applyVolumeToExistingVideos();
    }
});

// --- Başlatma ---
loadSettings(); // Ayarları yükle (içinde applyVolumeIfEnabled çağrılacak)
observer.observe(document.body, { childList: true, subtree: true });
console.log("Instagram Volume Limiter: Observer started.");