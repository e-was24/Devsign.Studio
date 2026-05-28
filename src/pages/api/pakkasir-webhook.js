// Endpoint: POST /api/pakasir-webhook
app.post('/api/pakasir-webhook', async (req, res) => {
    const webhookData = req.body;

    // 1. Validasi status dari Pakasir (sesuai dokumentasi pakarir status 'completed' / 'paid')
    if (webhookData.status === 'completed' || webhookData.status === 'paid') {
        
        // 2. UPDATE status di database kamu menjadi 'PAID' berdasarkan Invoice ID
        await database.table('orders')
            .update({ status: 'PAID' })
            .match({ invoice_id: webhookData.invoice_id });

        // 3. Kirim respon balik ke Pakasir dengan status 200 agar Pakasir tahu data sudah diterima
        return res.status(200).json({ message: "Webhook berhasil diproses" });
    }

    res.status(400).json({ message: "Status tidak valid" });
});