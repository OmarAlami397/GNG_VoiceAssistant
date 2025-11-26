import audioBufferToWav from "audiobuffer-to-wav";

export async function convertBase64ToWav(base64String) {
  try {
    const cleanBase64 = base64String.replace(/^data:audio\/[^;]+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: "audio/wav" });
  } catch (error) {
    console.error("Error converting base64 to WAV:", error);
    throw error;
  }
}

// Upload to Raspberry Pi
export async function uploadGroupToPi(commandTitle, audioFiles, scriptId, credentials) {
  const formData = new FormData();
  formData.append("user", "default_user"); 
  formData.append("group_name", commandTitle); 
  
  // Add all audio files
  for (let i = 0; i < audioFiles.length; i++) {
    const wavBlob = await convertBase64ToWav(audioFiles[i].file_base64);
    formData.append("audio_files", wavBlob, `recording_${i + 1}.wav`);
  }

  formData.append("id", scriptId || "");
  
  // Add credentials to the form data
  if (credentials) {
    formData.append("hass_ip", credentials.ip || "");
    formData.append("hass_token", credentials.token || "");
  }
  
  try {
    const response = await fetch('http://GNG2101-VoiceBridge.local:8080/upload_profile_group', {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    console.log("Upload Response:", data);
    return data;
  } catch (error) {
    console.error("Upload Error:", error);
    throw error;
  }
}

// Delete command group from Raspberry Pi
export async function deleteGroupFromPi(commandTitle) {
  const formData = new FormData();
  formData.append("user", "default_user");
  formData.append("group_name", commandTitle);

  try {
    const response = await fetch("http://GNG2101-VoiceBridge.local:8080/delete_group", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    console.log("Delete Response:", data);
    return data;
  } catch (error) {
    console.error("Delete Error:", error);
    throw error;
  }
}