// background.js

console.log("Background script loaded for command handling.");

const VOLUME_STEP = 0.05; // Sesi %5'lik adımlarla değiştir

// Komut dinleyicisi
browser.commands.onCommand.addListener(async (command) => {
  console.log(`Command received: ${command}`);

  if (command === "toggle-enabled") {
    try {
      const data = await browser.storage.local.get("isEnabled");
      const currentIsEnabled = (data && data.isEnabled !== undefined) ? data.isEnabled : true; // Varsayılan aktif
      const newIsEnabled = !currentIsEnabled;
      await browser.storage.local.set({ isEnabled: newIsEnabled });
      console.log(`Background: Toggled enabled state to ${newIsEnabled}`);
      // Not: İkon güncelleme mantığı burada olabilirdi (önceki adımdan),
      // şimdilik sadece storage'ı güncelliyoruz.
      // Eğer ikon güncelleme kodunu eklediysen, burada updateIcon(newIsEnabled) çağrılabilir.
    } catch (error) {
      console.error("Background: Error toggling enabled state:", error);
    }
  } else if (command === "decrease-volume" || command === "increase-volume") {
    try {
      // Sadece eklenti aktifse ses ayarı yap
      const enabledData = await browser.storage.local.get("isEnabled");
      const isEnabled = (enabledData && enabledData.isEnabled !== undefined) ? enabledData.isEnabled : true;

      if (!isEnabled) {
          console.log("Background: Extension is disabled, ignoring volume command.");
          return; // Eklenti kapalıysa ses değiştirme
      }

      const volumeData = await browser.storage.local.get("volumeLevel");
      const currentVolume = (volumeData && volumeData.volumeLevel !== undefined) ? volumeData.volumeLevel : 0.05; // Varsayılan ses
      let newVolume;

      if (command === "decrease-volume") {
        newVolume = Math.max(0, currentVolume - VOLUME_STEP); // 0'ın altına düşmesin
      } else { // increase-volume
        newVolume = Math.min(1, currentVolume + VOLUME_STEP); // 1'in üstüne çıkmasın
      }

      // Yuvarlama hatalarını önlemek için küçük bir düzeltme
      newVolume = parseFloat(newVolume.toFixed(2));

      await browser.storage.local.set({ volumeLevel: newVolume });
      console.log(`Background: Volume changed to ${newVolume}`);

      // İçerik betiğine mesaj göndermeye GEREK YOK, çünkü içerik betiği
      // zaten storage.onChanged'ı dinliyor ve volumeLevel değişince tepki veriyor.
      // Bu daha basit ve yeterince hızlı olmalı.

    } catch (error) {
      console.error("Background: Error changing volume:", error);
    }
  }
});