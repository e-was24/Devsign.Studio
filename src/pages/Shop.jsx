import React, { useState, useEffect } from 'react';
import './shop-page.css';
import products from '../data/products.json';

function Shop() {
    // Menyimpan status pembelian per produk (Contoh: { 1: 'pending', 2: 'success' })
    const [paymentStatus, setPaymentStatus] = useState({});
    const [loadingProductId, setLoadingProductId] = useState(null);
    const [downloadUrl, setDownloadUrl] = useState({});
    const [customerEmail, setCustomerEmail] = useState('');

    // API Key Pakasir (Disarankan ditaruh di file .env)
    const PAKKASIR_API_KEY = import.meta.env.VITE_PAKKASIR_API_KEY; 

    // Fungsi untuk membuat tagihan ke Pakasir via Backend Proxy
    const handleBayar = async (product) => {
        if (!customerEmail) {
            alert("Silakan masukkan email Anda terlebih dahulu.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerEmail)) {
            alert("Silakan masukkan format email yang valid.");
            return;
        }

        setLoadingProductId(product.id);
        
        try {
            // Memanggil API lokal kita (Serverless Function) untuk menghindari CORS
            const response = await fetch(`/api/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pakasir_slug: product.pakasir_slug,
                    customer_email: customerEmail, 
                    reference_id: `ORDER-${product.id}-${Date.now()}`
                })
            });

            const data = await response.json();

            if (data.success && data.payment_url) {
                setPaymentStatus(prev => ({ ...prev, [product.id]: 'pending' }));
                window.open(data.payment_url, '_blank');
                mulaiCekStatusBerkala(product.id, data.invoice_id || data.data?.invoice_id);
            } else {
                alert("Gagal membuat pembayaran. Cek log server atau konfigurasi slug.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Terjadi kesalahan koneksi ke server.");
        } finally {
            setLoadingProductId(null);
        }
    };

    // Simulasi mengecek database/webhook apakah pembayaran sudah sukses
    const mulaiCekStatusBerkala = (productId, invoiceId) => {
        const interval = setInterval(async () => {
            try {
                // Di sini kamu menembak API backend/Supabase milikmu sendiri 
                // yang sudah menerima webhook 200 dari Pakasir
                const response = await fetch(`/api/check-payment-status?invoice_id=${invoiceId}`);
                const data = await response.json();

                if (data.status === 'PAID') {
                    // 1. Ubah status tombol menjadi sukses
                    setPaymentStatus(prev => ({ ...prev, [productId]: 'success' }));
                    
                    // 2. Simpan link download file .zip aman yang diberikan oleh backend
                    setDownloadUrl(prev => ({ ...prev, [productId]: data.secure_download_link }));
                    
                    // 3. Hentikan pengecekan berkala jika sudah lunas
                    clearInterval(interval);
                }
            } catch (err) {
                console.log("Menunggu webhook Pakasir...");
            }
        }, 5000); // Cek setiap 5 detik sekali
    };

    return (
        <div className="shop-container">
            <h1 className="shop-title"><span>Digital</span> Shop.</h1>
            
            <div className="email-input-container">
                <label htmlFor="customer-email">Email Pengiriman:</label>
                <input 
                    id="customer-email"
                    type="email" 
                    placeholder="Masukkan email untuk menerima link download..." 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="email-field"
                />
                <p className="email-helper">File akan dikirimkan ke email ini setelah pembayaran lunas.</p>
            </div>

            <div className="product-grid">
                {products.map((product) => {
                    const status = paymentStatus[product.id];
                    const isProductLoading = loadingProductId === product.id;

                    return (
                        <div className="product-card" key={product.id}>
                            <div className="product-details">
                                <span className="product-category">{product.category}</span>
                                <h3>{product.name}</h3>
                                <p className="product-price">{product.price}</p>
                            </div>

                            {/* LOGIKA DINAMIS TOMBOL BERUBAH BERDASARKAN STATUS */}
                            {status === 'success' ? (
                                // JIKA SUKSES -> Tombol berubah jadi Download
                                <a 
                                    href={downloadUrl[product.id]} 
                                    className="btn-buy" 
                                    style={{ backgroundColor: '#2ed573', textDecoration: 'none' }}
                                    download
                                >
                                    💾 Download File .Zip
                                </a>
                            ) : status === 'pending' ? (
                                // JIKA PENDING -> Menunggu pembayaran di tab sebelah
                                <button className="btn-buy" disabled style={{ backgroundColor: '#ffa502' }}>
                                    ⏳ Menunggu Pembayaran...
                                </button>
                            ) : (
                                // JIKA BELUM BAYAR -> Tombol default "Bayar Sekarang"
                                <button 
                                    className="btn-buy" 
                                    onClick={() => handleBayar(product)}
                                    disabled={isProductLoading || !product.inStock}
                                >
                                    {isProductLoading ? 'Memproses...' : '💳 Bayar Sekarang'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Shop;