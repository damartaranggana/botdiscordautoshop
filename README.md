# Discord Digital Store Bot

Bot Discord untuk toko digital dengan sistem pembayaran Tripay dan database SQLite. Bot ini memungkinkan pengguna untuk membeli produk digital menggunakan saldo internal yang dapat di-top up melalui payment gateway Tripay.

## Fitur Utama

### 🛒 Sistem Katalog Produk
- Menampilkan daftar produk dengan harga dan stok
- Stok berbasis kode unik (email:password, voucher:PIN, dll)
- Sistem pencarian dan autocomplete

### 💰 Sistem Balance & Top-up
- Saldo internal untuk setiap user
- Top-up menggunakan Tripay payment gateway
- Callback otomatis untuk verifikasi pembayaran
- Multiple payment methods (QRIS, Bank Transfer, E-Wallet)

### 🔐 Pembelian Produk
- Pembelian menggunakan saldo internal
- Kode produk dikirim via DM
- Sistem proteksi ganda untuk mencegah duplikasi
- Role otomatis untuk customer

### 👨‍💼 Panel Admin
- Manajemen produk (tambah, hapus, edit)
- Manajemen stok (tambah, hapus kode)
- Manajemen saldo user
- Log transaksi lengkap
- Monitoring stok rendah

### 📊 Fitur Tambahan
- Backup database otomatis
- Notifikasi stok rendah
- Log transaksi ke channel admin
- Cron jobs untuk maintenance
- Health check endpoint

## Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd discord-digital-store-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Salin file `.env.example` ke `.env` dan isi dengan konfigurasi Anda:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
GUILD_ID=your_guild_id_here

# Tripay API Configuration
TRIPAY_API_KEY=your_tripay_api_key_here
TRIPAY_PRIVATE_KEY=your_tripay_private_key_here
TRIPAY_MERCHANT_CODE=your_tripay_merchant_code_here
TRIPAY_CALLBACK_URL=https://your-domain.com/tripay/callback

# Server Configuration
PORT=3000
ADMIN_ROLE_ID=your_admin_role_id_here
CUSTOMER_ROLE_ID=your_customer_role_id_here
LOG_CHANNEL_ID=your_log_channel_id_here

# Database
DB_PATH=./database/store.db
```

### 4. Setup Discord Bot
1. Buat aplikasi baru di [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat bot dan copy token ke `DISCORD_TOKEN`
3. Copy Application ID ke `CLIENT_ID`
4. Invite bot ke server dengan permissions yang diperlukan:
   - Send Messages
   - Use Slash Commands
   - Manage Roles
   - Read Message History

### 5. Setup Tripay
1. Daftar akun di [Tripay](https://tripay.co.id/)
2. Dapatkan API Key, Private Key, dan Merchant Code
3. Setup callback URL di dashboard Tripay

### 6. Jalankan Bot
```bash
# Development
npm run dev

