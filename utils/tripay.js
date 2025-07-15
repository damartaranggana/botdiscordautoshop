const axios = require('axios');
const crypto = require('crypto');

class TripayService {
    constructor() {
        this.apiKey = process.env.TRIPAY_API_KEY;
        this.privateKey = process.env.TRIPAY_PRIVATE_KEY;
        this.merchantCode = process.env.TRIPAY_MERCHANT_CODE;
        this.callbackUrl = process.env.TRIPAY_CALLBACK_URL;
        this.baseUrl = 'https://tripay.co.id/api';
        this.sandboxBaseUrl = 'https://tripay.co.id/api-sandbox';

        // Use sandbox for development
        this.isProduction = process.env.NODE_ENV === 'production';
        this.endpoint = this.isProduction ? this.baseUrl : this.sandboxBaseUrl;
    }

    // Get available payment channels
    async getPaymentChannels() {
        try {
            const response = await axios.get(`${this.endpoint}/merchant/payment-channel`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching payment channels:', error.response?.data || error.message);
            throw error;
        }
    }

    // Create payment transaction
    async createTransaction(amount, userId, userName) {
        try {
            const merchantRef = `TOPUP-${Date.now()}-${userId}`;
            const expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

            const data = {
                method: 'QRIS', // Using QRIS as default payment method
                merchant_ref: merchantRef,
                amount: amount,
                customer_name: userName,
                customer_email: `${userId}@discord.user`,
                customer_phone: '08123456789',
                order_items: [
                    {
                        sku: 'TOPUP',
                        name: 'Top-up Saldo',
                        price: amount,
                        quantity: 1,
                        product_url: '',
                        image_url: ''
                    }
                ],
                return_url: 'https://discord.com',
                expired_time: expiry,
                signature: this.generateSignature(merchantRef, amount)
            };

            const response = await axios.post(`${this.endpoint}/transaction/create`, data, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating transaction:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get transaction detail
    async getTransactionDetail(reference) {
        try {
            const response = await axios.get(`${this.endpoint}/transaction/detail`, {
                params: { reference },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error fetching transaction detail:', error.response?.data || error.message);
            throw error;
        }
    }

    // Generate signature for creating transaction
    generateSignature(merchantRef, amount) {
        const payload = `${this.merchantCode}${merchantRef}${amount}`;
        return crypto.createHmac('sha256', this.privateKey)
            .update(payload)
            .digest('hex');
    }

    // Verify callback signature
    verifyCallback(callbackData, signature) {
        const payload = JSON.stringify(callbackData);
        const calculatedSignature = crypto.createHmac('sha256', this.privateKey)
            .update(payload)
            .digest('hex');

        return calculatedSignature === signature;
    }

    // Format payment methods for display
    formatPaymentChannels(channels) {
        const formatted = [];

        for (const channel of channels) {
            formatted.push({
                code: channel.code,
                name: channel.name,
                type: channel.type,
                fee_merchant: channel.fee_merchant,
                fee_customer: channel.fee_customer,
                minimum_fee: channel.minimum_fee,
                maximum_fee: channel.maximum_fee,
                icon_url: channel.icon_url
            });
        }

        return formatted;
    }

    // Calculate total amount including fees
    calculateTotalAmount(baseAmount, paymentMethod) {
        // This is a simplified calculation
        // In production, you should get the exact fee from the payment channel data
        const fee = paymentMethod === 'QRIS' ? 0 : 4000; // Example fee
        return baseAmount + fee;
    }

    // Get fee information for a payment method
    async getFeeInfo(paymentMethod, amount) {
        try {
            const response = await axios.get(`${this.endpoint}/merchant/fee-calculator`, {
                params: {
                    code: paymentMethod,
                    amount: amount
                },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error calculating fee:', error.response?.data || error.message);
            throw error;
        }
    }

    // Create transaction with specific payment method
    async createTransactionWithMethod(amount, userId, userName, paymentMethod) {
        try {
            const merchantRef = `TOPUP-${Date.now()}-${userId}`;
            const expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now

            const data = {
                method: paymentMethod,
                merchant_ref: merchantRef,
                amount: amount,
                customer_name: userName,
                customer_email: `${userId}@discord.user`,
                customer_phone: '08123456789',
                order_items: [
                    {
                        sku: 'TOPUP',
                        name: 'Top-up Saldo',
                        price: amount,
                        quantity: 1,
                        product_url: '',
                        image_url: ''
                    }
                ],
                return_url: 'https://discord.com',
                expired_time: expiry,
                signature: this.generateSignature(merchantRef, amount)
            };

            const response = await axios.post(`${this.endpoint}/transaction/create`, data, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Error creating transaction with method:', error.response?.data || error.message);
            throw error;
        }
    }

    // Check if service is properly configured
    isConfigured() {
        return !!(this.apiKey && this.privateKey && this.merchantCode);
    }

    // Get service status
    getStatus() {
        return {
            configured: this.isConfigured(),
            production: this.isProduction,
            endpoint: this.endpoint
        };
    }
}

module.exports = TripayService; 