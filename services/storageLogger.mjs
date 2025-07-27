saveToPostgres(phoneNumber, data, fileUrl) {
  postgres.insert("skck", {
    phone: phoneNumber,
    name: data.name,
    nik: data.nik,
    ttl: data.ttl,
    address: data.address,
    reason: data.reason,
    file_url: fileUrl,
    created_at: Datenow()
  })
}
