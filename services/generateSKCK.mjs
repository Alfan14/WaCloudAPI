generateAndUploadSKCK(data) {
  // Fill template using data (name, nik, ttl, address, reason)
  skckHtml = renderHtmlTemplate(data)

  // Convert to PDF/image (use Puppeteer or Canvas)
  fileBuffer = convertHtmlToImage(skckHtml)

  // Upload to Cloudinary (for image) or Cloudflare (PDF)
  fileUrl = uploadToStorage(fileBuffer)

  return fileUrl
}
