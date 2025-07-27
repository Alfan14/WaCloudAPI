import express from 'express';
import puppeteer from 'puppeteer';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import pool from "../db/index.mjs";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()

async function getBase64Image(filePathOrUrl) {
    try {
        if (isValidHttpUrl(filePathOrUrl)) {
            const response = await axios.get(filePathOrUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');
            return imageBuffer.toString('base64');
        } else {
            const imageBuffer = await fs.readFile(filePathOrUrl);
            return imageBuffer.toString('base64');
        }
    } catch (err) {
        console.error(`Error getting image from ${filePathOrUrl}:`, err.message);
        return 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
}

const generateSkckPdf = (async (req, res) => {
  try {
        const polriEmblemBase64 = await getBase64Image('public/Lambang_Polri.png');

        const skckData = req.body;

        const skckDataToRender = [];
        for (const s of skckData) {
            const skckDetail = s.skck_details;
            let applicantPhotoBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            if (skckDetail && skckDetail.passport_photo) {
                applicantPhotoBase64 = await getBase64Image(skckDetail.passport_photo);
            }
            skckDataToRender.push({ ...skckDetail, applicantPhotoBase64 });
        }

        let htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SKCK Document</title>
                <style>
                    /* Your CSS styles here (unchanged) */
                    body { font-family: 'Times New Roman', serif; margin: 0; padding: 20px; font-size: 12pt; }
                    .skck-container { width: 8.5in; min-height: 11in; margin: auto; padding: 0.5in; box-sizing: border-box; position: relative; }
                    .polri-watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 80%;
                        height: auto;
                        opacity: 0.1;
                        z-index: 0;
                        pointer-events: none;
                    }
                    .relative { position: relative; z-index: 1; }
                    .text-center { text-align: center; }
                    .mb-6 { margin-bottom: 1.5rem; }
                    .font-bold { font-weight: bold; }
                    .text-lg { font-size: 1.125rem; }
                    .text-md { font-size: 1rem; }
                    .text-sm { font-size: 0.875rem; }
                    .text-xs { font-size: 0.75rem; }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .items-center { align-items: center; }
                    .space-x-2 > *:not(:first-child) { margin-left: 0.5rem; }
                    .h-16 { height: 4rem; }
                    .w-16 { width: 4rem; }
                    .uppercase { text-transform: uppercase; }
                    .italic { font-style: italic; }
                    .grid { display: grid; }
                    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .col-span-full { grid-column: span / span; }
                    .gap-y-2 > *:not(:first-child) { margin-top: 0.5rem; }
                    .data-label { font-weight: normal; margin-right: 5px; display: inline-block; min-width: 150px; }
                    .data-value { font-weight: bold; }
                    .list-lower-alpha { list-style-type: lower-alpha; }
                    .ml-6 { margin-left: 1.5rem; }
                    .mt-4 { margin-top: 1rem; }
                    .mt-8 { margin-top: 2rem; }
                    .w-24 { width: 6rem; }
                    .h-32 { height: 8rem; }
                    .border { border-width: 1px; border-style: solid; border-color: #e2e8f0; }
                    .object-cover { object-fit: cover; }
                    .object-top { object-position: top; }
                    .h-20 { height: 5rem; }
                    .w-48 { width: 12rem; }
                    .border-b-2 { border-bottom-width: 2px; }
                    .border-gray-400 { border-color: #cbd5e0; }
                    .mx-auto { margin-left: auto; margin-right: auto; }
                </style>
            </head>
            <body>
            <div id="skck_document" class="skck-container">
                <img src="data:image/png;base64,${polriEmblemBase64}" alt="Polri Emblem Watermark" class="polri-watermark">
        `;

        skckDataToRender.forEach((skck, index) => {
            htmlContent += `
                <div key="${index}" class="relative z-10">
                    <div class="text-center mb-6">
                        <p class="text-lg font-bold">KEPOLISIAN NEGARA REPUBLIK INDONESIA</p>
                        <p class="text-md">RESOR KABUPATEN MAGETAN</p>
                        <p class="text-md">SEKTOR BENDO</p>
                        <p class="text-sm">Gorang-Gareng Jl. Raya Bendo No.209, Dusun Bendo, Belotan, Kec. Magetan, Kabupaten Magetan, Jawa Timur 63384</p>
                    </div>

                    <div class="flex justify-between items-center mb-6">
                        <div class="flex items-center space-x-2">
                            <img src="data:image/png;base64,${polriEmblemBase64}" alt="Polri Header Emblem" class="h-16 w-16 mx-auto mb-4">
                            <h1 class="text-xl font-bold uppercase">SURAT KETERANGAN CATATAN KEPOLISIAN</h1>
                        </div>
                        <p class="text-right text-sm">No : 09 - 0986542</p>
                    </div>
                    <p class="text-center text-lg font-bold mb-6">POLICE RECORD</p>
                    <p class="text-center text-sm mb-6">Nomor: SKCK/YANMAS/2.490/VII/2012/Sek.TJ</p>

                    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-y-2">
                        <p class="col-span-full mb-2">Diterangkan bersama ini bahwa:</p>
                        <p class="col-span-full mb-4">This is to certify that:</p>

                        <div><span class="data-label">Nama</span></div>
                        <div><span class="data-value">: ${skck.applicant_name} </span></div>

                        <div><span class="data-label">Name</span></div>
                        <div><span class="data-value">: ${skck.applicant_name} </span></div>

                        <div><span class="data-label">Jenis Kelamin</span></div>
                        <div><span class="data-value">: Laki-laki</span></div>

                        <div><span class="data-label">Sex</span></div>
                        <div><span class="data-value">: Male</span></div>

                        <div><span class="data-label">Kebangsaan</span></div>
                        <div><span class="data-value">: Indonesia</span></div>

                        <div><span class="data-label">Nationality</span></div>
                        <div><span class="data-value">: Indonesia</span></div>

                        <div><span class="data-label">Agama</span></div>
                        <div><span class="data-value">: Islam</span></div>

                        <div><span class="data-label">Religion</span></div>
                        <div><span class="data-value">: Islam</span></div>

                        <div><span class="data-label">Tempat dan tgl. lahir</span></div>
                        <div><span class="data-value">: ${skck.place_date_birth}</span></div>

                        <div><span class="data-label">Place and date of birth</span></div>
                        <div><span class="data-value">: ${skck.place_date_birth}</span></div>

                        <div><span class="data-label">Tempat tinggal sekarang</span></div>
                        <div><span class="data-value">: ${skck.complete_address}</span></div>

                        <div><span class="data-label">Current address</span></div>
                        <div><span class="data-value">: ${skck.complete_address}</span></div>

                        <div><span class="data-label">Pekerjaan</span></div>
                        <div><span class="data-value">: Karyawan</span></div>

                        <div><span class="data-label">Occupation</span></div>
                        <div><span class="data-value">: Employee</span></div>

                        <div><span class="data-label">Nomor Kartu Tanda Penduduk</span></div>
                        <div><span class="data-value">: ${skck.id_number}</span></div>

                        <div><span class="data-label">Identity card number</span></div>
                        <div><span class="data-value">: ${skck.id_number}</span></div>

                        <div><span class="data-label">Nomor Paspor/KITAS/KITAP</span></div>
                        <div><span class="data-value">: -</span></div>

                        <div><span class="data-label">Passport/KITAS/KITAP number</span></div>
                        <div><span class="data-value">: -</span></div>

                        <div><span class="data-label">Rumus sidik jari</span></div>
                        <div><span class="data-value">: 31.114 - III</span></div>

                        <div><span class="data-label">Fingerprints FORMULA</span></div>
                        <div><span class="data-value">: 31.114 - III</span></div>
                    </div>

                    <div class="mb-6">
                        <p>Setelah diadakan penelitian hingga saat dikeluarkan surat keterangan ini yang didasarkan kepada:</p>
                        <p>As of checking through the issuer hereof by virtue of:</p>
                        <ol class="list-lower-alpha ml-6">
                            <li>Catatan Kepolisian yang ada</li>
                            <li>Existing Police record</li>
                            <li>Surat Keterangan dari Kepala Desa / Lurah</li>
                            <li>Information from local Authorities</li>
                        </ol>
                        <p class="mt-4">bahwa nama tersebut diatas tidak memiliki catatan atau keterlibatan dalam kegiatan kriminal apapun.</p>
                        <p>the bearer hereof proves not to be involved in any criminal cases</p>
                        <p class="mt-4">selama ia berada di Indonesia dari <span class="data-value">27 Juli 2025</span></p>
                        <p>during his/her stay in Indonesia from <span class="data-value">27 Juli 2025</span></p>
                        <p>sampai dengan <span class="data-value">27 Juli 2026</span></p>
                        <p>until <span class="data-value">27 Juli 2026</span></p>
                    </div>

                    <div class="mb-6">
                        <p class="text-center italic mb-4">Keterangan ini diberikan berhubung dengan permohonan</p>
                        <p class="text-center italic mb-4">This certificate is issued at the request to the applicant</p>

                        <div class="grid grid-cols-2 gap-y-2">
                            <div><span class="data-label">Untuk keperluan/menuju</span></div>
                            <div><span class="data-value">: Persyaratan Melamar Pekerjaan</span></div>

                            <div><span class="data-label">For the purpose</span></div>
                            <div><span class="data-value">: Job Application Requirement</span></div>

                            <div><span class="data-label">Berlaku dari tanggal</span></div>
                            <div><span class="data-value">: 27 Juli 2025</span></div>

                            <div><span class="data-label">Valid from</span></div>
                            <div><span class="data-value">: 27 Juli 2025</span></div>

                            <div><span class="data-label">Sampai dengan</span></div>
                            <div><span class="data-value">: 27 Juli 2026</span></div>

                            <div><span class="data-label">To</span></div>
                            <div><span class="data-value">: 27 Juli 2026</span></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-end mt-8">
                        <div>
                            <img src="data:image/jpeg;base64,${skck.applicantPhotoBase64}" alt="Applicant Photo" class="w-24 h-32 border border-gray-300 object-cover object-top">
                        </div>
                        <div class="text-center">
                            <p>Dikeluarkan di : Bendo</p>
                            <p>Issued in : Bendo</p>
                            <p>Pada tanggal : 10 Juli 2025</p>
                            <p>On : 10 Juli 2025</p>
                            <p class="mt-4 font-bold">KEPALA KEPOLISIAN SEKTOR BENDO</p>
                            <div class="h-20 w-48 border-b-2 border-gray-400 mx-auto mt-4"></div>
                            <p class="mt-2 text-sm">( NAMA PEJABAT )</p>
                            <p class="text-xs">NRP. XXXXXXXXXX</p>
                        </div>
                    </div>
                </div>
            `;
        });

        htmlContent += `
            </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 500));

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
            },
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=skck-document.pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Internal Server Error during PDF generation", error: error.message });
    }
});

