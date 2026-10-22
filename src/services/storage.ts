const CLOUD_NAME = "rvolv4db";
const UPLOAD_PRESET = "chat_preset";

export const uploadFileToStorage = async (
  uriOrFile: any,
  path: string
): Promise<string> => {
  try {
    const formData = new FormData();

    const extension = path.split(".").pop()?.toLowerCase() || "jpg";

    let resourceType = "image";
    if (["mp4", "mov", "avi", "mkv", "m4a", "mp3", "wav", "ogg", "aac", "webm"].includes(extension)) {
      resourceType = "video";
    } else if (["pdf", "doc", "docx", "txt", "zip"].includes(extension)) {
      resourceType = "raw";
    }

    let mimeType = "application/octet-stream";
    if (resourceType === "image") {
      mimeType = "image/jpeg";
    } else if (["m4a", "mp3", "wav", "ogg", "aac", "webm"].includes(extension)) {
      mimeType = `audio/${extension === "m4a" ? "mp4" : extension}`; 
    } else if (resourceType === "video") {
      mimeType = "video/mp4";
    }

    let fileData = uriOrFile;

    if (typeof uriOrFile === "string" && uriOrFile.startsWith("blob:")) {
      const blobResponse = await fetch(uriOrFile);
      fileData = await blobResponse.blob();
    }

    // Si es un Blob o File directo (Web)
    if (typeof fileData !== "string" && (fileData instanceof File || fileData instanceof Blob)) {
      formData.append("file", fileData, `upload.${extension}`);
    } else if (typeof fileData === "string" && fileData.startsWith("data:")) {
      // Si es un Data URL Base64 (Común en imágenes en web)
      formData.append("file", fileData);
    } else {
      // Para entornos móviles nativos (iOS / Android)
      formData.append("file", {
        uri: fileData,
        type: mimeType,
        name: `upload.${extension}`,
      } as any);
    }

    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error(data.error?.message || "Error al subir archivo a Cloudinary");
    }
  } catch (error) {
    console.error("Error en uploadFileToStorage:", error);
    throw error;
  }
};