const CLOUD_NAME = "rvolv4db";
const UPLOAD_PRESET = "chat_preset";

export const uploadFileToStorage = async (
  uriOrFile: any,
  path: string
): Promise<string> => {
  const formData = new FormData();

  // Detectar la extensión para determinar el tipo en Cloudinary
  let uriString = typeof uriOrFile === "string" ? uriOrFile : uriOrFile?.name || "";
  const extension = uriString.split(".").pop()?.toLowerCase();

  let resourceType = "image";
  if (["mp4", "mov", "avi", "mkv"].includes(extension || "")) {
    resourceType = "video";
  } else if (["pdf", "doc", "docx", "txt", "zip"].includes(extension || "")) {
    resourceType = "raw";
  }

  // Si se ejecuta en Web y tenemos el objeto de archivo directo (Blob/File)
  if (typeof uriOrFile !== "string" && (uriOrFile instanceof File || uriOrFile instanceof Blob)) {
    formData.append("file", uriOrFile);
  } else if (typeof uriOrFile === "string" && uriOrFile.startsWith("data:")) {
    // Si es un Data URL Base64 (común en web)
    formData.append("file", uriOrFile);
  } else {
    // Para entornos móviles nativos (iOS / Android)
    formData.append("file", {
      uri: uriOrFile,
      type: resourceType === "image" ? "image/jpeg" : resourceType === "video" ? "video/mp4" : "application/octet-stream",
      name: `upload.${extension || "jpg"}`,
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
};