const generateSikPdf = (async (req, res) => {
    try {
        const polriEmblemBase64 = await getBase64Image('public/Lambang_Polri.png');

        const mockDbResponse = await axios.get('http://127.0.0.1:5000/mock-db/sikk');
        const sikkData = mockDbResponse.data;

        const sikDataToRender = [];
        for (const s of skckData) {
            const sikDetail = s.sik_details;
            let applicantPhotoBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            if (sikDetail && sikDetail.passport_photo) {
                applicantPhotoBase64 = await getBase64Image(skckDetail.passport_photo);
            }
            sikDataToRender.push({ ...sikkDetail, applicantPhotoBase64 });
        }

        let htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Surat Izin Keramaian</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Roboto', sans-serif;
                        background-color: #f0f0f0; /* Light grey background for the page itself */
                    }
                    .surat-container {
                        max-width: 800px;
                        margin: 2rem auto;
                        background-color: #FCF8E8; /* A light, warm off-white, similar to original document */
                        padding: 2.5rem; /* Slightly more padding for formal document */
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        position: relative;
                        overflow: hidden;

                        /* Subtle fine line pattern in background */
                        background-image:
                            repeating-linear-gradient(0deg, #E0DBCF 0.5px, transparent 0.5px, transparent 8px),
                            repeating-linear-gradient(90deg, #E0DBCF 0.5px, transparent 0.5px, transparent 8px);
                        background-size: 8px 8px; /* Control density of the lines */
                        background-repeat: repeat;
                        background-blend-mode: multiply;
                        background-position: center center;
                        /* opacity: 0.98; */ /* Adjust if the pattern is too strong */
                    }

                    .polri-watermark {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        opacity: 0.08; /* Very faded effect for watermark */
                        width: 70%; /* Adjust size */
                        height: auto;
                        z-index: 0;
                        pointer-events: none;
                        filter: grayscale(100%); /* Make watermark grayscale for more formal look */
                    }

                    /* Ensure content is always on top */
                    .relative.z-10 {
                        position: relative;
                        z-index: 10;
                    }

                    .section-title {
                        font-weight: bold;
                        text-decoration: underline;
                        margin-top: 1.5rem;
                        margin-bottom: 0.5rem;
                    }

                    .list-decimal-custom {
                        list-style-type: decimal;
                        padding-left: 1.5rem; /* Indent for list numbers */
                    }
                    .list-decimal-custom li {
                        margin-bottom: 0.5rem; /* Space between list items */
                    }
                    .data-value {
                        color: #555;
                    }
                </style>
            </head>
            <body>

                <div class="surat-container">
                <img src="data:image/png;base64,${polriEmblemBase64}" alt="Polri Emblem Watermark" class="polri-watermark">
        `;

        sikDataToRender.forEach((sik, index) => {
            htmlContent += `
                <div key=${index} class="relative z-10">
                <div class="text-center mb-8">
                    <p class="text-base font-bold">KEPOLISIAN NEGARA REPUBLIK INDONESIA</p>
                    <p class="text-sm">DAERAH METROPOLITAN JAKARTA RAYA</p>
                    <p class="text-sm">Jl. Jend. Sudirman No. 55 Jakarta 12190</p>
                    <div class="mt-4">
                        <img src="data:image/png;base64,${polriEmblemBase64}" alt="Polri Header Emblem" class="h-16 w-16 mx-auto">
                    </div>
                </div>

                <div class="flex justify-between items-end mb-4">
                    <div class="flex-grow text-center">
                        <p class="text-xl font-bold uppercase tracking-wider">SURAT - IJIN</p>
                        <p class="text-sm">No.Pol: SI/ YANMIN / 241 / I / 2017 / DATRO</p>
                    </div>
                    <p class="text-right text-sm font-bold ml-auto">ASLI</p>
                </div>

                <p class="section-title">Pertimbangan:</p>
                <ol class="list-decimal-custom text-sm">
                    <li>Bahwa telah dipenuhinya segala hal yang merupakan persyaratan formal dalam penerbitan Surat Izin Kegiatan / keramaian umum.</li>
                    <li>Bahwa kegiatan yang akan dilaksanakan dipandang tidak bertentangan dengan kebijakan Pemerintah Pusat pada umumnya, serta kebijakan Pemerintah Daerah khususnya ditempat kegiatan dilaksanakan.</li>
                    <li>Bahwa kegiatan yang akan dilaksanakan itu dimungkinkan untuk tidak menimbulkan kerawanan kamtibmas, ataupun dalam lingkungan dimana kegiatan dilaksanakan.</li>
                </ol>

                <p class="section-title">Dasar:</p>
                <ol class="list-decimal-custom text-sm">
                    <li>UU RI No. 2 Tahun 2002 tentang Kepolisian Negara RI.</li>
                    <li>Keppres No. 67 Tahun 2001 tanggal 2 Agustus 2001 tentang Perubahan atas Keputusan Presiden RI No. 54 tahun 2001 tentang Organisasi dan Tata Cara Kerja Satuan-satuan Organisasi Kepolisian Negara Republik Indonesia.</li>
                    <li>Kep. KEPALA KEPOLISIAN NEGARA RI DAN MENTERI PERTAHANAN KEAMANAN RI NOMOR KEP/139/XII/1995 dan NOMOR KEP/139/XII/1995 tentang petunjuk Pelaksanaan Perizinan sebagaimana diatur dalam Undang-undang No. 5 Tahun 1995 tentang Keamanan Polri.</li>
                    <li>Kep. Kapolri No. Pol. : JUKLAK/09/IX/1995, tanggal 29 Desember 1995 tentang Perizinan dan pemberitahuan kegiatan masyarakat.</li>
                    <li>Kep. KAPOLRI No. Pol : KEP/54/X/2002 tanggal 17 Oktober 2002 perihal Organisasi dan Tata Cara Kerja Kepolisian Daerah Metro Jaya dan Subdinas.</li>
                    <li>Peraturan Daerah Propinsi Daerah Khusus Ibukota Jakarta Nomor : 10 Tahun 2004 tentang Keramaian Umum.</li>
                    <li>Keputusan Gubernur Propinsi Daerah Khusus Ibukota Jakarta Nomor : 98 Tahun 2004 tentang Wewenang Organisasi Industri Pariwisata di Propinsi daerah khusus Ibukota Jakarta.</li>
                </ol>

                <p class="mt-6 text-sm">Memperhatikan : Segala kebijakan pemerintah yang berhubungan dengan adanya ketentuan-ketentuan per Undang-undangan yang berlaku untuk kegiatan tersebut.</p>

                <p class="text-center text-lg font-bold my-8">MEMBERIKAN - IJIN</p>

                <div class="grid grid-cols-2 md:grid-cols-3 gap-y-2 text-sm mb-8">
                    <div class="col-span-1"><span class="data-label">Kepada</span></div>
                    <div class="col-span-2"><span class="data-value">: ${sik.organizer_name} </span></div>

                    <div class="col-span-1"><span class="data-label">Nama Organisasi</span> </div>
                    <div class="col-span-2"><span class="data-value">: ${sik.organizer_name} </span></div>

                    <div class="col-span-1"><span class="data-label">Nama Penanggung Jawab </span></div>
                    <div class="col-span-2"><span class="data-value">: Sdr. ${sik.name}</span></div>

                    <div class="col-span-1"><span class="data-label">Pekerjaan</span></div>
                    <div class="col-span-2"><span class="data-value">: DIREKTUR</span></div>

                    <div class="col-span-1"><span class="data-label">Alamat</span></div>
                    <div class="col-span-2"><span class="data-value">: ${sik.location}</span></div>
                    <div class="col-span-1"></div>
                </div>

                <div class="flex justify-end mt-8">
                    <div class="text-center text-sm">
                        <p>Dikeluarkan di Bendo</p>
                        <p>Pada tanggal 27 Juli 2025</p>
                        <p class="mt-4 font-bold">A.n. KEPALA KEPOLISIAN NEGARA REPUBLIK INDONESIA</p>
                        <p class="font-bold">KEPALA KEPOLISIAN DAERAH BENDO</p>
                        <p class="mt-8 font-bold"> ( NAMA PEJABAT )</p>
                        <p class="mt-1">Pangkat. Nrp. XXXXXXXX</p>
                    </div>
                </div>

                <div class="absolute bottom-4 right-4 text-xs text-gray-500">
                    1.237
                </div>
            </div>
            `;
        });

        htmlContent += `
            </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 500));

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in',
            },
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=skck-document.pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Internal Server Error during PDF generation", error: error.message });
    }
});

export default {
    generateSkckPdf,
    generateSikPdf
}