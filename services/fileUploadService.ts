import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { ChatAttachment } from "../types";

// =====================================================
// CONSTANTS
// =====================================================
const MAX_IMAGE_SIZE = 400; // Max width/height in pixels
const IMAGE_QUALITY = 0.7; // JPEG quality (0-1)
const MAX_FILE_SIZE_MB = 5; // Max file size in MB

// Supported file types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const SUPPORTED_DOC_TYPES = ["application/pdf"];
const BLOCKED_TYPES = ["video/mp4", "video/quicktime", "video/avi", "video/webm", "video/mov"];

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  isBase64?: boolean;
}

// =====================================================
// IMAGE COMPRESSION - With Error Handling
// =====================================================
export const compressImage = (
  file: File,
  maxSize = MAX_IMAGE_SIZE,
  quality = IMAGE_QUALITY
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      reject(new Error(`Archivo muy grande. Máximo ${MAX_FILE_SIZE_MB}MB`));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error("Error al leer archivo"));
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Scale down if needed
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No se pudo crear el canvas"));
            return;
          }

          // Draw with white background (for transparency)
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", quality);
          resolve(compressed);
        } catch (err) {
          reject(new Error("Error al comprimir imagen"));
        }
      };
      
      img.onerror = () => reject(new Error("Error al cargar imagen"));
      img.src = result;
    };
    
    reader.onerror = () => reject(new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });
};

// =====================================================
// VALIDATION
// =====================================================
export const validateFile = (file: File): { valid: boolean; error?: string; type?: "image" | "pdf" } => {
  // Check if blocked (videos)
  if (BLOCKED_TYPES.includes(file.type)) {
    return { valid: false, error: "Videos no permitidos. Solo imágenes y PDFs." };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `Archivo muy grande. Máximo ${MAX_FILE_SIZE_MB}MB` };
  }

  // Check if supported image
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: true, type: "image" };
  }

  // Check if PDF
  if (SUPPORTED_DOC_TYPES.includes(file.type)) {
    return { valid: true, type: "pdf" };
  }

  return { valid: false, error: "Tipo de archivo no soportado. Use imágenes (JPG, PNG) o PDF." };
};

// =====================================================
// UPLOAD TO SUPABASE STORAGE
// =====================================================
export const uploadToStorage = async (
  file: File | Blob,
  bucket: string,
  fileName: string
): Promise<UploadResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("❌ Error uploading to storage:", error.message);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (urlData?.publicUrl) {
      console.log("✅ Archivo subido a Supabase Storage:", urlData.publicUrl);
      return { success: true, url: urlData.publicUrl };
    }

    return { success: false, error: "No se pudo obtener URL pública" };
  } catch (err: any) {
    console.error("❌ Error en uploadToStorage:", err);
    return { success: false, error: err.message || "Error desconocido" };
  }
};

// =====================================================
// UPLOAD PROFILE IMAGE - ALWAYS WORKS (base64 fallback)
// =====================================================
export const uploadProfileImage = async (
  file: File,
  userId: string
): Promise<UploadResult> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (validation.type !== "image") {
      return { success: false, error: "Solo imágenes permitidas para perfil" };
    }

    // Compress image first (this always works)
    let compressed: string;
    try {
      compressed = await compressImage(file, 400, 0.7);
    } catch (compressError: any) {
      console.error("Compression error:", compressError);
      return { success: false, error: compressError.message || "Error al comprimir imagen" };
    }
    
    // Try to upload to Supabase Storage
    if (isSupabaseConfigured()) {
      try {
        // Convert base64 to Blob
        const response = await fetch(compressed);
        const blob = await response.blob();
        
        const fileName = `${userId}-${Date.now()}.jpg`;
        console.log("📤 Uploading to bucket 'avatars' with filename:", fileName);
        
        const result = await uploadToStorage(blob, "avatars", fileName);
        
        if (result.success && result.url) {
          console.log("✅ Imagen subida exitosamente:", result.url);
          
          // Update profile in database
          try {
            const { error } = await supabase
              .from("profiles")
              .update({ avatar_url: result.url })
              .eq("id", userId);
            
            if (error) {
              console.warn("⚠️ Error updating avatar_url in profiles:", error);
            } else {
              console.log("✅ avatar_url actualizado en profiles");
            }
          } catch (updateErr) {
            console.warn("Could not update profile with avatar URL:", updateErr);
          }
          
          return result;
        }
        
        console.warn("⚠️ Supabase Storage falló:", result.error, "- usando base64");
      } catch (uploadError) {
        console.warn("⚠️ Error de upload a Storage, usando base64:", uploadError);
      }
    }

    // Fallback: Return compressed base64 (extra compressed for localStorage safety)
    try {
      const extraCompressed = await compressImage(file, 200, 0.5);
      return { 
        success: true, 
        url: extraCompressed, 
        isBase64: true 
      };
    } catch (extraCompressError) {
      // Last resort: use the first compression
      return { 
        success: true, 
        url: compressed, 
        isBase64: true 
      };
    }
  } catch (err: any) {
    console.error("❌ Error en uploadProfileImage:", err);
    return { success: false, error: err.message || "Error al subir imagen" };
  }
};

// =====================================================
// UPLOAD CHAT ATTACHMENT - Simple base64 approach
// =====================================================
export const uploadChatAttachment = async (
  file: File,
  senderId: string,
  receiverId: string
): Promise<UploadResult & { attachment?: ChatAttachment }> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Only handle images for simplicity (PDFs need storage)
    if (validation.type !== "image") {
      return { 
        success: false, 
        error: "Solo imágenes permitidas en el chat" 
      };
    }

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Compress image for chat (larger than profile)
    let compressed: string;
    try {
      compressed = await compressImage(file, 600, 0.8);
    } catch (compressError: any) {
      return { success: false, error: compressError.message || "Error al comprimir" };
    }
    
    // Try Supabase Storage first
    if (isSupabaseConfigured()) {
      try {
        const response = await fetch(compressed);
        const blob = await response.blob();
        
        const fileName = `${senderId}-${receiverId}/${attachmentId}.jpg`;
        const result = await uploadToStorage(blob, "chat", fileName);
        
        if (result.success && result.url) {
          return {
            ...result,
            attachment: {
              id: attachmentId,
              type: "image",
              url: result.url,
              fileName: file.name,
              size: file.size,
            },
          };
        }
      } catch (uploadError) {
        console.warn("Storage upload failed, using base64");
      }
    }
    
    // Fallback to base64
    return {
      success: true,
      url: compressed,
      isBase64: true,
      attachment: {
        id: attachmentId,
        type: "image",
        url: compressed,
        fileName: file.name,
        size: file.size,
      },
    };
  } catch (err: any) {
    console.error("❌ Error en uploadChatAttachment:", err);
    return { success: false, error: err.message || "Error al subir archivo" };
  }
};

// =====================================================
// DELETE FROM STORAGE
// =====================================================
export const deleteFromStorage = async (
  bucket: string,
  filePath: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.error("Error deleting from storage:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error in deleteFromStorage:", err);
    return false;
  }
};

// =====================================================
// HELPERS
// =====================================================
export const isBase64Image = (url: string): boolean => {
  return url?.startsWith("data:image/");
};

export const getFileExtension = (fileName: string): string => {
  return fileName.split(".").pop()?.toLowerCase() || "";
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
