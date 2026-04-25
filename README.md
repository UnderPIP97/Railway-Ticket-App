# Railway Ticket Record Generator

A mobile-friendly web application for generating railway ticket booking records in Excel and PDF format.

## Features

✅ Mobile-responsive design
✅ Add multiple ticket records
✅ Generate Excel files with exact format
✅ Generate PDF files
✅ Edit and delete records before generating
✅ Auto-fills current date
✅ Works offline after first load (PWA ready)

## Installation & Setup

### Step 1: Install Dependencies
```bash
cd railway-ticket-app
npm install
```

### Step 2: Run Development Server
```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Step 3: Build for Production (Optional)
```bash
npm run build
```

## How to Use

1. **Fill the Form**: Enter all ticket details (Train, Date, Name, PNR, Berth, Destination, Request From, Priority)
2. **Add Record**: Click "Add Record" to add the entry to the list
3. **Add More**: Repeat for multiple tickets
4. **Generate Files**: 
   - Click "Generate Excel" to download .xlsx file
   - Click "Generate PDF" to download .pdf file

## Fields

- **Train Number**: Train number (e.g., 18520)
- **Date**: Journey date
- **Passenger Name**: Name with count (e.g., PRAMEELA RANI+1)
- **PNR Number**: PNR number
- **No. of Berth**: Berth details (e.g., 2AC-2)
- **Destination**: Route (e.g., LTT-RJY)
- **Request From**: Requesting authority (e.g., Secretary CR)
- **Priority**: Important/Urgent/Normal

## Output Format

The generated files include:
- Header: ACM(RES), PCCM OFFICE CSMT, Current Date
- Table with all records
- Footer: Pravin Baria, Chief office superintendent, GM secretariat GM Office, 8828110017

## Mobile Access

### Option 1: Local Network Access
1. Run `npm run dev -- --host`
2. Access from phone using your computer's IP address (e.g., `http://192.168.1.100:5173`)

### Option 2: Deploy Online (Recommended)
Deploy to Vercel/Netlify for easy mobile access:

**Vercel (Easiest):**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy
```

## Browser Compatibility

- ✅ Chrome (Android/iOS)
- ✅ Safari (iOS)
- ✅ Firefox
- ✅ Edge

## Support

For issues or questions, contact the developer.
