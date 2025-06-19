const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function getRandomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals) {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
}

function generateSaleRecord(index) {
    const uniquePart = index.toString().padStart(5, '0');
    const bookVal = `BOOK-${uniquePart.substring(0, 3)}`;
    const pageVal = `PAGE-${uniquePart.substring(3)}`;
    const swisCode = `SWIS-${(index % 5) + 1}`;
    const deedYear = 2020 + (index % 4);
    const deedMonth = (index % 12) + 1;
    const deedDay = (index % 28) + 1;
    const deterministicDeedDate = `${deedYear}-${String(deedMonth).padStart(2, '0')}-${String(deedDay).padStart(2, '0')}`;
    const saleYear = 2021 + (index % 4);
    const saleMonth = (index % 12) + 1;
    const saleDay = (index % 28) + 1;
    const deterministicSaleDate = `${saleYear}-${String(saleMonth).padStart(2, '0')}-${String(saleDay).padStart(2, '0')}`;

    return {
        'swis_code': swisCode,
        'county_name': `County${(index % 3) + 1}`,
        'muni_name': ((index % 500) + 100).toString(),
        'street_nbr': (index + 100).toString(),
        'street_name': `Street${(index % 20) + 1}`,
        'book': bookVal,
        'page': pageVal,
        'deed_date': deterministicDeedDate,
        'sale_date': deterministicSaleDate,
        'sale_price': getRandomInt(100000, 1500000).toFixed(2),
        'zip5': ((index % 90000) + 10000).toString(),
        'prop_class_desc_at_sale': ['Residential', 'Commercial', 'Land'][(index % 3)],
        'total_sale_acres': getRandomFloat(0.1, 5.0, 2).toString(),
        'seller_last_name': `Seller${index}`,
        'buyer_first_name': `Buyer${index}`
    };
}

function convertToCsv(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }).join(','));
    return [headers, ...rows].join('\n');
}

async function createZipFile(zipFilePath, csvFileName, csvContent) {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
        zlib: { level: 9 }
    });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            console.log(`Created ZIP file: ${zipFilePath} (${archive.pointer()} total bytes)`);
            resolve();
        });
        archive.on('error', (err) => reject(err));
        archive.pipe(output);
        archive.append(csvContent, { name: csvFileName });
        archive.finalize();
    });
}

async function generateDummyDataAndZip() {
    const dummyDataDir = path.join(__dirname, 'dummy_data');
    if (!fs.existsSync(dummyDataDir)) {
        fs.mkdirSync(dummyDataDir);
    }

    console.log("Generating initial dummy data (V0 - 'Target' like)...");
    const initialRecordsCount = 50;
    const salesV0 = [];
    for (let i = 1; i <= initialRecordsCount; i++) {
        salesV0.push(generateSaleRecord(i));
    }
    const csvContentV0 = convertToCsv(salesV0);
    const zipFilePathV0 = path.join(dummyDataDir, '0122_CUR_Target.zip');
    await createZipFile(zipFilePathV0, '0122_CUR.csv', csvContentV0);

    console.log("\nGenerating first source update (V1) - expected to be identical to V0 for first sync test...");
    const salesV1 = JSON.parse(JSON.stringify(salesV0));
    const csvContentV1 = convertToCsv(salesV1);
    const zipFilePathV1 = path.join(dummyDataDir, '0122_CUR_Source_V1.zip');
    await createZipFile(zipFilePathV1, '0122_CUR.csv', csvContentV1);

    console.log("\nGenerating second source update (V2) with additions, modifications, and deletions...");
    let salesV2 = JSON.parse(JSON.stringify(salesV1));

    const newRecordsCount = 5;
    for (let i = initialRecordsCount + 1; i <= initialRecordsCount + newRecordsCount; i++) {
        salesV2.push(generateSaleRecord(i));
    }
    console.log(`- Added ${newRecordsCount} new records.`);

    const recordsToModifyIndexes = [10, 20];
    recordsToModifyIndexes.forEach(index => {
        const bookToFind = `BOOK-${String(index).padStart(5, '0').substring(0, 3)}`;
        const pageToFind = `PAGE-${String(index).padStart(5, '0').substring(3)}`;
        const record = salesV2.find(s => s.book === bookToFind && s.page === pageToFind);
        if (record) {
            record.sale_price = (parseFloat(record.sale_price) * 1.05 + 100).toFixed(2);
            record.county_name = `ModifiedCounty${index}`;
            console.log(`- Modified record with book/page: ${record.book}/${record.page}`);
        }
    });

    const recordsToDeleteIndexes = [3, 7];
    salesV2 = salesV2.filter(sale => {
        const currentBook = sale.book;
        const currentPage = sale.page;
        const originalIndexFromBookPage = parseInt(currentBook.substring(5) + currentPage.substring(5));
        return !recordsToDeleteIndexes.includes(originalIndexFromBookPage);
    });
    console.log(`- Deleted ${recordsToDeleteIndexes.length} records.`);

    const csvContentV2 = convertToCsv(salesV2);
    const zipFilePathV2 = path.join(dummyDataDir, '0122_CUR_Source_V2.zip');
    await createZipFile(zipFilePathV2, '0122_CUR.csv', csvContentV2);

    console.log("\nDummy data generation complete. Please re-run the sync tests.");
}

generateDummyDataAndZip().catch(console.error);
