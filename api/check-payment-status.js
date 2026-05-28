export default async function handler(req, res) {
    const { invoice_id } = req.query;

    if (!invoice_id) {
        return res.status(400).json({ success: false, message: 'Missing invoice_id' });
    }

    // NOTE: In a real implementation, you would query your database (e.g. Supabase)
    // to check if the webhook has updated the status of this invoice.
    
    // For now, we return a pending status or success if we want to simulate
    // In this case, I'll return a mock "PAID" if it's a specific test ID, or "PENDING"
    
    return res.status(200).json({
        status: 'PENDING', // Change to 'PAID' via webhook
        message: 'Status check placeholder'
    });
}