# Production
npm start
```

## Struktur File
```
discord-digital-store-bot/
├── bot.js                 # Main bot file
├── database/
│   └── db.js             # Database handler
├── commands/             # Slash commands
│   ├── beli.js
│   ├── produk.js
│   ├── saldo.js
│   ├── topup.js
│   ├── cek_transaksi.js
│   ├── tambah_produk.js
│   ├── tambah_stok.js
│   ├── tambah_saldo.js
│   ├── cek_stok.js
│   └── pesanan_log.js
├── events/               # Event handlers
│   ├── ready.js
│   ├── interactionCreate.js
│   └── autocomplete.js
├── utils/                # Utility functions
│   └── tripay.js
├── backups/              # Database backups
├── package.json
└── README.md
```

## Perintah Bot

### User Commands
- `/produk` - Lihat daftar produk yang tersedia
- `/saldo` - Cek saldo Anda
- `/topup <jumlah>` - Top-up saldo menggunakan Tripay
- `/beli <nama_produk>` - Beli produk dengan saldo
- `/cek_transaksi <referensi>` - Cek status transaksi top-up

### Admin Commands
- `/tambah_produk <nama> <harga> [deskripsi]` - Tambah produk baru
- `/tambah_stok <produk> <kode1,kode2,...>` - Tambah stok produk
- `/tambah_saldo <@user> <jumlah>` - Tambah saldo user secara manual
- `/cek_stok [produk]` - Cek stok produk (kosongkan untuk semua)
- `/pesanan_log [limit]` - Lihat log transaksi

## Database Schema

### Users Table
- `id` - Primary key
- `discord_id` - Discord user ID
- `username` - Discord username
- `balance` - User balance
- `created_at` - Account creation date
- `updated_at` - Last update date

### Products Table
- `id` - Primary key
- `name` - Product name (unique)
- `price` - Product price
- `description` - Product description
- `active` - Product status
- `created_at` - Creation date

### Stock Table
- `id` - Primary key
- `product_id` - Foreign key to products
- `code` - Product code
- `used` - Usage status
- `created_at` - Creation date

### Transactions Table
- `id` - Primary key
- `user_id` - Discord user ID
- `product_id` - Foreign key to products
- `type` - Transaction type (purchase/topup/admin_add)
- `amount` - Transaction amount
- `code_given` - Product code given
- `tripay_reference` - Tripay reference
- `status` - Transaction status
- `created_at` - Transaction date

### Topup Requests Table
- `id` - Primary key
- `user_id` - Discord user ID
- `amount` - Top-up amount
- `tripay_reference` - Tripay reference
- `tripay_checkout_url` - Payment URL
- `status` - Payment status
- `created_at` - Request date
- `updated_at` - Last update date

## API Endpoints

### Health Check
```
GET /health
```

### Tripay Callback
```
POST /tripay/callback
```

## Deployment

### VPS/Dedicated Server
1. Install Node.js dan npm
2. Clone repository
3. Install dependencies
4. Setup environment variables
5. Jalankan dengan PM2:
```bash
npm install -g pm2
pm2 start bot.js --name discord-store-bot
```

### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### Replit
1. Import repository
2. Setup environment variables
3. Run project

## Monitoring & Maintenance

### Backup Database
Bot secara otomatis membuat backup database setiap hari pukul 02:00. Backup disimpan di folder `backups/`.

### Log Monitoring
- Semua transaksi dicatat di database
- Log admin dikirim ke channel yang ditentukan
- Error logging ke console

### Health Check
Bot menyediakan endpoint `/health` untuk monitoring status.

## Troubleshooting

### Common Issues

1. **Bot tidak merespon slash commands**
   - Pastikan bot memiliki permission `Use Slash Commands`
   - Check `GUILD_ID` di environment variables

2. **Tripay callback tidak berfungsi**
   - Pastikan callback URL dapat diakses public
   - Check signature verification di Tripay dashboard

3. **Database error**
   - Pastikan folder `database/` ada dan writable
   - Check file permissions

4. **Role assignment gagal**
   - Pastikan bot memiliki permission `Manage Roles`
   - Check `ADMIN_ROLE_ID` dan `CUSTOMER_ROLE_ID`

### Error Logs
Check console output untuk error details:
```bash
# Jika menggunakan PM2
pm2 logs discord-store-bot

# Jika run manual
node bot.js
```

## Security Considerations

1. **Environment Variables**
   - Jangan commit file `.env` ke repository
   - Gunakan environment variables di production

2. **Database Security**
   - Backup database secara berkala
   - Pastikan database file tidak dapat diakses public

3. **API Keys**
   - Gunakan API keys yang valid
   - Rotasi API keys secara berkala

4. **Callback URL**
   - Pastikan callback URL menggunakan HTTPS
   - Implementasi signature verification

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - lihat file LICENSE untuk detail.

## Support

Jika ada pertanyaan atau masalah, silakan buat issue di repository atau hubungi developer. 