// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

console.info("Webhook Pakasir server started");

export default {
    // Kita aktifkan akses "secret" (service_role) agar bisa menembus RLS dan mengupdate tabel orders_tokoelan
    fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {

        // Menangani CORS Preflight Request (Supaya aman dari pemblokiran browser luar)
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                }
            })
        }

        try {
            // 1. Ambil data JSON yang dikirim oleh Webhook Pakasir
            const webhookData = await req.json()

            // 2. Ambil client Supabase yang sudah disediakan otomatis oleh context (ctx)
            const supabase = ctx.supabase

            // 3. Ambil data status dan invoice_id dari Pakasir
            const statusPakasir = webhookData.status?.toLowerCase()
            const invoiceId = webhookData.reference_id || webhookData.invoice_id

            // 4. Validasi jika status menyatakan pembayaran sukses/lunas
            if (statusPakasir === 'completed' || statusPakasir === 'paid' || statusPakasir === 'success') {

                // 5. UPDATE status di tabel orders_tokoelan menjadi 'PAID'
                // ctx.authMode === "secret" menjamin ini bisa bypass RLS dengan aman
                const { error } = await supabase
                    .from('orders_tokoelan')
                    .update({ status: 'PAID' })
                    .eq('invoice_id', invoiceId)

                if (error) throw error

                return Response.json({
                    success: true,
                    message: "Status orders_tokoelan berhasil diperbarui menjadi PAID"
                }, { status: 200 });
            }

            return Response.json({
                success: false,
                message: "Status tidak valid untuk memicu download"
            }, { status: 400 });

        } catch (err: any) {
            return Response.json({
                success: false,
                error: err.message
            }, { status: 500 });
        }
    }),
};