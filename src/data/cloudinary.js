export const uploadFile = async (file) => {
  const config = window.CLOUDINARY_CONFIG;
  if (!config) {
    throw new Error('Cloudinary config not found');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', config.uploadPreset);
  formData.append('folder', '1percent-better');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    type: data.resource_type,
    format: data.format,
    name: file.name,
    size: file.size,
  };
};

export const getFileIcon = (format) => {
  const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoFormats = ['mp4', 'mov', 'avi', 'webm'];
  const docFormats = ['pdf'];
  const wordFormats = ['doc', 'docx'];
  const sheetFormats = ['xls', 'xlsx'];

  if (!format) return '📎';
  const f = format.toLowerCase();
  if (imageFormats.includes(f)) return '🖼️';
  if (videoFormats.includes(f)) return '🎥';
  if (docFormats.includes(f)) return '📄';
  if (wordFormats.includes(f)) return '📝';
  if (sheetFormats.includes(f)) return '📊';
  return '📎';
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};