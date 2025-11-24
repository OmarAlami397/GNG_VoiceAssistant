//upload to raspberry pi
export async function uploadGroupToPi(commandTitle, audioFiles) {
    const formData = new FormData();
    formData.append("user", "default_user"); 
    formData.append("group_name", commandTitle); 
    
    //add all udio files
    audioFiles.forEach((audioFile, index) => {
        //convert to blob
        const byteCharacters = atob(audioFile.file_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/webm" });
        
        formData.append("audio_files", blob, `recording_${index + 1}.webm`);
    });

    try {
        const response = await fetch("http://raspberrypi.local:8080/upload_profile_group", {
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
        const response = await fetch("http://raspberrypi.local:8080/delete_group", {
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