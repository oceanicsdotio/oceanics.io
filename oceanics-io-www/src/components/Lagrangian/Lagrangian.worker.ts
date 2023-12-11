/**
 * Get image data from S3, the Blob-y way. 
 */
export const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
    const blob = await fetch(url).then(response => response.blob());
    const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => { resolve(reader.result); };
      reader.readAsArrayBuffer(blob);
    }));
    if (arrayBuffer instanceof ArrayBuffer) {
      return new Float32Array(arrayBuffer);
    } else {
      throw TypeError("Result is not ArrayBuffer type")
    }
  }
  