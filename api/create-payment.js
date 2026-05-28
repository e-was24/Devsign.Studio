export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { pakasir_slug, customer_email, reference_id } = req.body;
    const PAKKASIR_API_KEY = process.env.PAKKASIR_API_KEY || process.env.VITE_PAKKASIR_API_KEY;

    if (!pakasir_slug || !customer_email) {
        return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    try {
        const response = await fetch(`https://app.pakasir.com/api/v1/status/${pakasir_slug}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAKKASIR_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customer_email,
                reference_id: reference_id || `ORDER-${Date.now()}`
            })
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
}
