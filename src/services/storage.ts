import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const CLOUD_NAME = "rvolv4db";
const UPLOAD_PRESET = "chat_preset";

export const uploadFileToStorage = async (
  uriOrFile: any,
  path: string
): Promise<string> => {
  try {
    const extension = path.split(".").pop()?.toLowerCase() || "jpg";

    let resourceType = "image";
    if (["mp4", "mov", "avi", "mkv", "m4a", "mp3", "wav", "ogg", "aac", "webm"].includes(extension)) {
      resourceType = "video";
    } else if (["pdf", "doc", "docx", "txt", "zip"].includes(extension)) {
      resourceType = "raw";
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    // Para entornos móviles nativos (Android / iOS) usamos el uploader nativo de expo-file-system
    if (Platform.OS !== "web") {
      let fileUri = typeof uriOrFile === "string" ? uriOrFile : uriOrFile?.uri;
      if (!fileUri) {
        throw new Error("No se pudo obtener la ruta del archivo local.");
      }

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        parameters: {
          upload_preset: UPLOAD_PRESET,
        },
      });

      const data = JSON.parse(uploadResult.body);
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || "Error al subir archivo a Cloudinary");
      }
    } else {
      // Para entorno Web
      const formData = new FormData();
      let fileData = uriOrFile;

      if (typeof uriOrFile === "string" && uriOrFile.startsWith("blob:")) {
        const blobResponse = await fetch(uriOrFile);
        fileData = await blobResponse.blob();
      }

      if (typeof fileData !== "string" && (fileData instanceof File || fileData instanceof Blob)) {
        formData.append("file", fileData, `upload.${extension}`);
      } else if (typeof fileData === "string" && fileData.startsWith("data:")) {
        formData.append("file", fileData);
      } else {
        formData.append("file", fileData);
      }

      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error(data.error?.message || "Error al subir archivo a Cloudinary");
      }
    }
  } catch (error) {
    console.error("Error en uploadFileToStorage:", error);
    throw error;
  }
};
