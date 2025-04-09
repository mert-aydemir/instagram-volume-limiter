console.log("Instagram Volume Limiter: Content script injected!");

let targetVolume = 0.05;
let isExtensionEnabled = true; // Varsayılan olarak aktif

// Ayarları yükle (hem ses hem de aktiflik)
function loadSettings() {
  console.log("VolumeFix: Attempting to load settings (volume and enabled state)...");
  browser.storage.local.get(['volumeLevel', 'isEnabled'], (data) => {
    if (browser.runtime.lastError) {
      console.error("VolumeFix: Error loading settings:", browser.runtime.lastError);
      applyVolumeToExistingVideos(); // Hata olsa bile varsayılanlarla devam et
      return;
    }

    console.log("VolumeFix: Storage result:", data);

    // Aktiflik durumunu oku veya varsayılanı ata/kaydet
    if (data && data.isEnabled !== undefined) {
      isExtensionEnabled = data.isEnabled;
    } else {
      isExtensionEnabled = true; // Varsayılan aktif
      browser.storage.local.set({ isEnabled: isExtensionEnabled }); // Kaydet
    }
    console.log(`VolumeFix: Extension enabled state loaded: ${isExtensionEnabled}`);

    // Ses seviyesini oku veya varsayılanı ata/kaydet
    if (data && data.volumeLevel !== undefined) {
      targetVolume = parseFloat(data.volumeLevel);
      console.log(`VolumeFix: Volume loaded from storage: ${targetVolume}`);
    } else {
      targetVolume = 0.05; // Varsayılan ses
      browser.storage.local.set({ volumeLevel: targetVolume }); // Kaydet
      console.log(`VolumeFix: Default volume used: ${targetVolume}`);
    }

    // Ayarlar yüklendikten sonra videolara uygula (eğer aktifse)
    if (isExtensionEnabled) {
        applyVolumeToExistingVideos();
    } else {
        console.log("VolumeFix: Extension is disabled. Not applying volume on load.");
        // İsteğe bağlı: Eğer eklenti kapalıysa, mevcut videolardaki kısıtlamayı kaldırabiliriz.
        // resetVolumeOnExistingVideos(); // Bu fonksiyonu aşağıda tanımlayabiliriz. Şimdilik kapalı.
    }
  });
}

// Sayfadaki mevcut videolara ses seviyesini uygula (Sadece aktifse)
function applyVolumeToExistingVideos() {
    if (!isExtensionEnabled) {
        // console.log("VolumeFix: Skipping applyVolumeToExistingVideos (disabled).");
        return;
    }
    const videos = document.querySelectorAll("video");
    console.log(`VolumeFix: Applying volume. Found ${videos.length} video(s). Enabled: ${isExtensionEnabled}`);
    videos.forEach(setVideoVolume);
}

/* // İsteğe Bağlı: Eklenti kapatıldığında sesi sıfırlama fonksiyonu
function resetVolumeOnExistingVideos() {
    console.log("VolumeFix: Resetting volume on existing videos as extension is disabled.");
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
        // Kullanıcı manuel olarak sessize aldıysa dokunma? Veya hepsini aç? Şimdilik sesi 1 yapalım.
        if (video.volume !== 1.0) { // Sadece zaten 1 değilse değiştir
             console.log("VolumeFix: Resetting volume to 1.0 for video:", video.src || "[No Source]");
             video.volume = 1.0;
        }
         if (video.muted) { // Sessizdeyse açalım
             console.log("VolumeFix: Unmuting video during reset:", video.src || "[No Source]");
             video.muted = false;
         }
    });
}
*/

// Tek bir videonun sesini ayarla (Sadece aktifse)
function setVideoVolume(video) {
  // Ana kontrol: Eklenti aktif değilse hiçbir şey yapma
  if (!isExtensionEnabled) {
    // console.log("VolumeFix: Skipping setVideoVolume for a video (disabled).");
    return;
  }

  // console.log(`VolumeFix: Processing video. Current vol: ${video.volume}, muted: ${video.muted}, target: ${targetVolume}, enabled: ${isExtensionEnabled}`);
  if (Math.abs(video.volume - targetVolume) < 0.001 && video.muted === (targetVolume === 0)) {
     return; // Zaten doğru durumda
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

  // Kontrol
  setTimeout(() => {
       if (isExtensionEnabled && (Math.abs(video.volume - targetVolume) > 0.001 || video.muted !== (targetVolume === 0))) {
           console.warn("VolumeFix: Volume/Mute state might have been reset for video:", video.src || "[No Source]", "Current:", video.volume, "Muted:", video.muted);
       }
   }, 100);
}

// DOM değişikliklerini izle
const observer = new MutationObserver((mutationsList) => {
  // Eklenti aktif değilse gözlemci hiçbir şey yapmasın
  if (!isExtensionEnabled) return;

  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'VIDEO') {
          // console.log("VolumeFix: New VIDEO node detected by observer.");
          setVideoVolume(node);
        } else if (node.querySelectorAll) {
          const videos = node.querySelectorAll("video");
          if(videos.length > 0){
            // console.log(`VolumeFix: ${videos.length} new video(s) detected inside added node by observer.`);
            videos.forEach(setVideoVolume);
          }
        }
      });
    }
  }
});

// Ayar değiştiğinde haberdar ol
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return; // Sadece local storage değişikliklerini dinle

  let needsVolumeUpdate = false;

  // Aktiflik durumu değişti mi?
  if (changes.isEnabled) {
      isExtensionEnabled = changes.isEnabled.newValue;
      console.log(`VolumeFix: Extension enabled state changed via storage to: ${isExtensionEnabled}`);
      if (isExtensionEnabled) {
          // Eğer eklenti yeni AKTİF edildiyse, mevcut videolara sesi uygula
          needsVolumeUpdate = true;
      } else {
          // Eğer eklenti yeni PASİF edildiyse, mevcut videolardaki kısıtlamayı kaldırabiliriz (opsiyonel)
          // resetVolumeOnExistingVideos();
          console.log("VolumeFix: Extension disabled. Volume control stopped.");
      }
  }

  // Ses seviyesi değişti mi?
  if (changes.volumeLevel) {
      targetVolume = parseFloat(changes.volumeLevel.newValue);
      console.log(`VolumeFix: Target volume changed via storage to: ${targetVolume}`);
      // Ses seviyesi değiştiyse ve eklenti zaten aktifse, güncelleme lazım
      if (isExtensionEnabled) {
          needsVolumeUpdate = true;
      }
  }

  // Gerekliyse ve eklenti aktifse mevcut videoları güncelle
  if (needsVolumeUpdate && isExtensionEnabled) {
      console.log("VolumeFix: Applying volume update to existing videos due to storage change.");
      applyVolumeToExistingVideos();
  }
});

// --- Başlatma ---
loadSettings(); // Ayarları yükle (bu fonksiyon içinde applyVolumeToExistingVideos çağrılacak)
observer.observe(document.body, { childList: true, subtree: true });
console.log("Instagram Volume Limiter: Observer started.");