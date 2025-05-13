const fs = require('fs').promises;
const path = require('path');
// const axios = require('axios');

const full_path = path.join(__dirname, './lodes_2025_jsons');

function clean(line) {
    return line
        .replace(/[↙➘]/g, '')
        .replace(/–/g, '-')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s{2,}/g, ' ');
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

function processValue(value) {
    if (value.toLowerCase() === "pendant") {
        return "Pendants";
    }
    return toTitleCase(value);
}

function readFileJson(file) {
    return require(path.join(full_path, file));
}

async function processProductFiles() {
    try {
        const files = await fs.readdir(full_path);
        const productFiles = files.filter(f => f !== '.DS_Store');

        // Flatten all products to a queue for sequential API calls
        const productQueue = [];

        for (const file of productFiles) {
            let file_json = readFileJson(file);
            let path_name = file.replace('.json', '');
            if (path_name === 'tidal-2') path_name = 'tidal';

            for (const key in file_json.products) {
                if (!file_json.products.hasOwnProperty(key)) continue;
                const skus = file_json.products[key].skus;

                for (const skuKey in skus) {
                    if (!skus.hasOwnProperty(skuKey)) continue;
                    const sku = skus[skuKey];

                    let product = { page_status: 'Live', path_name: path_name };
                    product.page_name = key + ' ' + skuKey;
                    product.title = key + ' ' + skuKey;
                    product.code = skuKey;
                    product.sku = skuKey;
                    product.related_file_1 = file_json.products[key].specs_sheet;
                    product.related_file_6 = file_json.products[key].assembly_instruction;
                    product.related_file_5 = file_json.products[key].photometric_diagram;
                    product.related_file_2 = file_json.products[key].diagram_2d;
                    product.related_file_3 = file_json.products[key].diagram_3d;
                    product.image_url_3 = file_json.products[key].technical_drawings;
                    product.style = processValue(file_json.products[key].mount);

                    // Light source parsing
                    if (file_json.products[key].light_source) {
                        const parsed = file_json.products[key].light_source.map(source => {
                            const lines = source.split('\n').map(clean);
                            const obj = {
                                type: lines[0],
                                kelvin: lines[1],
                                watt: lines[2],
                                lumen: lines[3],
                                directCurrent: '',
                                indirectCurrent: '',
                                cri: '',
                                macadam: ''
                            };
                            lines.forEach(line => {
                                if (line.startsWith('Direct light')) obj.directCurrent = line.replace('Direct light', '').trim();
                                else if (line.startsWith('Indirect light')) obj.indirectCurrent = line.replace('Indirect light', '').trim();
                                else if (line.startsWith('CRI')) obj.cri = line;
                                else if (line.startsWith('MacAdam')) obj.macadam = line;
                            });
                            return obj;
                        });

                        const firstSource = parsed[0];
                        if (firstSource) {
                            product.option_3 = firstSource.type;
                            product.option_6 = firstSource.watt.replace(/\s/g, '');
                            product.volume = firstSource.lumen;
                            product.option_12 = firstSource.current;
                            product.option_8 = firstSource.cri;
                            product.option_54 = firstSource.macadam;
                            product.option_21 = "IP20";
                            const kelvinValues = parsed.map(p => p.kelvin.replace(/\s/g, ''));
                            product.option_22 = [...new Set(kelvinValues)].join(',');
                        }
                    }

                    // Metal/Colour/Material logic
                    if (sku.metal) {
                        product.colour = sku.metal.replace(/\s*\–\s*\d+$/, '') || sku.metal;
                        if (sku.colour) {
                            product.material = sku.colour.replace(/\s*\–\s*\d+$/, '') || sku.colour;
                        }
                    } else if (sku.colour) {
                        product.colour = sku.colour.replace(/\s*\–\s*\d+$/, '') || sku.colour;
                    }

                    product.image_file_url = sku.image;

                    let product_tags = ['Lodes', key, 'Indoor', product.style, '2025'];
                    product.tags = product_tags.join(',');
                    product.related_tags = product_tags.join(',');
                    product.item_vendor = 'Lodes';
                    product.brand = 'Lodes';
                    product.summary = file_json['description'];
                    product.meta_description = file_json['description'];
                    product.description = file_json['description'];

                    product.item_category = 'Indoor';

                    // Gallery images
                    (file_json['gallery'] || []).forEach((img, idx) => {
                        if (idx === 0) product['image_url_1'] = img;
                        else product[`gallery_image_${idx + 1}`] = img;
                    });

                    product.url = product.page_name.toLowerCase()
                        .replace(/\s/g, '-')
                        .replace(/\./g, '-')
                        .replace(/\+/g, '')
                        .replace(/\\/g, '-')
                        .replace(/\!/g, '')
                        .replace(/[\(\)\/]/g, '')
                        .replace(/ø/g, '')
                        .replace(/ò/g, 'o');

                    // Add to queue for API posting
                    productQueue.push(product);
                }
            }
        }

        console.log(productQueue);

        // // Sequentially post products with 2s delay
        // await postProductsWithInterval(productQueue, 1000);

    } catch (err) {
        console.error(err);
    }
}

// async function postProductsWithInterval(products, delayMs) {
//     for (let i = 0; i < products.length; i++) {
//         const product = products[i];
//         console.log(`Posting: ${product.url}`);

//         try {
//             // Uncomment to actually send to API
//             await axios({
//                 url: 'https://eustage.moble.site/api/product',
//                 method: 'post',
//                 headers: {
//                     'mobleapikey': 'ak_2d9ad56e7b9d530fe4038a0c6097b3bd40fc3e7a8a46cae5e5c3c56dad39c57f',
//                     'Content-Type': 'application/json'
//                 },
//                 data: product
//             });
//         } catch (err) {
//             console.error(`Failed to post ${product.url}:`, err.message);
//         }

//         if (i < products.length - 1) {
//             await new Promise(res => setTimeout(res, delayMs));
//         }
//     }
// }

processProductFiles();
