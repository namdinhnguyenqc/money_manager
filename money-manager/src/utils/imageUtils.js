import imageCompression from 'browser-image-compression';

export async function compressImage(imageFile) {
  const options = {
    maxSizeMB: 0.15, // Target size 150KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };
  try {
    const compressedFile = await imageCompression(imageFile, options);
    console.log(`Original size: ${imageFile.size / 1024 / 1024} MB`);
    console.log(`Compressed size: ${compressedFile.size / 1024 / 1024} MB`);
    
    // For MVP without backend, returning base64 to store in localStorage
    return await fileToBase64(compressedFile);
  } catch (error) {
    console.error("Compression error:", error);
    return null;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
