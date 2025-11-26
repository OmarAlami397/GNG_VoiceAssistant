import audioBufferToWav from "audiobuffer-to-wav";

export async function convertBase64ToWav(base64String) {
  // Decode base64 → ArrayBuffer
  const byteCharacters = atob(base64String);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }

  // Decode audio data
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);

  // Convert AudioBuffer → WAV Blob
  const wavBuffer = audioBufferToWav(audioBuffer);
  return new Blob([wavBuffer], { type: "audio/wav" });
}
//upload to raspberry pi
export async function uploadGroupToPi(commandTitle, audioFiles, credentials, scriptId) {
    const formData = new FormData();
    formData.append("user", "default_user"); 
    formData.append("group_name", commandTitle); 
    
    // Add LLAT and IP
    if (credentials) {
        formData.append("ip", credentials.ip);
        formData.append("token", credentials.token);
    }
    
    // Add script ID
    if (scriptId) {
        formData.append("script_id", scriptId);
    }
    
    // Add all audio files
    for (let i = 0; i < audioFiles.length; i++) {
        const wavBlob = await convertBase64ToWav(audioFiles[i].file_base64);
        formData.append("audio_files", wavBlob, `recording_${i + 1}.wav`);
    }

    formData.append("id", "121212121");
    
    try {
        const response = await fetch("http://127.0.0.1:8080/upload_profile_group", {
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

//delete command group from raspberry pi
export async function deleteGroupFromPi(commandTitle) {
    const formData = new FormData();
    formData.append("user", "default_user"); //static user
    formData.append("group_name", commandTitle); //command text as group name

    try {
        const response = await fetch("http://127.0.0.1:8080/delete_group", {
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