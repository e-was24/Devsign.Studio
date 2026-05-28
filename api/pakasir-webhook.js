export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const webhookData = req.body;
    console.log('Webhook received:', webhookData);

    // 1. Validasi status dari Pakasir
    if (webhookData.status === 'completed' || webhookData.status === 'paid' || webhookData.status === 'success') {
        
        // 2. UPDATE status di database kamu menjadi 'PAID' berdasarkan Invoice ID
        // Note: You need to implement database logic here if you want it to work.
        // Example with Supabase if keys are available:
        // const { error } = await supabase.from('orders').update({ status: 'PAID' }).eq('invoice_id', webhookData.invoice_id);

        return res.status(200).json({ message: "Webhook berhasil diproses" });
    }

    return res.status(400).json({ message: "Status tidak valid" });
}
